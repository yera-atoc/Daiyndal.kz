import { describe, expect, it } from 'vitest'
import { ATOC_TESTS, atocTest, gradeAtoc } from '../lib/atocTests'

describe('AtoC tests', () => {
  it('each test has 30 questions with 4 distinct options and a valid key', () => {
    expect(ATOC_TESTS.map((t) => t.id)).toEqual(['vocab', 'workbook'])
    for (const t of ATOC_TESTS) {
      expect(t.questions).toHaveLength(30)
      for (const q of t.questions) {
        expect(q.opts).toHaveLength(4)
        expect(new Set(q.opts.map((o) => JSON.stringify(o))).size).toBe(4)
        expect(q.a).toBeGreaterThanOrEqual(0)
        expect(q.a).toBeLessThan(4)
      }
    }
  })
  it('grades answers and lists wrong question numbers', () => {
    const t = atocTest('workbook')!
    const all = t.questions.map((q) => q.a)
    expect(gradeAtoc(t, all)).toEqual({ correct: 30, total: 30, pct: 100, wrong: [] })
    const some: (number | null)[] = [...all]
    some[0] = (some[0]! + 1) % 4
    some[4] = null
    expect(gradeAtoc(t, some)).toEqual({ correct: 28, total: 30, pct: 93, wrong: [1, 5] })
  })
})
