// Күннің 5 сұрағы: қай топқа қай сұрақтар қоры, бүгінгі сұрақтарды таңдау, қатарынан неше күн (streak).
// Таза функциялар — тесттерде тексеріледі.

export type DailyTrack = 'nzm' | 'ubt-math' | 'ubt-phys'

export const TRACK_NAMES: Record<DailyTrack, string> = {
  nzm: 'НЗМ: математика және логика',
  'ubt-math': 'ҰБТ: математика',
  'ubt-phys': 'ҰБТ: физика',
}

export const DAILY_COUNT = 5

export function dailyTrack(groupId: string | null | undefined): DailyTrack | null {
  if (!groupId) return null
  if (groupId === 'nzm' || groupId === 'nzm5') return 'nzm'
  if (groupId === 'ubt1') return 'ubt-math'
  if (/^phys\d+$/.test(groupId)) return 'ubt-phys'
  return null
}

const TZ = 5 * 3600e3 // Алматы
const EPOCH = Date.UTC(2026, 10, 1) // 2026-11-01

/** Алматы уақытымен күн: 'YYYY-MM-DD' */
export function dayKey(now: Date = new Date()): string {
  return new Date(now.getTime() + TZ).toISOString().slice(0, 10)
}

export function dayIndex(day: string): number {
  return Math.round((Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)) - EPOCH) / 86400e3)
}

function rng(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function perm(n: number, seed: number) {
  const r = rng(seed)
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Бүгінгі сұрақтардың қордағы реттік нөмірлері (0…n-1). Қор біткенше қайталанбайды, сосын жаңа ретпен басынан. */
export function pickIndices(day: string, n: number, count = DAILY_COUNT): number[] {
  if (n <= 0) return []
  const k = Math.min(count, n)
  const out: number[] = []
  let pos = Math.max(0, dayIndex(day)) * k
  while (out.length < k) {
    const cycle = Math.floor(pos / n)
    const idx = perm(n, 7919 * (cycle + 1))[pos % n]
    if (!out.includes(idx)) out.push(idx)
    pos++
  }
  return out
}

/** Қатарынан неше күн: бүгін немесе кеше аяқталатын тізбек */
export function streak(days: string[], today: string): number {
  const set = new Set(days)
  const t = dayIndex(today)
  let start = set.has(today) ? t : t - 1
  let n = 0
  const key = (i: number) => new Date(EPOCH + i * 86400e3).toISOString().slice(0, 10)
  while (set.has(key(start))) {
    n++
    start--
  }
  return n
}
