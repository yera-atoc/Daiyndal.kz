import { describe, expect, it } from 'vitest'
import { markTone, monthLabel, monthRange, shiftMonth, summarize } from '../lib/grid'

describe('grid: айлар', () => {
  it('ай шекаралары', () => {
    expect(monthRange('2026-11')).toEqual({ from: '2026-11-01', to: '2026-11-30' })
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' })
  })
  it('айды жылжыту жыл арқылы', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2027-01', -1)).toBe('2026-12')
  })
  it('қазақша атауы', () => expect(monthLabel('2026-11')).toBe('Қараша 2026'))
})

describe('grid: оқушы қорытындысы', () => {
  it('қатысу, ҮТ, орташа баға, тест', () => {
    const s = summarize(
      {
        '2026-11-02': { a: 'present', h: 'done', m: 8, q: [7, 10] },
        '2026-11-04': { a: 'late', h: 'partial', m: 9 },
        '2026-11-06': { a: 'absent', h: 'none' },
        '2026-11-09': { a: 'excused' },
        '2026-11-11': { a: 'present', m: 6, q: [3, 5] },
      },
      10,
    )
    expect(s.att).toBe(75) // себепті есептелмейді: 3/4
    expect(s.hw).toBe(50) // (1 + 0.5 + 0) / 3
    expect(s.mark).toBe(7.7)
    expect(s.quiz).toBe(67) // 10/15
    expect(s.marks).toBe(3)
    expect(s.absent).toBe(1)
  })
  it('бос ай — бәрі null', () => {
    expect(summarize({}, 5)).toEqual({ att: null, hw: null, mark: null, quiz: null, marks: 0, absent: 0 })
  })
  it('баға түсі шкалаға қатысты', () => {
    expect(markTone(5, 5).fg).toBe('#15803D')
    expect(markTone(9, 10).fg).toBe('#15803D')
    expect(markTone(3, 5).fg).toBe('#B45309')
    expect(markTone(30, 100).fg).toBe('#B91C1C')
  })
})
