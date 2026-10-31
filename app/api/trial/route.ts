import { NextRequest, NextResponse } from 'next/server'
import { leadLimit, saveLead } from '@/lib/leads'
import { normPhone, trialLevel, trialTrack, TRIAL_TRACKS } from '@/lib/trialTests'

export const dynamic = 'force-dynamic'

// Тегін сынақ: сұрақтар (кілтсіз)
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('track')
  if (!id) return NextResponse.json({ tracks: TRIAL_TRACKS.map((t) => ({ id: t.id, title: t.title, who: t.who, minutes: t.minutes, count: t.questions.length })) })
  const t = trialTrack(id)
  if (!t) return NextResponse.json({ error: 'Табылмады' }, { status: 404 })
  return NextResponse.json({ id: t.id, title: t.title, minutes: t.minutes, questions: t.questions.map((q) => ({ text: q.text, options: q.options, topic: q.topic })) })
}

// Тапсыру: тексеріп, өтінім ретінде сақтаймыз, нәтиже мен ұсынысты қайтарамыз
export async function POST(req: NextRequest) {
  try {
    const b = await req.json().catch(() => null)
    const t = trialTrack(String(b?.track ?? ''))
    if (!t) return NextResponse.json({ error: 'Бағыт табылмады' }, { status: 400 })
    const name = String(b?.child_name ?? '').trim()
    const phone = normPhone(b?.phone)
    if (name.length < 2) return NextResponse.json({ error: 'Баланың атын жазыңыз' }, { status: 400 })
    if (!phone) return NextResponse.json({ error: 'Телефон нөмірін дұрыс жазыңыз' }, { status: 400 })
    const answers = t.questions.map((_, i) => {
      const a = String(b?.answers?.[i] ?? '').toUpperCase()
      return /^[A-D]$/.test(a) ? a : ''
    })
    const correct = t.questions.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0)
    const level = trialLevel(t, correct)
    const weak = Array.from(new Set(t.questions.filter((q, i) => answers[i] !== q.answer).map((q) => q.topic)))
    if (!b?.website) {
      const { wait, ip } = await leadLimit(req.headers)
      if (!wait) {
        await saveLead(ip, {
          source: 'trial',
          child_name: name,
          phone,
          grade: b?.grade,
          parent_name: b?.parent_name,
          direction: t.title,
          trial: { track: t.id, title: t.title, correct, total: t.questions.length, level: level.name, weak, answers },
        }).catch(() => {})
      }
    }
    return NextResponse.json({
      correct,
      total: t.questions.length,
      level: level.name,
      text: level.text,
      weak,
      review: t.questions.map((q, i) => ({ given: answers[i], key: q.answer })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
