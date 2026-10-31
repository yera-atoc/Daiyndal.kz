import { describe, expect, it } from 'vitest'
import { dailyTrack, dayIndex, dayKey, pickIndices, streak } from '../lib/daily'

describe('daily questions', () => {
  it('maps groups to tracks', () => {
    expect(dailyTrack('nzm')).toBe('nzm')
    expect(dailyTrack('nzm5')).toBe('nzm')
    expect(dailyTrack('ubt1')).toBe('ubt-math')
    expect(dailyTrack('phys3')).toBe('ubt-phys')
    expect(dailyTrack('eng4')).toBeNull()
  })
  it('uses Almaty days', () => {
    expect(dayKey(new Date('2026-11-01T19:30:00Z'))).toBe('2026-11-02') // 00:30 Алматы
    expect(dayIndex('2026-11-01')).toBe(0)
    expect(dayIndex('2026-12-01')).toBe(30)
  })
  it('does not repeat questions until the pool is used up', () => {
    const seen = new Set<number>()
    for (let d = 0; d < 12; d++) {
      const day = new Date(Date.UTC(2026, 10, 1 + d)).toISOString().slice(0, 10)
      const p = pickIndices(day, 60)
      expect(new Set(p).size).toBe(5)
      p.forEach((i) => seen.add(i))
    }
    expect(seen.size).toBe(60)
    expect(pickIndices('2026-11-05', 3)).toHaveLength(3)
  })
  it('counts the streak ending today or yesterday', () => {
    expect(streak(['2026-11-03', '2026-11-04', '2026-11-05'], '2026-11-05')).toBe(3)
    expect(streak(['2026-11-03', '2026-11-04'], '2026-11-05')).toBe(2)
    expect(streak(['2026-11-01', '2026-11-03'], '2026-11-05')).toBe(0)
  })
})
