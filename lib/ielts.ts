// IELTS mock: ортақ типтер, band кестелері, тексеру. Клиентте де, серверде де қолданылады (құпия жоқ).

// cloze — мәтін ішіндегі әріп толтыру (TOEFL Complete the Words), order — сөйлем құрау (TOEFL Build a Sentence)
export type QType = 'mcq' | 'tfng' | 'ynng' | 'gap' | 'matching' | 'cloze' | 'order'

export type QItem = {
  n: number // сұрақ нөмірі (1–40)
  prompt: string // gap үшін: «The bridge was built in ___»
  options?: string[] // mcq: ['A ...','B ...'] — тек осы сұраққа
  answer?: string // дұрыс жауап(тар): «1925 | nineteen twenty-five» — оқушыға жіберілмейді
}

export type QGroup = {
  type: QType
  instructions: string // «Choose the correct letter, A, B or C.» / «NO MORE THAN TWO WORDS»
  options?: string[] // matching: ортақ тізім ['A Coastal erosion', 'B ...']
  text?: string // cloze: абзац, ішінде [n] — n-сұрақтың орны
  items: QItem[]
}

export type ListeningPart = { title: string; groups: QGroup[] }
export type ReadingPassage = { title: string; text: string; groups: QGroup[] }
export type WritingTask = { prompt: string; image?: string; minWords: number }
// TOEFL: audios — әр сұрақтың аудиосы, hideText — мәтінді көрсетпеу (Listen and Repeat), limit — жазу ұзақтығы, с
export type SpeakingPart = { title: string; questions: string[]; cueCard?: string; audios?: string[]; hideText?: boolean; limit?: number }

export type IeltsContent = {
  listening?: { audio?: string; minutes: number; parts: ListeningPart[] }
  reading?: { minutes: number; passages: ReadingPassage[] }
  writing?: { minutes: number; task1: WritingTask; task2: WritingTask; build?: QGroup[] }
  speaking?: { parts: SpeakingPart[] }
}

export type IeltsTest = {
  id: string
  teacher_id: string | null
  title: string
  exam?: Exam
  variant: 'academic' | 'general'
  mode: 'exam' | 'practice'
  content: IeltsContent
  published: boolean
  created_at?: string
  updated_at?: string
}

export type Exam = 'ielts' | 'toefl'
export const EXAM_NAME: Record<Exam, string> = { ielts: 'IELTS', toefl: 'TOEFL' }

export type Section = 'listening' | 'reading' | 'writing' | 'speaking'
export const SECTIONS: Section[] = ['listening', 'reading', 'writing', 'speaking']
export const SECTION_NAME: Record<Section, string> = {
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
}

export type AttemptState = {
  order: Section[] // осы тесттегі бөлімдер реті
  current: number // ағымдағы бөлім индексі; order.length — бәрі бітті
  startedAt: Partial<Record<Section, string>> // ISO
}

export type Criteria = Record<string, number | null>
type Raw = { raw: number; of: number; band: number | null }
export type Scores = {
  listening?: Raw
  reading?: Raw
  // IELTS: task1/task2 критерийлері; TOEFL: build (авто), email, discussion (1–6)
  writing?: { task1?: Criteria; task2?: Criteria; build?: Raw; email?: number | null; discussion?: number | null; band?: number | null }
  // IELTS: criteria; TOEFL: repeat, interview (1–6)
  speaking?: { criteria?: Criteria; repeat?: number | null; interview?: number | null; band?: number | null }
  overall?: number | null
}

export type Attempt = {
  id: string
  test_id: string
  student_id: string
  status: 'in_progress' | 'submitted' | 'graded'
  state: AttemptState
  answers: Partial<Record<'listening' | 'reading' | 'build', Record<string, string>>>
  writing: { task1?: string; task2?: string }
  speaking: Record<string, string>
  scores: Scores
  feedback: { writing?: string; speaking?: string; general?: string }
  published: boolean
  started_at: string
  submitted_at: string | null
  graded_at: string | null
}

export const WRITING_CRITERIA: [string, string][] = [
  ['ta', 'Task Achievement / Response'],
  ['cc', 'Coherence & Cohesion'],
  ['lr', 'Lexical Resource'],
  ['gra', 'Grammatical Range & Accuracy'],
]
export const SPEAKING_CRITERIA: [string, string][] = [
  ['fc', 'Fluency & Coherence'],
  ['lr', 'Lexical Resource'],
  ['gra', 'Grammatical Range & Accuracy'],
  ['p', 'Pronunciation'],
]

export const DEFAULT_MINUTES = { listening: 32, reading: 60, writing: 60 }

