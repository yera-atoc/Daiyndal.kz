import { describe, expect, it } from 'vitest'
import { guessTeacher, normPhone, phoneOk, planGroup, validateGroup, type ImpGroup } from '@/lib/importPlan'
import { IMPORT_SEED } from '@/lib/importSeed'
import { paymentMessage, resultMessage, waUrl } from '@/lib/parentMessages'

const st = (name: string, note = '') => ({ name, parentName: '', parentPhone: '', note })
const base: ImpGroup = {
  key: 'g',
  name: '4-сынып 1-топ',
  grade: 4,
  teacherId: 't1',
  lessons: [
    { days: [2, 4, 6], start: '14:00', end: '15:00', subject: 'Математика', teacherId: '' },
    { days: [2, 4, 6], start: '15:00', end: '16:00', subject: 'Ағылшын тілі', teacherId: 't2' },
  ],
  students: [st('Бекнұр'), st('Раяна', 'тек математика'), st('Самир')],
}

describe('import plan', () => {
  it('normalises KZ phones', () => {
    expect(normPhone('8 701 234 56 78')).toBe('77012345678')
    expect(normPhone('+7 (701) 234-56-78')).toBe('77012345678')
    expect(normPhone('701 234 5678')).toBe('77012345678')
    expect(phoneOk('')).toBe(true)
    expect(phoneOk('12345')).toBe(false)
  })

  it('builds a journal class per teacher+subject and schedule slots', () => {
    const p = planGroup(base)
    expect(p.classes).toHaveLength(2)
    const math = p.classes.find((c) => c.subject === 'Математика')!
    const eng = p.classes.find((c) => c.subject === 'Ағылшын тілі')!
    expect(math).toMatchObject({ teacherId: 't1', name: '4-сынып 1-топ · Математика', days: [2, 4, 6] })
    expect(math.students).toEqual(['Бекнұр', 'Раяна', 'Самир'])
    expect(eng.teacherId).toBe('t2')
    expect(eng.students).toEqual(['Бекнұр', 'Самир']) // «тек математика»
    expect(p.slots).toHaveLength(6)
  })

  it('"+ ағылшын" notes limit the English class to marked students', () => {
    const g = { ...base, students: [st('Амина', '+ ағылшын'), st('Әмір'), st('Асылан', '+ағылшын')] }
    const eng = planGroup(g).classes.find((c) => c.subject === 'Ағылшын тілі')!
    expect(eng.students).toEqual(['Амина', 'Асылан'])
    expect(planGroup(g).classes.find((c) => c.subject === 'Математика')!.students).toHaveLength(3)
  })

  it('single-subject group keeps its own name; empty times skip schedule', () => {
    const g = { ...base, lessons: [{ days: [1, 3], start: '', end: '', subject: 'НЗМ', teacherId: '' }] }
    const p = planGroup(g)
    expect(p.classes[0].name).toBe('4-сынып 1-топ')
    expect(p.slots).toHaveLength(0)
  })

  it('validates unsure names, duplicates, phones, times and teacher', () => {
    expect(validateGroup(base)).toEqual([])
    const bad = { ...base, teacherId: '', students: [st('Әлихан?'), st('Әлихан?'), { ...st('X'), parentPhone: '123' }], lessons: [{ days: [], start: '15:00', end: '14:00', subject: 'М', teacherId: '' }] }
    const errs = validateGroup(bad).join(' | ')
    expect(errs).toContain('Мұғалім')
    expect(errs).toContain('Тексерілмеген')
    expect(errs).toContain('Қайталанған')
    expect(errs).toContain('нөмір')
    expect(errs).toContain('күні')
    expect(errs).toContain('уақыты')
  })

  it('guesses teachers from journal hints', () => {
    const t = [{ id: '1', name: 'Жолтай Серікұлы' }, { id: '2', name: 'Ернар Белгібаев' }]
    expect(guessTeacher('Жолтай', t)).toBe('1')
    expect(guessTeacher('Ернар', t)).toBe('2')
    expect(guessTeacher('', t)).toBe('')
  })

  it('seed has no duplicate keys and every group has students and lessons', () => {
    expect(new Set(IMPORT_SEED.map((g) => g.key)).size).toBe(IMPORT_SEED.length)
    for (const g of IMPORT_SEED) {
      expect(g.students.length).toBeGreaterThan(0)
      expect(g.lessons.length).toBeGreaterThan(0)
    }
  })
})

describe('parent messages', () => {
  it('payment and result texts', () => {
    expect(paymentMessage('Әли', 'Айгүл', { deadline: '2026-11-01', amount: 30000, kind: 'overdue', days: -2 })).toContain('1 қараша күні өтіп кетті')
    const t = resultMessage('Әли', null, { title: 'Қараша сынағы', month: '2026-11', score: 820, max: 1200, place: 3, of: 20, subjects: [{ name: 'Математика', score: 320, max: 400 }] }, 'https://x.kz')
    expect(t).toContain('820/1200')
    expect(t).toContain('3-орын')
    expect(t).toContain('Математика: 320/400')
    expect(waUrl('87012345678', 'hi')).toBe('https://wa.me/77012345678?text=hi')
    expect(waUrl('', 'hi')).toBeNull()
  })
})
