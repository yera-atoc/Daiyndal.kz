import { describe, expect, it } from 'vitest'
import { helpMessage, helpReasons, helpScore } from '../lib/help'

const att = (...s: string[]) => s.map((status, i) => ({ date: `2026-11-${String(i + 1).padStart(2, '0')}`, status: status as any }))
const hw = (...m: string[]) => m.map((mark, i) => ({ date: `2026-11-${String(i + 1).padStart(2, '0')}`, mark: mark as any }))
const mk = (...v: number[]) => v.map((score, i) => ({ date: `2026-11-${String(i + 1).padStart(2, '0')}`, score, max: 10 }))
const none = { att: [], hw: [], marks: [], quiz: [] }

describe('help: себептер', () => {
  it('бәрі жақсы — бос', () => {
    expect(helpReasons({ att: att('present', 'present', 'late'), hw: hw('done', 'partial', 'done'), marks: mk(8, 9), quiz: [{ score: 4, total: 5 }] })).toEqual([])
    expect(helpReasons(none)).toEqual([])
  })
  it('қатарынан келмеу қатысу %-дан басым', () => {
    const r = helpReasons({ ...none, att: att('present', 'absent', 'absent', 'absent') })
    expect(r).toEqual([{ tone: 'bad', kind: 'absent', text: '3 сабаққа қатарынан келмеді' }])
  })
  it('себепті қатысуды бұзбайды', () => {
    expect(helpReasons({ ...none, att: att('present', 'excused', 'excused', 'present') })).toEqual([])
  })
  it('төмен қатысу (кемі 3 сабақ)', () => {
    expect(helpReasons({ ...none, att: att('absent', 'present', 'absent', 'present') })[0].text).toBe('қатысу 50% (2 сабақ қалды)')
    expect(helpReasons({ ...none, att: att('absent', 'present') })).toEqual([])
  })
  it('ҮТ: қатарынан 3 рет — қызыл, жалпы төмен — сары', () => {
    expect(helpReasons({ ...none, hw: hw('done', 'none', 'none', 'none') })[0]).toMatchObject({ tone: 'bad', kind: 'homework' })
    expect(helpReasons({ ...none, hw: hw('none', 'partial', 'none', 'done') })[0]).toMatchObject({ tone: 'warn', text: 'үй тапсырмасы 38%' })
  })
  it('бағалар: төмен немесе түсіп бара жатыр', () => {
    expect(helpReasons({ ...none, marks: mk(3, 4) })[0]).toMatchObject({ tone: 'bad', kind: 'marks' })
    expect(helpReasons({ ...none, marks: mk(9, 9, 6, 6) })[0]).toMatchObject({ tone: 'warn', kind: 'falling' })
  })
  it('реті мен хабарлама', () => {
    expect(helpScore([{ tone: 'bad', kind: 'absent', text: '' }, { tone: 'warn', kind: 'quiz', text: '' }])).toBe(4)
    const t = helpMessage('Дана Сейітова Ерланқызы', [{ subject: 'Математика', className: 'x', reasons: [{ tone: 'bad', kind: 'absent', text: '2 сабаққа қатарынан келмеді' }] }], 'https://x/r/1')
    expect(t).toContain('Дана Сейітова бойынша')
    expect(t).toContain('• Математика: 2 сабаққа қатарынан келмеді')
    expect(t).toContain('https://x/r/1')
  })
})
