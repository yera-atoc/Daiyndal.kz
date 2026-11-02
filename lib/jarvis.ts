// «Jarvis» — әкімшінің ақылды панелі: ортақ типтер және таза есептеулер (клиент пен сервер).

import { addDays } from './journal'
import { paymentStatus } from './payments'
import type { Overview, StudentInsight } from './teacherInsights'

export type JLevel = 'high' | 'medium' | 'info'
export type JAlert = { level: JLevel; area: 'payment' | 'student' | 'journal' | 'lead' | 'system' | 'teacher'; text: string; href?: string }

export type JTeacher = { id: string; name: string; subject: string | null; students: number; classes: number; rate: number | null; atRisk: number; unmarked: number }
export type JLesson = { time: string; end: string; title: string; teacher: string; room: string | null }

export type JarvisData = {
  today: string
  generatedAt: string
  kpi: {
    activeStudents: number
    paused: number
    revenueMonth: number
    revenuePrev: number
    revenueForecast: number
    debt: number
    overdue: number
    dueSoon: number
    attendance30: number | null
    attendancePrev30: number | null
    atRisk: number
    newLeads: number
    leads7: number
    conversion30: number | null
    lessonsToday: number
    errors24: number
    actions24: number
  }
  revenue6: { month: string; value: number }[]
  lessonsToday: JLesson[]
  teachers: JTeacher[]
  risk: Pick<StudentInsight, 'id' | 'full_name' | 'risk' | 'reasons' | 'rate' | 'classes'>[]
  alerts: JAlert[]
  briefing: string[]
  missing: string[]
}

export type RawPayment = { student_id: string | null; amount: number | null; paid_on: string }
export type RawCrmAtt = { student_id: string; date: string; present: boolean; excused: boolean | null }
export type RawLead = { created_at: string; status: string; source: string; child_name: string }
export type RawStudent = { id: string; full_name: string; status: string | null; payment_deadline: string | null; payment_amount: number | null; teacher_id: string | null }

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null)
const fmtMoney = (n: number) => `${n.toLocaleString('ru-RU')} ₸`

export function daysInMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

export function attRate(rows: RawCrmAtt[], from: string, to: string) {
  const r = rows.filter((a) => a.date >= from && a.date <= to && !a.excused)
  return pct(r.filter((a) => a.present).length, r.length)
}

/** Ай соңына дейінгі болжам: түскен ақша + осы айда мерзімі келетін (әлі төленбеген) белсенді оқушылардың төлемі */
export function forecastRevenue(today: string, received: number, students: RawStudent[]) {
  const monthEnd = `${today.slice(0, 7)}-${String(daysInMonth(today.slice(0, 7))).padStart(2, '0')}`
  const expected = students
    .filter((s) => (s.status ?? 'active') === 'active' && s.payment_deadline && s.payment_deadline <= monthEnd)
    .reduce((a, s) => a + (s.payment_amount ?? 0), 0)
  return received + expected
}

