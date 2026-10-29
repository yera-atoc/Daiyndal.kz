import { describe, expect, it } from 'vitest'
import { personalizeFor, toCanonical, toPersonal, variantFor } from '../lib/bilimShuffle'
import { gradeSubject, type Exam } from '../lib/bilimTest'

describe('personal variants', () => {
  it('is deterministic per student and differs between students', () => {
    const a = variantFor('phys2_2026-10', 'physics', 'Айтбек Азиз', 40, 4)
    expect(variantFor('phys2_2026-10', 'physics', 'Айтбек Азиз', 40, 4)).toEqual(a)
    const b = variantFor('phys2_2026-10', 'physics', 'Арнаш Имран', 40, 4)
    expect(b.order).not.toEqual(a.order)
    expect([...a.order].sort((x, y) => x - y)).toEqual(Array.from({ length: 40 }, (_, i) => i))
    for (const o of a.opts) expect([...o].sort()).toEqual([0, 1, 2, 3])
  })
  it('round-trips answers between personal and canonical order', () => {
    const v = variantFor('x', 'physics', 'Оқушы', 40, 4)
    const canon = Array.from({ length: 40 }, (_, i) => 'ABCD'[i % 4])
    canon[5] = ''
    const personal = toPersonal(canon, v)
    expect(toCanonical(personal, v)).toEqual(canon)
  })
  it('a student who answers his own sheet correctly gets full marks', () => {
    const subj = { id: 'physics', name: 'Физика', short: 'Физика', max: 40, questions: 40, options: 4 }
    const key = Array.from({ length: 40 }, (_, i) => 'DCBA'[(i * 7) % 4])
    const exam = { id: 'phys1_2026-10', group_id: 'phys1', month: '2026-10', title: 'Қазан', subjects: [subj], open_subjects: ['physics'], answer_key: { physics: key }, questions: {}, published: true, shuffle: true } as Exam
    const v = variantFor(exam.id, 'physics', 'Берік Ислам', 40, 4)
    const sheetKey = toPersonal(key, v) // оқушы өз парағының дұрыс жауаптары
    const stored = toCanonical(sheetKey, v)
    expect(gradeSubject(subj, key, stored)?.correct).toBe(40)
    const view = personalizeFor(exam, [{ id: '1', exam_id: exam.id, student_name: 'Берік Ислам', subject: 'physics', answers: stored, submitted_at: '' }], 'Берік Ислам')
    expect(view.subs[0].answers).toEqual(sheetKey)
    expect(view.exam.answer_key.physics).toEqual(sheetKey)
  })
})
