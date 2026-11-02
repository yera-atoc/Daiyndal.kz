// Мұғалімнің «Шолу» беті: оқушылар талдауы мен ескертулер (таза есептеулер — клиент пен сервер, тест үшін бөлек).

import type { AttStatus } from './journal'
import { addDays } from './journal'
import { paymentStatus, type PaymentStatus } from './payments'

export const WINDOW_DAYS = 30

export type InsightClass = { id: string; name: string; subject: string | null; days: number[]; active: boolean }
export type InsightStudent = {
  id: string
  full_name: string
  grade: number | null
  status: string | null
  rating_points: number | null
  payment_deadline: string | null
  group_name: string | null
}
export type InsightAtt = { class_id: string; student_id: string; date: string; status: AttStatus }
export type InsightLesson = { class_id: string; date: string; cancelled: boolean }
export type Membership = { class_id: string; student_id: string }

export type Risk = 'high' | 'medium' | 'ok'

export type StudentInsight = {
  id: string
  full_name: string
  grade: number | null
  group_name: string | null
  classes: string[]
  rating: number
  /** Келу пайызы (себептісіз) соңғы 30 күнде; белгі жоқ болса — null */
  rate: number | null
  /** Соңғы 14 күн мен оның алдындағы 14 күннің айырмасы (пайыздық тармақ) */
  trend: number | null
  present: number
  late: number
  absent: number
  excused: number
  /** Қатарынан келмеген сабақ саны (ең соңғы белгілерден бастап) */
  absentStreak: number
  lastPresent: string | null
  payment: PaymentStatus
  risk: Risk
  reasons: string[]
}

export type ClassInsight = {
  id: string
  name: string
  subject: string | null
  students: number
  rate: number | null
  atRisk: number
  unmarked: string[]
}

export type Alert = { level: 'high' | 'medium' | 'info'; kind: 'absence' | 'attendance' | 'payment' | 'journal' | 'trend'; text: string; studentId?: string; classId?: string }

export type Overview = {
  today: string
  totals: { students: number; classes: number; rate: number | null; atRisk: number; alerts: number }
  classes: ClassInsight[]
  students: StudentInsight[]
  alerts: Alert[]
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null)

