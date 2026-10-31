// «Қатемен жұмыс»: жарияланған сынақтан оқушының қате / бос қалдырған сұрақтары (мәтіні бар пәндер ғана).
// Мәтін мен сурет топтың бірінші сұрағында ғана сақталады (1–4-сұрақтар т.с.с.), сондықтан алдыңғы сұрақтан аламыз.
import type { Exam, Question, Submission } from './bilimTest'

export type MistakeItem = {
  id: string // `${subject}:${index}`
  subject: string
  subjectName: string
  index: number // 0-ден
  question: Question
  passage?: string
  image?: string
  key: string
  given: string // '' — бос
  optionCount: number
}

export function collectMistakes(exam: Exam, subs: Submission[]): MistakeItem[] {
  const out: MistakeItem[] = []
  for (const s of exam.subjects) {
    const sub = subs.find((x) => x.subject === s.id)
    const key = exam.answer_key[s.id] ?? []
    const qs = exam.questions?.[s.id] ?? []
    if (!sub || !qs.some((q) => q?.text || q?.image)) continue
    let passage: string | undefined
    let image: string | undefined
    qs.forEach((q, i) => {
      if (q?.passage) {
        passage = q.passage
        image = q.image
      }
      const k = key[i]
      const a = sub.answers[i] ?? ''
      if (!k || a === k || !(q?.text || q?.image)) return
      out.push({
        id: `${s.id}:${i}`,
        subject: s.id,
        subjectName: s.name,
        index: i,
        question: q,
        passage: q.passage ?? passage,
        image: q.image ?? (q.passage ? undefined : image),
        key: k,
        given: a,
        optionCount: s.options,
      })
    })
  }
  return out
}
