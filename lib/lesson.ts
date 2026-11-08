// «Бір экран — бір сабақ»: КТП, үй тапсырмасы, тест және прогресс. Ортақ (клиент + сервер), құпия дерек жоқ.
import type { AttStatus } from './journal'

export type PlanItem = { id: string; position: number; topic: string; homework: string | null }
export type HwMark = 'done' | 'partial' | 'none'
export type QuizQ = { q: string; options: string[]; correct: number }
export type PayInfo = { deadline: string | null; amount: number | null; kind: 'none' | 'overdue' | 'today' | 'soon' | 'ok'; days: number | null }
export type Progress = { att: number | null; hw: number | null; quiz: number | null; risk: 'high' | 'medium' | 'ok'; absStreak: number; hwStreak: number }

export type LessonStudent = { id: string; full_name: string; pay: PayInfo; progress: Progress }
export type LessonView = {
  class: { id: string; name: string; subject: string | null; days: number[]; teacher: string }
  date: string
  time: string | null
  students: LessonStudent[]
  lesson: { topic: string | null; homework: string | null; plan_id: string | null; cancelled: boolean } | null
  attendance: Record<string, AttStatus>
  homework: Record<string, HwMark>
  prev: { date: string; topic: string | null; homework: string | null } | null
  plan: (PlanItem & { done: boolean })[]
  next: PlanItem | null
  quiz: { id: string; topic: string; open: boolean; total: number; results: { student_id: string; score: number; total: number }[] } | null
  canPay: boolean
}

export type TodayItem = {
  classId: string
  name: string
  subject: string | null
  teacher: string
  teacherId: string
  time: string | null
  students: number
  marked: number
  topic: string | null
  done: boolean
  next: string | null
}

export const HW: Record<HwMark, { short: string; label: string; bg: string; fg: string; score: number }> = {
  done: { short: '✓', label: 'Орындады', bg: '#DCFCE7', fg: '#15803D', score: 1 },
  partial: { short: '½', label: 'Жартылай', bg: '#FEF3C7', fg: '#B45309', score: 0.5 },
  none: { short: '✕', label: 'Орындамады', bg: '#FEE2E2', fg: '#B91C1C', score: 0 },
}

const letters = (s: string) => (s.match(/[A-Za-zА-Яа-яӘәІіҢңҒғҮүҰұҚқӨөҺһЁё]/g) ?? []).length

/**
 * КТП мәтінін тақырыптарға бөлу. Word/Excel-ден көшірілген кесте де, жай тізім де болады:
 *  «1. Натурал сандар — №12, 14»  /  «1\tНатурал сандар\t2\tЖаттығу 5»  /  «Натурал сандар | үй: 12-бет»
 * Сағат саны (2–6) көрсетілсе, тақырып сонша сабаққа қайталанады: «… (1/2)», «… (2/2)».
 */
export function parsePlan(text: string): { topic: string; homework: string | null }[] {
  const out: { topic: string; homework: string | null }[] = []
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.trim()
    if (!line || letters(line) < 2) continue
    if (line.split(/\t| \| /).some((c) => /^(сабақтың |сабақ )?(тақырып|тақырыбы|тақырыптар|тема|тема урока)$/i.test(c.trim()))) continue // кестенің тақырып жолы
    let cells = line.includes('\t') ? line.split('\t') : line.includes(' | ') ? line.split(' | ') : [line]
    cells = cells.map((c) => c.trim())
    let hours = 1
    let topic = ''
    let homework: string | null = null
    if (cells.length > 1) {
      const ti = cells.reduce((best, c, i) => (letters(c) > letters(cells[best]) ? i : best), 0)
      topic = cells[ti]
      for (let i = ti + 1; i < cells.length; i++) {
        const c = cells[i]
        if (/^\d{1,2}$/.test(c) && hours === 1) hours = Number(c)
        else if (!homework && /[^\d\s.,:\/-]/.test(c) && !/^\d{1,2}[./]\d{1,2}([./]\d{2,4})?$/.test(c)) homework = c
      }
    } else {
      topic = line
      const m = topic.match(/\s+(?:—|–|-|\/\/)\s+(?:(?:үй|үй тапсырмасы|дз|д\/з|ҮТ)\s*[:.]?\s*)?(.+)$/i)
      if (m && /(?:үй|дз|д\/з|ҮТ|№|\bбет\b|стр|жатт|упр)/i.test(m[1])) {
        homework = m[1].trim()
        topic = topic.slice(0, m.index).trim()
      }
      const h = topic.match(/\s*\((\d)\s*(?:сағ|сағат|ч|час)\.?\)\s*$/i)
      if (h) {
        hours = Number(h[1])
        topic = topic.slice(0, h.index).trim()
      }
    }
    topic = topic.replace(/^(?:\d{1,3}\s*[.)\-–:]\s*|\d{1,3}\s+(?=[^\d\s]))/, '').replace(/^[•·\-–*]\s*/, '').trim()
    homework = homework ? homework.replace(/^(?:үй тапсырмасы|үй|дз|д\/з)\s*[:.]?\s*/i, '').trim() || null : null
    if (letters(topic) < 2) continue
    topic = topic.slice(0, 300)
    homework = homework ? homework.slice(0, 500) : null
    const n = hours >= 2 && hours <= 6 ? hours : 1
    for (let i = 1; i <= n; i++) out.push({ topic: n > 1 ? `${topic} (${i}/${n})` : topic, homework })
    if (out.length >= 400) break
  }
  return out
}

