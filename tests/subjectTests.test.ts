import { describe, expect, it } from 'vitest'
import { avgPct, buildMySubject, lastDelta, parseScore, pcts, type Sheet, type SheetRow } from '../lib/subjectTests'

const sheet: Sheet = { id: 's', subject: 'Физика', name: '2-топ', grade: 11, position: 0, tests: [{ title: '1-тест', max: 30 }, { title: '2-тест', max: 40 }, { title: '3-тест', max: 40 }] }
const row = (n: string, s: (number | null)[]): SheetRow => ({ student_id: n, student_name: n, scores: s, position: 0 })

describe('subject tests', () => {
  it('percent, average and delta', () => {
    expect(pcts([15, 30, null], sheet.tests)).toEqual([50, 75, null])
    expect(avgPct([15, 30, null], sheet.tests)).toBe(63)
    expect(lastDelta([50, null, 40])).toEqual({ from: 0, to: 2, d: -10 })
    expect(lastDelta([50, null, null])).toBeNull()
  })
  it('parses scores', () => {
    expect(parseScore('14/30', 30)).toBe(14)
    expect(parseScore('', 30)).toBeNull()
    expect(parseScore('41', 40)).toBeNull()
  })
  it('ranks across sheets of the same subject', () => {
    const rows = [row('a', [30, 40, null]), row('b', [15, null, null]), row('c', [null, null, null])]
    const other = { sheet: { ...sheet, id: 's2' }, rows: [row('d', [20, 20, null])] }
    const m = buildMySubject(sheet, rows, rows[1], [{ sheet, rows }, other])
    expect(m.rank).toBe(3)
    expect(m.of).toBe(3)
    expect(m.groupAvg).toEqual([75, 100, null])
  })
})
