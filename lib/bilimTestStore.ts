// Серверлік қабат: Білім тексеру сынағының деректері Supabase-те.
// BILIM_TEST_DEMO=1 болса (тек жергілікті превью үшін) — жадта сақталады.
import {
  DEFAULT_SUBJECTS,
  SEED_STUDENTS,
  examTitle,
  scoresForExam,
  type Exam,
  type ScoreRow,
  type Student,
  type Submission,
} from './bilimTest'

const DEMO = process.env.BILIM_TEST_DEMO === '1'

type Mem = { exams: Exam[]; subs: Submission[]; students: Student[] }
const g = globalThis as unknown as { __btMem?: Mem }
const mem = (): Mem => (g.__btMem ??= { exams: [], subs: [], students: [] })

async function db() {
  const { supabaseAdmin } = await import('./supabaseAdmin')
  return supabaseAdmin
}

export async function listExams(): Promise<Exam[]> {
  if (DEMO) return [...mem().exams].sort((a, b) => a.id.localeCompare(b.id))
  const { data, error } = await (await db()).from('bt_exams').select('*').order('id')
  if (error) throw new Error(error.message)
  return (data ?? []) as Exam[]
}

export async function getExam(id: string): Promise<Exam | null> {
  return (await listExams()).find((e) => e.id === id) ?? null
}

export async function saveExam(e: Exam): Promise<void> {
  if (DEMO) {
    const m = mem()
    m.exams = m.exams.filter((x) => x.id !== e.id).concat(e)
    return
  }
  const { error } = await (await db())
    .from('bt_exams')
    .upsert({
      id: e.id,
      title: e.title,
      subjects: e.subjects,
      open_subjects: e.open_subjects,
      answer_key: e.answer_key,
    })
  if (error) throw new Error(error.message)
}

export function newExam(id: string): Exam {
  return { id, title: examTitle(id), subjects: DEFAULT_SUBJECTS, open_subjects: [], answer_key: {} }
}

export async function listSubmissions(examId: string): Promise<Submission[]> {
  if (DEMO) return mem().subs.filter((s) => s.exam_id === examId)
  const { data, error } = await (await db())
    .from('bt_submissions')
    .select('*')
    .eq('exam_id', examId)
    .order('submitted_at')
  if (error) throw new Error(error.message)
  return (data ?? []) as Submission[]
}

// 'duplicate' — бұл пәнді оқушы бұрын тапсырған
export async function addSubmission(
  s: Omit<Submission, 'id' | 'submitted_at'>
): Promise<'ok' | 'duplicate'> {
  if (DEMO) {
    const m = mem()
    if (m.subs.some((x) => x.exam_id === s.exam_id && x.student_name === s.student_name && x.subject === s.subject))
      return 'duplicate'
    m.subs.push({ ...s, id: crypto.randomUUID(), submitted_at: new Date().toISOString() })
    return 'ok'
  }
  const { error } = await (await db()).from('bt_submissions').insert(s)
  if (error) {
    if (error.code === '23505') return 'duplicate'
    throw new Error(error.message)
  }
  return 'ok'
}

