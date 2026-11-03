// Мұғалімдердің жұмысы: апталық есеп, еңбекақы, рейтинг, ескертулер. Таза есептеулер (тесттерде тексеріледі).
import { addDays } from './journal'

export type OpsTeacher = { id: string; name: string; subject: string | null; phone: string | null; lesson_rate: number | null }
export type OpsClass = { id: string; teacher_id: string; name: string; days: number[]; active: boolean }
export type OpsAtt = { class_id: string; student_id: string; date: string; status: 'present' | 'absent' | 'excused' | 'late' }
export type OpsLesson = { class_id: string; date: string; cancelled: boolean; topic: string | null; homework: string | null }
export type OpsMember = { class_id: string; student_id: string }
export type OpsStudent = { id: string; status: string | null }

export type TeacherReport = {
  id: string
  name: string
  subject: string | null
  phone: string | null
  rate: number | null
  classes: number
  students: number
  left: number
  scheduled: number // кесте бойынша болуы керек сабақтар (бүгінге дейін)
  held: number // қатысуы белгіленген сабақтар
  unmarked: { class: string; date: string }[]
  topics: number // тақырыбы жазылған сабақтар
  attendance: number | null // %
  journal: number | null // held / scheduled, %
  retention: number | null // қалған оқушылар, %
  pay: number | null // held × rate
  score: number | null // рейтинг 0–100
}

const wd = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`).getUTCDay()
  return d === 0 ? 7 : d
}
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null)

/** Кезеңдегі күндер [from, to] (to — бүгіннен аспайды) */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

export function teacherReports(input: {
  from: string
  to: string
  today: string
  teachers: OpsTeacher[]
  classes: OpsClass[]
  attendance: OpsAtt[]
  lessons: OpsLesson[]
  members: OpsMember[]
  students: OpsStudent[]
}): TeacherReport[] {
  const { from, today, teachers, classes, attendance, lessons, members, students } = input
  const to = input.to < today ? input.to : today
  const days = from <= to ? daysBetween(from, to) : []
  const status = new Map(students.map((s) => [s.id, s.status]))
  const marked = new Set(attendance.map((a) => `${a.class_id}|${a.date}`))
  const lessonAt = new Map(lessons.map((l) => [`${l.class_id}|${l.date}`, l]))

  const rows = teachers.map((t) => {
    const cls = classes.filter((c) => c.teacher_id === t.id && c.active)
    const ids = new Set(cls.map((c) => c.id))
    let scheduled = 0
    let held = 0
    let topics = 0
    const unmarked: { class: string; date: string }[] = []
    for (const c of cls) {
      for (const d of days) {
        const l = lessonAt.get(`${c.id}|${d}`)
        const isLesson = l ? !l.cancelled : c.days.includes(wd(d))
        const isMarked = marked.has(`${c.id}|${d}`)
        if (isLesson) scheduled++
        if (isMarked) {
          held++
          if (l?.topic?.trim()) topics++
        } else if (isLesson && d < today) unmarked.push({ class: c.name, date: d })
      }
    }
    const att = attendance.filter((a) => ids.has(a.class_id) && a.status !== 'excused')
    const attendancePct = pct(att.filter((a) => a.status === 'present' || a.status === 'late').length, att.length)
    const studs = Array.from(new Set(members.filter((m) => ids.has(m.class_id)).map((m) => m.student_id)))
    const left = studs.filter((id) => status.get(id) === 'left').length
    const retention = pct(studs.length - left, studs.length)
    const journal = scheduled ? Math.min(100, pct(held, scheduled)!) : null
    const parts = [
      [journal, 0.4],
      [attendancePct, 0.4],
      [retention, 0.2],
    ].filter(([v]) => v !== null) as [number, number][]
    const w = parts.reduce((a, [, k]) => a + k, 0)
    const score = w ? Math.round(parts.reduce((a, [v, k]) => a + v * k, 0) / w) : null
    return {
      id: t.id,
      name: t.name,
      subject: t.subject,
      phone: t.phone,
      rate: t.lesson_rate,
      classes: cls.length,
      students: studs.length - left,
      left,
      scheduled,
      held,
      unmarked: unmarked.sort((a, b) => a.date.localeCompare(b.date)),
      topics,
      attendance: attendancePct,
      journal,
      retention,
      pay: t.lesson_rate ? held * t.lesson_rate : null,
      score,
    }
  })
  return rows.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.name.localeCompare(b.name, 'kk'))
}

/** Аптаның дүйсенбісі */
export function weekStart(iso: string) {
  return addDays(iso, 1 - wd(iso))
}

export function monthRange(ym: string): [string, string] {
  const [y, m] = ym.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return [`${ym}-01`, `${ym}-${String(last).padStart(2, '0')}`]
}

const dm = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`
const money = (n: number) => `${n.toLocaleString('ru-RU')} ₸`

/** Мұғалімге апталық есеп (WhatsApp мәтіні) */
export function weeklyText(r: TeacherReport, from: string, to: string) {
  return [
    `Сәлеметсіз бе, ${r.name.split(' ')[0]}! Beles education — апталық есеп (${dm(from)}–${dm(to)}):`,
    `• Өткізілген сабақ: ${r.held}${r.scheduled ? ` / ${r.scheduled}` : ''}`,
    `• Оқушылар қатысуы: ${r.attendance ?? '—'}%`,
    `• Тақырыбы жазылған сабақ: ${r.topics}`,
    r.unmarked.length ? `• Журналда белгіленбеген: ${r.unmarked.map((u) => `${u.class} (${dm(u.date)})`).join(', ')}` : '• Журнал толық толтырылған ✓',
    r.score !== null ? `• Апталық көрсеткіш: ${r.score}/100` : '',
    'Рахмет, жұмысыңызға сәттілік!',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Кешкі ескерту мәтіні (тек белгіленбеген сабақ болса) */
export function reminderText(r: TeacherReport) {
  if (!r.unmarked.length) return null
  return `Сәлеметсіз бе, ${r.name.split(' ')[0]}! Beles education: сабақ журналында қатысу белгіленбеген — ${r.unmarked
    .slice(-6)
    .map((u) => `${u.class} (${dm(u.date)})`)
    .join(', ')}. Бүгін толтырып қоюыңызды сұраймыз. Рахмет!`
}

/** Айлық еңбекақы мәтіні */
export function payText(r: TeacherReport, ym: string) {
  return `Сәлеметсіз бе, ${r.name.split(' ')[0]}! Beles education: ${ym} айы бойынша журналдағы өткізілген сабақ — ${r.held}${r.rate ? `, бір сабақ ${money(r.rate)}, барлығы ${money(r.pay ?? 0)}` : ''}. Сұрағыңыз болса, жазыңыз.`
}
