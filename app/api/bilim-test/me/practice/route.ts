import { NextRequest, NextResponse } from 'next/server'
import { currentStudent } from '@/lib/bilimTestAuth'
import { getExam, listSubmissions } from '@/lib/bilimTestStore'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// Дайындық сынағының бір пәні: сұрақтар (кілтсіз). Оқушы тапсырған соң ғана
// оның жауаптары мен дұрыс жауаптар қосылады — алдын ала кілт ешқашан жіберілмейді.
export async function GET(req: NextRequest) {
  try {
    const me = await currentStudent()
    if (!me) return NextResponse.json({ error: 'Кіру керек' }, { status: 401 })
    const exam = await getExam(req.nextUrl.searchParams.get('exam') ?? '')
    const cfg = exam?.subjects.find((s) => s.id === req.nextUrl.searchParams.get('subject'))
    if (!exam || !cfg || !exam.practice || exam.group_id !== me.group_id) {
      return NextResponse.json({ error: 'Сынақ табылмады' }, { status: 404 })
    }
    const sub = (await listSubmissions(exam.id)).find((s) => s.student_name === me.full_name && s.subject === cfg.id)
    return NextResponse.json(
      {
        exam: { id: exam.id, title: exam.title },
        subject: { id: cfg.id, name: cfg.name, questions: cfg.questions, options: cfg.options, max: cfg.max },
        questions: exam.questions[cfg.id] ?? [],
        review: sub ? { answers: sub.answers, key: exam.answer_key[cfg.id] ?? [], at: sub.submitted_at } : null,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
