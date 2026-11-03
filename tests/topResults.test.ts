import { describe, expect, it } from 'vitest'
import { categoryOf, schoolYearStart, topOfExam } from '@/lib/topResults'
import type { Exam } from '@/lib/bilimTest'

describe('top results', () => {
  it('categorises groups', () => {
    expect(categoryOf('nzm', 'НЗМ дайындық тобы - 6 сынып')).toBe('НЗМ')
    expect(categoryOf('g9', 'БИЛ дайындық тобы')).toBe('БИЛ')
    expect(categoryOf('ubt1', '11 сынып ҰБТ-1 топ')).toBe('ҰБТ')
    expect(categoryOf('phys2', 'ҰБТ: Физика · 2-топ')).toBe('ҰБТ')
    expect(categoryOf('eng', 'Ағылшын 8-сынып')).toBeNull()
  })
  it('school year starts in September', () => {
    expect(schoolYearStart(new Date('2026-11-03'))).toBe('2026-09')
    expect(schoolYearStart(new Date('2027-03-01'))).toBe('2026-09')
  })
  it('top of an exam: masked names, only listed students, sorted', () => {
    const exam: Exam = {
      id: 'e', group_id: 'nzm', month: '2026-10', title: 'Қазан', open_subjects: [], questions: {}, published: true,
      subjects: [{ id: 'm', name: 'Мат', short: 'Мат', max: 4, questions: 2, options: 4 }],
      answer_key: { m: ['A', 'B'] },
    }
    const sub = (name: string, answers: string[]) => ({ id: name, exam_id: 'e', student_name: name, subject: 'm', answers, submitted_at: '' })
    const top = topOfExam(exam, [sub('Айтбек Ақжол', ['A', 'B']), sub('Сәрсен Әмір', ['A', 'C']), sub('Кеткен Бала', ['A', 'B'])], new Set(['Айтбек Ақжол', 'Сәрсен Әмір']), 'НЗМ тобы')
    expect(top.map((x) => x.name)).toEqual(['Айтбек А.', 'Сәрсен Ә.'])
    expect(top[0].pct).toBe(100)
    expect(top[0].score).toBeGreaterThan(top[1].score)
  })
})
