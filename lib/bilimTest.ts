// Білім тексеру сынағы: ортақ типтер, бағалау. Топтар (НЗМ, 3–11 сыныптар) бірдей жүйемен жұмыс істейді.
// Бұл файлда құпия дерек жоқ — клиентте де, серверде де қолданылады.

export type SubjectId = string

export type SubjectConfig = {
  id: SubjectId
  name: string
  short: string
  max: number // пәннің максимал баллы
  questions: number // сұрақ саны
  options: number // жауап нұсқалары (4 = A–D, 5 = A–E)
}

// Бір сұрақтың мазмұны (міндетті емес): мәтіні, суреті, тақырыбы
export type Question = { text?: string; image?: string; topic?: string }

export type Group = {
  id: string
  name: string
  position: number
  subjects: SubjectConfig[] // жаңа айдың сынағына үлгі
}

export type Exam = {
  id: string // НЗМ: 'YYYY-MM', басқа топтар: '<топ>_YYYY-MM'
  group_id: string
  month: string // 'YYYY-MM'
  title: string
  subjects: SubjectConfig[]
  open_subjects: SubjectId[]
  answer_key: Record<SubjectId, string[]>
  questions: Record<SubjectId, Question[]>
  published: boolean // оқушылар нәтижесін көре ала ма
}

export type Submission = {
  id: string
  exam_id: string
  student_name: string
  subject: SubjectId
  answers: string[]
  submitted_at: string
}

// Бір оқушының бір айдағы пән баллдары (null — тапсырмаған)
export type ScoreRow = Record<SubjectId, number | null>

export const LETTERS = ['A', 'B', 'C', 'D', 'E']

// НЗМ тобының пәндері (үлгі)
export const DEFAULT_SUBJECTS: SubjectConfig[] = [
  { id: 'math', name: 'Математика', short: 'Математика', max: 400, questions: 40, options: 4 },
  { id: 'quant', name: 'Сандық сипаттама', short: 'Сандық сип.', max: 300, questions: 60, options: 4 },
  { id: 'science', name: 'Жаратылыстану', short: 'Жаратылыстану', max: 200, questions: 20, options: 4 },
  { id: 'kazakh', name: 'Қазақ тілі', short: 'Қазақ т.', max: 200, questions: 20, options: 4 },
  { id: 'russian', name: 'Орыс тілі', short: 'Орыс т.', max: 200, questions: 20, options: 4 },
  { id: 'english', name: 'Ағылшын тілі', short: 'Ағылшын т.', max: 200, questions: 20, options: 4 },
]

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/
export const GROUP_ID_RE = /^[a-z0-9-]{2,24}$/

export function examIdFor(groupId: string, month: string) {
  return groupId === 'nzm' ? month : `${groupId}_${month}`
}

// Рейтингте басқа оқушының аты қысқа: «Оразалы Ж.»
export function shortName(full: string) {
  const [a, b] = full.split(' ')
  return b ? `${a} ${b[0]}.` : a
}

// Осы сынақтың жалпы максимумы (пәндер бойынша)
export function examMax(exam: Exam): number {
  return exam.subjects.reduce((a, s) => a + s.max, 0)
}

// Алдыңғы айдың максимумы: сол айда болған пәндер ғана (қыркүйек = 1200)
export function prevMax(exam: Exam, row: ScoreRow | undefined): number {
  return row ? exam.subjects.filter((s) => s.id in row).reduce((a, s) => a + s.max, 0) : 0
}

export type Student = {
  id: string
  group_id: string
  full_name: string
  pin: string | null
  position: number
  // Сайтқа дейінгі айлардың баллдары: {"2026-09": {"math": 370, ...}}
  legacy_scores: Record<string, ScoreRow>
}

