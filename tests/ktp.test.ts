import { describe, expect, it } from 'vitest'
import { TEMPLATES, buildPlan, calendar, parseWeeks, pickTemplate, templateById } from '@/lib/ktp'

describe('КТП үлгілері', () => {
  it('әр үлгіде 21 мазмұнды апта, әр аптада екі сабақ', () => {
    for (const t of TEMPLATES) {
      const w = parseWeeks(t)
      expect(w.length, t.id).toBe(21)
      for (const x of w) {
        expect(x.a.length, t.id).toBeGreaterThan(2)
        expect(x.b.length, t.id).toBeGreaterThan(2)
      }
    }
  })
  it('id-лер қайталанбайды', () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length)
  })
})

describe('calendar', () => {
  const cal = calendar('2026-11-09')
  it('айлық Білім тексеру апталары', () => {
    const tests = cal.filter((w) => w.kind === 'test').map((w) => w.start)
    expect(tests).toEqual(['2026-11-23', '2026-12-21', '2027-01-25', '2027-02-22', '2027-03-15', '2027-04-26', '2027-05-24'])
  })
  it('жыл соңы — қайталау аптасы', () => {
    expect(cal.find((w) => w.start === '2026-12-28')?.kind).toBe('review')
  })
  it('мазмұнды апталар саны үлгіге сай', () => {
    expect(cal.filter((w) => w.kind === 'lesson').length).toBe(21)
  })
})

describe('buildPlan', () => {
  const t = templateById('nzm6math')!
  it('аптасына 3 сабақ — практикум қосылады', () => {
    const p = buildPlan(t, 3, '2026-11-09')
    expect(p.slice(0, 3).map((x) => x.topic)).toEqual(['Рационал сандар, сандық түзу', 'Рационал сандармен амалдар', 'Практикум: Рационал сандар, сандық түзу'])
    expect(p.filter((x) => x.kind === 'test').length).toBe(7 * 3)
  })
  it('аптасына 1 сабақ — екі тақырып біріктіріледі', () => {
    const p = buildPlan(t, 1, '2026-11-09')
    expect(p[0].topic).toBe('Рационал сандар, сандық түзу. Рационал сандармен амалдар')
    expect(p.find((x) => x.kind === 'test')?.topic).toBe('Білім тексеру — Қараша сынағы')
  })
})

describe('pickTemplate', () => {
  const cases: [string | null, string, string][] = [
    ['Математика', '6 сынып НЗМ-1', 'nzm6math'],
    ['Математика', '11-сынып ҰБТ 2-топ', 'ubtmath'],
    ['Физика', 'ҰБТ: Физика · 3-топ', 'ubtphys'],
    ['Ағылшын тілі', 'Pre-IELTS 9–10 сынып · 1-топ', 'preielts'],
    ['Ағылшын тілі', '4 class - English', 'eng45'],
    ['Математика', '3-сынып 1-топ', 'math3'],
    ['Математика', '4 сынып', 'math4'],
    ['Математика', '5 сынып НЗМ дайындық', 'nzm5math'],
    ['Қазақ тілі', 'БИЛ дайындық тобы', 'kazakh'],
    ['Химия', '11 сынып', 'ubtchem'],
  ]
  for (const [s, n, id] of cases) it(`${n} → ${id}`, () => expect(pickTemplate(s, n)?.id).toBe(id))
})
