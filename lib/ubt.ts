// ҰБТ сынағы: пәндер, комбинациялар, тапсырма түрлері және ресми бағалау ережелері.
// Құрылым: Қазақстан тарихы 20, Математикалық сауаттылық 10, Оқу сауаттылығы 10 (әрқайсысы 1 балл),
// бейіндік 2 пән × 40 тапсырма = 50 балл (1–25 бір жауапты, 26–30 контекстік — 1 балл;
// 31–35 сәйкестендіру, 36–40 бір/бірнеше жауапты — 2 балл). Барлығы 120 тапсырма, 140 балл, 240 минут.

export type UbtType = 'single' | 'context' | 'matching' | 'multiple'

export type UbtQ = {
  id: string
  type: UbtType
  text: string
  context?: string // контекстік тапсырманың мәтіні (бірнеше сұраққа ортақ)
  left?: string[] // сәйкестендіру: сол жақтағы 2 элемент
  options: string[] // жауап нұсқалары (4 немесе 6); сәйкестендіруде — оң жақ тізім
  answer?: number[] // дұрыс нұсқалардың индекстері; сәйкестендіруде [left1 → i, left2 → j]
}

export type UbtSubject = { key: string; name: string; questions: UbtQ[] }
export type UbtContent = { minutes: number; compulsory: UbtSubject[]; profile: UbtSubject[] }

export const UBT_SUBJECTS: Record<string, string> = {
  history_kz: 'Қазақстан тарихы',
  math_lit: 'Математикалық сауаттылық',
  read_lit: 'Оқу сауаттылығы',
  math: 'Математика',
  physics: 'Физика',
  informatics: 'Информатика',
  chemistry: 'Химия',
  biology: 'Биология',
  geography: 'География',
  world_history: 'Дүниежүзі тарихы',
  law: 'Құқық негіздері',
  english: 'Шет тілі (ағылшын)',
  kaz_lang: 'Қазақ тілі',
  kaz_lit: 'Қазақ әдебиеті',
  rus_lang: 'Русский язык',
  rus_lit: 'Русская литература',
}

export const UBT_COMBOS: [string, string][] = [
  ['math', 'physics'],
  ['math', 'informatics'],
  ['math', 'geography'],
  ['biology', 'chemistry'],
  ['biology', 'geography'],
  ['chemistry', 'physics'],
  ['world_history', 'geography'],
  ['world_history', 'law'],
  ['world_history', 'english'],
  ['geography', 'english'],
  ['kaz_lang', 'kaz_lit'],
  ['rus_lang', 'rus_lit'],
]
export const comboName = (c: [string, string] | string[] | undefined) => (c ? c.map((k) => UBT_SUBJECTS[k] ?? k).join(' – ') : '')
export const isCombo = (c: unknown): c is [string, string] => Array.isArray(c) && UBT_COMBOS.some(([a, b]) => a === c[0] && b === c[1])

/** Шекті балл: бейіндік пәндер мен тарих — 5, сауаттылықтар — 3 */
export const UBT_THRESHOLD: Record<string, number> = { history_kz: 5, math_lit: 3, read_lit: 3 }
export const thresholdOf = (key: string) => UBT_THRESHOLD[key] ?? 5

export const pointsOf = (q: UbtQ) => (q.type === 'matching' || q.type === 'multiple' ? 2 : 1)

/** Ресми ереже бойынша балл */
export function scoreQ(q: UbtQ, given: number[] | undefined): number {
  const ans = q.answer ?? []
  const g = (given ?? []).filter((x) => typeof x === 'number')
  if (q.type === 'single' || q.type === 'context') return g.length === 1 && g[0] === ans[0] ? 1 : 0
  if (q.type === 'matching') {
    // әр сол жақ элементке бір таңдау; екеуі дұрыс — 2, біреуі — 1
    const right = ans.filter((a, i) => g[i] === a).length
    return right === 2 ? 2 : right === 1 ? 1 : 0
  }
  // multiple: 1–3 дұрыс жауап
  const set = new Set(g.filter((x) => x >= 0))
  const right = ans.filter((a) => set.has(a)).length
  const wrong = Array.from(set).filter((x) => !ans.includes(x)).length
  const k = ans.length
  if (wrong >= 2 || right === 0) return 0
  if (right === k && wrong === 0) return 2
  if (k === 1) return right === 1 && wrong === 1 ? 1 : 0
  if (k === 2) return 1 // бір дұрыс; бір дұрыс + бір қате; екі дұрыс + бір қате
  // k === 3
  if (right >= 2) return 1
  return 0
}

export type UbtSubjectScore = { key: string; name: string; points: number; max: number; threshold: number; passed: boolean }
export type UbtScores = { combo: [string, string]; subjects: UbtSubjectScore[]; total: number; max: number; passed: boolean; band?: number | null }

export function subjectsFor(c: UbtContent, combo: [string, string]): UbtSubject[] {
  const prof = combo.map((k) => c.profile.find((s) => s.key === k)).filter(Boolean) as UbtSubject[]
  return [...c.compulsory, ...prof]
}

export function scoreUbt(c: UbtContent, combo: [string, string], answers: Record<string, number[]> | undefined): UbtScores {
  const subjects = subjectsFor(c, combo).map((s) => {
    const points = s.questions.reduce((n, q) => n + scoreQ(q, answers?.[q.id]), 0)
    const max = s.questions.reduce((n, q) => n + pointsOf(q), 0)
    const threshold = thresholdOf(s.key)
    return { key: s.key, name: s.name, points, max, threshold, passed: points >= threshold }
  })
  const total = subjects.reduce((n, s) => n + s.points, 0)
  return { combo, subjects, total, max: subjects.reduce((n, s) => n + s.max, 0), passed: subjects.every((s) => s.passed) }
}

/** Оқушыға жіберер алдында: тек таңдалған пәндер, дұрыс жауапсыз */
export function ubtForStudent(c: UbtContent, combo: [string, string] | undefined, withAnswers = false): UbtContent {
  const strip = (s: UbtSubject): UbtSubject => ({ ...s, questions: s.questions.map(({ answer, ...q }) => (withAnswers ? { ...q, answer } : q)) })
  return {
    minutes: c.minutes,
    compulsory: c.compulsory.map(strip),
    profile: combo ? c.profile.filter((s) => combo.includes(s.key)).map(strip) : [],
  }
}

export const LETTERS = 'ABCDEFGH'
