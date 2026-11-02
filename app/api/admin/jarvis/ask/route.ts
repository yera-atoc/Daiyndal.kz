import { NextRequest, NextResponse } from 'next/server'
import { currentAdmin } from '@/lib/requireAdmin'
import { loadJarvis } from '@/lib/jarvisServer'
import { adminFirstName, almatyHour, greeting } from '@/lib/jarvis'
import { getWeather, weatherSentence } from '@/lib/weather'
import { todayAlmatyISO } from '@/lib/payments'
import { logServerError } from '@/lib/serverLog'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Msg = { role: 'user' | 'assistant'; content: string }

const SYSTEM = (name: string, today: string, hour: number) => `Сен — Online Beles Manager, Beles education оқу орталығының (Жезқазған) ақылды дауыстық көмекшісісің — Алиса сияқты. Сенімен ${name} сөйлесіп отыр. Бүгін ${today}, Алматы уақытымен сағат ${hour}:00 шамасы.

Сен екі нәрсені білесің:
1) Орталықтың ТІРІ деректері (төменде): оқушылар, төлемдер, қатысу, мұғалімдер, өтінімдер. Бұл туралы сұраққа тек осы деректерге сүйеніп жауап бер, ойдан шығарма.
2) Жалпы сұрақтар: ауа райы, жаңалықтар, ғылым, тарих, есеп, кеңес, аударма, идея — кез келген сұраққа Алиса сияқты жауап бер. Қазіргі оқиға, бағам, жаңалық сияқты жаңа дерек керек болса — web_search құралын қолдан. Жезқазғанның ауа райы төменде берілген.

Тіл: сұрақ қай тілде болса (қазақша не орысша), сол тілде жауап бер. Қазақшаң таза, әдеби болсын.
Стиль: жылы, сабырлы, сәл әзілмен; қысқа (әдетте 2–5 сөйлем) — жауабың дауыстап оқылуы мүмкін, сондықтан Markdown белгілерін, кестелерді, сілтемелерді қолданба. Сандарды нақты айт.
Талдау сұраса — себебін және нақты келесі қадамды ұсын (кімге қоңырау шалу, қай топқа назар аудару).
Сен деректерді өзгерте алмайсың: төлем қабылдау, оқушы қосу сияқты әрекетті сұраса, панельдің қай бөлімінде жасауға болатынын айт.
Сәлемдессе — «${greeting(hour)}, ${name}!» деп жауап бер.
Өрістер: қатысу30 — соңғы 30 күндегі келу пайызы; төлем күйі: overdue — кешікті, today — бүгін, soon — 3 күн ішінде, ok — уақыты бар, none — мерзімі қойылмаған.`

async function callClaude(key: string, body: Record<string, unknown>) {
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
  })
}

export async function POST(req: NextRequest) {
  const me = await currentAdmin()
  if (!me) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return NextResponse.json({ error: 'ANTHROPIC_API_KEY орнатылмаған (Vercel → Environment Variables)' }, { status: 503 })

  const body = await req.json().catch(() => null)
  const raw: Msg[] = Array.isArray(body?.messages) ? body.messages : []
  const messages = raw
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
  while (messages.length && messages[0].role !== 'user') messages.shift()
  if (!messages.length || messages[messages.length - 1].role !== 'user') return NextResponse.json({ error: 'Сұрақ жазыңыз' }, { status: 400 })

  try {
    const [{ context }, weather] = await Promise.all([loadJarvis(), getWeather()])
    const name = adminFirstName(me, process.env.OWNER_NAME)
    const base = {
      model: process.env.ADMIN_CHAT_MODEL ?? 'claude-sonnet-5-5',
      max_tokens: 1000,
      system: [
        { type: 'text', text: SYSTEM(name, todayAlmatyISO(), almatyHour()) },
        { type: 'text', text: `ЖЕЗҚАЗҒАН АУА РАЙЫ: ${weatherSentence(weather) || 'дерек жоқ'}\n\nОРТАЛЫҚ ДЕРЕКТЕРІ:\n${context}` },
      ],
      messages,
    }
    // Интернеттен іздеу (Алиса сияқты жаңа ақпарат). Ұйымда қосылмаған болса — іздеусіз қайталаймыз.
    let r = await callClaude(key, { ...base, tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }] })
    if (!r.ok && r.status === 400) r = await callClaude(key, base)
    if (!r.ok) {
      await logServerError('jarvis-ask', new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 300)}`))
      return NextResponse.json({ error: 'Көмекші қазір жауап бере алмайды. Кейінірек көріңіз.' }, { status: 502 })
    }
    const d = await r.json()
    const answer = (d.content ?? [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('')
      .replace(/\*\*|__|^#+\s*/gm, '')
      .trim()
    return NextResponse.json({ answer })
  } catch (e) {
    await logServerError('jarvis-ask', e)
    return NextResponse.json({ error: 'Байланыс үзілді. Қайта жазып көріңіз.' }, { status: 502 })
  }
}
