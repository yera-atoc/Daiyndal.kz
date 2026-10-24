import { NextRequest, NextResponse } from 'next/server'
import { LETTERS } from '@/lib/bilimTest'
import { addSubmission, getExam } from '@/lib/bilimTestStore'
import { currentStudent } from '@/lib/bilimTestAuth'

export async function POST(req: NextRequest) {
  try {
    const me = await currentStudent()
    if (!me) return NextResponse.json({ error: 'Қайта кіріңіз' }, { status: 401 })
    const body = await req.json().catch(() => null)
    const exam = await getExam(String(body?.examId ?? ''))
    const cfg = exam?.subjects.find((s) => s.id === String(body?.subject ?? ''))
    if (!exam || !cfg || exam.group_id !== me.group_id) {
      return NextResponse.json({ error: 'Сынақ табылмады' }, { status: 404 })
    }
    if (!exam.open_subjects.includes(cfg.id)) {
      return NextResponse.json({ error: 'Бұл пән бойынша жауап қабылдау жабық' }, { status: 403 })
    }
    const answers = body?.answers
    const allowed = LETTERS.slice(0, cfg.options)
    if (!Array.isArray(answers) || answers.length !== cfg.questions || answers.some((a) => a !== '' && !allowed.includes(a))) {
      return NextResponse.json({ error: 'Жауап парағы дұрыс емес' }, { status: 400 })
    }
    const res = await addSubmission({ exam_id: exam.id, student_name: me.full_name, subject: cfg.id, answers })
    if (res === 'duplicate') return NextResponse.json({ error: 'Бұл пәнді бұрын тапсырдың' }, { status: 409 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
