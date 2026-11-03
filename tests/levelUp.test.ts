import { vi } from 'vitest'
vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: {} }))
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

import { rankBoard } from '@/lib/levelUp'
import { cleanNote, NOTE_MAX } from '@/lib/teacherNotes'

describe('rankBoard', () => {
  it('sorts, ties share a place, skips missing', () => {
    const b = rankBoard([
      { name: 'А', me: false, total: 900 },
      { name: 'Б', me: true, total: 1200 },
      { name: 'В', me: false, total: 900 },
      { name: 'Г', me: false, total: null },
    ])
    expect(b.map((r) => r.name)).toEqual(['Б', 'А', 'В'])
    expect(b.map((r) => r.place)).toEqual([1, 2, 2])
    expect(b[0]).toMatchObject({ rank: 'B', level: 25, me: true })
    expect(b[1].rank).toBe('D')
  })
})

describe('cleanNote', () => {
  it('trims and caps', () => {
    expect(cleanNote('  a\n\n\n\nb ')).toBe('a\n\nb')
    expect(cleanNote('x'.repeat(2000))).toHaveLength(NOTE_MAX)
    expect(cleanNote(null)).toBe('')
  })
})

import { buildLevelUp as build2, levelEvent } from '@/lib/levelUp'

describe('system: points, penalty, focus, titles, events', () => {
  const months = [{ month: '2026-10', name: 'Қазан', maxes: { math: 400, quant: 300, science: 200, english: 200, kazakh: 200, russian: 200 }, scores: { math: 360, quant: 270, science: 150, english: 180, kazakh: 170, russian: 120 } }]
  it('points, focus quest and penalty', () => {
    const d = build2({
      months,
      topics: [],
      daily: [{ day: '2026-11-02', correct: 30, total: 35 }, { day: '2026-11-04', correct: 33, total: 35 }],
      streak: 1,
      today: '2026-11-04',
      points: { russian: 3, math: 1, bogus: 5 },
      practiceToday: ['russian'],
    })!
    expect(d.total).toBe(1250)
    expect(d.points).toEqual({ total: 25, free: 21, spent: { russian: 3, math: 1 }, focus: 'russian' })
    expect(d.penalty).toBe(true)
    expect(d.quests[0]).toMatchObject({ id: 'penalty', done: true })
    expect(d.quests.find((q) => q.id === 'focus')).toMatchObject({ done: true, xp: 40 })
    const got = d.titles.filter((t) => t.got).map((t) => t.id)
    expect(got).toEqual(expect.arrayContaining(['math', 'quant', 'grant']))
    expect(got).not.toContain('elite')
  })
  it('no penalty for newcomers', () => {
    const d = build2({ months, topics: [], daily: [], streak: 0, today: '2026-11-04' })!
    expect(d.penalty).toBe(false)
    expect(d.quests.some((q) => q.id === 'focus')).toBe(false)
  })
  it('level events', () => {
    expect(levelEvent(null, { level: 5, rank: 'E' })).toBeNull()
    expect(levelEvent({ level: 5, rank: 'E' }, { level: 5, rank: 'E' })).toBeNull()
    expect(levelEvent({ level: 5, rank: 'E' }, { level: 6, rank: 'E' })).toMatchObject({ from: 5, to: 6, rankUp: false })
    expect(levelEvent({ level: 20, rank: 'D' }, { level: 22, rank: 'C' })).toMatchObject({ rankUp: true, rankTo: 'C' })
    expect(levelEvent({ level: 22, rank: 'C' }, { level: 20, rank: 'D' })).toBeNull()
  })
})
