// Прокторинг (камерасыз): тест кезіндегі оқиғалардан күдікті белгілерді есептеу. Таза функциялар — клиент пен сервер.

export type ProctorRaw = {
  startedAt: number
  endedAt: number
  questions: number // тесттегі сұрақ саны (белгісіз болса 0)
  leaves: { at: number; ms: number }[] // бетті жасырды / басқа терезеге өтті: қашан және қанша уақыт
  copy: number
  paste: number
  menu: number
  fsExit: number
  split: number // терезе кенет тарылды (экранды бөліп, қатар басқа қолданба ашу)
  marks: { i: string; t: number }[] // жауап берілген сәттер (тест басынан мс)
}

export type Risk = 'ok' | 'medium' | 'high'
export type ProctorFlag = { level: Exclude<Risk, 'ok'>; text: string }
export type ProctorStats = {
  minutes: number
  leaves: number
  awaySec: number
  answers: number
  avgSec: number | null
  fastShare: number | null
  afterReturn: number
}

const RETURN_WINDOW = 20_000 // қайтып оралған соң 20 секунд ішінде берілген жауап
const FAST_GAP = 3_000 // екі жауаптың арасы 3 секундтан аз

export function analyze(r: ProctorRaw): { risk: Risk; flags: ProctorFlag[]; stats: ProctorStats } {
  const flags: ProctorFlag[] = []
  const awayMs = r.leaves.reduce((a, l) => a + Math.max(0, l.ms), 0)
  const awaySec = Math.round(awayMs / 1000)
  const leaves = r.leaves.length

  if (leaves >= 3 || awayMs >= 60_000) flags.push({ level: 'high', text: `Тест бетінен ${leaves} рет шықты (барлығы ${fmtSec(awaySec)})` })
  else if (leaves > 0) flags.push({ level: 'medium', text: `Тест бетінен ${leaves} рет шықты (${fmtSec(awaySec)})` })

  if (r.paste > 0) flags.push({ level: 'high', text: `Мәтін қоюға (paste) ${r.paste} рет әрекет жасады` })
  if (r.copy >= 2) flags.push({ level: 'medium', text: `Сұрақты көшіруге ${r.copy} рет әрекет жасады` })
  else if (r.copy === 1) flags.push({ level: 'medium', text: 'Сұрақты көшіруге әрекет жасады' })
  if (r.split > 0) flags.push({ level: 'medium', text: 'Экранды бөліп, қатар басқа қолданба ашқан болуы мүмкін' })
  if (r.fsExit > 0) flags.push({ level: 'medium', text: `Толық экран режимінен ${r.fsExit} рет шықты` })

  // Жауап уақыттары
  const marks = [...r.marks].sort((a, b) => a.t - b.t)
  const firstPerQ = new Map<string, number>()
  for (const m of marks) if (!firstPerQ.has(m.i)) firstPerQ.set(m.i, m.t)
  const times = Array.from(firstPerQ.values()).sort((a, b) => a - b)
  const answers = times.length
  const gaps = times.slice(1).map((t, k) => t - times[k])
  const fast = gaps.filter((g) => g < FAST_GAP).length
  const fastShare = gaps.length ? fast / gaps.length : null
  const avgSec = answers ? Math.round((times[times.length - 1] ?? 0) / 1000 / answers) : null
  if (answers >= 10 && fastShare !== null && fastShare >= 0.4)
    flags.push({ level: 'medium', text: `Жауаптардың ${Math.round(fastShare * 100)}%-ы 3 секундтан жылдам берілді (оқымай белгілеген не дайын жауаптан көшірген болуы мүмкін)` })

  // Шығып, қайтып оралған соң бірден жауап беру — басқа жерден жауап іздеген белгісі
  const returns = r.leaves.map((l) => l.at + l.ms - r.startedAt)
  const afterReturn = Array.from(firstPerQ.values()).filter((t) => returns.some((back) => t >= back && t - back <= RETURN_WINDOW)).length
  if (afterReturn >= 3) flags.push({ level: 'high', text: `Беттен оралған соң ${afterReturn} сұраққа бірден (20 сек ішінде) жауап берді` })
  else if (afterReturn > 0) flags.push({ level: 'medium', text: `Беттен оралған соң ${afterReturn} сұраққа бірден жауап берді` })

  const risk: Risk = flags.some((f) => f.level === 'high') ? 'high' : flags.length ? 'medium' : 'ok'
  return {
    risk,
    flags,
    stats: { minutes: Math.max(0, Math.round((r.endedAt - r.startedAt) / 60000)), leaves, awaySec, answers, avgSec, fastShare: fastShare === null ? null : Math.round(fastShare * 100) / 100, afterReturn },
  }
}

export function fmtSec(s: number) {
  return s >= 60 ? `${Math.floor(s / 60)} мин ${s % 60} сек` : `${s} сек`
}

/** Серверге келген деректі тазалау (көлемін шектеу, түрлерін тексеру) */
export function sanitize(x: any): ProctorRaw | null {
  if (!x || typeof x !== 'object') return null
  const n = (v: unknown, max = 1e13) => (typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : 0)
  const startedAt = n(x.startedAt)
  const endedAt = n(x.endedAt)
  if (!startedAt || endedAt < startedAt) return null
  return {
    startedAt,
    endedAt,
    questions: n(x.questions, 1000),
    leaves: (Array.isArray(x.leaves) ? x.leaves : []).slice(0, 200).map((l: any) => ({ at: n(l?.at), ms: n(l?.ms, 6 * 3600e3) })),
    copy: n(x.copy, 1000),
    paste: n(x.paste, 1000),
    menu: n(x.menu, 1000),
    fsExit: n(x.fsExit, 1000),
    split: n(x.split, 1000),
    marks: (Array.isArray(x.marks) ? x.marks : []).slice(0, 600).map((m: any) => ({ i: String(m?.i ?? '').slice(0, 40), t: n(m?.t, 6 * 3600e3) })),
  }
}
