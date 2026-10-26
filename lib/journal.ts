// Сабақ журналы: ортақ типтер мен есептеулер (клиент пен сервер). Құпия дерек жоқ.

export type AttStatus = 'present' | 'absent' | 'excused' | 'late'
export type JClass = { id: string; teacher_id: string; name: string; subject: string | null; group_id: string | null; days: number[]; active: boolean; position: number }
export type JStudent = { id: string; full_name: string }
export type JWeek = { topic: string | null; homework: string | null; note: string | null; updated_at?: string | null; updated_by?: string | null }
export type JLesson = { date: string; topic: string | null; homework: string | null; cancelled: boolean; updated_at?: string | null; updated_by?: string | null }
export type JAtt = { student_id: string; date: string; status: AttStatus }
export type JDetail = { class: JClass; teacher: string; students: JStudent[]; weekStart: string; week: JWeek | null; lessons: JLesson[]; attendance: JAtt[] }
export type JStats = { lessons: number; marked: number; expected: number; topics: number; homework: number; weekTopic: boolean; weekHomework: boolean; present: number; absent: number }

export const ISO = /^\d{4}-\d{2}-\d{2}$/

export const STATUS: Record<AttStatus, { short: string; label: string; bg: string; fg: string }> = {
  present: { short: '✓', label: 'Келді', bg: '#DCFCE7', fg: '#15803D' },
  late: { short: 'К', label: 'Кешікті', bg: '#FEF3C7', fg: '#B45309' },
  excused: { short: 'С', label: 'Себепті', bg: '#E0E7FF', fg: '#4338CA' },
  absent: { short: '✕', label: 'Келмеді', bg: '#FEE2E2', fg: '#B91C1C' },
}
/** Ұяшықты басқанда: бос → келді → келмеді → кешікті → себепті → бос */
export const CYCLE: (AttStatus | null)[] = [null, 'present', 'absent', 'late', 'excused']
export const nextStatus = (s: AttStatus | null) => CYCLE[(CYCLE.indexOf(s) + 1) % CYCLE.length]

export const DAY_SHORT = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс']
export const DAY_FULL = ['Дүйсенбі', 'Сейсенбі', 'Сәрсенбі', 'Бейсенбі', 'Жұма', 'Сенбі', 'Жексенбі']
const MON_GEN = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан']

export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
/** 1 = дүйсенбі … 7 = жексенбі */
export function weekdayOf(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`).getUTCDay()
  return d === 0 ? 7 : d
}
/** Аптаның дүйсенбісі */
export function weekStartOf(iso: string) {
  return addDays(iso, 1 - weekdayOf(iso))
}
export const weekDates = (ws: string) => Array.from({ length: 7 }, (_, i) => addDays(ws, i))
export const dayMonth = (iso: string) => `${Number(iso.slice(8, 10))} ${MON_GEN[Number(iso.slice(5, 7)) - 1]}`
export function weekLabel(ws: string) {
  const end = addDays(ws, 6)
  return ws.slice(5, 7) === end.slice(5, 7) ? `${Number(ws.slice(8, 10))}–${dayMonth(end)}` : `${dayMonth(ws)} – ${dayMonth(end)}`
}
export function todayAlmaty() {
  return new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 10)
}

/** Осы күні сабақ бар ма: кесте күні (болдырылмаса) немесе қосымша сабақ */
export function isLessonDay(date: string, days: number[], lesson?: Pick<JLesson, 'cancelled'> | null) {
  if (lesson) return !lesson.cancelled
  return days.includes(weekdayOf(date))
}
export function lessonDates(ws: string, days: number[], lessons: JLesson[]) {
  return weekDates(ws).filter((d) => isLessonDay(d, days, lessons.find((l) => l.date === d)))
}

const filled = (s: string | null | undefined) => !!s && s.trim().length > 0

/** Аптаның толтырылуы (әкімшінің бақылауы үшін). Болашақ сабақ күндері есептелмейді. */
export function weekStats(d: Pick<JDetail, 'class' | 'students' | 'weekStart' | 'week' | 'lessons' | 'attendance'>, today = todayAlmaty()): JStats {
  const all = lessonDates(d.weekStart, d.class.days, d.lessons)
  const past = all.filter((x) => x <= today)
  const ids = new Set(d.students.map((s) => s.id))
  const att = d.attendance.filter((a) => ids.has(a.student_id) && past.includes(a.date))
  const byDate = (x: string) => d.lessons.find((l) => l.date === x)
  return {
    lessons: past.length,
    expected: past.length * d.students.length,
    marked: att.length,
    present: att.filter((a) => a.status === 'present' || a.status === 'late').length,
    absent: att.filter((a) => a.status === 'absent').length,
    topics: past.filter((x) => filled(byDate(x)?.topic)).length,
    homework: past.filter((x) => filled(byDate(x)?.homework)).length,
    weekTopic: filled(d.week?.topic),
    weekHomework: filled(d.week?.homework),
  }
}

/** Толтырылу күйі: толық / жартылай / толтырылмаған / сабақ жоқ */
export function fillState(s: JStats): { label: string; bg: string; fg: string; pct: number } {
  if (!s.lessons) return { label: 'Сабақ әлі болған жоқ', bg: '#EEF1F6', fg: '#6B7385', pct: 0 }
  const att = s.expected ? s.marked / s.expected : 1
  const topic = s.weekTopic || s.topics === s.lessons ? 1 : s.topics / s.lessons
  const pct = Math.round(((att + topic) / 2) * 100)
  if (pct >= 95) return { label: 'Толық', bg: '#DCFCE7', fg: '#15803D', pct }
  if (pct > 0) return { label: 'Жартылай', bg: '#FEF3C7', fg: '#B45309', pct }
  return { label: 'Толтырылмаған', bg: '#FEE2E2', fg: '#B91C1C', pct }
}