// ── Band кестелері (40 сұрақ) ─────────────────────────────
// [ең аз дұрыс жауап, band]
const LISTENING: [number, number][] = [[39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5], [16, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [2, 2], [1, 1]]
const READING_AC: [number, number][] = [[39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [2, 2], [1, 1]]
const READING_GT: [number, number][] = [[40, 9], [39, 8.5], [37, 8], [36, 7.5], [34, 7], [32, 6.5], [30, 6], [27, 5.5], [23, 5], [19, 4.5], [15, 4], [12, 3.5], [9, 3], [6, 2.5], [3, 2], [1, 1]]

/** Дұрыс жауап саны → band. Сұрақ саны 40 болмаса, пропорциямен 40-қа келтіріледі. */
export function rawToBand(section: 'listening' | 'reading', raw: number, of: number, variant: 'academic' | 'general'): number | null {
  if (!of) return null
  const r40 = Math.round((raw / of) * 40)
  const table = section === 'listening' ? LISTENING : variant === 'general' ? READING_GT : READING_AC
  for (const [min, band] of table) if (r40 >= min) return band
  return 0
}

/** IELTS дөңгелектеуі: .25 → .5, .75 → келесі бүтін */
export function roundBand(x: number): number {
  const f = Math.floor(x)
  const d = x - f
  return d < 0.25 ? f : d < 0.75 ? f + 0.5 : f + 1
}

export function avgCriteria(c: Criteria | undefined): number | null {
  const v = Object.values(c ?? {}).filter((x): x is number => typeof x === 'number')
  return v.length === 4 ? v.reduce((a, b) => a + b, 0) / 4 : null
}

/** Writing: Task 2 екі есе салмақты, нәтиже ең жақын 0.5-ке дейін */
export function writingBand(w: Scores['writing']): number | null {
  const t1 = avgCriteria(w?.task1)
  const t2 = avgCriteria(w?.task2)
  if (t1 === null || t2 === null) return null
  return roundBand((t1 + 2 * t2) / 3)
}

export function speakingBand(s: Scores['speaking']): number | null {
  const a = avgCriteria(s?.criteria)
  return a === null ? null : roundBand(a)
}

export function overallBand(s: Scores, order: Section[]): number | null {
  const parts = order.map((sec) => (sec === 'listening' || sec === 'reading' ? s[sec]?.band : s[sec]?.band))
  if (parts.some((b) => typeof b !== 'number')) return null
  return roundBand((parts as number[]).reduce((a, b) => a + b, 0) / parts.length)
}

// ── Жауапты тексеру ──────────────────────────────────────

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[.,;:!?"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const TFNG: Record<string, string> = { t: 'true', true: 'true', f: 'false', false: 'false', ng: 'not given', 'not given': 'not given', y: 'yes', yes: 'yes', n: 'no', no: 'no' }

export function isCorrect(type: QType, given: string | undefined, answer: string | undefined): boolean {
  if (!given || !answer) return false
  const alts = answer.split(/\s*[|/]\s*/).map(norm).filter(Boolean)
  let g = norm(given)
  if (type === 'tfng' || type === 'ynng') {
    g = TFNG[g] ?? g
    return alts.map((a) => TFNG[a] ?? a).includes(g)
  }
  if (type === 'order') {
    const flat = (x: string) => x.replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim()
    return alts.map(flat).includes(flat(g))
  }
  if (type === 'mcq' || type === 'matching') {
    // Тек әріп/рим цифры салыстырылады: «B» = «b»
    const first = (x: string) => x.split(' ')[0]
    return alts.map(first).includes(first(g))
  }
  return alts.includes(g)
}

export function allItems(groups: QGroup[]) {
  return groups.flatMap((g) => g.items.map((it) => ({ ...it, type: g.type })))
}

export function sectionItems(content: IeltsContent, sec: 'listening' | 'reading' | 'build') {
  if (sec === 'build') return allItems(content.writing?.build ?? [])
  if (sec === 'listening') return allItems((content.listening?.parts ?? []).flatMap((p) => p.groups))
  return allItems((content.reading?.passages ?? []).flatMap((p) => p.groups))
}

export function scoreSection(content: IeltsContent, sec: 'listening' | 'reading' | 'build', answers: Record<string, string> | undefined, variant: 'academic' | 'general', exam: Exam = 'ielts') {
  const items = sectionItems(content, sec)
  const raw = items.filter((it) => isCorrect(it.type, answers?.[String(it.n)], it.answer)).length
  const band = exam === 'toefl' || sec === 'build' ? toeflBand(raw, items.length) : rawToBand(sec, raw, items.length, variant)
  return { raw, of: items.length, band }
}

/** Оқушыға жіберер алдында дұрыс жауаптарды алып тастау */
export function stripAnswers(c: IeltsContent): IeltsContent {
  const clean = (gs: QGroup[]) => gs.map((g) => ({ ...g, items: g.items.map(({ answer, ...rest }) => rest) }))
  return {
    ...c,
    listening: c.listening && { ...c.listening, parts: c.listening.parts.map((p) => ({ ...p, groups: clean(p.groups) })) },
    reading: c.reading && { ...c.reading, passages: c.reading.passages.map((p) => ({ ...p, groups: clean(p.groups) })) },
    writing: c.writing && { ...c.writing, ...(c.writing.build ? { build: clean(c.writing.build) } : {}) },
    speaking: c.speaking && { parts: c.speaking.parts.map((p) => (p.hideText ? { ...p, questions: p.questions.map(() => '') } : p)) },
  }
}

export function sectionsOf(c: IeltsContent): Section[] {
  return SECTIONS.filter((s) => {
    if (s === 'listening') return (c.listening?.parts ?? []).some((p) => p.groups.some((g) => g.items.length))
    if (s === 'reading') return (c.reading?.passages ?? []).some((p) => p.groups.some((g) => g.items.length))
    if (s === 'writing') return !!(c.writing?.task1?.prompt || c.writing?.task2?.prompt || c.writing?.build?.some((g) => g.items.length))
    return (c.speaking?.parts ?? []).some((p) => p.questions.length)
  })
}

export function sectionMinutes(c: IeltsContent, s: Section): number | null {
  if (s === 'listening') return c.listening?.minutes ?? DEFAULT_MINUTES.listening
  if (s === 'reading') return c.reading?.minutes ?? DEFAULT_MINUTES.reading
  if (s === 'writing') return c.writing?.minutes ?? DEFAULT_MINUTES.writing
  return null // Speaking: әр сұрақтың өз уақыты бар
}

export const wordCount = (t: string | undefined) => (t ?? '').trim().split(/\s+/).filter(Boolean).length

export function emptyContent(): IeltsContent {
  return {
    listening: {
      minutes: DEFAULT_MINUTES.listening,
      parts: [1, 2, 3, 4].map((i) => ({ title: `Part ${i}`, groups: [] })),
    },
    reading: {
      minutes: DEFAULT_MINUTES.reading,
      passages: [1, 2, 3].map((i) => ({ title: `Passage ${i}`, text: '', groups: [] })),
    },
    writing: {
      minutes: DEFAULT_MINUTES.writing,
      task1: { prompt: '', minWords: 150 },
      task2: { prompt: '', minWords: 250 },
    },
    speaking: {
      parts: [
        { title: 'Part 1 · Introduction and interview', questions: [] },
        { title: 'Part 2 · Long turn', questions: [], cueCard: '' },
        { title: 'Part 3 · Discussion', questions: [] },
      ],
    },
  }
}

// Speaking: жазу ұзақтығы (секунд) және Part 2 дайындық уақыты
export const SPEAK_LIMIT = { p1: 45, p2prep: 60, p2talk: 120, p3: 75 }

// ── TOEFL iBT (2026): 1–6 шкала ──────────────────────────
// Ресми кесте жарияланбаған (тест адаптивті), сондықтан дұрыс жауап пайызы бойынша шамамен.
const TOEFL_PCT: [number, number][] = [[95, 6], [89, 5.5], [82, 5], [74, 4.5], [65, 4], [56, 3.5], [47, 3], [38, 2.5], [28, 2], [18, 1.5]]
export function toeflBand(raw: number, of: number): number | null {
  if (!of) return null
  const pct = (raw / of) * 100
  for (const [min, b] of TOEFL_PCT) if (pct >= min) return b
  return 1
}
export const roundHalf = (x: number) => Math.round(x * 2) / 2
const avg = (xs: (number | null | undefined)[]) => (xs.every((x) => typeof x === 'number') && xs.length ? roundHalf((xs as number[]).reduce((a, b) => a + b, 0) / xs.length) : null)
export function toeflWritingBand(w: Scores['writing']): number | null {
  const parts: (number | null | undefined)[] = []
  if (w?.build) parts.push(w.build.band)
  parts.push(w?.email, w?.discussion)
  return avg(parts)
}
export const toeflSpeakingBand = (s: Scores['speaking']) => avg([s?.repeat, s?.interview])
export const toeflOverall = (s: Scores, order: Section[]) => avg(order.map((sec) => s[sec]?.band))
export const CEFR: Record<number, string> = { 6: 'C2', 5.5: 'C1+', 5: 'C1', 4.5: 'B2+', 4: 'B2', 3.5: 'B1+', 3: 'B1', 2.5: 'A2+', 2: 'A2', 1.5: 'A1+', 1: 'A1' }
export const TOEFL_DEFAULT_MINUTES = { listening: 29, reading: 30, writing: 23 }

export function emptyToeflContent(): IeltsContent {
  return {
    listening: { minutes: TOEFL_DEFAULT_MINUTES.listening, parts: ['Listen and Choose a Response', 'Listen to a Conversation', 'Listen to an Announcement', 'Listen to an Academic Talk'].map((title) => ({ title, groups: [] })) },
    reading: { minutes: TOEFL_DEFAULT_MINUTES.reading, passages: ['Complete the Words', 'Read in Daily Life', 'Read an Academic Passage'].map((title) => ({ title, text: '', groups: [] })) },
    writing: { minutes: TOEFL_DEFAULT_MINUTES.writing, task1: { prompt: '', minWords: 80 }, task2: { prompt: '', minWords: 100 }, build: [] },
    speaking: {
      parts: [
        { title: 'Listen and Repeat', questions: [], audios: [], hideText: true, limit: 12 },
        { title: 'Take an Interview', questions: [], audios: [], limit: 45 },
      ],
    },
  }
}
