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
    fetch('https://api.anthropic.com/v1/messages', {
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

async function gemini(o: Opts): Promise<string> {
  const key = process.env.GEMINI_API_KEY!
  const model = o.model?.gemini ?? process.env.GEMINI_MODEL ?? 'gemini-flash-latest'
  const body: Record<string, unknown> = {
    systemInstruction: { parts: o.system.map((text) => ({ text })) },
    contents: o.messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    generationConfig: { maxOutputTokens: Math.max(o.maxTokens, 1024) * 2 }, // «ойлау» токендеріне де орын
  }
  const call = (b: Record<string, unknown>) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(b),
      cache: 'no-store',
    })
  let r = await call(o.webSearch ? { ...body, tools: [{ google_search: {} }] } : body)
  if (!r.ok && r.status === 400 && o.webSearch) r = await call(body)
  if (!r.ok) throw new LlmError(r.status, `Gemini ${r.status}: ${(await r.text()).slice(0, 300)}`)
  const d = await r.json()
  const parts = d.candidates?.[0]?.content?.parts ?? []
  const text = parts.filter((p: any) => typeof p.text === 'string' && !p.thought).map((p: any) => p.text).join('')
  if (!text) throw new LlmError(502, `Gemini: бос жауап (${d.candidates?.[0]?.finishReason ?? d.promptFeedback?.blockReason ?? 'белгісіз'})`)
  return text
}

/** Бір сұрау: таңдалған провайдер арқылы мәтін қайтарады */
export async function askLLM(o: Opts): Promise<string> {
  const p = provider()
  if (!p) throw new LlmError(503, 'no_key')
  return p === 'gemini' ? gemini(o) : anthropic(o)
}
