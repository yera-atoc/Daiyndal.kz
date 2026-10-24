import type { Exam, Group, ScoreRow, Student, Submission } from '@/lib/bilimTest'
import type { HistPoint } from '@/lib/bilimTestForecast'

export type Resp = {
  groups: Group[]
  group: Group | null
  students: Student[]
  exams: { id: string; title: string; month: string }[]
  exam: Exam | null
  submissions: Submission[]
  previous: { id: string; month: string; title: string; scores: Record<string, ScoreRow> } | null
  histories: Record<string, HistPoint[]>
  error?: string
}

export async function post<T = any>(body: unknown): Promise<T> {
  const r = await fetch('/api/bilim-test/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const j = await r.json()
  if (!r.ok) throw new Error(j.error || 'Қате')
  return j
}

// Beles бренд түстері (логотиптен)
export const BRAND = {
  ink: '#000000',
  text: '#1B1F29',
  blue: '#2B6BF3',
  red: '#E5383B',
  paper: '#F5F7FB',
  line: '#E3E7F0',
  muted: '#6B7385',
  green: '#16A34A',
}
