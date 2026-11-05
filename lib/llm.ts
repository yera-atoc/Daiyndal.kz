// ИИ-провайдер: Claude (ANTHROPIC_API_KEY) немесе Gemini (GEMINI_API_KEY). Тек серверде.
// Екеуі де болса — Claude; AI_PROVIDER=gemini не anthropic деп нақты таңдауға болады.

export type ChatMsg = { role: 'user' | 'assistant'; content: string }
export type Provider = 'anthropic' | 'gemini'

export function provider(): Provider | null {
  const forced = process.env.AI_PROVIDER?.toLowerCase()
  if (forced === 'gemini' && process.env.GEMINI_API_KEY) return 'gemini'
  if (forced === 'anthropic' && process.env.ANTHROPIC_API_KEY) return 'anthropic'
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic'
  if (process.env.GEMINI_API_KEY) return 'gemini'
  return null
}

export class LlmError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

type Opts = { system: string[]; messages: ChatMsg[]; maxTokens: number; webSearch?: boolean; model?: { anthropic?: string; gemini?: string } }

async function anthropic(o: Opts): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY!
  const body: Record<string, unknown> = {
    model: o.model?.anthropic ?? process.env.ADMIN_CHAT_MODEL ?? 'claude-sonnet-5-5',
    max_tokens: o.maxTokens,
    system: o.system.map((text) => ({ type: 'text', text })),
    messages: o.messages,
  }
  const call = (b: Record<string, unknown>) =>
    fetch(`${process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com'}/v1/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(b),
      cache: 'no-store',
    })
  let r = await call(o.webSearch ? { ...body, tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }] } : body)
  if (!r.ok && r.status === 400 && o.webSearch) r = await call(body) // іздеу қосылмаған болса — іздеусіз
  if (!r.ok) throw new LlmError(r.status, `Anthropic ${r.status}: ${(await r.text()).slice(0, 300)}`)
  const d = await r.json()
  return (d.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
}

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta'
const geminiResolved = new Map<string, string>() // сұралған модель → кілтпен жұмыс істейтіні (сервер тірі тұрғанда есте сақталады)

/** Кілтке қолжетімді модельдердің ішінен ең жаңа «flash» мәтін моделін таңдау */
async function pickGeminiModel(key: string, exclude: string): Promise<string | null> {
  const r = await fetch(`${GEMINI}/models?pageSize=200`, { headers: { 'x-goog-api-key': key }, cache: 'no-store' })
  if (!r.ok) return null
  const d = await r.json()
  const names: string[] = (d.models ?? [])
    .filter((m: any) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
    .map((m: any) => String(m.name).replace(/^models\//, ''))
    .filter((n: string) => n !== exclude && /gemini/.test(n) && !/(image|tts|audio|live|embedding|vision|robotics|nano|banana|computer|omni)/.test(n))
  const rank = (n: string) => {
    const v = parseFloat((/gemini-(\d+(?:\.\d+)?)/.exec(n) ?? [])[1] ?? '0')
    return v * 10 + (/flash/.test(n) ? 3 : 0) - (/lite/.test(n) ? 1 : 0) - (/preview|exp/.test(n) ? 2 : 0) + (/latest/.test(n) ? 1 : 0)
  }
  return names.sort((a, b) => rank(b) - rank(a))[0] ?? null
}

async function gemini(o: Opts): Promise<string> {
  const key = process.env.GEMINI_API_KEY!.trim()
  const wanted = o.model?.gemini ?? process.env.GEMINI_MODEL ?? 'gemini-flash-latest'
  let model = geminiResolved.get(wanted) ?? wanted
  const body: Record<string, unknown> = {
    systemInstruction: { parts: o.system.map((text) => ({ text })) },
    contents: o.messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    generationConfig: { maxOutputTokens: Math.max(o.maxTokens, 1024) * 4 }, // «ойлау» токендеріне де орын
  }
  const call = (b: Record<string, unknown>) =>
    fetch(`${GEMINI}/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(b),
      cache: 'no-store',
    })
  const withTools = o.webSearch ? { ...body, tools: [{ google_search: {} }] } : body
  let r = await call(withTools)
  // Модель табылмаса не ескірсе — қолжетімдісін тауып, қайталаймыз
  if (r.status === 404 || (r.status === 400 && /not found|not supported|deprecat/i.test(await r.clone().text()))) {
    const alt = await pickGeminiModel(key, model)
    if (alt) {
      model = alt
      r = await call(withTools)
    }
  }
  if (!r.ok && (r.status === 400 || r.status === 403) && o.webSearch && !/API_KEY|api key/i.test(await r.clone().text())) r = await call(body) // іздеусіз
  if (!r.ok) throw new LlmError(r.status, `Gemini ${r.status} (${model}): ${(await r.text()).slice(0, 400)}`)
  geminiResolved.set(wanted, model)
  const d = await r.json()
  const parts = d.candidates?.[0]?.content?.parts ?? []
  const text = parts.filter((p: any) => typeof p.text === 'string' && !p.thought).map((p: any) => p.text).join('')
  if (!text) throw new LlmError(502, `Gemini: бос жауап (${d.candidates?.[0]?.finishReason ?? d.promptFeedback?.blockReason ?? 'белгісіз'})`)
  return text
}

/** Әкімшіге түсінікті қате мәтіні */
export function friendlyError(e: unknown): string {
  const m = String((e as any)?.message ?? e)
  const st = (e as any)?.status
  if (/API_KEY_INVALID|API key not valid/i.test(m)) return 'Gemini кілті жарамсыз. AI Studio-дан кілтті қайта көшіріп, Vercel-де GEMINI_API_KEY мәнін жаңартып, Redeploy жасаңыз.'
  if (/location is not supported|FAILED_PRECONDITION/i.test(m)) return 'Gemini API бұл аймақта тегін жұмыс істемейді. AI Studio-да Billing қосу керек.'
  if (st === 429 || /RESOURCE_EXHAUSTED|quota/i.test(m)) return 'Gemini шектеуі (квота) таусылды. Бір минуттан кейін қайталаңыз; жиі болса — AI Studio-да Billing қосыңыз.'
  if (st === 403 || /PERMISSION_DENIED/i.test(m)) return 'Gemini кілтіне рұқсат жоқ (Generative Language API өшірулі болуы мүмкін). AI Studio-да жаңа кілт жасап көріңіз.'
  if (/бос жауап/.test(m)) return 'Модель бос жауап қайтарды. Сұрақты басқаша жазып көріңіз.'
  if (/abort|timeout|fetch failed/i.test(m)) return 'ИИ серверіне қосылу мүмкін болмады. Қайта жазып көріңіз.'
  return `ИИ қатесі: ${m.slice(0, 220)}`
}

/** Бір сұрау: таңдалған провайдер арқылы мәтін қайтарады */
export async function askLLM(o: Opts): Promise<string> {
  const p = provider()
  if (!p) throw new LlmError(503, 'no_key')
  return p === 'gemini' ? gemini(o) : anthropic(o)
}
