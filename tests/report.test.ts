import { describe, expect, it } from 'vitest'
import { markTrend, notesOf, reportMessage, type ReportClass } from '../lib/report'
import { reportToken, studentOfToken } from '../lib/reportToken'

const base: ReportClass = { id: 'c', name: 'Топ', subject: 'Математика', teacher: 'А', lessons: 0, present: 0, absent: 0, late: 0, att: null, hw: null, hwNone: 0, markPct: null, marks: [], quiz: null, topics: [], homework: null, next: null, absStreak: 0 }
const mk = (date: string, score: number) => ({ date, score, max: 10, comment: null, topic: null })

describe('report: сілтеме кілті', () => {
  const id = '33333333-3333-4333-8333-333333333331'
  it('өз id-ін қайтарады', () => expect(studentOfToken(reportToken(id))).toBe(id))
  it('өзгертілген немесе басқа оқушының қолтаңбасы өтпейді', () => {
    const t = reportToken(id)
    expect(studentOfToken(t.slice(0, -1) + (t.endsWith('A') ? 'B' : 'A'))).toBeNull()
    expect(studentOfToken('4' + t.slice(1))).toBeNull()
    expect(studentOfToken(id)).toBeNull()
    expect(studentOfToken('')).toBeNull()
  })
})

describe('report: қорытынды', () => {
  it('баға бағыты', () => {
    expect(markTrend([mk('2026-11-01', 5), mk('2026-11-03', 6), mk('2026-11-05', 8), mk('2026-11-07', 9)])).toBe(0.3)
    expect(markTrend([mk('2026-11-01', 5)])).toBeNull()
  })
  it('алдымен алаңдататыны, сосын жақсысы', () => {
    const n = notesOf([
      { ...base, lessons: 8, att: 100, hw: 90 },
      { ...base, id: 'd', subject: 'Физика', lessons: 6, att: 50, absStreak: 3, hw: 30 },
    ])
    expect(n[0]).toEqual({ tone: 'bad', text: 'Физика: соңғы 3 сабаққа қатарынан келмеді' })
    expect(n.map((x) => x.tone)).toEqual(['bad', 'warn', 'good', 'good'])
  })
  it('дерек жоқ болса — үнсіз', () => expect(notesOf([base])).toEqual([]))
  it('хабарламада сілтеме мен сандар бар', () => {
    const t = reportMessage('Айтбек Азизов Ерланұлы', { subject: 'Математика', att: 92, hw: 80, mark: 8.5, scale: 10 }, 'https://x/r/abc')
    expect(t).toContain('Айтбек Азизов · Математика')
    expect(t).toContain('орташа баға — 8,5/10')
    expect(t).toContain('https://x/r/abc')
  })
})
