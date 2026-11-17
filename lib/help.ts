// «Көмек керек» тізімі: әр оқушының әр пәні бойынша себептер (клиент + сервер, құпия дерек жоқ).
import type { AttStatus } from './journal'
import { HW, type HwMark } from './lesson'
import { markTrend } from './report'

export type HelpTone = 'bad' | 'warn'
export type HelpReason = { tone: HelpTone; kind: 'absent' | 'attendance' | 'homework' | 'marks' | 'falling' | 'quiz'; text: string }
export type HelpInput = {
  att: { date: string; status: AttStatus }[]
  hw: { date: string; mark: HwMark }[]
  marks: { date: string; score: number; max: number }[]
  quiz: { score: number; total: number }[]
}
export type HelpClass = { classId: string; className: string; subject: string | null; teacher: string; reasons: HelpReason[] }
export type HelpStudent = {
  id: string
  name: string
  group: string | null
  score: number
  classes: HelpClass[]
  reportUrl: string
  wa: string | null
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : null)

/** Бір оқушының бір пәні бойынша себептер (соңғы ~30 күн). Бос массив — бәрі жақсы. */
export function helpReasons(d: HelpInput): HelpReason[] {
  const out: HelpReason[] = []
  const a = [...d.att].sort((x, y) => x.date.localeCompare(y.date))
  const counted = a.filter((x) => x.status !== 'excused')
  let absStreak = 0
  for (let i = a.length - 1; i >= 0 && a[i].status === 'absent'; i--) absStreak++
  const att = pct(counted.filter((x) => x.status !== 'absent').length, counted.length)
  if (absStreak >= 2) out.push({ tone: 'bad', kind: 'absent', text: `${absStreak} сабаққа қатарынан келмеді` })
  else if (att != null && counted.length >= 3 && att < 70) out.push({ tone: 'bad', kind: 'attendance', text: `қатысу ${att}% (${counted.length - counted.filter((x) => x.status !== 'absent').length} сабақ қалды)` })

  const h = [...d.hw].sort((x, y) => x.date.localeCompare(y.date))
  let hwStreak = 0
  for (let i = h.length - 1; i >= 0 && h[i].mark === 'none'; i--) hwStreak++
  const hw = h.length ? Math.round((h.reduce((s, x) => s + HW[x.mark].score, 0) / h.length) * 100) : null
  if (hwStreak >= 3) out.push({ tone: 'bad', kind: 'homework', text: `${hwStreak} үй тапсырмасын қатарынан орындамады` })
  else if (hw != null && h.length >= 3 && hw < 50) out.push({ tone: 'warn', kind: 'homework', text: `үй тапсырмасы ${hw}%` })

  const m = d.marks.filter((x) => x.max > 0)
  const mp = m.length ? Math.round((m.reduce((s, x) => s + x.score / x.max, 0) / m.length) * 100) : null
  const trend = markTrend(m)
  if (mp != null && m.length >= 2 && mp < 50) out.push({ tone: 'bad', kind: 'marks', text: `бағалары төмен (орташа ${mp}%)` })
  else if (trend != null && trend <= -0.15) out.push({ tone: 'warn', kind: 'falling', text: `бағасы төмендеп барады (${Math.round(trend * 100)}%)` })

  const qt = d.quiz.reduce((s, x) => s + x.total, 0)
  const qp = pct(d.quiz.reduce((s, x) => s + x.score, 0), qt)
  if (qp != null && d.quiz.length >= 2 && qp < 50) out.push({ tone: 'warn', kind: 'quiz', text: `сабақ тесттері ${qp}%` })
  return out
}

/** Тізімдегі реті: «қызыл» себеп — 3 ұпай, «сары» — 1. */
export const helpScore = (rs: HelpReason[]) => rs.reduce((s, r) => s + (r.tone === 'bad' ? 3 : 1), 0)

/** Ата-анаға нақты себеппен жазылған хабарлама + толық есептің сілтемесі. */
export function helpMessage(student: string, classes: Pick<HelpClass, 'subject' | 'className' | 'reasons'>[], url: string) {
  const name = student.split(' ').slice(0, 2).join(' ')
  const lines = classes.map((c) => `• ${c.subject || c.className}: ${c.reasons.map((r) => r.text).join(', ')}`)
  return [
    `Сәлеметсіз бе! Beles education.`,
    `${name} бойынша соңғы апталарда назар аударатын жайттар бар:`,
    ...lines,
    `Толық есеп: ${url}`,
    `Бірге шешейік — ыңғайлы уақытта хабарласыңызшы.`,
  ].join('\n')
}
