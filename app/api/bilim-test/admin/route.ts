import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/requireAdmin'
import { EXAM_ID_RE, LETTERS, SUBJECT_IDS, cleanName, type Exam } from '@/lib/bilimTest'
import {
  addStudent,
  deleteStudent,
  deleteSubmission,
  listStudents,
  renameStudent,
  getExam,
  listExams,
  listSubmissions,
  newExam,
  previousScores,
  saveExam,
} from '@/lib/bilimTestStore'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const denied = () => NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return denied()
  try {
    const exams = await listExams()
    const id = req.nextUrl.searchParams.get('exam') ?? exams[exams.length - 1]?.id
    const exam = id ? exams.find((e) => e.id === id) ?? null : null
    return NextResponse.json({
      students: await listStudents(),
      exams: exams.map((e) => ({ id: e.id, title: e.title })),
      exam,
      submissions: exam ? await listSubmissions(exam.id) : [],
      previous: exam ? await previousScores(exam.id) : null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function clean(e: any): Exam | null {
  if (!e || !EXAM_ID_RE.test(String(e.id))) return null
  const subjects = (Array.isArray(e.subjects) ? e.subjects : [])
    .filter((s: any) => SUBJECT_IDS.includes(s?.id))
    .map((s: any) => ({
      id: s.id,
      name: String(s.name).slice(0, 40),
      short: String(s.short ?? s.name).slice(0, 20),
      max: Math.max(1, Math.round(Number(s.max) || 0)),
      questions: Math.min(100, Math.max(1, Math.round(Number(s.questions) || 0))),
      options: Math.min(5, Math.max(2, Math.round(Number(s.options) || 4))),
    }))
  const answer_key: Exam['answer_key'] = {}
  for (const s of subjects) {
    const k = e.answer_key?.[s.id]
    if (Array.isArray(k)) {
      const allowed = LETTERS.slice(0, s.options)
      answer_key[s.id as keyof Exam['answer_key']] = Array.from({ length: s.questions }, (_, i) =>
        allowed.includes(k[i]) ? k[i] : ''
      )
    }
  }
  return {
    id: e.id,
    title: String(e.title || e.id).slice(0, 60),
    subjects,
    open_subjects: (Array.isArray(e.open_subjects) ? e.open_subjects : []).filter((x: any) =>
      subjects.some((s: any) => s.id === x)
    ),
    answer_key,
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return denied()
  try {
    const body = await req.json().catch(() => null)
    if (body?.action === 'create') {
      const id = String(body.id)
      if (!EXAM_ID_RE.test(id)) return NextResponse.json({ error: 'Ай дұрыс емес' }, { status: 400 })
      if (await getExam(id)) return NextResponse.json({ error: 'Бұл айдың сынағы бар' }, { status: 409 })
      await saveExam(newExam(id))
      return NextResponse.json({ ok: true })
    }
    if (body?.action === 'save') {
      const exam = clean(body.exam)
      if (!exam) return NextResponse.json({ error: 'Дерек дұрыс емес' }, { status: 400 })
      await saveExam(exam)
      return NextResponse.json({ ok: true })
    }
    if (body?.action === 'add-student' || body?.action === 'rename-student') {
      const name = cleanName(body.name)
      if (name.length < 3) return NextResponse.json({ error: 'Аты-жөнін толық жазыңыз' }, { status: 400 })
      const res =
        body.action === 'add-student' ? await addStudent(name) : await renameStudent(String(body.id), name)
      if (res === 'duplicate') return NextResponse.json({ error: 'Бұл аты-жөні тізімде бар' }, { status: 409 })
      if (res === 'missing') return NextResponse.json({ error: 'Оқушы табылмады' }, { status: 404 })
      return NextResponse.json({ ok: true })
    }
    if (body?.action === 'delete-student') {
      await deleteStudent(String(body.id))
      return NextResponse.json({ ok: true })
    }
    if (body?.action === 'delete-submission') {
      await deleteSubmission(String(body.id))
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Белгісіз әрекет' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
