import { describe, expect, it } from 'vitest'
import { buildForecast } from '../lib/bilimTestForecast'
import type { Exam } from '../lib/bilimTest'

const ex = (max: number, q: number) =>
  ({ id: 'phys1_2026-10', group_id: 'phys1', month: '2026-10', title: '', subjects: [{ id: 'p', name: 'Физика', short: 'Ф', max, questions: q, options: 4 }], open_subjects: [], answer_key: {}, questions: {}, published: true }) as Exam

describe('forecast', () => {
  it('never predicts below the current score (small 40-point subject)', () => {
    const fc = buildForecast(ex(40, 40), { p: 37 }, [])!
    expect(Math.min(...fc.totals)).toBeGreaterThanOrEqual(37)
  })
  it('grows a weak result in whole points', () => {
    const fc = buildForecast(ex(40, 40), { p: 12 }, [])!
    expect(fc.totals.at(-1)!).toBeGreaterThan(12)
    expect(fc.totals.every((v) => Number.isInteger(v))).toBe(true)
  })
  it('big subjects still step in fives', () => {
    const fc = buildForecast(ex(400, 40), { p: 230 }, [])!
    expect(fc.totals.every((v) => v % 5 === 0)).toBe(true)
  })
})
