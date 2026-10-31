import { describe, expect, it } from 'vitest'
import { collectMistakes } from '../lib/bilimMistakes'
import { computeAwards } from '../lib/bilimAwards'
import type { Exam, Submission } from '../lib/bilimTest'

const exam = {
  id: '2026-10', group_id: 'nzm', month: '2026-10', title: 'Қазан 2026', published: true, practice: false,
  subjects: [{ id: 'sci', name: 'Жаратылыстану', short: 'Жар', max: 40, questions: 4, options: 4 }],
  open_subjects: ['sci'],
  answer_key: { sci: ['A', 'B', 'C', 'D'] },
  questions: { sci: [{ text: 'q1', passage: 'P1', image: 'img1' }, { text: 'q2' }, { text: 'q3', passage: 'P2' }, { text: 'q4' }] },
} as unknown as Exam
const sub = (name: string, answers: string[]): Submission => ({ id: name, exam_id: exam.id, student_name: name, subject: 'sci', answers, submitted_at: '' })

describe('mistake drill', () => {
  it('collects wrong and blank questions and inherits the block passage and picture', () => {
    const m = collectMistakes(exam, [sub('Әлия', ['A', 'C', '', 'D'])])
    expect(m.map((x) => x.index)).toEqual([1, 2])
    expect(m[0]).toMatchObject({ passage: 'P1', image: 'img1', key: 'B', given: 'C' })
    expect(m[1]).toMatchObject({ passage: 'P2', image: undefined, key: 'C', given: '' })
  })
})

describe('certificates', () => {
  it('gives places 1–3 (ties share a place) and the biggest growth', () => {
    const subs = [sub('A', ['A', 'B', 'C', 'D']), sub('B', ['A', 'B', 'C', '']), sub('C', ['A', 'B', 'C', '']), sub('D', ['A', '', '', ''])]
    const prev = { title: 'Қыркүйек', scores: { A: { sci: 40 }, B: { sci: 10 }, C: { sci: 30 }, D: { sci: 0 } } }
    const a = computeAwards(exam, subs, ['A', 'B', 'C', 'D'], prev)
    expect(a.filter((x) => x.kind === 'place').map((x) => [x.name, (x as any).place])).toEqual([['A', 1], ['B', 2], ['C', 2]])
    expect(a.find((x) => x.kind === 'growth')).toMatchObject({ name: 'B', delta: 20 })
  })
})
