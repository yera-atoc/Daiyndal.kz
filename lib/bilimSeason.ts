// Оқу маусымы: айлар бойынша Білім тексеру сынақтары (Қыркүйек → Наурыз), рейтинг матрицасы
// және нағыз емтиханға дейінгі кері санақ. Таза функциялар — клиентте де, серверде де жұмыс істейді.
import { monthName, rowTotal, shortName, type ScoreRow, type SubjectConfig } from './bilimTest'

export type SeasonConfig = {
  months: string[] // маусымдағы айлар, 'YYYY-MM'
  examName: string
  examDate: string // ISO, Алматы уақыты
  examLabel: string
}

// НЗМ дайындық тобы: қыркүйектен наурызға дейін ай сайын сынақ, нағыз емтихан 27–28 наурыз 2027
export const SEASONS: Record<string, SeasonConfig> = {
  nzm: {
    months: ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03'],
    examName: 'НЗМ емтиханы',
    examDate: '2027-03-27T00:00:00+05:00',
    examLabel: '27–28 наурыз 2027',
  },
}

export function seasonFor(groupId: string | null | undefined): SeasonConfig | null {
  return (groupId && SEASONS[groupId]) || null
}

// ── Кері санақ ───────────────────────────────────────────

const TZ = 5 * 3600e3 // Қазақстан: UTC+5

export type Countdown = { months: number; days: number; hours: number; minutes: number; seconds: number; totalDays: number; done: boolean }

function daysInMonth(y: number, m0: number) {
  return new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate()
}

// «4 ай 26 күн»: күнтізбелік ай + қалған күн (Алматы уақытымен), сосын сағат/минут
export function countdown(now: Date, target: Date): Countdown {
  const ms = target.getTime() - now.getTime()
  if (ms <= 0) return { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, totalDays: 0, done: true }
  const a = new Date(now.getTime() + TZ)
  const b = new Date(target.getTime() + TZ)
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth())
  const anchorAt = (k: number) => {
    const y = a.getUTCFullYear() + Math.floor((a.getUTCMonth() + k) / 12)
    const m = (a.getUTCMonth() + k) % 12
    const d = Math.min(a.getUTCDate(), daysInMonth(y, m))
    return Date.UTC(y, m, d, a.getUTCHours(), a.getUTCMinutes(), a.getUTCSeconds(), a.getUTCMilliseconds())
  }
  while (months > 0 && anchorAt(months) > b.getTime()) months--
  let rest = b.getTime() - anchorAt(months)
  const days = Math.floor(rest / 86400e3)
  rest -= days * 86400e3
  const hours = Math.floor(rest / 3600e3)
  rest -= hours * 3600e3
  const minutes = Math.floor(rest / 60e3)
  const seconds = Math.floor((rest - minutes * 60e3) / 1000)
  return { months, days, hours, minutes, seconds, totalDays: Math.floor(ms / 86400e3), done: false }
}

// ── Маусым кестесі ───────────────────────────────────────

export type SeasonExamInput = {
  id: string
  month: string
  title: string
  subjects: SubjectConfig[]
  published: boolean
  open: boolean
  scores: Record<string, ScoreRow> // оқушы аты → пән баллдары
  submitted: string[] // кем дегенде бір пән тапсырғандар
}

export type SeasonInput = {
  months: string[]
  students: { id: string; full_name: string; legacy_scores: Record<string, ScoreRow> }[]
  exams: SeasonExamInput[]
  template: SubjectConfig[] // сайтқа дейінгі (Excel) айлардың пәндері
}

export type SeasonCell = { total: number; max: number; place: number; scores: ScoreRow }

export type SeasonMonth = {
  month: string
  name: string // «Қыркүйек»
  title: string
  examId: string | null
  kind: 'legacy' | 'exam' | 'none'
  shown: boolean // нәтижесі осы көрерменге көрінеді
  published: boolean
  open: boolean
  max: number | null
  of: number // нәтижесі бар оқушы саны
  subjects: { id: string; short: string; max: number }[]
}

export type SeasonRow = { id: string; name: string; me: boolean; cells: Record<string, SeasonCell | null> }

export type SeasonView = { months: SeasonMonth[]; rows: SeasonRow[]; mine?: Record<string, 'submitted' | null> }

