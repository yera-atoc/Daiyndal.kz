// Жеке нұсқа: әр оқушыға сұрақтардың реті мен жауап нұсқаларының реті әртүрлі (көшірмеу үшін).
// Нұсқа оқушының аты мен сынақтан анықталады (детерминистік): қағаздағы парақ, сайттағы жауап парағы
// және нәтиже беті бір нұсқаны көрсетеді. Базада жауаптар әрқашан «негізгі» ретпен сақталады.
import { LETTERS, type Exam, type Question, type Submission } from './bilimTest'

export type Variant = {
  order: number[] // жеке нөмір p → негізгі сұрақ индексі
  opts: number[][] // жеке нөмір p: көрсетілген k-нұсқа → негізгі нұсқа индексі
}

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffled(n: number, r: () => number) {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function variantFor(examId: string, subject: string, student: string, questions: number, options: number): Variant {
  const r = rng(hash(`${examId}|${subject}|${student.trim().toLowerCase()}`))
  const order = shuffled(questions, r)
  const opts = order.map(() => shuffled(options, r))
  return { order, opts }
}

export const isShuffled = (e: Pick<Exam, 'shuffle' | 'practice'>) => !!e.shuffle && !e.practice

export function examVariant(exam: Exam, subject: string, student: string): Variant | null {
  const s = exam.subjects.find((x) => x.id === subject)
  if (!s || !isShuffled(exam)) return null
  return variantFor(exam.id, subject, student, s.questions, s.options)
}

/** Оқушының жеке ретпен белгілегені → негізгі рет (сақтау үшін) */
export function toCanonical(personal: string[], v: Variant): string[] {
  const out = Array.from({ length: v.order.length }, () => '')
  v.order.forEach((orig, p) => {
    const k = LETTERS.indexOf(personal[p] ?? '')
    out[orig] = k >= 0 && v.opts[p][k] !== undefined ? LETTERS[v.opts[p][k]] : ''
  })
  return out
}

/** Негізгі рет → оқушының жеке реті (көрсету үшін) */
export function toPersonal(canonical: string[], v: Variant): string[] {
  return v.order.map((orig, p) => {
    const o = LETTERS.indexOf(canonical[orig] ?? '')
    const k = o >= 0 ? v.opts[p].indexOf(o) : -1
    return k >= 0 ? LETTERS[k] : ''
  })
}

/** Сұрақтар (мәтін, нұсқалар) жеке ретпен */
export function personalQuestions(qs: Question[] | undefined, v: Variant): Question[] {
  return v.order.map((orig, p) => {
    const q = qs?.[orig] ?? {}
    return { ...q, options: q.options ? v.opts[p].map((o) => q.options![o] ?? '') : undefined, passage: undefined }
  })
}

/** Бір оқушыға арналған сынақ көрінісі: сұрақтар, кілт және оның парақтары жеке ретпен */
export function personalizeFor(exam: Exam, subs: Submission[], student: string): { exam: Exam; subs: Submission[] } {
  if (!isShuffled(exam)) return { exam, subs }
  const e: Exam = { ...exam, answer_key: { ...exam.answer_key }, questions: { ...exam.questions } }
  for (const s of exam.subjects) {
    const v = examVariant(exam, s.id, student)!
    if (exam.answer_key[s.id]) e.answer_key[s.id] = toPersonal(exam.answer_key[s.id], v)
    if (exam.questions[s.id]) e.questions[s.id] = personalQuestions(exam.questions[s.id], v)
  }
  const out = subs.map((x) => {
    const v = x.student_name === student ? examVariant(exam, x.subject, student) : null
    return v ? { ...x, answers: toPersonal(x.answers, v) } : x
  })
  return { exam: e, subs: out }
}
