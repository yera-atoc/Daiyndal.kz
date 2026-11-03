import { NextRequest, NextResponse } from 'next/server'
import { currentAdmin } from '@/lib/requireAdmin'
import { loadJarvis } from '@/lib/jarvisServer'
import { adminFirstName, almatyHour, greeting } from '@/lib/jarvis'
import { getWeather, weatherSentence } from '@/lib/weather'
import { todayAlmatyISO } from '@/lib/payments'
import { logServerError } from '@/lib/serverLog'
import { askLLM, provider } from '@/lib/llm'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Msg = { role: 'user' | 'assistant'; content: string }

const SYSTEM = (name: string, today: string, hour: number) => `Сен — Online Beles Manager, Beles education оқу орталығының (Жезқазған) ақылды дауыстық көмекшісісің — Алиса сияқты. Сенімен ${name} сөйлесіп отыр. Бүгін ${today}, Алматы уақытымен сағат ${hour}:00 шамасы.

Сен екі нәрсені білесің:
1) Орталықтың ТІРІ деректері (төменде): оқушылар, төлемдер, қатысу, мұғалімдер, өтінімдер. Бұл туралы сұраққа тек осы деректерге сүйеніп жауап бер, ойдан шығарма.
2) Жалпы сұрақтар: ауа райы, жаңалықтар, ғылым, тарих, есеп, кеңес, аударма, идея — кез келген сұраққа Алиса сияқты жауап бер. Қазіргі оқиға, бағам, жаңалық сияқты жаңа дерек керек болса — интернеттен іздеу құралын қолдан. Жезқазғанның ауа райы төменде берілген.

Тіл: сұрақ қай тілде болса (қазақша не орысша), сол тілде жауап бер. Қазақшаң таза, әдеби болсын.
Стиль: жылы, сабырлы, сәл әзілмен; қысқа (әдетте 2–5 сөйлем) — жауабың дауыстап оқылуы мүмкін, сондықтан Markdown белгілерін, кестелерді, сілтемелерді қолданба. Сандарды нақты айт.
Талдау сұраса — себебін және нақты келесі қадамды ұсын (кімге қоңырау шалу, қай топқа назар аудару).
Сен деректерді өзгерте алмайсың: төлем қабылдау, оқушы қосу сияқты әрекетті сұраса, панельдің қай бөлімінде жасауға болатынын айт.
Сәлемдессе — «${greeting(hour)}, ${name}!» деп жауап бер.
Өрістер: қатысу30 — соңғы 30 күндегі келу пайызы; төлем күйі: overdue — кешікті, today — бүгін, soon — 3 күн ішінде, ok — уақыты бар, none — мерзімі қойылмаған.`

export async function POST(req: NextRequest) {
  const me = await currentAdmin()
  if (!me) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  if (!provider()) return NextResponse.json({ error: 'ИИ кілті орнатылмаған: Vercel-ге GEMINI_API_KEY не ANTHROPIC_API_KEY қосыңыз' }, { status: 503 })

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
    const text = await askLLM({
      system: [SYSTEM(name, todayAlmatyISO(), almatyHour()), `ЖЕЗҚАЗҒАН АУА РАЙЫ: ${weatherSentence(weather) || 'дерек жоқ'}\n\nОРТАЛЫҚ ДЕРЕКТЕРІ:\n${context}`],
      messages,
      maxTokens: 1000,
      webSearch: true,
    })
    const answer = text.replace(/\*\*|__|^#+\s*/gm, '').trim()
    return NextResponse.json({ answer })
  } catch (e) {
    await logServerError('jarvis-ask', e)
    return NextResponse.json({ error: 'Байланыс үзілді. Қайта жазып көріңіз.' }, { status: 502 })
  }
}
