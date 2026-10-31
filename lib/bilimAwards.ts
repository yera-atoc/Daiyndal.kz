// Мадақтама: айдың үздік 3 оқушысы (тең балл — тең орын) және ең көп өскен оқушы.
import { commonDelta, examMax, ranking, type Exam, type ScoreRow, type Submission } from './bilimTest'

export type Award =
  | { kind: 'place'; name: string; place: number; total: number; max: number }
  | { kind: 'growth'; name: string; delta: number; total: number; max: number; prevTitle: string }

export function computeAwards(exam: Exam, subs: Submission[], names: string[], prev: { title: string; scores: Record<string, ScoreRow> } | null): Award[] {
  const allowed = new Set(names)
  const rk = ranking(exam, subs.filter((s) => allowed.has(s.student_name)))
  const max = examMax(exam)
  const total = (n: string) => Object.values(rk.scores[n] ?? {}).reduce<number>((a, v) => a + (typeof v === 'number' ? v : 0), 0)
  const out: Award[] = Object.entries(rk.place)
    .filter(([, p]) => p <= 3)
    .map(([name, place]) => ({ kind: 'place' as const, name, place, total: total(name), max }))
    .sort((a, b) => a.place - b.place || a.name.localeCompare(b.name))
  if (prev && rk.of >= 3) {
    let best: { name: string; delta: number } | null = null
    for (const name of Object.keys(rk.place)) {
      const d = commonDelta(rk.scores[name], prev.scores[name])
      if (d !== null && d > 0 && (!best || d > best.delta)) best = { name, delta: d }
    }
    if (best) out.push({ kind: 'growth', name: best.name, delta: best.delta, total: total(best.name), max, prevTitle: prev.title })
  }
  return out
}