// Бастапқы тізім: bt_students кестесі бос болса, бір рет осыдан толтырылады.
// Кейін оқушыларды админ бетінен қосасыз / өзгертесіз.
const SEED_ROSTER: string[] = [
  'Оразалы Жанел',
  'Тамабай Ералы',
  'Әлихан Алдияр',
  'Серік Іңкар',
  'Өмірзақ Нұрасыл',
  'Көбейсін Жанайдар',
  'Қойлыбай Айғаным',
  'Жүсіпәлиева Ұлжан',
  'Оразалы Мүслім',
  'Кенес Дарын',
  'Оразалы Айша',
  'Ибраева Зере',
  'Бексентов Альтаир',
  'Мұрат Бекназар',
  'Әмірхан Інжу',
  'Азат Олжас',
  'Баймұхамбет Шыңғыс',
  'Хамитбек Мұстафа',
  // Қыркүйекте тапсырмағандар
  'Аружан Сұңғат',
  'Дәмелі Серікқызы',
  'Серік Батырлан',
  'Жаңбырбай Санжар',
]

// Сайтқа дейінгі нәтижелер (Excel кестесінен). Бос ұяшық = null.
type Row = [string, number | null, number | null, number | null, number | null, number | null]
const SEPT_ROWS: Row[] = [
  ['Оразалы Жанел', 370, 160, 160, 100, 140],
  ['Тамабай Ералы', 300, 140, 190, 90, 130],
  ['Әлихан Алдияр', 340, 150, 160, 100, 90],
  ['Серік Іңкар', 230, 150, 170, 90, 110],
  ['Өмірзақ Нұрасыл', 300, 160, 100, 130, 40],
  ['Көбейсін Жанайдар', 320, 140, 130, 60, 50],
  ['Қойлыбай Айғаным', 230, 100, 160, 90, 100],
  ['Жүсіпәлиева Ұлжан', 220, 130, 130, 190, null],
  ['Оразалы Мүслім', 230, 130, 110, 110, 60],
  ['Кенес Дарын', 190, 130, 90, 110, 100],
  ['Оразалы Айша', 160, 120, 120, 130, 80],
  ['Ибраева Зере', 170, 100, 110, 110, 100],
  ['Бексентов Альтаир', 150, 130, 100, 80, 70],
  ['Мұрат Бекназар', 170, 110, 110, 50, 70],
  ['Әмірхан Інжу', 110, 110, 80, 90, 80],
  ['Азат Олжас', 130, 120, 80, 60, 80],
  ['Баймұхамбет Шыңғыс', 90, 60, 90, 70, 110],
  ['Хамитбек Мұстафа', 130, 80, 60, 50, 60],
]

export const SEED_STUDENTS: Omit<Student, 'id' | 'pin' | 'group_id'>[] = SEED_ROSTER.map((full_name, i) => {
  const r = SEPT_ROWS.find((x) => x[0] === full_name)
  const legacy_scores: Record<string, ScoreRow> = {}
  if (r) legacy_scores['2026-09'] = { math: r[1], science: r[2], english: r[3], kazakh: r[4], russian: r[5] }
  return {
    full_name,
    position: i + 1,
    legacy_scores,
  }
})

export function cleanName(v: unknown): string {
  return String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, 80)
}

const MONTHS = [
  'Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым',
  'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан',
]

export function monthName(month: string): string {
  const m = Number(month.slice(5, 7))
  return MONTHS[m - 1] ?? month
}

export function examTitle(month: string): string {
  return `${monthName(month)} ${month.slice(0, 4)}`
}


// ── Бағалау ──────────────────────────────────────────────

export function pointsPerQuestion(s: SubjectConfig) {
  return s.questions > 0 ? s.max / s.questions : 0
}

export type Graded = {
  correct: number
  wrong: number[] // қате сұрақ нөмірлері (1-ден)
  blank: number[] // бос қалдырылған
  score: number
}

