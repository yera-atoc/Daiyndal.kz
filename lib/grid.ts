// Топ журналы (айлық кесте): ортақ типтер мен есептеу — клиент пен сервер.
import type { AttStatus } from './journal'
import type { HwMark } from './lesson'
import { HW } from './lesson'

export type GridCell = { a?: AttStatus; h?: HwMark; m?: number; q?: [number, number]; c?: string }
export type GridDate = { date: string; topic: string | null; homework: string | null; quiz: number }
export type GridSummary = { att: number | null; hw: number | null; mark: number | null; quiz: number | null; marks: number; absent: number }
export type GridView = {
  class: { id: string; name: string; subject: string | null; scale: number; teacher: string }
  month: string
  dates: GridDate[]
  students: { id: string; name: string }[]
  cells: Record<string, Record<string, GridCell>>
  summary: Record<string, GridSummary>
}

export const SCALES = [5, 10, 100] as const

export function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` }
}
export function shiftMonth(month: string, n: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return d.toISOString().slice(0, 7)
}
const MONTHS = ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым', 'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан']
export const monthLabel = (month: string) => `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : null)

/** Оқушының ай бойынша қорытындысы. Баға орташасы топ шкаласында (1 таңба үтірден кейін). */
export function summarize(cells: Record<string, GridCell>, scale: number): GridSummary {
  const v = Object.values(cells)
  const att = v.filter((c) => c.a)
  const counted = att.filter((c) => c.a !== 'excused')
  const hw = v.filter((c) => c.h)
  const marks = v.filter((c) => typeof c.m === 'number')
  const q = v.filter((c) => c.q)
  const qs = q.reduce((s, c) => s + c.q![0], 0)
  const qt = q.reduce((s, c) => s + c.q![1], 0)
  return {
    att: pct(counted.filter((c) => c.a === 'present' || c.a === 'late').length, counted.length),
    hw: hw.length ? Math.round((hw.reduce((s, c) => s + HW[c.h!].score, 0) / hw.length) * 100) : null,
    mark: marks.length ? Math.round((marks.reduce((s, c) => s + c.m!, 0) / marks.length) * 10) / 10 : null,
    quiz: pct(qs, qt),
    marks: marks.length,
    absent: att.filter((c) => c.a === 'absent').length,
  }
}

/** Бағаның түсі: шкаладағы үлесі бойынша */
export function markTone(m: number, scale: number) {
  const r = m / scale
  return r >= 0.85 ? { bg: '#DCFCE7', fg: '#15803D' } : r >= 0.65 ? { bg: '#E0F2FE', fg: '#0369A1' } : r >= 0.45 ? { bg: '#FEF3C7', fg: '#B45309' } : { bg: '#FEE2E2', fg: '#B91C1C' }
}