function places(totals: { key: string; total: number }[]) {
  const sorted = [...totals].sort((a, b) => b.total - a.total)
  const out: Record<string, number> = {}
  for (const x of sorted) out[x.key] = 1 + sorted.filter((y) => y.total > x.total).length
  return out
}

// viewer: 'admin' — бәрі (жарияланбаған ай да), толық аттар; әйтпесе оқушы: тек жарияланған/қағаз айлар, басқалардың аты қысқа
export function buildSeason(input: SeasonInput, viewer: 'admin' | { id: string }): SeasonView {
  const admin = viewer === 'admin'
  const meId = admin ? null : viewer.id
  const allMonths = Array.from(new Set([...input.months, ...input.exams.map((e) => e.month)])).sort()
  const months: SeasonMonth[] = []
  const cellsBy: Record<string, Record<string, SeasonCell>> = {}

  for (const month of allMonths) {
    const exam = input.exams.find((e) => e.month === month) ?? null
    const name = monthName(month)
    const title = `${name} ${month.slice(0, 4)}`
    const row: Record<string, { total: number; max: number; scores: ScoreRow }> = {}
    let kind: SeasonMonth['kind'] = 'none'
    let subjects: SeasonMonth['subjects'] = []
    let max: number | null = null
    if (exam) {
      kind = 'exam'
      subjects = exam.subjects.map((s) => ({ id: s.id, short: s.short, max: s.max }))
      max = exam.subjects.reduce((a, s) => a + s.max, 0)
      for (const st of input.students) {
        const sc = exam.scores[st.full_name]
        const t = rowTotal(sc)
        if (t === null) continue
        row[st.id] = { total: t, scores: sc, max: max! }
      }
    } else {
      const withLegacy = input.students.filter((s) => rowTotal(s.legacy_scores?.[month]) !== null)
      if (withLegacy.length) {
        kind = 'legacy'
        const used = input.template.filter((t) => withLegacy.some((s) => typeof s.legacy_scores[month]?.[t.id] === 'number'))
        subjects = used.map((s) => ({ id: s.id, short: s.short, max: s.max }))
        max = used.reduce((a, s) => a + s.max, 0)
        for (const st of withLegacy) {
          const sc = st.legacy_scores[month]
          row[st.id] = { total: rowTotal(sc)!, scores: sc, max: used.filter((t) => typeof sc[t.id] === 'number').reduce((a, t) => a + t.max, 0) }
        }
      }
    }
    const shown = kind === 'legacy' || (kind === 'exam' && (admin || !!exam?.published))
    const pl = places(Object.entries(row).map(([key, v]) => ({ key, total: v.total })))
    cellsBy[month] = {}
    if (shown) for (const [id, v] of Object.entries(row)) cellsBy[month][id] = { ...v, place: pl[id] }
    months.push({
      month,
      name,
      title: exam?.title ?? title,
      examId: exam?.id ?? (kind === 'legacy' ? `legacy:${month}` : null),
      kind,
      shown,
      published: kind === 'legacy' || !!exam?.published,
      open: !!exam?.open,
      max,
      of: shown ? Object.keys(row).length : 0,
      subjects,
    })
  }

  const rows: SeasonRow[] = input.students
    .map((st) => ({
    id: st.id,
    name: admin || st.id === meId ? st.full_name : shortName(st.full_name),
    me: st.id === meId,
    cells: Object.fromEntries(months.map((m) => [m.month, cellsBy[m.month][st.id] ?? null])),
  }))
    // Оқушыға: ешбір нәтижесі жоқтар кестені толтырмасын (өзі әрқашан көрінеді)
    .filter((r) => admin || r.me || Object.values(r.cells).some(Boolean))
  // Реттеу: нәтижесі бар соңғы ай бойынша, сосын алдыңғылары
  const order = months.filter((m) => m.shown && m.of > 0).map((m) => m.month).reverse()
  rows.sort((a, b) => {
    for (const m of order) {
      const x = a.cells[m]?.total ?? -1
      const y = b.cells[m]?.total ?? -1
      if (x !== y) return y - x
    }
    return a.name.localeCompare(b.name)
  })

  const view: SeasonView = { months, rows }
  if (!admin) {
    const me = input.students.find((s) => s.id === meId)
    view.mine = Object.fromEntries(
      input.exams.map((e) => [e.month, me && e.submitted.includes(me.full_name) ? 'submitted' : null])
    )
  }
  return view
}
