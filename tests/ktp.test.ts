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
  it('әр мұғалімде 3–11 сынып үлгілері бар', () => {
    const has = (id: string) => TEMPLATES.some((t) => t.id === id)
    for (const g of [3, 4, 5, 6, 7, 8, 9, 10, 11]) {
      expect(has(g <= 4 ? `math${g}` : `math${g}`), `math${g}`).toBe(true)
      expect(has(`eng${g}`), `eng${g}`).toBe(true)
      expect(has(`kaz${g}`), `kaz${g}`).toBe(true)
      expect(has(`rus${g}`), `rus${g}`).toBe(true)
    }
    for (const g of [7, 8, 9, 10, 11]) expect(has(`phys${g}`), `phys${g}`).toBe(true)
    for (const g of [5, 6, 7, 8, 9, 10, 11]) expect(has(`hist${g}`), `hist${g}`).toBe(true)
    for (const g of [3, 4, 5, 6]) expect(has(`sci${g}`), `sci${g}`).toBe(true)
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
    ['Математика', 'НЗМ дайындық тобы · Математика', 'nzm6math'],
    ['Математика', '6 сынып НЗМ-1', 'nzm6math'],
    ['Математика', 'НЗМ дайындық 1-топ - 5 сынып · Математика', 'nzm5math'],
    ['Математика', '5 сынып · 3-топ (English) · Математика', 'math5'],
    ['Математика', '6-сынып 2-топ', 'math6'],
    ['Математика', '11-сынып ҰБТ 2-топ', 'ubtmath'],
    ['Математика', '11 сынып', 'math11'],
    ['Математика', '3-сынып 1-топ', 'math3'],
    ['Математика', '4 сынып', 'math4'],
    ['Математика', '7 сынып', 'math7'],
    ['Математика', '8-сынып 1-топ', 'math8'],
    ['Математика', '9 сынып', 'math9'],
    ['Математика', '10-сынып 1-топ', 'math10'],
    ['Физика', 'ҰБТ: Физика · 3-топ · Физика', 'ubtphys'],
    ['Физика', '8 сынып', 'phys8'],
    ['Ағылшын тілі', 'Pre-IELTS 9–10 сынып · 1-топ · Ағылшын тілі', 'preielts'],
    ['Ағылшын тілі', '4 class - English · Ағылшын тілі', 'eng4'],
    ['Ағылшын тілі', '11-English Group · Ағылшын тілі', 'eng11'],
    ['Ағылшын тілі', 'English A1–A2 · Ағылшын тілі', 'engA2'],
    ['Ағылшын тілі', 'English - 9 class · Ағылшын тілі', 'eng9'],
    ['Қазақ тілі', 'БИЛ дайындық тобы · Қазақ тілі', 'kazakh'],
    ['Қазақ тілі', '7 сынып', 'kaz7'],
    ['Орыс тілі', 'НЗМ дайындық тобы · Орыс тілі', 'russian'],
    ['Орыс тілі', '5 сынып', 'rus5'],
    ['Қазақстан тарихы', '11-сынып ҰБТ 1-топ · Қазақстан тарихы', 'ubthistory'],
    ['Қазақстан тарихы', '8 сынып', 'hist8'],
    ['Химия', '11 сынып ҰБТ', 'ubtchem'],
    ['Жаратылыстану', '4-сынып 1-топ · Жаратылыстану', 'sci4'],
    ['Жаратылыстану', '6 сынып', 'sci6'],
    ['Жаратылыстану', 'НЗМ дайындық тобы · Жаратылыстану', 'nzmscience'],
  ]
  for (const [s, n, id] of cases) it(`${n} → ${id}`, () => expect(pickTemplate(s, n)?.id).toBe(id))
})
