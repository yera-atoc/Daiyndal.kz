import { describe, expect, it } from 'vitest'
import { examDaily, pickExam, usableIndices } from '@/lib/examDaily'
import type { Exam } from '@/lib/bilimTest'

const sub = (id: string, name: string, n: number) => ({ id, name, short: name, max: 100, questions: n, options: 4 })
const qs = (n: number, withText = true) => Array.from({ length: n }, (_, i) => (withText ? { text: `Сұрақ ${i + 1}`, options: ['a', 'b', 'c', 'd'], passage: i % 5 === 0 ? `Мәтін ${i}` : undefined } : {}))
const key = (n: number) => Array.from({ length: n }, (_, i) => 'ABCD'[i % 4])

const exam: Exam = {
  id: '2026-10',
  group_id: 'nzm',
  month: '2026-10',
  title: 'Қазан сынағы',
  subjects: [sub('english', 'Ағылшын тілі', 20), sub('math', 'Математика', 40), sub('quant', 'Сандық сипаттама', 60), sub('science', 'Жаратылыстану', 20), sub('kazakh', 'Қазақ тілі', 20), sub('russian', 'Орыс тілі', 20)],
  open_subjects: [],
  answer_key: { english: key(20), math: key(40), quant: key(60), science: key(20), kazakh: key(20), russian: key(20) },
  questions: { english: qs(20) as any, math: qs(40) as any, quant: qs(60) as any, science: qs(20) as any, kazakh: qs(20) as any, russian: qs(20, false) as any },
  published: true,
}

describe('NISH daily from the October exam', () => {
  it('5 per subject, subjects in order, skips subjects without question content', () => {
    const d = examDaily(exam, '2026-11-04')
    expect(d).toHaveLength(25) // орыс тілінің мәтіні жоқ
    expect(Array.from(new Set(d.map((q) => q.section)))).toEqual(['Математика', 'Сандық сипаттама', 'Жаратылыстану', 'Ағылшын тілі', 'Қазақ тілі'])
    for (const q of d) {
      const [s, i] = q.id.split(':')
      expect(q.answer).toBe(exam.answer_key[s][+i])
    }
  })
  it('different questions on different days, nothing repeats until the subject pool is used up', () => {
    const a = examDaily(exam, '2026-11-04').map((q) => q.id)
    const b = examDaily(exam, '2026-11-05').map((q) => q.id)
    expect(a.filter((x) => b.includes(x))).toHaveLength(0)
    const seen = new Set<string>()
    for (let d = 0; d < 4; d++) examDaily(exam, new Date(Date.UTC(2026, 10, 1 + d)).toISOString().slice(0, 10)).filter((q) => q.id.startsWith('english')).forEach((q) => seen.add(q.id))
    expect(seen.size).toBe(20)
  })
  it('reading passage travels with later questions of the same text', () => {
    const q = examDaily(exam, '2026-11-04').find((x) => x.id.startsWith('english'))!
    expect(q.passage).toMatch(/Мәтін/)
  })
  it('picks the October exam, else the latest with content', () => {
    expect(pickExam([{ ...exam, id: '2026-09', month: '2026-09' }, exam, { ...exam, id: '2026-11', month: '2026-11' }])!.id).toBe('2026-10')
    expect(pickExam([{ ...exam, id: '2026-09', month: '2026-09' }])!.id).toBe('2026-09')
    expect(pickExam([{ ...exam, questions: {} }])).toBeNull()
    expect(usableIndices({ ...exam, questions: {} }, 'math')).toEqual([])
  })
})
