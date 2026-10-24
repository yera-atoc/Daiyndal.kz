// Серверлік қабат: Білім тексеру деректері Supabase-те.
// BILIM_TEST_DEMO=1 болса (тек жергілікті превью үшін) — жадта сақталады.
import {
  DEFAULT_SUBJECTS,
  SEED_STUDENTS,
  examIdFor,
  examTitle,
  scoresForExam,
  type Exam,
  type Group,
  type ScoreRow,
  type Student,
  type Submission,
} from './bilimTest'

const DEMO = process.env.BILIM_TEST_DEMO === '1'

type Mem = { groups: Group[]; exams: Exam[]; subs: Submission[]; students: (Student & { pin_fails: number; locked_until: string | null })[] }
const g = globalThis as unknown as { __btMem2?: Mem }
const mem = (): Mem =>
  (g.__btMem2 ??= {
    groups: [{ id: 'nzm', name: 'НЗМ дайындық тобы', position: 0, subjects: DEFAULT_SUBJECTS }],
    exams: [],
    subs: [],
    students: SEED_STUDENTS.map((s) => ({ ...s, id: crypto.randomUUID(), group_id: 'nzm', pin: randomPin(), pin_fails: 0, locked_until: null })),
  })

async function db() {
  const { supabaseAdmin } = await import('./supabaseAdmin')
  return supabaseAdmin
}

function check<T>(r: { data: T; error: { message: string; code?: string } | null }): T {
  if (r.error) throw Object.assign(new Error(r.error.message), { code: r.error.code })
  return r.data
}

export function randomPin() {
  const a = new Uint32Array(1)
  crypto.getRandomValues(a)
  return String(a[0] % 10000).padStart(4, '0')
}

// ── Топтар ───────────────────────────────────────────────

export async function listGroups(): Promise<Group[]> {
  const rows = DEMO ? mem().groups : (check(await (await db()).from('bt_groups').select('id,name,position,subjects')) as Group[])
  return [...(rows ?? [])].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
}

export async function saveGroup(gr: Group): Promise<void> {
  if (DEMO) {
    mem().groups = mem().groups.filter((x) => x.id !== gr.id).concat(gr)
    return
  }
  check(await (await db()).from('bt_groups').upsert(gr))
}

export async function deleteGroup(id: string): Promise<void> {
  if (DEMO) {
    mem().groups = mem().groups.filter((x) => x.id !== id)
    return
  }
  check(await (await db()).from('bt_groups').delete().eq('id', id))
}

// ── Сынақтар ─────────────────────────────────────────────

function normExam(e: any): Exam {
  return {
    ...e,
    group_id: e.group_id ?? 'nzm',
    month: e.month ?? e.id,
    answer_key: e.answer_key ?? {},
    questions: e.questions ?? {},
    open_subjects: e.open_subjects ?? [],
    published: !!e.published,
  }
}

export async function listExams(groupId?: string): Promise<Exam[]> {
  let rows: any[]
  if (DEMO) rows = mem().exams
  else {
    let q = (await db()).from('bt_exams').select('*')
    if (groupId) q = q.eq('group_id', groupId)
    rows = check(await q) ?? []
  }
  return rows
    .map(normExam)
    .filter((e) => !groupId || e.group_id === groupId)
    .sort((a, b) => a.month.localeCompare(b.month))
}

export async function getExam(id: string): Promise<Exam | null> {
  if (DEMO) {
    const e = mem().exams.find((x) => x.id === id)
    return e ? normExam(e) : null
  }
  const data = check(await (await db()).from('bt_exams').select('*').eq('id', id).maybeSingle())
  return data ? normExam(data) : null
}

