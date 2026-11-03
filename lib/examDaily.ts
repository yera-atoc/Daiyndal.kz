// НИШ (НЗМ) топтарына күнделікті сұрақтар: Білім тексеру сынағының (қазан) сұрақтарынан әр пәннен 5-тен.
// Күн сайын әртүрлі: әр пәннің сұрақтары өз ретімен қайталанбай өтеді, біткенде жаңа ретпен басталады.
import { LETTERS, type Exam } from './bilimTest'
import { dayIndex, pickIndices } from './daily'

export type DailyQ = { id: string; section: string; text: string; options: string[]; answer: string; topic: string; explain: string; image?: string; passage?: string }

/** Күнделікті сұрақтардағы пәндер реті (бар болса) */
export const NISH_SUBJECTS = ['math', 'quant', 'science', 'english', 'kazakh', 'russian']

function prevDay(day: string) {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Сұрақтың мазмұны бар ма (мәтін не сурет) және дұрыс жауабы белгілі ме */
export function usableIndices(exam: Exam, subject: string): number[] {
  const qs = exam.questions?.[subject] ?? []
  const key = exam.answer_key?.[subject] ?? []
  const out: number[] = []
  for (let i = 0; i < key.length; i++) {
    const q = qs[i]
    if (q && (q.text?.trim() || q.image) && /^[A-E]$/.test(key[i] ?? '')) out.push(i)
  }
  return out
}

/** Оқу мәтіні бір топ сұрақтың біріншісінде ғана тұрады — таңдалған сұраққа жақын алдыңғы мәтінді береміз */
function passageFor(exam: Exam, subject: string, i: number): string | undefined {
  const qs = exam.questions?.[subject] ?? []
  for (let j = i; j >= Math.max(0, i - 6); j--) if (qs[j]?.passage?.trim()) return qs[j]!.passage
  return undefined
}

export function examDaily(exam: Exam, day: string, perSubject = 5): DailyQ[] {
  const out: DailyQ[] = []
  const subjects = [...exam.subjects].sort((a, b) => {
    const ia = NISH_SUBJECTS.indexOf(a.id)
    const ib = NISH_SUBJECTS.indexOf(b.id)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })
  for (const s of subjects) {
    const pool = usableIndices(exam, s.id)
    if (!pool.length) continue
    const shift = hash(`${exam.id}:${s.id}`) % pool.length // пәндер бір-біріне ұқсамай ауысуы үшін
    const pick = (d: string) => pickIndices(d, pool.length, perSubject).map((k) => pool[(k + shift) % pool.length])
    // Қор біткенде жаңа айналым басталады — кешегі сұрақтар бүгін қайталанбасын
    const yesterday = new Set(pick(prevDay(day)))
    let picked = pick(day)
    if (pool.length >= perSubject * 2 && dayIndex(day) > 0) {
      const spare = pool.filter((i) => !yesterday.has(i) && !picked.includes(i))
      picked = picked.map((i) => (yesterday.has(i) ? spare.shift() ?? i : i))
    }
    picked.sort((a, b) => a - b)
    for (const i of picked) {
      const q = exam.questions[s.id][i]
      const n = Math.min(Math.max(s.options || 4, 2), LETTERS.length)
      const options = q.options?.length ? q.options.slice(0, n) : LETTERS.slice(0, n).map((l) => `${l} нұсқасы`)
      const answer = exam.answer_key[s.id][i]
      out.push({
        id: `${s.id}:${i}`,
        section: s.name,
        text: q.text?.trim() || 'Суреттегі тапсырманы орында',
        options,
        answer,
        image: q.image || undefined,
        passage: passageFor(exam, s.id, i),
        topic: `${s.short || s.name} · ${exam.title}, ${i + 1}-сұрақ${q.topic ? ` · ${q.topic}` : ''}`,
        explain: `Дұрыс жауап: ${answer}${q.options?.length ? ` — ${q.options[LETTERS.indexOf(answer)] ?? ''}` : ''}${q.topic ? `\nТақырып: ${q.topic}` : ''}`,
      })
    }
  }
  return out
}

/** Қай сынақтан аламыз: топтың қазан айындағы ресми сынағы; болмаса — сұрақтары бар ең соңғысы */
export function pickExam(exams: Exam[], month = '2026-10'): Exam | null {
  const withContent = exams.filter((e) => !e.practice && e.subjects.some((s) => usableIndices(e, s.id).length))
  return withContent.find((e) => e.month === month) ?? withContent[withContent.length - 1] ?? null
}
