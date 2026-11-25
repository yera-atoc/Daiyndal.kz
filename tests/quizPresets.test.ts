import { describe, expect, it } from 'vitest'
import { QUIZ_PRESETS, quizPreset } from '../lib/quizPresets'
import { scoreQuiz } from '../lib/lesson'

describe('quiz presets', () => {
  it('A1 test has 100 valid questions', () => {
    const p = quizPreset('atoc-a1-100')!
    expect(p.questions).toHaveLength(100)
    for (const q of p.questions) {
      expect(q.options).toHaveLength(4)
      expect(new Set(q.options).size).toBe(4)
      expect(q.correct).toBeGreaterThanOrEqual(0)
      expect(q.correct).toBeLessThan(4)
    }
    expect(scoreQuiz(p.questions, p.questions.map((q) => q.correct)).score).toBe(100)
  })
  it('preset ids are unique', () => {
    expect(new Set(QUIZ_PRESETS.map((p) => p.id)).size).toBe(QUIZ_PRESETS.length)
  })
})
