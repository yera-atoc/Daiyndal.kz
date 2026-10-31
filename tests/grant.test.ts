import { describe, expect, it } from 'vitest'
import type { SeasonView } from '../lib/bilimSeason'
import { grantCheck, NIS_GRANT_2026 } from '../lib/nisGrant'

const subjects = [
  { id: 'math', short: 'Мат', max: 400 }, { id: 'quant', short: 'Сан', max: 300 }, { id: 'science', short: 'Жар', max: 200 },
  { id: 'kazakh', short: 'Қаз', max: 200 }, { id: 'russian', short: 'Орыс', max: 200 }, { id: 'english', short: 'Ағыл', max: 200 },
]
const month = (m: string, name: string) => ({ month: m, name, title: name, examId: m, kind: 'exam' as const, shown: true, published: true, open: false, max: 1500, of: 2, subjects })
const season: SeasonView = {
  months: [month('2026-09', 'Қыркүйек'), month('2026-10', 'Қазан'), { ...month('2026-11', 'Қараша'), max: null, of: 0 }],
  rows: [
    { id: 'a', name: 'A', me: true, cells: { '2026-09': { total: 900, max: 1500, place: 2, scores: {} }, '2026-10': { total: 1100, max: 1500, place: 1, scores: { math: 300, quant: 150, science: 150, kazakh: 170, russian: 160, english: 170 } }, '2026-11': null } },
    { id: 'b', name: 'B', me: false, cells: { '2026-10': { total: 1300, max: 1500, place: 2, scores: { math: 130, quant: 290, science: 200, kazakh: 200, russian: 200, english: 280 } } } },
  ],
}

describe('NIS grant thresholds', () => {
  it('uses the latest full month and counts schools whose min is reached', () => {
    const g = grantCheck(season)!
    expect(g.month).toBe('2026-10')
    expect(g.subjects.map((s) => s.need)).toEqual([140, 120])
    expect(g.thresholdsOk).toBe(true)
    expect(g.reached).toBe(NIS_GRANT_2026.filter((s) => s.min <= 1100).length)
    expect(g.schools.find((s) => s.name === 'Астана')!.gap).toBe(197)
  })
  it('fails every school when the math threshold (35%) is not met', () => {
    const g = grantCheck(season, 'b')!
    expect(g.subjects[0].ok).toBe(false)
    expect(g.reached).toBe(0)
  })
})
