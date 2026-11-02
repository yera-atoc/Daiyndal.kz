import { NextRequest, NextResponse } from 'next/server'
import { currentAdmin } from '@/lib/requireAdmin'
import { loadJarvis } from '@/lib/jarvisServer'
import { logServerError } from '@/lib/serverLog'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Msg = { role: 'user' | 'assistant'; content: string }

const SYSTEM = `Сен — Jarvis, Beles education оқу орталығы әкімшісінің ақылды көмекшісісің (Железный адамдағы Джарвис сияқты: сабырлы, нақты, сәл әзілмен).
Төменде орталықтың ТІРІ деректері берілген. Тек соларға сүйен; дерек жоқ болса — «бұл туралы дерек жоқ» деп айт, ойдан шығарма.

Тіл: сұрақ қай тілде болса (қазақша не орысша), сол тілде жауап бер.
Стиль: қысқа (әдетте 2–6 сөйлем), алдымен жауаптың өзі, сосын керек болса қысқа тізім. Сандарды нақты айт. Markdown тақырыптарын қолданба.
Талдау сұраса — себебін және нақты келесі қадамды ұсын (кімге қоңырау шалу, қай топқа назар аудару).
Сен деректерді өзгерте алмайсың: төлем қабылдау, оқушы қосу сияқты әрекетті сұраса, панельдің қай бөлімінде жасауға болатынын айт.
Өрістер: қатысу30 — соңғы 30 күндегі келу пайызы; төлем күйі: overdue — кешікті, today — бүгін, soon — 3 күн ішінде, ok — уақыты бар, none — мерзімі қойылмаған.`

export async function POST(req: NextRequest) {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
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
    const { context } = await loadJarvis()
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.ADMIN_CHAT_MODEL ?? 'claude-sonnet-5-5',
        max_tokens: 900,
        system: [
          { type: 'text', text: SYSTEM },
          { type: 'text', text: `ОРТАЛЫҚ ДЕРЕКТЕРІ:\n${context}` },
        ],
        messages,
      }),
    })
    if (!r.ok) {
      await logServerError('jarvis-ask', new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 300)}`))
      return NextResponse.json({ error: 'Jarvis қазір жауап бере алмайды. Кейінірек көріңіз.' }, { status: 502 })
    }
    const d = await r.json()
    const answer = (d.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim()
    return NextResponse.json({ answer })
  } catch (e) {
    await logServerError('jarvis-ask', e)
    return NextResponse.json({ error: 'Байланыс үзілді. Қайта жазып көріңіз.' }, { status: 502 })
  }
}
