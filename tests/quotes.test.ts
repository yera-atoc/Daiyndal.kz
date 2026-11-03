import { describe, expect, it } from 'vitest'
import { QUOTES, QUOTE_TOPICS, quoteIndexFor } from '@/lib/quotes'

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)

describe('quotes', () => {
  it('covers every topic and has valid entries', () => {
    for (const t of Object.keys(QUOTE_TOPICS)) expect(QUOTES.filter((q) => q.topic === t).length).toBeGreaterThanOrEqual(8)
    for (const q of QUOTES) expect(q.text.length && q.author.length).toBeTruthy()
  })
  it('"Келесі" (step 7) cycles through every quote', () => {
    expect(gcd(7, QUOTES.length)).toBe(1)
  })
  it('daily pick is stable and in range', () => {
    const i = quoteIndexFor('2026-11-03', 'Әли')
    expect(i).toBe(quoteIndexFor('2026-11-03', 'Әли'))
    expect(i).toBeGreaterThanOrEqual(0)
    expect(i).toBeLessThan(QUOTES.length)
  })
})
