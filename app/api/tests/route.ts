import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { currentTeacherId } from '@/lib/requireTeacher'

export async function GET() {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('tests')
    .select('*, test_questions(count)')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

type IncomingQuestion = {
  questionText: string
  options: string[]
  correctIndex: number
}

export async function POST(req: NextRequest) {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const questions: IncomingQuestion[] = body?.questions ?? []

  if (!body?.title || !body?.subject) {
    return NextResponse.json({ error: 'Тақырып пен пән міндетті' }, { status: 400 })
  }
  if (questions.length === 0) {
    return NextResponse.json({ error: 'Кем дегенде бір сұрақ қосыңыз' }, { status: 400 })
  }
  for (const q of questions) {
    if (!q.questionText?.trim() || q.options.some((o) => !o.trim())) {
      return NextResponse.json(
        { error: 'Әр сұрақта мәтін және барлық жауап нұсқалары толтырылуы керек' },
        { status: 400 }
      )
    }
  }

  const { data: test, error: testError } = await supabaseAdmin
    .from('tests')
    .insert({ teacher_id: teacherId, subject: body.subject, title: body.title })
    .select()
    .single()

  if (testError) return NextResponse.json({ error: testError.message }, { status: 500 })

  const { error: questionsError } = await supabaseAdmin.from('test_questions').insert(
    questions.map((q, i) => ({
      test_id: test.id,
      question_text: q.questionText,
      options: q.options,
      correct_index: q.correctIndex,
      position: i,
    }))
  )

  if (questionsError) {
    // Roll back the orphaned test row so a failed question insert doesn't
    // leave an empty test behind.
    await supabaseAdmin.from('tests').delete().eq('id', test.id)
    return NextResponse.json({ error: questionsError.message }, { status: 500 })
  }

  return NextResponse.json(test)
}