export function buildJarvis(input: {
  today: string
  now: string
  students: RawStudent[]
  teachers: { id: string; name: string; subject: string | null }[]
  classTeacher: Record<string, string>
  payments: RawPayment[]
  crmAttendance: RawCrmAtt[]
  leads: RawLead[]
  errors24: { source: string; message: string }[]
  actions24: number
  lessonsToday: JLesson[]
  overview: Overview
  missing: string[]
}): JarvisData {
  const { today, students, payments, crmAttendance, leads, overview } = input
  const month = today.slice(0, 7)
  const prevMonth = addDays(`${month}-01`, -1).slice(0, 7)
  const sum = (ym: string) => payments.filter((p) => p.paid_on.startsWith(ym)).reduce((a, p) => a + (p.amount ?? 0), 0)

  const active = students.filter((s) => (s.status ?? 'active') === 'active')
  const pay = active.map((s) => ({ s, p: paymentStatus(s.payment_deadline, today) }))
  const overdue = pay.filter((x) => x.p.kind === 'overdue')
  const dueSoon = pay.filter((x) => x.p.kind === 'today' || x.p.kind === 'soon')
  const debt = overdue.reduce((a, x) => a + (x.s.payment_amount ?? 0), 0)

  const revenueMonth = sum(month)
  const months: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(`${month}-01T00:00:00Z`)
    d.setUTCMonth(d.getUTCMonth() - i)
    months.push(d.toISOString().slice(0, 7))
  }

  const from30 = addDays(today, -29)
  const attendance30 = attRate(crmAttendance, from30, today)
  const attendancePrev30 = attRate(crmAttendance, addDays(today, -59), addDays(today, -30))

  const since = (days: number) => new Date(Date.parse(input.now) - days * 86400000).toISOString()
  const newLeads = leads.filter((l) => l.status === 'new').length
  const leads7 = leads.filter((l) => l.created_at >= since(7)).length
  const leads30 = leads.filter((l) => l.created_at >= since(30))
  const conversion30 = pct(leads30.filter((l) => l.status === 'enrolled').length, leads30.length)

  const activeIds = new Set(active.map((s) => s.id))
  const riskStudents = overview.students.filter((s) => s.risk !== 'ok' && activeIds.has(s.id))

  // Мұғалімдер бойынша
  const teachers: JTeacher[] = input.teachers.map((t) => {
    const cls = overview.classes.filter((c) => input.classTeacher[c.id] === t.id)
    const names = new Set(cls.map((c) => c.name))
    const studs = overview.students.filter((s) => s.classes.some((n) => names.has(n)))
    const rated = cls.filter((c) => c.rate != null)
    return {
      id: t.id,
      name: t.name,
      subject: t.subject,
      students: new Set([...studs.map((s) => s.id), ...students.filter((s) => s.teacher_id === t.id && activeIds.has(s.id)).map((s) => s.id)]).size,
      classes: cls.length,
      rate: rated.length ? Math.round(rated.reduce((a, c) => a + (c.rate ?? 0), 0) / rated.length) : null,
      atRisk: studs.filter((s) => s.risk !== 'ok').length,
      unmarked: cls.reduce((a, c) => a + c.unmarked.length, 0),
    }
  })
  teachers.sort((a, b) => b.students - a.students || a.name.localeCompare(b.name, 'kk'))

  // Дабылдар
  const alerts: JAlert[] = []
  if (overdue.length) alerts.push({ level: overdue.length >= 5 ? 'high' : 'medium', area: 'payment', href: '/admin?view=payments', text: `${overdue.length} оқушының төлемі кешікті — жалпы қарыз ${fmtMoney(debt)}` })
  for (const s of riskStudents.filter((s) => s.risk === 'high').slice(0, 8)) {
    alerts.push({ level: 'high', area: 'student', href: '/admin?view=students', text: `${s.full_name}: ${s.reasons.join(', ')}` })
  }
  const mediumRisk = riskStudents.filter((s) => s.risk === 'medium').length
  if (mediumRisk) alerts.push({ level: 'medium', area: 'student', text: `Тағы ${mediumRisk} оқушының қатысуы төмендеп жүр` })
  for (const t of teachers.filter((t) => t.unmarked > 0)) {
    alerts.push({ level: 'info', area: 'teacher', href: '/admin?view=lessons', text: `${t.name}: ${t.unmarked} сабақтың қатысуы журналда белгіленбеген` })
  }
  if (newLeads) alerts.push({ level: newLeads >= 3 ? 'high' : 'medium', area: 'lead', href: '/admin?view=leads', text: `${newLeads} жаңа өтінім әлі өңделмеген — қоңырау шалыңыз` })
  if (input.errors24.length >= 5) alerts.push({ level: 'medium', area: 'system', text: `Соңғы 24 сағатта сайтта ${input.errors24.length} қате тіркелді (көбі: ${topSource(input.errors24)})` })
  if (dueSoon.length) alerts.push({ level: 'info', area: 'payment', href: '/admin?view=payments', text: `${dueSoon.length} оқушы 3 күн ішінде төлеуі керек` })
  if (input.missing.length) alerts.push({ level: 'info', area: 'system', text: `Дерекқорда кейбір кесте жоқ: ${input.missing.join(', ')}` })
  const order: Record<JLevel, number> = { high: 0, medium: 1, info: 2 }
  alerts.sort((a, b) => order[a.level] - order[b.level])

  const forecast = forecastRevenue(today, revenueMonth, students)

  // Таңғы брифинг
  const briefing: string[] = []
  briefing.push(`Бүгін ${input.lessonsToday.length ? `${input.lessonsToday.length} сабақ` : 'сабақ жоқ'}${input.lessonsToday[0] ? `, біріншісі ${input.lessonsToday[0].time}-де (${input.lessonsToday[0].title})` : ''}.`)
  briefing.push(`Осы айда ${fmtMoney(revenueMonth)} түсті, ай соңына болжам — ${fmtMoney(forecast)}.`)
  if (overdue.length) briefing.push(`${overdue.length} оқушының төлемі кешікті, қарыз ${fmtMoney(debt)}.`)
  if (attendance30 != null) {
    const diff = attendancePrev30 != null ? attendance30 - attendancePrev30 : null
    briefing.push(`30 күндік қатысу ${attendance30}%${diff ? ` (${diff > 0 ? '+' : ''}${diff} алдыңғы айға қарағанда)` : ''}.`)
  }
  if (riskStudents.length) briefing.push(`${riskStudents.length} оқушыға назар керек.`)
  if (newLeads) briefing.push(`${newLeads} жаңа өтінім күтіп тұр.`)
  if (!alerts.some((a) => a.level === 'high')) briefing.push('Шұғыл мәселе жоқ.')

  return {
    today,
    generatedAt: input.now,
    kpi: {
      activeStudents: active.length,
      paused: students.filter((s) => s.status === 'paused').length,
      revenueMonth,
      revenuePrev: sum(prevMonth),
      revenueForecast: forecast,
      debt,
      overdue: overdue.length,
      dueSoon: dueSoon.length,
      attendance30,
      attendancePrev30,
      atRisk: riskStudents.length,
      newLeads,
      leads7,
      conversion30,
      lessonsToday: input.lessonsToday.length,
      errors24: input.errors24.length,
      actions24: input.actions24,
    },
    revenue6: months.map((m) => ({ month: m, value: sum(m) })),
    lessonsToday: input.lessonsToday,
    teachers,
    risk: riskStudents.slice(0, 30).map(({ id, full_name, risk, reasons, rate, classes }) => ({ id, full_name, risk, reasons, rate, classes })),
    alerts,
    briefing,
    missing: input.missing,
  }
}

function topSource(errs: { source: string }[]) {
  const c = new Map<string, number>()
  for (const e of errs) c.set(e.source, (c.get(e.source) ?? 0) + 1)
  return Array.from(c.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
}
