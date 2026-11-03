import { describe, expect, it } from 'vitest'
import { FORMULAS } from '@/lib/formulas'
import { formulaQuiz } from '@/lib/formulaQuiz'
import { dailyTrack } from '@/lib/daily'
import { loginCandidates } from '@/lib/loginMatch'

describe('formulas daily', () => {
  it('has all 67 formulas, numbered 1..67 once', () => {
    expect(FORMULAS).toHaveLength(67)
    expect(new Set(FORMULAS.map((f) => f.n)).size).toBe(67)
    expect(Math.max(...FORMULAS.map((f) => f.n))).toBe(67)
  })
  it('5 questions a day, 4 distinct options, answer points at the right formula, stable per day', () => {
    const q = formulaQuiz('2026-11-04')
    expect(q).toHaveLength(5)
    for (const x of q) {
      expect(new Set(x.options).size).toBe(4)
      const f = FORMULAS.find((f) => f.n === x.id)!
      const right = x.options['ABCD'.indexOf(x.answer)]
      expect([f.formula, f.name]).toContain(right)
    }
    expect(formulaQuiz('2026-11-04')).toEqual(q)
  })
  it('covers every formula within 14 days', () => {
    const seen = new Set<number>()
    for (let d = 0; d < 14; d++) formulaQuiz(new Date(Date.UTC(2026, 10, 1 + d)).toISOString().slice(0, 10)).forEach((x) => seen.add(x.id))
    expect(seen.size).toBe(67)
  })
  it('NZM and BIL groups (by id or name) get formulas', () => {
    expect(dailyTrack('nzm')).toBe('nzm')
    expect(dailyTrack('bil')).toBe('nzm')
    expect(dailyTrack('g7', 'БИЛ 1-топ')).toBe('nzm')
    expect(dailyTrack('g8', 'НЗМ 2-топ')).toBe('nzm')
    expect(dailyTrack('g9', 'Ағылшын 8-сынып')).toBeNull()
  })
})

describe('student login by name', () => {
  const list = [
    { id: '1', full_name: 'Айтбек Ақжол' },
    { id: '2', full_name: 'Айтбек Ақерке' },
    { id: '3', full_name: 'Әмір Сәрсенбек' },
    { id: '4', full_name: 'Әмір Қайратұлы' },
  ]
  it('exact name in any order and spelling (Kazakh letters, case)', () => {
    expect(loginCandidates('ақжол айтбек', list).map((s) => s.id)).toEqual(['1'])
    expect(loginCandidates('Акжол Айтбек', list).map((s) => s.id)).toEqual(['1'])
  })
  it('first name only → a few candidates (PIN decides)', () => {
    expect(loginCandidates('Әмір', list).map((s) => s.id).sort()).toEqual(['3', '4'])
    expect(loginCandidates('', list)).toEqual([])
    expect(loginCandidates('Белгісіз', list)).toEqual([])
  })
})