export async function saveExam(e: Exam): Promise<void> {
  const row = {
    id: e.id,
    group_id: e.group_id,
    month: e.month,
    title: e.title,
    subjects: e.subjects,
    open_subjects: e.open_subjects,
    answer_key: e.answer_key,
    questions: e.questions,
    published: e.published,
  }
  if (DEMO) {
    mem().exams = mem().exams.filter((x) => x.id !== e.id).concat(row)
    return
  }
  check(await (await db()).from('bt_exams').upsert(row))
}

export function newExam(group: Group, month: string): Exam {
  return {
    id: examIdFor(group.id, month),
    group_id: group.id,
    month,
    title: examTitle(month),
    subjects: group.subjects.length ? group.subjects : DEFAULT_SUBJECTS,
    open_subjects: [],
    answer_key: {},
    questions: {},
    published: false,
  }
}

// ── Жауап парақтары ──────────────────────────────────────

export async function listSubmissions(examId: string): Promise<Submission[]> {
  if (DEMO) return mem().subs.filter((s) => s.exam_id === examId)
  return (check(await (await db()).from('bt_submissions').select('*').eq('exam_id', examId).order('submitted_at')) ??
    []) as Submission[]
}

// 'duplicate' — бұл пәнді оқушы бұрын тапсырған
export async function addSubmission(s: Omit<Submission, 'id' | 'submitted_at'>): Promise<'ok' | 'duplicate'> {
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
  check(await (await db()).from('bt_submissions').delete().eq('id', id))
}

// ── Оқушылар ─────────────────────────────────────────────

type StudentRow = Student & { pin_fails: number; locked_until: string | null }

async function studentRows(groupId?: string): Promise<StudentRow[]> {
  let rows: StudentRow[]
  if (DEMO) rows = mem().students
  else {
    let q = (await db()).from('bt_students').select('*')
    if (groupId) q = q.eq('group_id', groupId)
    rows = (check(await q) ?? []) as StudentRow[]
  }
  rows = rows.filter((s) => !groupId || s.group_id === groupId)
  // PIN-і жоқ оқушыға бірден код беру
  for (const s of rows) {
    if (!s.pin) {
      s.pin = randomPin()
      if (!DEMO) check(await (await db()).from('bt_students').update({ pin: s.pin }).eq('id', s.id))
    }
  }
  return [...rows].sort((a, b) => a.position - b.position || a.full_name.localeCompare(b.full_name))
}

const strip = ({ pin_fails, locked_until, ...s }: StudentRow): Student => s

export async function listStudents(groupId: string): Promise<Student[]> {
  return (await studentRows(groupId)).map(strip)
}

export async function getStudent(id: string): Promise<Student | null> {
  const s = (await studentRows()).find((x) => x.id === id)
  return s ? strip(s) : null
}

// 'duplicate' — бұл аты-жөні топта бар
export async function addStudent(groupId: string, full_name: string): Promise<'ok' | 'duplicate'> {
  const all = await studentRows(groupId)
  if (all.some((s) => s.full_name === full_name)) return 'duplicate'
  const row = { group_id: groupId, full_name, position: Math.max(0, ...all.map((s) => s.position)) + 1, legacy_scores: {}, pin: randomPin() }
  if (DEMO) {
    mem().students.push({ ...row, id: crypto.randomUUID(), pin_fails: 0, locked_until: null })
    return 'ok'
  }
  const { error } = await (await db()).from('bt_students').insert(row)
  if (error) {
    if (error.code === '23505') return 'duplicate'
    throw new Error(error.message)
  }
  return 'ok'
}