export function gradeSubject(
  s: SubjectConfig,
  key: string[] | undefined,
  answers: string[]
): Graded | null {
  if (!key || key.filter(Boolean).length === 0) return null
  let correct = 0
  const wrong: number[] = []
  const blank: number[] = []
  for (let i = 0; i < s.questions; i++) {
    const k = key[i]
    const a = answers[i] ?? ''
    if (!k) continue // кілті жоқ сұрақ есептелмейді
    if (!a) blank.push(i + 1)
    else if (a === k) correct++
    else wrong.push(i + 1)
  }
  return { correct, wrong, blank, score: Math.round(correct * pointsPerQuestion(s)) }
}

// Бір емтихан бойынша барлық оқушының баллдары
export function scoresForExam(exam: Exam, subs: Submission[]): Record<string, ScoreRow> {
  const out: Record<string, ScoreRow> = {}
  for (const sub of subs) {
    const cfg = exam.subjects.find((s) => s.id === sub.subject)
    if (!cfg) continue
    const g = gradeSubject(cfg, exam.answer_key[sub.subject], sub.answers)
    out[sub.student_name] ??= {}
    out[sub.student_name][sub.subject] = g ? g.score : null
  }
  return out
}

export function rowTotal(row: ScoreRow | undefined): number | null {
  if (!row) return null
  const vals = Object.values(row).filter((v): v is number => typeof v === 'number')
  return vals.length ? vals.reduce((a, b) => a + b, 0) : null
}

export function pct(v: number, max: number) {
  return max ? (v / max) * 100 : 0
}

export function fmtPct(v: number) {
  return v.toFixed(1).replace('.', ',') + ' %'
}

export function sign(n: number) {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0'
}

// Осы айдағы рейтинг: жалпы балл бойынша (тапсырғандар арасында)
export function ranking(exam: Exam, subs: Submission[]) {
  const scores = scoresForExam(exam, subs)
  const list = Object.entries(scores)
    .map(([name, row]) => ({ name, total: rowTotal(row) }))
    .filter((x): x is { name: string; total: number } => x.total !== null)
    .sort((a, b) => b.total - a.total)
  const place: Record<string, number> = {}
  list.forEach((x, i) => {
    // тең балл — тең орын
    place[x.name] = i > 0 && list[i - 1].total === x.total ? place[list[i - 1].name] : i + 1
  })
  return { place, of: list.length, scores }
}

// Өзгеріс: тек екі айда да тапсырылған пәндер бойынша (бір пәнді өткізіп алса, әділ болу үшін)
export function commonDelta(now: ScoreRow | undefined, prev: ScoreRow | undefined): number | null {
  if (!now || !prev) return null
  let d = 0
  let n = 0
  for (const id of Object.keys(now)) {
    const a = now[id]
    const b = prev[id]
    if (typeof a === 'number' && typeof b === 'number') {
      d += a - b
      n++
    }
  }
  return n ? d : null
}

// Тақырыптар бойынша нәтиже (сұрақтарға тақырып жазылған болса)
export function topicStats(
  s: SubjectConfig,
  key: string[] | undefined,
  answers: string[] | undefined,
  questions: Question[] | undefined
): { topic: string; correct: number; total: number }[] {
  const map = new Map<string, { correct: number; total: number }>()
  for (let i = 0; i < s.questions; i++) {
    const t = questions?.[i]?.topic?.trim()
    if (!t || !key?.[i]) continue
    const e = map.get(t) ?? { correct: 0, total: 0 }
    e.total++
    if (answers?.[i] && answers[i] === key[i]) e.correct++
    map.set(t, e)
  }
  return Array.from(map, ([topic, v]) => ({ topic, ...v }))
}

// Қайталау керек тақырыптар: 70 %-дан төмен орындалғандар, ең әлсізі бірінші
export function weakTopics(stats: { topic: string; correct: number; total: number }[]) {
  return stats
    .filter((t) => t.correct / t.total < 0.7)
    .sort((a, b) => a.correct / a.total - b.correct / b.total)
    .map((t) => t.topic)
}
