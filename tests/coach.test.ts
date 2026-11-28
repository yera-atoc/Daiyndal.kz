import { describe, expect, it } from 'vitest'
import { cleanMessages, coachAllowed, coachContext, coachSystem, firstName } from '@/lib/coach'
import { buildLevelUp } from '@/lib/levelUp'

const maxes = { math: 400, quant: 300, science: 200, english: 200, kazakh: 200, russian: 200 }

describe('coach', () => {
  it('only 6th-grade NIS groups', () => {
    expect(coachAllowed('nzm', 'НЗМ дайындық тобы - 6 сынып')).toBe(true)
    expect(coachAllowed('x1', 'НИШ 6')).toBe(true)
    expect(coachAllowed('nzm5', 'НЗМ 5 сынып')).toBe(false)
    expect(coachAllowed('x2', 'НЗМ 5-сынып')).toBe(false)
    expect(coachAllowed('bil', 'БИЛ')).toBe(false)
  })
  it('first name is the last word (Фамилия Аты)', () => {
    expect(firstName('Тестов Арман')).toBe('Арман')
  })
  it('context uses only own data', () => {
    const data = buildLevelUp({
      months: [{ month: '2026-11', name: 'Қараша', maxes, scores: { math: 320, quant: 228, science: 150, english: 180, kazakh: 160, russian: 120 } }],
      topics: [{ subject: 'russian', topic: 'Падеждер', correct: 1, total: 5 }],
      daily: [],
      streak: 2,
      today: '2026-11-28',
      xp: { total: 500, today: 0 },
    })
    const c = coachContext({ name: 'Тестов Арман', data, week: [{ place: 3, name: 'Тестов Арман', me: true, xp: 140 }, { place: 1, name: 'Басқа Б.', me: false, xp: 300 }], examLabel: '26–27 наурыз 2027', daysLeft: 118 })
    expect(c).toContain('Арман')
    expect(c).not.toContain('Тестов')
    expect(c).not.toContain('Басқа')
    expect(c).toContain('1158/1500')
    expect(c).toContain('Падеждер (20%)')
    expect(c).toContain('3-орын')
    expect(c).toContain('118 күн')
    expect(coachSystem(c)).toContain('Қазақша жаз')
  })
  it('cleans messages', () => {
    expect(cleanMessages('x')).toEqual([])
    expect(cleanMessages([{ role: 'assistant', content: 'hi' }])).toEqual([])
    const long = cleanMessages([{ role: 'system', content: 'hack' }, { role: 'user', content: 'a'.repeat(900) }])
    expect(long).toHaveLength(1)
    expect(long[0].content).toHaveLength(500)
    const many = cleanMessages(Array.from({ length: 15 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: String(i) })))
    expect(many[0].role).toBe('user')
    expect(many[many.length - 1].role).toBe('user')
    expect(many.length).toBeLessThanOrEqual(10)
  })
})
