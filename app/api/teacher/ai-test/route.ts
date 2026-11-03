import { NextRequest, NextResponse } from 'next/server'
import { currentTeacherId } from '@/lib/requireTeacher'
import { currentAdmin } from '@/lib/requireAdmin'
import { askLLM, friendlyError, provider } from '@/lib/llm'
import { throttleCheck, throttleFail } from '@/lib/security'
import { parseQuestions } from '@/lib/aiTest'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Мұғалімге: ИИ тест құрастырады — мұғалім тексеріп, түзетіп, сақтайды.
export async function POST(req: NextRequest) {
  const teacher = await currentTeacherId()
  const admin = teacher ? null : await currentAdmin()
  if (!teacher && !admin) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  if (!provider()) return NextResponse.json({ error: 'ИИ кілті орнатылмаған (GEMINI_API_KEY)' }, { status: 503 })
  const key = [`chat:teacher:${teacher ?? 'admin'}`]
  if (await throttleCheck(key)) return NextResponse.json({ error: 'Бір сағатта тым көп сұраныс. Кейінірек көріңіз.' }, { status: 429 })
  await throttleFail(key)

  const b = await req.json().catch(() => null)
  const subject = String(b?.subject ?? '').slice(0, 60)
  const topic = String(b?.topic ?? '').trim().slice(0, 300)
  const grade = String(b?.grade ?? '').slice(0, 20)
  const level = String(b?.level ?? 'орташа').slice(0, 20)
  const format = String(b?.format ?? '').slice(0, 40)
  const lang = b?.lang === 'ru' ? 'орыс' : b?.lang === 'en' ? 'ағылшын' : 'қазақ'
  const count = Math.min(20, Math.max(3, Number(b?.count) || 10))
  if (!topic) return NextResponse.json({ error: 'Тақырыбын жазыңыз' }, { status: 400 })

  const prompt = `${grade ? `${grade}-сынып` : ''} оқушыларына «${subject}» пәнінен «${topic}» тақырыбы бойынша ${count} тест сұрағын құрастыр.
Деңгейі: ${level}.${format ? ` Формат: ${format} емтиханындағыдай.` : ''} Тілі: ${lang} тілі (әдеби, қатесіз).
Әр сұрақта 4 жауап нұсқасы, тек біреуі дұрыс; дұрыс жауаптың орны әртүрлі болсын. Есеп болса — сандары нақты, жауабы тексерілген болсын.
ТЕК JSON массивін қайтар, басқа мәтінсіз:
[{"question":"...","options":["...","...","...","..."],"correct":0}]  (correct — дұрыс нұсқаның индексі 0–3)`
  try {
    const text = await askLLM({ system: ['Сен — тәжірибелі мұғалім және тест құрастырушысың. Сұрақтарың нақты, бір мағыналы, жауабы дұрыс.'], messages: [{ role: 'user', content: prompt }], maxTokens: 4000 })
    const questions = parseQuestions(text, count)
    if (!questions.length) return NextResponse.json({ error: 'ИИ дұрыс форматта жауап бермеді. Қайта басып көріңіз.' }, { status: 502 })
    return NextResponse.json({ questions })
  } catch (e) {
    return NextResponse.json({ error: friendlyError(e) }, { status: 502 })
  }
}
