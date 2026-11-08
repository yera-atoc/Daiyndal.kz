import { describe, expect, it } from 'vitest'
import { nextPlanItem, parsePlan, progressOf, scoreQuiz } from '@/lib/lesson'

describe('parsePlan', () => {
  it('жай тізім, нөмірлер мен үй тапсырмасы', () => {
    const p = parsePlan('1. Натурал сандар — үй: №12, 14\n2) Бөлшектер\n\n• Пайыз (2 сағ)')
    expect(p).toEqual([
      { topic: 'Натурал сандар', homework: '№12, 14' },
      { topic: 'Бөлшектер', homework: null },
      { topic: 'Пайыз (1/2)', homework: null },
      { topic: 'Пайыз (2/2)', homework: null },
    ])
  })
  it('Excel-ден көшірілген кесте', () => {
    const p = parsePlan('№\tТақырып\tСағат\tҮй тапсырмасы\n1\tКүш. Ньютон заңдары\t1\t§12, 3-жаттығу\n2\tҮйкеліс күші\t2\t§13')
    expect(p).toEqual([
      { topic: 'Күш. Ньютон заңдары', homework: '§12, 3-жаттығу' },
      { topic: 'Үйкеліс күші (1/2)', homework: '§13' },
      { topic: 'Үйкеліс күші (2/2)', homework: '§13' },
    ])
  })
  it('бос және сансыз жолдарды өткізеді', () => {
    expect(parsePlan('\n12\n---\nA')).toEqual([])
  })
})

describe('nextPlanItem', () => {
  const plan = [
    { id: 'a', position: 0 },
    { id: 'b', position: 1 },
    { id: 'c', position: 2 },
  ]
  it('ештеңе өтілмесе — бірінші', () => expect(nextPlanItem(plan, [])?.id).toBe('a'))
  it('соңғы өтілгеннен кейінгі', () => expect(nextPlanItem(plan, ['a', null, 'b'])?.id).toBe('c'))
  it('бәрі өтілсе — жоқ', () => expect(nextPlanItem(plan, ['c'])).toBeNull())
})

describe('progressOf', () => {
  it('қатарынан келмеу және қауіп', () => {
    const p = progressOf(
      [
        { date: '2026-11-02', status: 'present' },
        { date: '2026-11-05', status: 'absent' },
        { date: '2026-11-04', status: 'absent' },
      ],
      [{ date: '2026-11-02', mark: 'partial' }],
      [{ score: 3, total: 5 }]
    )
    expect(p.absStreak).toBe(2)
    expect(p.att).toBe(33)
    expect(p.hw).toBe(50)
    expect(p.quiz).toBe(60)
    expect(p.risk).toBe('high')
  })
  it('дерек жоқ — жақсы', () => expect(progressOf([], [], []).risk).toBe('ok'))
})

describe('scoreQuiz', () => {
  it('дұрыс жауаптарды санайды', () => {
    const qs = [
      { q: '1', options: ['a', 'b', 'c', 'd'], correct: 1 },
      { q: '2', options: ['a', 'b', 'c', 'd'], correct: 3 },
    ]
    expect(scoreQuiz(qs, [1, 9])).toEqual({ answers: [1, -1], score: 1, total: 2 })
  })
})
