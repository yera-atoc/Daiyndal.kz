import { describe, expect, it } from 'vitest'
import { weekBoard, weekStart, xpEvents, xpLevel, xpSummary, xpToNext } from '@/lib/xp'

describe('xp', () => {
  it('levels get slower', () => {
    expect(xpLevel(0)).toEqual({ level: 1, into: 0, need: 100 })
    expect(xpLevel(99).level).toBe(1)
    expect(xpLevel(100)).toEqual({ level: 2, into: 0, need: 120 })
    expect(xpLevel(100 + 120 + 5)).toEqual({ level: 3, into: 5, need: 140 })
    expect(xpToNext(10)).toBe(280)
  })
  it('week starts on Monday', () => {
    expect(weekStart('2026-11-28')).toBe('2026-11-23') // сенбі → дүйсенбі
    expect(weekStart('2026-11-23')).toBe('2026-11-23')
    expect(weekStart('2026-11-29')).toBe('2026-11-23') // жексенбі
  })
  it('events and summary', () => {
    const ev = xpEvents({
      daily: [
        { day: '2026-11-20', correct: 30 },
        { day: '2026-11-21', correct: 30 },
        { day: '2026-11-22', correct: 30 }, // 3-күн қатарынан → серия бонусы
        { day: '2026-11-28', correct: 20 },
      ],
      drills: [{ day: '2026-11-27' }],
      exams: [{ day: '2026-11-01', total: 1155 }],
    })
    const s = xpSummary(ev, '2026-11-28')
    expect(s.today).toBe(10 + 40)
    expect(s.week).toBe(50 + 40) // 23-нен бастап: бүгін + дайындық сынағы
    expect(s.total).toBe(70 * 3 + 10 + 50 + 40 + 116)
  })
  it('weekly board ties', () => {
    const b = weekBoard([{ name: 'А', me: false, xp: 50 }, { name: 'Б', me: true, xp: 120 }, { name: 'В', me: false, xp: 50 }])
    expect(b.map((r) => [r.name, r.place])).toEqual([['Б', 1], ['А', 2], ['В', 2]])
  })
})
