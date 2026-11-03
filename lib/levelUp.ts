// НИШ «Менің деңгейім»: Level Up стиліндегі статтар. Таза функциялар — серверде де, тестте де қолданылады.
import { NIS_GRANT_2026, NIS_TOTAL } from './nisGrant'
import { DEFAULT_SUBJECTS } from './bilimTest'
import { NIS_TIPS } from './nisTips'

export const LEVEL_STEP = 50 // әр 50 балл — бір деңгей
export const MAX_LEVEL = NIS_TOTAL / LEVEL_STEP

export const RANKS: { id: string; min: number; title: string }[] = [
  { id: 'S', min: 1450, title: 'Шың' },
  { id: 'A', min: 1350, title: 'Үздік' },
  { id: 'B', min: 1200, title: 'Мықты' },
  { id: 'C', min: 1050, title: 'Грант аймағы' },
  { id: 'D', min: 750, title: 'Өсіп келеді' },
  { id: 'E', min: 0, title: 'Бастау' },
]

/** НИШ тобы ма (БИЛ емес) */
export const isNishGroup = (groupId: string, name?: string | null) => /^nzm/.test(groupId) || /(НЗМ|НИШ)/i.test(name ?? '')

export type MonthScores = { month: string; name: string; scores: Record<string, number | null>; maxes: Record<string, number> }
export type TopicRow = { subject: string; topic: string; correct: number; total: number }
export type DailyRow = { day: string; correct: number; total: number }

export type LevelUpInput = {
  months: MonthScores[] // ескісінен жаңасына
  topics: TopicRow[]
  daily: DailyRow[]
  streak: number
  today: string
  points?: Record<string, number> // стат ұпайлары: пән → салынған ұпай
  practiceToday?: string[] // бүгін дайындық сынағын тапсырған пәндер
}

export type SubjectStat = { id: string; name: string; score: number; max: number; pct: number; delta: number | null }
export type Growth = { id: string; name: string; topic: string | null; gain: number }
export type Skill = { subject: string; topic: string; level: number; pct: number }
export type Quest = { id: string; title: string; xp: number; done: boolean; kind?: 'penalty' | 'focus' }
export type Title = { id: string; name: string; hint: string; got: boolean }

export type LevelUp = {
  month: string
  monthName: string
  total: number
  max: number
  level: number
  toNext: number
  rank: { id: string; title: string; next: { id: string; need: number } | null }
  target: { name: string; min: number; gap: number }
  efficiency: number
  effDelta: number | null
  totalDelta: number | null
  accuracy: number | null // күнделікті сұрақтардың 30 күндік дұрыстығы
  subjects: SubjectStat[]
  growth: Growth[]
  skills: Skill[]
  quests: Quest[]
  xp: { got: number; of: number }
  streak: number
  tip: { subject: string; subjectName: string; text: string }
  points: { total: number; free: number; spent: Record<string, number>; focus: string | null }
  penalty: boolean
  titles: Title[]
}

const NAMES: Record<string, string> = Object.fromEntries(DEFAULT_SUBJECTS.map((s) => [s.id, s.name]))
const QUESTIONS: Record<string, number> = Object.fromEntries(DEFAULT_SUBJECTS.map((s) => [s.id, s.questions]))
const ORDER = ['math', 'quant', 'science', 'english', 'kazakh', 'russian']

export function levelOf(total: number) {
  const level = Math.min(MAX_LEVEL, Math.floor(Math.max(0, total) / LEVEL_STEP) + 1)
  const toNext = level >= MAX_LEVEL ? 0 : level * LEVEL_STEP - total
  return { level, toNext }
}

export function rankOf(total: number) {
  const i = RANKS.findIndex((r) => total >= r.min)
  const r = RANKS[i]
  const up = i > 0 ? RANKS[i - 1] : null
  return { id: r.id, title: r.title, next: up ? { id: up.id, need: up.min - total } : null }
}

/** Мақсат: әлі жетпеген ең жақын НЗМ гранты шегі (ең төменнен бастап), бәрі жетсе — ең жоғарғысы */
export function targetOf(total: number) {
  const schools = [...NIS_GRANT_2026].sort((a, b) => a.min - b.min)
  const s = schools.find((x) => x.min > total) ?? schools[schools.length - 1]
  return { name: s.name, min: s.min, gap: Math.max(0, s.min - total) }
}

