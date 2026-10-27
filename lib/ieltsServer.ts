// IELTS серверлік көмекшілері: рұқсат (мұғалім/админ/оқушы), сессия, тапсыру күйі.
import { cookies } from 'next/headers'
import { isAdmin } from './requireAdmin'
import { currentTeacherId } from './requireTeacher'
import {
  sectionMinutes,
  sectionsOf,
  scoreSection,
  type Attempt,
  type AttemptState,
  type IeltsTest,
  type Section,
} from './ielts'

export async function db() {
  const { supabaseAdmin } = await import('./supabaseAdmin')
  return supabaseAdmin
}

/** Мұғалім (өз тесттері) немесе админ (барлығы). Екеуі де болмаса — null. */
export async function staff(): Promise<{ teacherId: string | null; admin: boolean } | null> {
  const [teacherId, admin] = await Promise.all([currentTeacherId(), isAdmin()])
  if (!teacherId && !admin) return null
  return { teacherId, admin }
}

export function canEdit(who: { teacherId: string | null; admin: boolean }, test: Pick<IeltsTest, 'teacher_id'> & { exam?: string }) {
  // ҰБТ сынақтары – орталықтың ортақ тесттері: кез келген мұғалім рұқсат бере алады
  return who.admin || (!!who.teacherId && (test.teacher_id === who.teacherId || test.exam === 'ubt'))
}

// ── Оқушы сессиясы (HMAC қолтаңбалы cookie) ─────────────────

const COOKIE = 'ielts_student'
const secret = () => process.env.SESSION_SECRET || process.env.BILIM_TEST_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ADMIN_PASSWORD || 'beles-dev-secret'

async function sign(v: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(`ielts:${secret()}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const s = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(v))
  return Array.from(new Uint8Array(s), (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function setStudent(id: string) {
  cookies().set(COOKIE, `${id}.${await sign(id)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 120,
  })
}
export function clearStudent() {
  cookies().set(COOKIE, '', { path: '/', maxAge: 0 })
}
export async function currentStudent(): Promise<{ id: string; full_name: string } | null> {
  const raw = cookies().get(COOKIE)?.value
  if (!raw) return null
  const [id, sig] = raw.split('.')
  if (!id || !sig || sig !== (await sign(id))) return null
  const { data } = await (await db()).from('students').select('id, full_name').eq('id', id).maybeSingle()
  return data ?? null
}

export function randomPin() {
  const a = new Uint32Array(1)
  crypto.getRandomValues(a)
  return String(a[0] % 10000).padStart(4, '0')
}

// ── Тесттер мен тапсырулар ───────────────────────────────

export async function getTest(id: string): Promise<IeltsTest | null> {
  const { data } = await (await db()).from('ielts_tests').select('*').eq('id', id).maybeSingle()
  return (data as IeltsTest) ?? null
}

export async function getAttempt(id: string): Promise<Attempt | null> {
  const { data } = await (await db()).from('ielts_attempts').select('*').eq('id', id).maybeSingle()
  return (data as Attempt) ?? null
}

export function newState(test: IeltsTest): AttemptState {
  const order = sectionsOf(test.content)
  return { order, current: 0, startedAt: order[0] ? { [order[0]]: new Date().toISOString() } : {} }
}

const GRACE_MS = 90_000 // желі кідірісіне қосымша уақыт

/** Ағымдағы бөлімнің соңғы мерзімі (емтихан режимінде). null — шектеусіз. */
export function deadline(test: IeltsTest, a: Attempt, sec: Section): number | null {
  if (test.mode !== 'exam') return null
  const min = sectionMinutes(test.content, sec)
  const start = a.state.startedAt?.[sec]
  if (!min || !start) return null
  return new Date(start).getTime() + min * 60_000
}

export function canWrite(test: IeltsTest, a: Attempt, sec: Section) {
  if (a.status !== 'in_progress') return false
  if (a.state.order[a.state.current] !== sec) return false
  const d = deadline(test, a, sec)
  return d === null || Date.now() <= d + GRACE_MS
}

