import { NextRequest, NextResponse } from 'next/server'
import { currentStudent, db } from '@/lib/ieltsServer'
import { addDays, todayAlmaty } from '@/lib/journal'
import { scoreQuiz, type QuizQ } from '@/lib/lesson'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

// Оқушыға: өз топтарының сабақ тесттері (соңғы 21 күн). Дұрыс жауап тапсырғаннан кейін ғана көрінеді.
export async function GET() {
  const me = await currentStudent()
  if (!me) return bad('Кіру керек', 401)
  const sb = await db()
  const { data: m } = await sb.from('teacher_class_students').select('class_id').eq('student_id', me.id)
  const ids = (m ?? []).map((x) => x.class_id)
  if (!ids.length) return NextResponse.json({ quizzes: [] })
  const { data: qs, error } = await sb.from('class_quizzes').select('id, class_id, date, topic, questions, open, teacher_classes(name, subject)').in('class_id', ids).gte('date', addDays(todayAlmaty(), -21)).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ quizzes: [] }) // миграция әлі жоқ болса — бос
  const { data: ans } = (qs ?? []).length ? await sb.from('class_quiz_answers').select('quiz_id, answers, score, total').eq('student_id', me.id).in('quiz_id', qs!.map((q) => q.id)) : { data: [] as any[] }
  const quizzes = (qs ?? [])
    .map((q: any) => {
      const a = (ans ?? []).find((x: any) => x.quiz_id === q.id)
      const questions = (q.questions as QuizQ[]).map((x) => (a ? x : { q: x.q, options: x.options, correct: -1 }))
      return { id: q.id, date: q.date, topic: q.topic, open: q.open, className: q.teacher_classes?.name ?? '', subject: q.teacher_classes?.subject ?? null, questions, result: a ? { answers: a.answers, score: a.score, total: a.total } : null }
    })
    .filter((q) => q.open || q.result)
  return NextResponse.json({ quizzes })
}

// POST { quizId, answers:[...] } — бір рет тапсырылады
export async function POST(req: NextRequest) {
  const me = await currentStudent()
  if (!me) return bad('Кіру керек', 401)
  const b = await req.json().catch(() => null)
  const sb = await db()
  const { data: q } = await sb.from('class_quizzes').select('id, class_id, questions, open').eq('id', String(b?.quizId ?? '')).maybeSingle()
  if (!q) return bad('Тест табылмады', 404)
  const { data: mem } = await sb.from('teacher_class_students').select('class_id').eq('class_id', q.class_id).eq('student_id', me.id).maybeSingle()
  if (!mem) return bad('Бұл тест сіздің тобыңызға емес', 403)
  if (!q.open) return bad('Тест жабылған')
  const { data: prev } = await sb.from('class_quiz_answers').select('score').eq('quiz_id', q.id).eq('student_id', me.id).maybeSingle()
  if (prev) return bad('Бұл тестті тапсырып қойдыңыз')
  const r = scoreQuiz(q.questions as QuizQ[], b?.answers)
  const { error } = await sb.from('class_quiz_answers').insert({ quiz_id: q.id, student_id: me.id, answers: r.answers, score: r.score, total: r.total })
  if (error) return bad(error.message, 500)
  return NextResponse.json({ ok: true, ...r, questions: q.questions })
}