/** ISO күннің апта күні: 1 = дүйсенбі … 7 = жексенбі */
export function weekday(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`).getUTCDay()
  return d === 0 ? 7 : d
}

function rateOf(rows: InsightAtt[]) {
  const counted = rows.filter((r) => r.status !== 'excused')
  return pct(counted.filter((r) => r.status === 'present' || r.status === 'late').length, counted.length)
}

export function buildOverview(input: {
  today: string
  classes: InsightClass[]
  members: Membership[]
  students: InsightStudent[]
  attendance: InsightAtt[]
  lessons: InsightLesson[]
}): Overview {
  const { today, classes, members, students, attendance, lessons } = input
  const from = addDays(today, -WINDOW_DAYS + 1)
  const mid = addDays(today, -13)
  const att = attendance.filter((a) => a.date >= from && a.date <= today)
  const classById = new Map(classes.map((c) => [c.id, c]))
  const active = students.filter((s) => s.status !== 'left')

  const studentInsights: StudentInsight[] = active.map((s) => {
    const rows = att.filter((a) => a.student_id === s.id).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    const count = (st: AttStatus) => rows.filter((r) => r.status === st).length
    const rate = rateOf(rows)
    const recent = rateOf(rows.filter((r) => r.date >= mid))
    const before = rateOf(rows.filter((r) => r.date < mid))
    const trend = recent != null && before != null ? recent - before : null

    let absentStreak = 0
    for (const r of rows) {
      if (r.status === 'excused') continue
      if (r.status === 'absent') absentStreak++
      else break
    }
    const lastPresent = rows.find((r) => r.status === 'present' || r.status === 'late')?.date ?? null
    const payment = paymentStatus(s.payment_deadline, today)

    const reasons: string[] = []
    let risk: Risk = 'ok'
    const raise = (lvl: Risk, why: string) => {
      reasons.push(why)
      if (lvl === 'high' || risk === 'ok') risk = lvl
    }
    if (absentStreak >= 2) raise('high', `Қатарынан ${absentStreak} сабаққа келмеді`)
    if (rate != null && rate < 60) raise('high', `Қатысу ${rate}%`)
    else if (rate != null && rate < 80) raise('medium', `Қатысу ${rate}%`)
    if (count('late') >= 3) raise('medium', `${count('late')} рет кешікті`)
    if (trend != null && trend <= -20) raise('medium', `Қатысу ${Math.abs(trend)}%-ға төмендеді`)
    if (payment.kind === 'overdue') raise('high', `Төлем ${Math.abs(payment.days!)} күн кешікті`)

    const classNames = members
      .filter((m) => m.student_id === s.id)
      .map((m) => classById.get(m.class_id)?.name)
      .filter((n): n is string => !!n)

    return {
      id: s.id,
      full_name: s.full_name,
      grade: s.grade,
      group_name: s.group_name,
      classes: classNames,
      rating: s.rating_points ?? 0,
      rate,
      trend,
      present: count('present'),
      late: count('late'),
      absent: count('absent'),
      excused: count('excused'),
      absentStreak,
      lastPresent,
      payment,
      risk,
      reasons,
    }
  })

  const riskOrder: Record<Risk, number> = { high: 0, medium: 1, ok: 2 }
  studentInsights.sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk] || (a.rate ?? 101) - (b.rate ?? 101) || a.full_name.localeCompare(b.full_name, 'kk'))
  const insightById = new Map(studentInsights.map((s) => [s.id, s]))

  // Топтар: келу пайызы, қауіптегі оқушылар, соңғы 7 күндегі белгіленбеген сабақтар
  const classInsights: ClassInsight[] = classes
    .filter((c) => c.active)
    .map((c) => {
      const ids = members.filter((m) => m.class_id === c.id).map((m) => m.student_id).filter((id) => insightById.has(id))
      const unmarked: string[] = []
      if (ids.length) {
        for (let i = 7; i >= 1; i--) {
          const d = addDays(today, -i)
          const lesson = lessons.find((l) => l.class_id === c.id && l.date === d)
          const scheduled = lesson ? !lesson.cancelled : c.days.includes(weekday(d))
          if (scheduled && !attendance.some((a) => a.class_id === c.id && a.date === d)) unmarked.push(d)
        }
      }
      return {
        id: c.id,
        name: c.name,
        subject: c.subject,
        students: ids.length,
        rate: rateOf(att.filter((a) => a.class_id === c.id)),
        atRisk: ids.filter((id) => insightById.get(id)!.risk !== 'ok').length,
        unmarked,
      }
    })

  const alerts: Alert[] = []
  for (const s of studentInsights) {
    if (s.absentStreak >= 2) alerts.push({ level: 'high', kind: 'absence', studentId: s.id, text: `${s.full_name} қатарынан ${s.absentStreak} сабаққа келмеді — ата-анасымен хабарласыңыз` })
    else if (s.rate != null && s.rate < 60) alerts.push({ level: 'high', kind: 'attendance', studentId: s.id, text: `${s.full_name}: соңғы ${WINDOW_DAYS} күнде қатысу ${s.rate}%` })
    if (s.trend != null && s.trend <= -20) alerts.push({ level: 'medium', kind: 'trend', studentId: s.id, text: `${s.full_name}: соңғы 2 аптада қатысу ${Math.abs(s.trend)}%-ға төмендеді` })
    if (s.payment.kind === 'overdue') alerts.push({ level: 'medium', kind: 'payment', studentId: s.id, text: `${s.full_name}: төлем ${Math.abs(s.payment.days!)} күн кешікті` })
  }
  for (const c of classInsights) {
    if (c.unmarked.length) alerts.push({ level: 'info', kind: 'journal', classId: c.id, text: `«${c.name}»: ${c.unmarked.length} сабақтың қатысуы белгіленбеген (${c.unmarked.map((d) => d.slice(8, 10) + '.' + d.slice(5, 7)).join(', ')})` })
  }
  const lvl = { high: 0, medium: 1, info: 2 }
  alerts.sort((a, b) => lvl[a.level] - lvl[b.level])

  return {
    today,
    totals: {
      students: studentInsights.length,
      classes: classInsights.length,
      rate: rateOf(att.filter((a) => insightById.has(a.student_id))),
      atRisk: studentInsights.filter((s) => s.risk !== 'ok').length,
      alerts: alerts.length,
    },
    classes: classInsights,
    students: studentInsights,
    alerts,
  }
}
