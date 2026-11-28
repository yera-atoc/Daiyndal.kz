// XP: күнделікті еңбектен жиналатын тәжірибе. Деңгей XP бойынша өседі (күн сайын көрінетін өсім),
// ранг (E→S) — сынақ баллы бойынша (шеберлік). Таза функциялар.

export const XP = {
  dailyBase: 10, // күннің сұрақтарын тапсырғаны үшін
  perCorrect: 2, // әр дұрыс жауап
  drill: 40, // дайындық сынағының бір пәні
  examPer10: 1, // айлық сынақ: әр 10 балл → 1 XP (1500 → 150 XP)
  streakBonus: 10, // 3+ күн қатарынан: күніне қосымша
}

export type XpEvent = { day: string; xp: number; kind: 'daily' | 'drill' | 'exam' | 'streak' }

/** Lv → Lv+1 үшін керек XP: алғашқы деңгейлер тез, кейін баяулайды */
export const xpToNext = (level: number) => 100 + 20 * (level - 1)

export function xpLevel(total: number) {
  let level = 1
  let left = Math.max(0, Math.floor(total))
  while (left >= xpToNext(level)) {
    left -= xpToNext(level)
    level++
  }
  return { level, into: left, need: xpToNext(level) }
}

/** Аптаның дүйсенбісі (YYYY-MM-DD) */
export function weekStart(day: string) {
  const d = new Date(day + 'T00:00:00Z')
  const wd = d.getUTCDay() || 7
  return new Date(d.getTime() - (wd - 1) * 864e5).toISOString().slice(0, 10)
}

const prevDay = (day: string) => new Date(new Date(day + 'T00:00:00Z').getTime() - 864e5).toISOString().slice(0, 10)

/** Күнделікті сұрақтар + дайындық сынақтары + айлық сынақтар → XP оқиғалары */
export function xpEvents(input: {
  daily: { day: string; correct: number }[]
  drills: { day: string }[]
  exams: { day: string; total: number }[]
}): XpEvent[] {
  const ev: XpEvent[] = []
  const days = new Set(input.daily.map((d) => d.day))
  for (const d of input.daily) {
    ev.push({ day: d.day, kind: 'daily', xp: XP.dailyBase + XP.perCorrect * Math.max(0, d.correct) })
    // Серия: алдыңғы екі күн де тапсырылса — бонус
    const p1 = prevDay(d.day)
    if (days.has(p1) && days.has(prevDay(p1))) ev.push({ day: d.day, kind: 'streak', xp: XP.streakBonus })
  }
  for (const d of input.drills) ev.push({ day: d.day, kind: 'drill', xp: XP.drill })
  for (const e of input.exams) ev.push({ day: e.day, kind: 'exam', xp: Math.round((Math.max(0, e.total) / 10) * XP.examPer10) })
  return ev
}

export type XpSummary = { total: number; week: number; today: number; level: number; into: number; need: number }

export function xpSummary(events: XpEvent[], today: string): XpSummary {
  const ws = weekStart(today)
  const sum = (f: (e: XpEvent) => boolean) => events.filter(f).reduce((a, e) => a + e.xp, 0)
  const total = sum(() => true)
  return { total, week: sum((e) => e.day >= ws && e.day <= today), today: sum((e) => e.day === today), ...xpLevel(total) }
}

export type WeekRow = { place: number; name: string; me: boolean; xp: number }

/** Апталық XP рейтингі: әр дүйсенбіде нөлден басталады (тең XP — тең орын, 0 XP-лар соңында) */
export function weekBoard(rows: { name: string; me: boolean; xp: number }[]): WeekRow[] {
  const list = [...rows].sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name))
  return list.map((r) => ({ ...r, place: 1 + list.filter((x) => x.xp > r.xp).length }))
}
