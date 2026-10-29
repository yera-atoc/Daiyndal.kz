import { describe, expect, it } from 'vitest'
import { buildSeason, countdown, seasonFor, type SeasonInput } from '../lib/bilimSeason'
import { DEFAULT_SUBJECTS } from '../lib/bilimTest'

describe('exam countdown', () => {
  const target = new Date(seasonFor('nzm')!.examDate)
  it('counts calendar months and days in Almaty time', () => {
    // 29 қазан 2026, 20:00 Алматы → 27 наурыз 2027
    const c = countdown(new Date('2026-10-29T20:00:00+05:00'), target)
    expect(c.months).toBe(4)
    expect(c.days).toBe(26) // 28 ақпан 20:00 → 27 наурыз 00:00 = 26 күн 4 сағ
    expect(c.hours).toBe(4)
    expect(c.totalDays).toBe(148)
    expect(c.done).toBe(false)
  })
  it('5th grade NIS group shares the season', () => {
    expect(seasonFor('nzm5')?.months).toHaveLength(9)
    expect(seasonFor('nzm5')?.examDate.slice(0, 4)).toBe('2028')
    const c = countdown(new Date('2026-10-29T20:00:00+05:00'), new Date(seasonFor('nzm5')!.examDate))
    expect(c.months).toBe(16)
    expect(seasonFor('bil5')).toBeNull()
  })
  it('stops at zero', () => {
    expect(countdown(new Date('2027-03-28T10:00:00+05:00'), target).done).toBe(true)
  })
})

const students: SeasonInput['students'] = [
  { id: 'a', full_name: 'Оразалы Жанел', legacy_scores: { '2026-09': { math: 370, science: 160, english: 160, kazakh: 100, russian: 140 } } },
  { id: 'b', full_name: 'Тамабай Ералы', legacy_scores: { '2026-09': { math: 300, science: 140, english: 190, kazakh: 90, russian: 130 } } },
  { id: 'c', full_name: 'Жаңа Оқушы', legacy_scores: {} },
]
const oct = {
  id: '2026-10', month: '2026-10', title: 'Қазан 2026', subjects: DEFAULT_SUBJECTS, published: false, open: true,
  scores: { 'Тамабай Ералы': { math: 400 } }, submitted: ['Тамабай Ералы'],
}
const input: SeasonInput = { months: seasonFor('nzm')!.months, students, exams: [oct], template: DEFAULT_SUBJECTS }

describe('season table', () => {
  it('September from paper results: totals, max 1200 and places', () => {
    const v = buildSeason(input, 'admin')
    const sep = v.months.find((m) => m.month === '2026-09')!
    expect(sep.kind).toBe('legacy')
    expect(sep.max).toBe(1200)
    expect(v.rows.find((r) => r.id === 'a')!.cells['2026-09']).toMatchObject({ total: 930, place: 1 })
    expect(v.rows.find((r) => r.id === 'b')!.cells['2026-09']).toMatchObject({ total: 850, place: 2 })
    expect(v.months.map((m) => m.name)).toEqual(['Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан', 'Қаңтар', 'Ақпан', 'Наурыз'])
    expect(v.months.filter((m) => m.kind === 'none')).toHaveLength(5)
  })
  it('paper month: every student gets the full month maximum', () => {
    const one = [...students, { id: 'd', full_name: 'Бір Пәнді', legacy_scores: { '2026-09': { math: 200 } } }]
    const v = buildSeason({ ...input, students: one }, 'admin')
    expect(v.rows.find((r) => r.id === 'd')!.cells['2026-09']).toMatchObject({ total: 200, max: 1200 })
  })
  it('unpublished month is hidden from students but visible to admin', () => {
    const adm = buildSeason(input, 'admin')
    expect(adm.rows.find((r) => r.id === 'b')!.cells['2026-10']?.total).toBe(400)
    const st = buildSeason(input, { id: 'b' })
    expect(st.rows.find((r) => r.me)!.cells['2026-10']).toBeNull()
    expect(st.mine?.['2026-10']).toBe('submitted')
    expect(st.months.find((m) => m.month === '2026-10')!.shown).toBe(false)
    // басқалардың аты қысқа, нәтижесі жоқ оқушы көрінбейді
    expect(st.rows.map((r) => r.name)).toEqual(['Оразалы Ж.', 'Тамабай Ералы'])
  })
  it('published month shows to students', () => {
    const v = buildSeason({ ...input, exams: [{ ...oct, published: true }] }, { id: 'a' })
    expect(v.rows.find((r) => r.id === 'b')!.cells['2026-10']).toMatchObject({ total: 400, place: 1, max: 1500 })
    expect(v.rows[0].id).toBe('b') // соңғы ай бойынша реттеледі
  })
})