/** Келесі тақырып: соңғы өтілген тақырыптан кейінгісі (ештеңе өтілмесе — біріншісі) */
export function nextPlanItem<T extends { id: string; position: number }>(plan: T[], usedIds: (string | null | undefined)[]): T | null {
  const sorted = [...plan].sort((a, b) => a.position - b.position)
  const used = new Set(usedIds.filter(Boolean) as string[])
  let last = -1
  sorted.forEach((p, i) => {
    if (used.has(p.id)) last = i
  })
  return sorted[last + 1] ?? null
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : null)

/**
 * Оқушының прогресі (соңғы ~30 күн): қатысу %, үй тапсырмасы %, тест %; қатарынан келмеу және
 * қатарынан тапсырма орындамау. Деректер ескіден жаңаға қарай берілмесе де, ішінде сұрыпталады.
 */
export function progressOf(att: { date: string; status: AttStatus }[], hw: { date: string; mark: HwMark }[], quiz: { score: number; total: number }[]): Progress {
  const a = [...att].sort((x, y) => x.date.localeCompare(y.date))
  const h = [...hw].sort((x, y) => x.date.localeCompare(y.date))
  const attP = pct(a.filter((x) => x.status === 'present' || x.status === 'late').length, a.filter((x) => x.status !== 'excused').length)
  const hwP = h.length ? Math.round((h.reduce((s, x) => s + HW[x.mark].score, 0) / h.length) * 100) : null
  const qt = quiz.reduce((s, x) => s + x.total, 0)
  const quizP = pct(quiz.reduce((s, x) => s + x.score, 0), qt)
  let absStreak = 0
  for (let i = a.length - 1; i >= 0 && a[i].status === 'absent'; i--) absStreak++
  let hwStreak = 0
  for (let i = h.length - 1; i >= 0 && h[i].mark === 'none'; i--) hwStreak++
  const bad = [attP != null && attP < 70, hwP != null && hwP < 50, quizP != null && quizP < 50].filter(Boolean).length
  const risk: Progress['risk'] = absStreak >= 2 || hwStreak >= 3 || bad >= 2 ? 'high' : bad === 1 || absStreak === 1 || hwStreak === 2 ? 'medium' : 'ok'
  return { att: attP, hw: hwP, quiz: quizP, risk, absStreak, hwStreak }
}

/** Тест жауабын бағалау */
export function scoreQuiz(qs: QuizQ[], answers: unknown): { answers: number[]; score: number; total: number } {
  const arr = Array.isArray(answers) ? answers : []
  const ans = qs.map((_, i) => (Number.isInteger(arr[i]) && arr[i] >= 0 && arr[i] < 4 ? (arr[i] as number) : -1))
  return { answers: ans, score: qs.reduce((s, q, i) => s + (ans[i] === q.correct ? 1 : 0), 0), total: qs.length }
}

/** Ата-анаға WhatsApp мәтіндері */
export function parentText(kind: 'absent' | 'homework' | 'pay', student: string, extra?: { amount?: number | null; days?: number | null }) {
  const name = student.split(' ').slice(0, 2).join(' ')
  if (kind === 'absent') return `Сәлеметсіз бе! Beles education орталығынан жазып отырмыз. ${name} соңғы сабақтарға келмеді. Себебін айтып жібересіз бе? Рақмет!`
  if (kind === 'homework') return `Сәлеметсіз бе! Beles education. ${name} соңғы бірнеше үй тапсырмасын орындамай келді. Үйде бақылауға көмектесесіз бе? Рақмет!`
  const sum = extra?.amount ? ` (${extra.amount.toLocaleString('ru-RU')} ₸)` : ''
  return `Сәлеметсіз бе! Beles education. ${name} бойынша ай сайынғы төлем${sum} ${extra?.days && extra.days < 0 ? `${Math.abs(extra.days)} күн кешікті` : 'уақыты келді'}. Kaspi немесе орталыққа келіп төлеуге болады. Рақмет!`
}
