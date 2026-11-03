import { describe, expect, it } from 'vitest'
import { buildLevelUp, isNishGroup, levelOf, rankOf, targetOf } from '@/lib/levelUp'
import { NIS_TIPS } from '@/lib/nisTips'

const maxes = { math: 400, quant: 300, science: 200, english: 200, kazakh: 200, russian: 200 }

describe('levelUp', () => {
  it('level and rank', () => {
    expect(levelOf(0)).toEqual({ level: 1, toNext: 50 })
    expect(levelOf(1158)).toEqual({ level: 24, toNext: 42 })
    expect(levelOf(1500).level).toBe(30)
    expect(levelOf(1500).toNext).toBe(0)
    expect(rankOf(1158).id).toBe('C')
    expect(rankOf(1158).next).toEqual({ id: 'B', need: 42 })
    expect(rankOf(1490).next).toBeNull()
    expect(rankOf(100).id).toBe('E')
  })
  it('target is nearest grant above', () => {
    expect(targetOf(1000).min).toBe(1036)
    expect(targetOf(1500).gap).toBe(0)
  })
  it('nish detection', () => {
    expect(isNishGroup('nzm')).toBe(true)
    expect(isNishGroup('x1', 'НИШ-7')).toBe(true)
    expect(isNishGroup('bil', 'БИЛ')).toBe(false)
  })
  it('builds stats with deltas, growth and quests', () => {
    const d = buildLevelUp({
      months: [
        { month: '2026-09', name: 'Қыркүйек', maxes, scores: { math: 300, quant: 210, science: 150, english: 170, kazakh: 160, russian: 110 } },
        { month: '2026-10', name: 'Қазан', maxes, scores: { math: 320, quant: 220, science: 150, english: 180, kazakh: 160, russian: 120 } },
      ],
      topics: [
        { subject: 'russian', topic: 'Падеждер', correct: 1, total: 5 },
        { subject: 'math', topic: 'Бөлшек', correct: 5, total: 5 },
      ],
      daily: [{ day: '2026-11-04', correct: 30, total: 35 }],
      streak: 4,
      today: '2026-11-04',
    })!
    expect(d.total).toBe(1150)
    expect(d.totalDelta).toBe(50)
    expect(d.subjects.find((s) => s.id === 'math')!.delta).toBe(20)
    expect(d.growth[0]).toMatchObject({ id: 'russian', gain: 40, topic: 'Падеждер' })
    expect(d.skills[0]).toMatchObject({ topic: 'Падеждер', level: 1 })
    expect(d.quests.every((q) => q.done)).toBe(true)
    expect(d.xp).toEqual({ got: 100, of: 100 })
    expect(d.accuracy).toBe(86)
    expect(d.tip.subject).toBe('russian')
    expect(NIS_TIPS.find((t) => t.id === 'russian')!.hacks).toContain(d.tip.text)
  })
  it('null without results', () => {
    expect(buildLevelUp({ months: [], topics: [], daily: [], streak: 0, today: '2026-11-04' })).toBeNull()
  })
})
