import { NextRequest, NextResponse } from 'next/server'
import { currentStudent } from '@/lib/bilimTestAuth'
import { getExam } from '@/lib/bilimTestStore'
import { examVariant, personalQuestions } from '@/lib/bilimShuffle'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// Ашық сынақтың сұрақтары (кілтсіз): жеке нұсқа болса — оқушының өз ретімен
export async function GET(req: NextRequest) {
  try {
    const me = await currentStudent()
    if (!me) return NextResponse.json({ error: 'Кіру керек' }, { status: 401 })
    const exam = await getExam(req.nextUrl.searchParams.get('exam') ?? '')
    const subject = req.nextUrl.searchParams.get('subject') ?? ''
    const cfg = exam?.subjects.find((s) => s.id === subject)
    if (!exam || !cfg || exam.group_id !== me.group_id || exam.practice || !exam.open_subjects.includes(subject)) {
      return NextResponse.json({ error: 'Сынақ табылмады' }, { status: 404 })
    }
    const qs = exam.questions[subject]
    if (!qs?.some((q) => q?.text || q?.image)) return NextResponse.json({ questions: null })
    const v = examVariant(exam, subject, me.full_name)
    const list = (v ? personalQuestions(qs, v) : qs.slice(0, cfg.questions)).map((q) => ({
      text: q?.text ?? '',
      image: q?.image ?? '',
      passage: v ? '' : q?.passage ?? '',
      options: q?.options ?? [],
    }))
    return NextResponse.json({ questions: list }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