// Атын өзгерту: топтағы сынақтардың жауап парақтары да жаңа атқа көшеді
export async function renameStudent(id: string, full_name: string): Promise<'ok' | 'duplicate' | 'missing'> {
  const st = (await studentRows()).find((s) => s.id === id)
  if (!st) return 'missing'
  if (st.full_name === full_name) return 'ok'
  const peers = await studentRows(st.group_id)
  if (peers.some((s) => s.full_name === full_name)) return 'duplicate'
  const examIds = (await listExams(st.group_id)).map((e) => e.id)
  if (DEMO) {
    for (const x of mem().subs) if (x.student_name === st.full_name && examIds.includes(x.exam_id)) x.student_name = full_name
    mem().students.find((s) => s.id === id)!.full_name = full_name
    return 'ok'
  }
  const sb = await db()
  const { error } = await sb.from('bt_students').update({ full_name }).eq('id', id)
  if (error) {
    if (error.code === '23505') return 'duplicate'
    throw new Error(error.message)
  }
  if (examIds.length)
    check(await sb.from('bt_submissions').update({ student_name: full_name }).eq('student_name', st.full_name).in('exam_id', examIds))
  return 'ok'
}

// Тізімнен шығару. Осы топтағы жауап парақтары да өшеді.
export async function deleteStudent(id: string): Promise<void> {
  const st = (await studentRows()).find((s) => s.id === id)
  if (!st) return
  const examIds = (await listExams(st.group_id)).map((e) => e.id)
  if (DEMO) {
    mem().students = mem().students.filter((s) => s.id !== id)
    mem().subs = mem().subs.filter((x) => !(x.student_name === st.full_name && examIds.includes(x.exam_id)))
    return
  }
  const sb = await db()
  if (examIds.length)
    check(await sb.from('bt_submissions').delete().eq('student_name', st.full_name).in('exam_id', examIds))
  check(await sb.from('bt_students').delete().eq('id', id))
}

export async function resetPin(id: string): Promise<void> {
  const patch = { pin: randomPin(), pin_fails: 0, locked_until: null }
  if (DEMO) {
    Object.assign(mem().students.find((s) => s.id === id) ?? {}, patch)
    return
  }
  check(await (await db()).from('bt_students').update(patch).eq('id', id))
}

// PIN тексеру: 5 рет қате енгізсе — 10 минутқа бұғатталады
export async function checkPin(id: string, pin: string): Promise<'ok' | 'wrong' | 'locked' | 'missing'> {
  const st = (await studentRows()).find((s) => s.id === id)
  if (!st) return 'missing'
  if (st.locked_until && new Date(st.locked_until) > new Date()) return 'locked'
  const ok = st.pin === pin
  const fails = ok ? 0 : (st.pin_fails ?? 0) + 1
  const patch = { pin_fails: fails >= 5 ? 0 : fails, locked_until: fails >= 5 ? new Date(Date.now() + 10 * 60e3).toISOString() : null }
  if (DEMO) Object.assign(mem().students.find((s) => s.id === id)!, patch)
  else check(await (await db()).from('bt_students').update(patch).eq('id', id))
  return ok ? 'ok' : fails >= 5 ? 'locked' : 'wrong'
}

// ── Алдыңғы ай ───────────────────────────────────────────

// Осы топтағы алдыңғы айдың баллдары (сайтқа дейінгі Excel нәтижесі немесе сайттағы сынақ)
export async function previousScores(
  exam: Exam
): Promise<{ id: string; month: string; title: string; scores: Record<string, ScoreRow> } | null> {
  const [exams, students] = await Promise.all([listExams(exam.group_id), listStudents(exam.group_id)])
  const legacy = students.flatMap((s) => Object.keys(s.legacy_scores ?? {}))
  const months = Array.from(new Set([...legacy, ...exams.map((e) => e.month)]))
    .filter((m) => m < exam.month)
    .sort()
  const prev = months[months.length - 1]
  if (!prev) return null
  const dbExam = exams.find((e) => e.month === prev)
  if (dbExam) {
    return { id: dbExam.id, month: prev, title: dbExam.title, scores: scoresForExam(dbExam, await listSubmissions(dbExam.id)) }
  }
  const scores: Record<string, ScoreRow> = {}
  for (const s of students) if (s.legacy_scores?.[prev]) scores[s.full_name] = s.legacy_scores[prev]
  return { id: prev, month: prev, title: examTitle(prev), scores }
}
