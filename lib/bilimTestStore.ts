// Серверлік қабат: Білім тексеру сынағының деректері Supabase-те.
// BILIM_TEST_DEMO=1 болса (тек жергілікті превью үшін) — жадта сақталады.
import {
  DEFAULT_SUBJECTS,
  STATIC_HISTORY,
  examTitle,
  scoresForExam,
  type Exam,
  type ScoreRow,
  type Submission,
} from './bilimTest'

const DEMO = process.env.BILIM_TEST_DEMO === '1'

type Mem = { exams: Exam[]; subs: Submission[] }
const g = globalThis as unknown as { __btMem?: Mem }
const mem = (): Mem => (g.__btMem ??= { exams: [], subs: [] })

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

// Алдыңғы айдың баллдары (Excel-ден енгізілгені немесе сайттағы сынақ)
export async function previousScores(
  examId: string
): Promise<{ id: string; title: string; scores: Record<string, ScoreRow> } | null> {
  const exams = await listExams()
  const ids = Array.from(new Set([...Object.keys(STATIC_HISTORY), ...exams.map((e) => e.id)]))
    .filter((id) => id < examId)
    .sort()
  const prevId = ids[ids.length - 1]
  if (!prevId) return null
  const dbExam = exams.find((e) => e.id === prevId)
  if (dbExam) {
    return { id: prevId, title: dbExam.title, scores: scoresForExam(dbExam, await listSubmissions(prevId)) }
  }
  return { id: prevId, ...STATIC_HISTORY[prevId] }
}