/** Күнге байланысты тұрақты сан (бір күн ішінде өзгермейді) */
function daySeed(day: string) {
  let h = 0
  for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

export function buildLevelUp(input: LevelUpInput): LevelUp | null {
  const filled = input.months.filter((m) => ORDER.some((id) => typeof m.scores[id] === 'number'))
  const cur = filled[filled.length - 1]
  if (!cur) return null
  const prev = filled.length > 1 ? filled[filled.length - 2] : null

  const subjects: SubjectStat[] = ORDER.filter((id) => cur.maxes[id]).map((id) => {
    const max = cur.maxes[id]
    const score = typeof cur.scores[id] === 'number' ? (cur.scores[id] as number) : 0
    const p = prev && typeof prev.scores[id] === 'number' ? (prev.scores[id] as number) : null
    return { id, name: NAMES[id] ?? id, score, max, pct: Math.round((score / max) * 100), delta: p === null ? null : score - p }
  })
  const total = subjects.reduce((a, s) => a + s.score, 0)
  const max = subjects.reduce((a, s) => a + s.max, 0) || NIS_TOTAL
  const efficiency = Math.round((total / max) * 100)

  let totalDelta: number | null = null
  let effDelta: number | null = null
  if (prev) {
    const common = subjects.filter((s) => s.delta !== null)
    if (common.length) {
      totalDelta = common.reduce((a, s) => a + (s.delta as number), 0)
      const pTotal = common.reduce((a, s) => a + (prev.scores[s.id] as number), 0)
      const pMax = common.reduce((a, s) => a + (prev.maxes[s.id] ?? s.max), 0)
      const cTotal = common.reduce((a, s) => a + s.score, 0)
      const cMax = common.reduce((a, s) => a + s.max, 0)
      effDelta = Math.round((cTotal / cMax) * 100) - Math.round((pTotal / pMax) * 100)
    }
  }

  // Тақырыптар → дағды деңгейі 1–5
  const skills: Skill[] = input.topics
    .filter((t) => t.total > 0)
    .map((t) => {
      const pct = Math.round((t.correct / t.total) * 100)
      return { subject: t.subject, topic: t.topic, pct, level: Math.max(1, Math.min(5, Math.ceil((t.correct / t.total) * 5))) }
    })
    .sort((a, b) => a.level - b.level || a.pct - b.pct)

  // Өсім нүктелері: жоғалған баллдың жартысын бір айда қайтаруға болады деп есептейміз (бір сұрақтың құнына дөңгелектеп)
  const growth: Growth[] = subjects
    .map((s) => {
      const ppq = QUESTIONS[s.id] ? s.max / QUESTIONS[s.id] : 10
      const gain = Math.round(((s.max - s.score) * 0.5) / ppq) * ppq
      const weak = skills.find((k) => k.subject === s.id && k.level <= 3)
      return { id: s.id, name: s.name, topic: weak?.topic ?? null, gain, pct: s.pct }
    })
    .filter((g) => g.gain > 0)
    .sort((a, b) => b.gain - a.gain || a.pct - b.pct)
    .slice(0, 3)
    .map(({ pct: _p, ...g }) => g)

  // Күнделікті сұрақтар: бүгін және соңғы 30 күн
  const todayRow = input.daily.find((d) => d.day === input.today) ?? null
  const since = new Date(new Date(input.today + 'T00:00:00Z').getTime() - 29 * 864e5).toISOString().slice(0, 10)
  const recent = input.daily.filter((d) => d.day >= since && d.day <= input.today)
  const rc = recent.reduce((a, d) => a + d.correct, 0)
  const rt = recent.reduce((a, d) => a + d.total, 0)
  const accuracy = rt ? Math.round((rc / rt) * 100) : null

  const todayShare = todayRow && todayRow.total > 0 ? todayRow.correct / todayRow.total : 0
  const { level, toNext } = levelOf(total)

  // Стат ұпайлары: әр деңгей сайын 1 ұпай (Lv 1-де — 0). Ең көп ұпай салынған пән — фокус.
  const spent = Object.fromEntries(Object.entries(input.points ?? {}).filter(([id, n]) => ORDER.includes(id) && n > 0))
  const used = Object.values(spent).reduce((a, n) => a + n, 0)
  const ptsTotal = level - 1
  const focus = Object.entries(spent).sort((a, b) => b[1] - a[1] || ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]))[0]?.[0] ?? null

  // Айыппұл: кеше күннің сұрақтары тапсырылмаса (бұрын тапсырып жүрген оқушыға ғана)
  const yesterday = new Date(new Date(input.today + 'T00:00:00Z').getTime() - 864e5).toISOString().slice(0, 10)
  const penalty = input.daily.some((d) => d.day < yesterday) && !input.daily.some((d) => d.day === yesterday)

  const quests: Quest[] = [
    ...(penalty ? [{ id: 'penalty', title: 'Айыппұл квесті: кеше квест орындалмады. Бүгін күннің сұрақтарын 90 %-дан жоғары орында', xp: 0, done: todayShare >= 0.9, kind: 'penalty' as const }] : []),
    { id: 'daily', title: 'Күннің сұрақтарын тапсыр', xp: 50, done: !!todayRow },
    { id: 'accuracy', title: 'Бүгін 80 %-дан жоғары дұрыс', xp: 30, done: todayShare >= 0.8 },
    { id: 'streak', title: 'Серияны үзбе: 3 күн қатарынан', xp: 20, done: input.streak >= 3 },
    ...(focus ? [{ id: 'focus', title: `Фокус-квест: ${NAMES[focus] ?? focus} бойынша дайындық сынағын тапсыр`, xp: 40, done: (input.practiceToday ?? []).includes(focus), kind: 'focus' as const }] : []),
  ]
  const xp = { got: quests.filter((q) => q.done).reduce((a, q) => a + q.xp, 0), of: quests.reduce((a, q) => a + q.xp, 0) }

  // Бүгінгі лайфхак: ең әлсіз пәннен, күн сайын басқасы
  const weakest = [...subjects].sort((a, b) => a.pct - b.pct)[0]
  const tips = NIS_TIPS.find((t) => t.id === weakest?.id)?.hacks ?? NIS_TIPS[0].hacks
  const tip = { subject: weakest?.id ?? 'math', subjectName: weakest?.name ?? 'Математика', text: tips[daySeed(input.today) % tips.length] }

  return {
    month: cur.month,
    monthName: cur.name,
    total,
    max,
    level,
    toNext,
    rank: rankOf(total),
    target: targetOf(total),
    efficiency,
    effDelta,
    totalDelta,
    accuracy,
    subjects,
    growth,
    skills: skills.slice(0, 12),
    quests,
    xp,
    streak: input.streak,
    tip,
    points: { total: ptsTotal, free: Math.max(0, ptsTotal - used), spent, focus },
    penalty,
    titles: titlesFor({ subjects, streak: input.streak, totalDelta, total, accuracy }),
  }
}

