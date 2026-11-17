// Оқушының серияларын, айлық мақсатын және белгілерін есептеу (клиент + сервер, құпия дерек жоқ).
import type { AttStatus } from './journal'
import type { HwMark } from './lesson'
import { markTrend } from './report'

export type StreakInput = {
  att: { classId: string; date: string; status: AttStatus }[]
  hw: { classId: string; date: string; mark: HwMark }[]
  marks: { classId: string; date: string; score: number; max: number }[]
  quiz: { score: number; total: number }[]
}
export type Badge = { id: string; icon: string; title: string; hint: string; earned: boolean; progress?: [number, number] }
export type Streaks = {
  att: number
  attBest: number
  hw: number
  hwBest: number
  month: { label: string; attended: number; held: number; hwDone: number; hwGiven: number }
  badges: Badge[]
  next: string | null
}

const STEPS = [5, 10, 20]
const order = <T extends { date: string; classId: string }>(xs: T[]) => [...xs].sort((a, b) => a.date.localeCompare(b.date) || a.classId.localeCompare(b.classId))

/** Ағымдағы және ең ұзын серия: ok — жалғастырады, skip — есептелмейді, басқасы — үзеді. */
function run<T>(xs: T[], kind: (x: T) => 'ok' | 'skip' | 'break'): { cur: number; best: number } {
  let cur = 0
  let best = 0
  for (const x of xs) {
    const k = kind(x)
    if (k === 'skip') continue
    cur = k === 'ok' ? cur + 1 : 0
    best = Math.max(best, cur)
  }
  return { cur, best }
}

const MONTHS = ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым', 'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан']

export function streaksOf(d: StreakInput, today: string): Streaks {
  const att = order(d.att)
  const hw = order(d.hw)
  const a = run(att, (x) => (x.status === 'excused' ? 'skip' : x.status === 'absent' ? 'break' : 'ok'))
  const h = run(hw, (x) => (x.mark === 'done' ? 'ok' : 'break'))

  const ym = today.slice(0, 7)
  const mAtt = att.filter((x) => x.date.startsWith(ym) && x.status !== 'excused')
  const mHw = hw.filter((x) => x.date.startsWith(ym))
  const month = {
    label: MONTHS[Number(ym.slice(5)) - 1],
    attended: mAtt.filter((x) => x.status !== 'absent').length,
    held: mAtt.length,
    hwDone: mHw.filter((x) => x.mark === 'done').length,
    hwGiven: mHw.length,
  }

  const lvl = (best: number) => STEPS.filter((s) => best >= s).length
  const nextStep = (best: number) => STEPS.find((s) => best < s) ?? null
  const byClass = new Map<string, { date: string; score: number; max: number }[]>()
  for (const m of d.marks) byClass.set(m.classId, [...(byClass.get(m.classId) ?? []), m])
  const growing = Array.from(byClass.values()).some((ms) => (markTrend(ms) ?? 0) >= 0.15)
  const perfect = d.marks.some((m) => m.max > 0 && m.score >= m.max)
  const quiz100 = d.quiz.some((q) => q.total > 0 && q.score === q.total)
  const fullMonth = month.held >= 4 && month.attended === month.held

  const aNext = nextStep(a.best)
  const hNext = nextStep(h.best)
  const badges: Badge[] = [
    {
      id: 'att',
      icon: '📅',
      title: a.best >= 5 ? `${STEPS[lvl(a.best) - 1]} сабақ қатар` : 'Сабақ қалдырма',
      hint: aNext ? `${aNext} сабаққа қатарынан кел` : 'Ең жоғары деңгей!',
      earned: a.best >= 5,
      progress: aNext ? [Math.min(a.cur, aNext), aNext] : undefined,
    },
    {
      id: 'hw',
      icon: '📘',
      title: h.best >= 5 ? `${STEPS[lvl(h.best) - 1]} ҮТ қатар` : 'Үй тапсырмасы',
      hint: hNext ? `${hNext} үй тапсырмасын қатарынан толық орында` : 'Ең жоғары деңгей!',
      earned: h.best >= 5,
      progress: hNext ? [Math.min(h.cur, hNext), hNext] : undefined,
    },
    { id: 'month', icon: '🗓️', title: 'Толық ай', hint: 'Айдағы барлық сабаққа кел (кемі 4)', earned: fullMonth },
    { id: 'perfect', icon: '⭐', title: 'Үздік баға', hint: 'Сабақта ең жоғары баға ал', earned: perfect },
    { id: 'quiz', icon: '🎯', title: 'Тест шебері', hint: 'Сабақ тестін қатесіз тапсыр', earned: quiz100 },
    { id: 'grow', icon: '📈', title: 'Өсу', hint: 'Бағаларыңды көтер (соңғы сабақтарда)', earned: growing },
  ]

  // Ең жақын мақсат — бір сөйлеммен
  const gaps = [aNext && { left: aNext - a.cur, text: `Тағы ${aNext - a.cur} сабаққа қатарынан келсең — «${aNext} сабақ қатар» белгісі` }, hNext && { left: hNext - h.cur, text: `Тағы ${hNext - h.cur} үй тапсырмасын толық орындасаң — «${hNext} ҮТ қатар» белгісі` }].filter(
    (x): x is { left: number; text: string } => !!x && x.left > 0
  )
  gaps.sort((x, y) => x.left - y.left)

  return { att: a.cur, attBest: a.best, hw: h.cur, hwBest: h.best, month, badges, next: gaps[0]?.text ?? null }
}