export async function deleteSubmission(id: string): Promise<void> {
  if (DEMO) {
    mem().subs = mem().subs.filter((s) => s.id !== id)
    return
  }
  const { error } = await (await db()).from('bt_submissions').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Оқушылар ─────────────────────────────────────────────

export async function listStudents(): Promise<Student[]> {
  let rows: Student[]
  if (DEMO) rows = mem().students
  else {
    const { data, error } = await (await db()).from('bt_students').select('*').order('position').order('full_name')
    if (error) throw new Error(error.message)
    rows = (data ?? []) as Student[]
  }
  if (rows.length === 0) {
    // Алғашқы іске қосу: бастапқы тізім мен қыркүйек нәтижелерін салу
    if (DEMO) mem().students = SEED_STUDENTS.map((s) => ({ ...s, id: crypto.randomUUID() }))
    else {
      const { error } = await (await db()).from('bt_students').upsert(SEED_STUDENTS, { onConflict: 'full_name', ignoreDuplicates: true })
      if (error) throw new Error(error.message)
    }
    return DEMO ? mem().students : listStudents()
  }
  return [...rows].sort((a, b) => a.position - b.position || a.full_name.localeCompare(b.full_name))
}

export async function studentExists(name: string): Promise<boolean> {
  return (await listStudents()).some((s) => s.full_name === name)
}

// 'duplicate' — бұл аты-жөні тізімде бар
export async function addStudent(full_name: string): Promise<'ok' | 'duplicate'> {
  const all = await listStudents()
  if (all.some((s) => s.full_name === full_name)) return 'duplicate'
  const position = Math.max(0, ...all.map((s) => s.position)) + 1
  if (DEMO) {
    mem().students.push({ id: crypto.randomUUID(), full_name, position, legacy_scores: {} })
    return 'ok'
  }
  const { error } = await (await db()).from('bt_students').insert({ full_name, position, legacy_scores: {} })
  if (error) {
    if (error.code === '23505') return 'duplicate'
    throw new Error(error.message)
  }
  return 'ok'
}

// Атын өзгерту: оқушының бұрын тапсырған жауап парақтары да жаңа атқа көшеді
export async function renameStudent(id: string, full_name: string): Promise<'ok' | 'duplicate' | 'missing'> {
  const all = await listStudents()
  const st = all.find((s) => s.id === id)
  if (!st) return 'missing'
  if (st.full_name === full_name) return 'ok'
  if (all.some((s) => s.full_name === full_name)) return 'duplicate'
  if (DEMO) {
    const old = st.full_name
    st.full_name = full_name
    for (const x of mem().subs) if (x.student_name === old) x.student_name = full_name
    return 'ok'
  }
  const sb = await db()
  const { error } = await sb.from('bt_students').update({ full_name }).eq('id', id)
  if (error) {
    if (error.code === '23505') return 'duplicate'
    throw new Error(error.message)
  }
  const { error: e2 } = await sb.from('bt_submissions').update({ student_name: full_name }).eq('student_name', st.full_name)
  if (e2) throw new Error(e2.message)
  return 'ok'
}

// Тізімнен шығару. Жауап парақтары да өшіріледі.
export async function deleteStudent(id: string): Promise<void> {
  const st = (await listStudents()).find((s) => s.id === id)
  if (!st) return
  if (DEMO) {
    mem().students = mem().students.filter((s) => s.id !== id)
    mem().subs = mem().subs.filter((x) => x.student_name !== st.full_name)
    return
  }
  const sb = await db()
  const { error: e1 } = await sb.from('bt_submissions').delete().eq('student_name', st.full_name)
  if (e1) throw new Error(e1.message)
  const { error } = await sb.from('bt_students').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// Алдыңғы айдың баллдары (сайтқа дейінгі Excel нәтижесі немесе сайттағы сынақ)
export async function previousScores(
  examId: string
): Promise<{ id: string; title: string; scores: Record<string, ScoreRow> } | null> {
  const [exams, students] = await Promise.all([listExams(), listStudents()])
  const legacyIds = students.flatMap((s) => Object.keys(s.legacy_scores ?? {}))
  const ids = Array.from(new Set([...legacyIds, ...exams.map((e) => e.id)]))
    .filter((id) => id < examId)
    .sort()
  const prevId = ids[ids.length - 1]
  if (!prevId) return null
  const dbExam = exams.find((e) => e.id === prevId)
  if (dbExam) {
    return { id: prevId, title: dbExam.title, scores: scoresForExam(dbExam, await listSubmissions(prevId)) }
  }
  const scores: Record<string, ScoreRow> = {}
  for (const s of students) if (s.legacy_scores?.[prevId]) scores[s.full_name] = s.legacy_scores[prevId]
  return { id: prevId, title: examTitle(prevId), scores }
}
