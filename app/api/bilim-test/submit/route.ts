import { NextRequest, NextResponse } from 'next/server'
import { LETTERS } from '@/lib/bilimTest'
import { addSubmission, getExam, studentExists } from '@/lib/bilimTestStore'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const examId = String(body?.examId ?? '')
    const student = String(body?.student ?? '')
    const subject = String(body?.subject ?? '')
    const answers = body?.answers

    if (!(await studentExists(student))) {
      return NextResponse.json({ error: 'Оқушы тізімде жоқ' }, { status: 400 })
    }
    const exam = await getExam(examId)
    const cfg = exam?.subjects.find((s) => s.id === subject)
    if (!exam || !cfg) {
      return NextResponse.json({ error: 'Сынақ табылмады' }, { status: 404 })
    }
    if (!exam.open_subjects.includes(cfg.id)) {
      return NextResponse.json({ error: 'Бұл пән бойынша жауап қабылдау жабық' }, { status: 403 })
    }
    const allowed = LETTERS.slice(0, cfg.options)
    if (
      !Array.isArray(answers) ||
      answers.length !== cfg.questions ||
      answers.some((a) => a !== '' && !allowed.includes(a))
    ) {
      return NextResponse.json({ error: 'Жауап парағы дұрыс емес' }, { status: 400 })
    }

    const res = await addSubmission({ exam_id: exam.id, student_name: student, subject: cfg.id, answers })
    if (res === 'duplicate') {
      return NextResponse.json({ error: 'Бұл пәнді бұрын тапсырдың' }, { status: 409 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