/** Атақтар: нәтижеден есептеледі (алынбағаны сұр түспен, шартымен көрсетіледі) */
export function titlesFor(x: { subjects: SubjectStat[]; streak: number; totalDelta: number | null; total: number; accuracy: number | null }): Title[] {
  const pct = (id: string) => x.subjects.find((s) => s.id === id)?.pct ?? 0
  return [
    { id: 'math', name: 'Математика шебері', hint: 'Математикадан 85 %+', got: pct('math') >= 85 },
    { id: 'quant', name: 'Сандық шебері', hint: 'Сандық сипаттамадан 85 %+', got: pct('quant') >= 85 },
    { id: 'lang', name: 'Үш тілді', hint: 'Үш тілдің әрқайсысынан 80 %+', got: ['kazakh', 'russian', 'english'].every((id) => pct(id) >= 80) },
    { id: 'science', name: 'Зерттеуші', hint: 'Жаратылыстанудан 85 %+', got: pct('science') >= 85 },
    { id: 'streak7', name: '7 күн тоқтамаған', hint: '7 күн қатарынан күннің сұрақтары', got: x.streak >= 7 },
    { id: 'streak30', name: 'Темір тәртіп', hint: '30 күн қатарынан', got: x.streak >= 30 },
    { id: 'jump', name: 'Секіріс', hint: 'Бір айда +100 балл', got: (x.totalDelta ?? 0) >= 100 },
    { id: 'sniper', name: 'Мерген', hint: 'Күнделікті дұрыстық 90 %+', got: (x.accuracy ?? 0) >= 90 },
    { id: 'grant', name: 'Грант аймағы', hint: '1050 балл және одан жоғары', got: x.total >= 1050 },
    { id: 'elite', name: 'Үздіктер қатары', hint: 'A ранг: 1350+', got: x.total >= 1350 },
  ]
}

/** Деңгей/ранг көтерілді ме: бұрын көрген күйімен салыстыру (бірінші кіргенде хабарлама жоқ) */
export function levelEvent(seen: { level: number; rank: string } | null, now: { level: number; rank: string }) {
  if (!seen || seen.level <= 0) return null
  const order = RANKS.map((r) => r.id).reverse() // E..S
  const rankUp = order.indexOf(now.rank) > order.indexOf(seen.rank)
  if (now.level <= seen.level && !rankUp) return null
  return { from: seen.level, to: now.level, rankFrom: seen.rank, rankTo: now.rank, rankUp }
}

export type BoardRow = { place: number; name: string; me: boolean; total: number; level: number; rank: string }

/** Топтың ранг рейтингі: бір айдың жалпы баллы бойынша (тең балл — тең орын) */
export function rankBoard(rows: { name: string; me: boolean; total: number | null | undefined }[]): BoardRow[] {
  const list = rows.filter((r): r is { name: string; me: boolean; total: number } => typeof r.total === 'number').sort((a, b) => b.total - a.total)
  return list.map((r) => ({
    place: 1 + list.filter((x) => x.total > r.total).length,
    name: r.name,
    me: r.me,
    total: r.total,
    level: levelOf(r.total).level,
    rank: rankOf(r.total).id,
  }))
}
