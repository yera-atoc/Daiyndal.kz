import { seasonFor } from './bilimSeason'
// Оң болжам: оқушы жүйелі дайындалса, келесі айларда нәтиже қалай өсуі мүмкін.
// Әдіс: әр пән бойынша әр айда «максимумға дейінгі қалған айырманың» бір бөлігі жабылады,
// оқушының өз өсу қарқыны жоғары болса — сол қарқын алынады. Нәтиже ешқашан төмендемейді.
import type { Exam, ScoreRow, SubjectConfig } from './bilimTest'

export type HistPoint = { month: string; title: string; scores: ScoreRow; total: number | null; max: number }

export type Forecast = {
  months: string[] // болжам айлары
  perSubject: Record<string, number[]>
  totals: number[]
  max: number
}

// Оқу жылының соңғы бақылау айы: маусым кестесінің соңғы айы (НЗМ 6 сынып — наурыз), басқа топтар — мамыр
export function endMonthFor(groupId: string, month: string): string | null {
  const y = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7))
  const last = seasonFor(groupId)?.months.at(-1)
  const endM = last ? Number(last.slice(5, 7)) : 5
  const endY = m >= 9 ? y + 1 : y
  const end = `${endY}-${String(endM).padStart(2, '0')}`
  return end > month ? end : null
}

export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = []
  let y = Number(from.slice(0, 4))
  let m = Number(from.slice(5, 7))
  for (let i = 0; i < 24; i++) {
    m++
    if (m > 12) {
      m = 1
      y++
    }
    const s = `${y}-${String(m).padStart(2, '0')}`
    if (s > to) break
    out.push(s)
  }
  return out
}

const round5 = (n: number) => Math.round(n / 5) * 5

function subjectPath(s: SubjectConfig, now: number, prev: number | null, steps: number): number[] {
  const ceiling = Math.floor((s.max * 0.95) / 5) * 5
  const trend = prev !== null ? Math.max(0, now - prev) : 0
  const out: number[] = []
  let cur = now
  for (let i = 0; i < steps; i++) {
    const gap = Math.max(0, ceiling - cur)
    const step = Math.max(gap * 0.2, Math.min(trend, gap * 0.35), Math.min(gap, s.max * 0.02))
    cur = Math.min(ceiling, Math.max(cur, round5(cur + step)))
    out.push(cur)
  }
  return out
}

export function buildForecast(exam: Exam, nowRow: ScoreRow, history: HistPoint[]): Forecast | null {
  const end = endMonthFor(exam.group_id, exam.month)
  if (!end) return null
  const months = monthsBetween(exam.month, end)
  if (!months.length) return null
  const before = history.filter((h) => h.month < exam.month).pop()
  const perSubject: Record<string, number[]> = {}
  for (const s of exam.subjects) {
    const now = nowRow[s.id]
    if (typeof now !== 'number') continue
    const p = before?.scores[s.id]
    perSubject[s.id] = subjectPath(s, now, typeof p === 'number' ? p : null, months.length)
  }
  if (!Object.keys(perSubject).length) return null
  const totals = months.map((_, i) => Object.values(perSubject).reduce((a, arr) => a + arr[i], 0))
  const max = exam.subjects.filter((s) => s.id in perSubject).reduce((a, s) => a + s.max, 0)
  return { months, perSubject, totals, max }
}
