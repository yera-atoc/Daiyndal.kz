import { NextRequest, NextResponse } from 'next/server'
import { CONTACT, MORE_SUBJECTS, TEACHERS, waLink } from '@/components/site/brand'
import { clientIp, throttleCheck, throttleFail } from '@/lib/security'
import { logServerError } from '@/lib/serverLog'

export const dynamic = 'force-dynamic'

// Сайттағы ИИ-көмекші. Тек орталық туралы ашық ақпаратқа сүйенеді, оқушылардың деректерін көрмейді.
const SYSTEM = `Сен – Жезқазғандағы Beles education оқу орталығы сайтының көмекшісісің. Ата-аналар мен оқушылардың сұрақтарына жауап бересің.

Тіл: сұрақ қай тілде болса, сол тілде жауап бер (қазақша, орысша не ағылшынша). Қазақшаң таза, әдеби болсын.
Стиль: жылы, қысқа (әдетте 2–5 сөйлем), нақты. Қажет болса қысқа тізім. Markdown тақырыптарын қолданба.

Орталық туралы дерек (тек осыған сүйен):
- Мекенжай: ${CONTACT.address}. 2GIS: ${CONTACT.gis}
- WhatsApp: ${CONTACT.phone} (жазылу, баға, кесте, бос орын – осы арқылы). Instagram: ${CONTACT.instagramHandle}
- Бағдарламалар:
  • 5–6 сынып: НЗМ, БИЛ, РФМШ-ға түсу емтихандарына дайындық (математика, сандық сипаттама, жаратылыстану, қазақ/орыс/ағылшын тілдері).
  • 9–11 сынып: ҰБТ-ға дайындық (Қазақстан тарихы, математикалық және оқу сауаттылығы, бейіндік пәндер).
  • IELTS және TOEFL: академиялық ағылшын, Writing пен Speaking-ті мұғалім тексереді.
  • 3–11 сынып: мектеп пәндері бойынша сабақтар.
- Мұғалімдер: ${TEACHERS.map((t) => `${t.name} (${t.subject})`).join(', ')}. Сонымен қатар ${MORE_SUBJECTS.join(', ')} пәндерінің мұғалімдері бар.
- Онлайн платформа (тек орталық оқушыларына; кіру – атын таңдап, мұғалім берген 4 таңбалы PIN):
  • /bilim-test – Білім тексеру: ай сайынғы сынақ, нәтиже, топтағы орын, тақырыптар бойынша талдау, келесі айға жоспар және ата-анаға PDF есеп.
  • /ubt – ҰБТ сынағы: ресми формат, 5 пән, 120 тапсырма, 140 балл, 240 минут, 12 бейіндік комбинация. Балл бірден шығады, PDF есеп және келесі сынаққа жоспар бар.
  • /ielts – IELTS Academic mock (Listening, Reading, Writing, Speaking). /toefl – TOEFL iBT mock (2026 жылғы жаңа формат).
  • /ielts/materials – IELTS/TOEFL дайындық кеңестері, /materials – мұғалімдер жүктеген материалдар.
  • PIN-ді ұмытса не тізімде аты жоқ болса – мұғалімге не WhatsApp-қа жазу керек.
- ҰБТ шекті балы: бейіндік пәндер мен Қазақстан тарихы – 5, сауаттылық пәндері – 3.

Ережелер:
- Баға, нақты кесте, жеңілдік, бос орын туралы дерек сенде ЖОҚ – ойдан шығарма, WhatsApp-қа жазуды ұсын.
- Оқушының жеке нәтижесін, PIN-ін, басқа адамдар туралы ақпаратты білмейсің және сұрамайсың.
- Орталыққа қатысы жоқ сұрақ болса (мысалы, үй тапсырмасы), қысқа көмектесіп, орталықтың сабақтарын ұсынуға болады. Емтихан кезінде жауап сұраса – бас тарт.
- Жазылғысы келсе, осы сілтемені бер: ${waLink('Сәлеметсіз бе! Сабаққа жазылғым келеді.')}`

type Msg = { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return NextResponse.json({ error: 'no_key' }, { status: 503 })

  const body = await req.json().catch(() => null)
  const raw: Msg[] = Array.isArray(body?.messages) ? body.messages : []
  const messages = raw
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 800) }))
  if (!messages.length || messages[messages.length - 1].role !== 'user') return NextResponse.json({ error: 'Сұрақ жазыңыз' }, { status: 400 })
  while (messages[0]?.role !== 'user') messages.shift()

  const ipKey = [`chat:${clientIp(req.headers)}`]
  if (await throttleCheck(ipKey)) return NextResponse.json({ error: 'Бір сағатта тым көп сұрақ. Кейінірек жазыңыз немесе WhatsApp арқылы хабарласыңыз.' }, { status: 429 })
  await throttleFail(ipKey) // әр хабарлама санауышқа қосылады

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.CHAT_MODEL ?? 'claude-haiku-5-5', max_tokens: 600, system: SYSTEM, messages }),
    })
    if (!r.ok) {
      await logServerError('chat', new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 300)}`))
      return NextResponse.json({ error: 'Көмекші қазір жауап бере алмайды. WhatsApp арқылы жазыңыз.' }, { status: 502 })
    }
    const d = await r.json()
    const answer = (d.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim()
    return NextResponse.json({ answer })
  } catch (e) {
    await logServerError('chat', e)
    return NextResponse.json({ error: 'Байланыс үзілді. Қайта жазып көріңіз.' }, { status: 502 })
  }
}
