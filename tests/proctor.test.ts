import { describe, expect, it } from 'vitest'
import { analyze, sanitize, type ProctorRaw } from '@/lib/proctor'

const base = (p: Partial<ProctorRaw> = {}): ProctorRaw => ({ startedAt: 1_000_000, endedAt: 1_000_000 + 30 * 60_000, questions: 20, leaves: [], copy: 0, paste: 0, menu: 0, fsExit: 0, split: 0, marks: [], ...p })
const marks = (n: number, gap: number, start = 0) => Array.from({ length: n }, (_, i) => ({ i: String(i), t: start + i * gap }))

describe('proctor analysis', () => {
  it('clean attempt', () => {
    const a = analyze(base({ marks: marks(20, 60_000) }))
    expect(a.risk).toBe('ok')
    expect(a.flags).toHaveLength(0)
    expect(a.stats.avgSec).toBe(57)
  })
  it('one short leave → medium, three leaves → high', () => {
    expect(analyze(base({ leaves: [{ at: 1_100_000, ms: 5000 }] })).risk).toBe('medium')
    expect(analyze(base({ leaves: [1, 2, 3].map((k) => ({ at: 1_000_000 + k * 100_000, ms: 4000 })) })).risk).toBe('high')
    expect(analyze(base({ leaves: [{ at: 1_100_000, ms: 70_000 }] })).risk).toBe('high')
  })
  it('paste is high, copy is medium', () => {
    expect(analyze(base({ paste: 1 })).risk).toBe('high')
    expect(analyze(base({ copy: 1 })).risk).toBe('medium')
  })
  it('answers right after coming back from another app', () => {
    // 3 рет шығып, әр оралған соң 5 сек ішінде жауап береді
    const leaves = [100_000, 300_000, 500_000].map((t) => ({ at: 1_000_000 + t, ms: 30_000 }))
    const m = [135_000, 335_000, 535_000].map((t, i) => ({ i: `q${i}`, t }))
    const a = analyze(base({ leaves, marks: m }))
    expect(a.stats.afterReturn).toBe(3)
    expect(a.flags.some((f) => f.text.includes('бірден'))).toBe(true)
    expect(a.risk).toBe('high')
  })
  it('too fast answering on a long test', () => {
    const a = analyze(base({ marks: marks(20, 1500) }))
    expect(a.stats.fastShare).toBe(1)
    expect(a.risk).toBe('medium')
  })
  it('only the first answer per question counts', () => {
    const a = analyze(base({ marks: [{ i: '1', t: 1000 }, { i: '1', t: 1500 }, { i: '2', t: 90_000 }] }))
    expect(a.stats.answers).toBe(2)
  })
  it('sanitizes input', () => {
    expect(sanitize(null)).toBeNull()
    expect(sanitize({ startedAt: 10, endedAt: 5 })).toBeNull()
    const s = sanitize({ startedAt: 1, endedAt: 2, leaves: Array(500).fill({ at: 1, ms: -5 }), marks: [{ i: 'x'.repeat(100), t: 5 }] })!
    expect(s.leaves).toHaveLength(200)
    expect(s.leaves[0].ms).toBe(0)
    expect(s.marks[0].i).toHaveLength(40)
  })
})
