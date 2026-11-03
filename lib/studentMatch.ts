// Журналдан оқылған атты базадағы бар оқушымен сәйкестендіру (қолжазба қателеріне төзімді).

export type Existing = { id: string; full_name: string; grade: number | null; group_id: string | null; status?: string | null }
export type Candidate = { id: string; score: number }

const KZ: Record<string, string> = { ә: 'а', ғ: 'г', қ: 'к', ң: 'н', ө: 'о', ұ: 'у', ү: 'у', һ: 'х', і: 'и', ё: 'е', й: 'и', ъ: '', ь: '' }

export function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[?.,()]/g, ' ')
    .replace(/[әғқңөұүһіёйъь]/g, (c) => KZ[c] ?? c)
    .replace(/\s+/g, ' ')
    .trim()
}

export function similarity(a: string, b: string) {
  if (a === b) return 1
  if (!a || !b) return 0
  const m = a.length
  const n = b.length
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return 1 - prev[n] / Math.max(m, n)
}

/** Сөздер бойынша ұқсастық: журналдағы әр сөзге базадағы ең жақын сөз (рет маңызды емес — «Аты Тегі» не «Тегі Аты») */
export function nameScore(seed: string, full: string) {
  const a = norm(seed).split(' ').filter(Boolean)
  const b = norm(full).split(' ').filter(Boolean)
  if (!a.length || !b.length) return 0
  const used = new Set<number>()
  let sum = 0
  for (const w of a) {
    let best = 0
    let bi = -1
    b.forEach((x, i) => {
      if (used.has(i)) return
      const s = similarity(w, x)
      if (s > best) {
        best = s
        bi = i
      }
    })
    if (bi >= 0) used.add(bi)
    sum += best
  }
  return sum / a.length
}

/**
 * Үміткерлер (ең ұқсасы бірінші). Сынып сәйкес келсе — бонус, сынып белгілі және өзгеше болса — айып.
 * groupHint: журналдағы топқа ұқсас CRM тобындағы оқушыларға бонус.
 */
export function candidates(seed: string, grade: number | null, list: Existing[], groupHint?: Set<string>): Candidate[] {
  const words = norm(seed).split(' ').filter(Boolean).length
  const min = words >= 2 ? 0.72 : 0.8
  return list
    .filter((s) => s.status !== 'left')
    .map((s) => {
      let score = nameScore(seed, s.full_name)
      if (grade && s.grade) score += s.grade === grade ? 0.08 : -0.25
      if (groupHint && s.group_id && groupHint.has(s.group_id)) score += 0.1
      return { id: s.id, score }
    })
    .filter((c) => c.score >= min)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
}

/** Сенімді жалғыз сәйкестік бар ма: ең жақсысы жеткілікті жоғары әрі келесісінен анық озық */
export function confident(c: Candidate[]) {
  if (!c.length) return null
  const [a, b] = c
  if (a.score >= 0.9 && (!b || a.score - b.score >= 0.08)) return a.id
  return null
}