/** Бөлімді аяқтап, келесісіне өту. L/R автоматты бағаланады. */
export async function finishSection(test: IeltsTest, a: Attempt): Promise<Attempt> {
  const sec = a.state.order[a.state.current]
  const scores = { ...a.scores }
  const exam = test.exam ?? 'ielts'
  if (sec === 'listening' || sec === 'reading') scores[sec] = scoreSection(test.content, sec, a.answers?.[sec], test.variant, exam)
  // ҰБТ — бәрі автоматты
  if (sec === 'ubt' && test.content.ubt && a.state.combo) {
    const { scoreUbt } = await import('./ubt')
    scores.ubt = scoreUbt(test.content.ubt, a.state.combo, a.answers?.ubt)
  }
  // TOEFL Build a Sentence — автоматты тексеріледі
  if (sec === 'writing' && test.content.writing?.build?.length) scores.writing = { ...scores.writing, build: scoreSection(test.content, 'build', a.answers?.build, test.variant, 'toefl') }
  const nextIdx = a.state.current + 1
  const next = a.state.order[nextIdx]
  const state: AttemptState = {
    ...a.state,
    current: nextIdx,
    startedAt: next ? { ...a.state.startedAt, [next]: new Date().toISOString() } : a.state.startedAt,
  }
  const done = nextIdx >= a.state.order.length
  const needsTeacher = a.state.order.some((s) => s === 'writing' || s === 'speaking')
  const patch: Partial<Attempt> = {
    state,
    scores,
    ...(done ? { status: needsTeacher ? 'submitted' : 'graded', submitted_at: new Date().toISOString(), ...(needsTeacher ? {} : { graded_at: new Date().toISOString() }) } : {}),
  }
  if (done && !needsTeacher) {
    const { overallBand, toeflOverall } = await import('./ielts')
    patch.scores = { ...scores, overall: exam === 'ubt' ? scores.ubt?.total ?? null : exam === 'toefl' ? toeflOverall(scores, a.state.order) : overallBand(scores, a.state.order) }
  }
  const { data, error } = await (await db()).from('ielts_attempts').update(patch).eq('id', a.id).select('*').single()
  if (error) throw new Error(error.message)
  return data as Attempt
}

/** Уақыты өтіп кеткен бөлімдерді өзі аяқтау (оқушы бетті жауып кетсе) */
export async function catchUp(test: IeltsTest, a: Attempt): Promise<Attempt> {
  let cur = a
  for (let i = 0; i < 4 && cur.status === 'in_progress'; i++) {
    const sec = cur.state.order[cur.state.current]
    if (!sec) break
    const d = deadline(test, cur, sec)
    if (d === null || Date.now() <= d + GRACE_MS) break
    cur = await finishSection(test, cur)
  }
  return cur
}

/**
 * Аяқталған тапсыруды қайта есептеу (кілт не сұрақ түзетілгеннен кейін): автоматты бөлімдер
 * (ҰБТ, Listening, Reading, Build) қазіргі кілтпен қайта бағаланады; мұғалімнің W/S бағасы сақталады.
 */
export async function regradeAttempt(test: IeltsTest, a: Attempt): Promise<Attempt> {
  const exam = test.exam ?? 'ielts'
  const scores = { ...a.scores }
  const done = (sec: Section) => a.state.order.indexOf(sec) > -1 && a.state.order.indexOf(sec) < a.state.current
  for (const sec of ['listening', 'reading'] as const) if (done(sec)) scores[sec] = scoreSection(test.content, sec, a.answers?.[sec], test.variant, exam)
  if (done('ubt') && test.content.ubt && a.state.combo) {
    const { scoreUbt } = await import('./ubt')
    scores.ubt = scoreUbt(test.content.ubt, a.state.combo, a.answers?.ubt)
  }
  if (done('writing') && test.content.writing?.build?.length) scores.writing = { ...scores.writing, build: scoreSection(test.content, 'build', a.answers?.build, test.variant, 'toefl') }
  const { overallBand, toeflOverall } = await import('./ielts')
  if (exam === 'ubt') scores.overall = scores.ubt?.total ?? null
  else if (a.status === 'graded') scores.overall = exam === 'toefl' ? toeflOverall(scores, a.state.order) : overallBand(scores, a.state.order)
  const { data, error } = await (await db()).from('ielts_attempts').update({ scores }).eq('id', a.id).select('*').single()
  if (error) throw new Error(error.message)
  return data as Attempt
}
