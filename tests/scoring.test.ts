import { describe, expect, it } from 'vitest'
import { isCorrect, overallBand, writingBand } from '@/lib/ielts'
import { scoreQ, type UbtQ } from '@/lib/ubt'

describe('ҰБТ бағалау (ресми ережелер)', () => {
  const q = (type: UbtQ['type'], answer: number[]): UbtQ => ({ id: 'x', type, text: '', options: ['a', 'b', 'c', 'd', 'e', 'f'], answer })
  it('бір жауапты', () => {
    expect(scoreQ(q('single', [2]), [2])).toBe(1)
    expect(scoreQ(q('single', [2]), [1])).toBe(0)
    expect(scoreQ(q('single', [2]), [])).toBe(0)
  })
  it('сәйкестендіру: 2 / 1 / 0', () => {
    expect(scoreQ(q('matching', [1, 3]), [1, 3])).toBe(2)
    expect(scoreQ(q('matching', [1, 3]), [1, 0])).toBe(1)
    expect(scoreQ(q('matching', [1, 3]), [0, 1])).toBe(0)
  })
  it('бірнеше жауапты', () => {
    expect(scoreQ(q('multiple', [0, 2, 4]), [0, 2, 4])).toBe(2)
    expect(scoreQ(q('multiple', [0, 2, 4]), [0, 2])).toBe(1)
    expect(scoreQ(q('multiple', [0, 2, 4]), [0])).toBe(0)
    expect(scoreQ(q('multiple', [0, 2]), [0, 2])).toBe(2)
    expect(scoreQ(q('multiple', [0, 2]), [0, 5])).toBe(1)
    expect(scoreQ(q('multiple', [0, 2]), [0, 1, 5])).toBe(0)
    expect(scoreQ(q('multiple', [3]), [3])).toBe(2)
    expect(scoreQ(q('multiple', [3]), [3, 1])).toBe(1)
  })
})

describe('IELTS band', () => {
  it('overall жарты балға дөңгелектенеді', () => {
    const s = { listening: { band: 6.5 }, reading: { band: 6.5 }, writing: { band: 5 }, speaking: { band: 7 } } as any
    expect(overallBand(s, ['listening', 'reading', 'writing', 'speaking'])).toBe(6.5) // 6.25 → 6.5
    const s2 = { listening: { band: 7 }, reading: { band: 7 }, writing: { band: 6.5 }, speaking: { band: 6.5 } } as any
    expect(overallBand(s2, ['listening', 'reading', 'writing', 'speaking'])).toBe(7) // 6.75 → 7
  })
  it('writing = (T1 + 2·T2) / 3', () => {
    const c = (x: number) => ({ ta: x, cc: x, lr: x, gra: x })
    expect(writingBand({ task1: c(6), task2: c(7) } as any)).toBe(6.5)
  })
  it('жауап салыстыру: регистр, баламалар, TRUE/T', () => {
    expect(isCorrect('gap', ' Library ', 'library')).toBe(true)
    expect(isCorrect('gap', 'colour', 'color|colour')).toBe(true)
    expect(isCorrect('tfng', 'T', 'TRUE')).toBe(true)
    expect(isCorrect('tfng', 'false', 'NOT GIVEN')).toBe(false)
  })
})
