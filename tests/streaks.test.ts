import { describe, expect, it } from 'vitest'
import { streaksOf } from '../lib/streaks'

const A = (date: string, status: string, classId = 'm') => ({ classId, date, status: status as any })
const H = (date: string, mark: string, classId = 'm') => ({ classId, date, mark: mark as any })
const days = (n: number, start = 1) => Array.from({ length: n }, (_, i) => `2026-11-${String(start + i).padStart(2, '0')}`)

describe('streaks', () => {
  it('қатысу сериясы: себепті үзбейді, келмеу үзеді', () => {
    const s = streaksOf({ att: [A('2026-10-30', 'present'), A('2026-11-01', 'absent'), A('2026-11-02', 'present'), A('2026-11-03', 'excused'), A('2026-11-04', 'late')], hw: [], marks: [], quiz: [] }, '2026-11-17')
    expect(s.att).toBe(2)
    expect(s.attBest).toBe(2)
  })
  it('ҮТ сериясы және ең ұзыны', () => {
    const hw = [...days(6).map((d) => H(d, 'done')), H('2026-11-07', 'partial'), H('2026-11-08', 'done')]
    const s = streaksOf({ att: [], hw, marks: [], quiz: [] }, '2026-11-17')
    expect(s.hw).toBe(1)
    expect(s.hwBest).toBe(6)
    expect(s.badges.find((b) => b.id === 'hw')).toMatchObject({ earned: true, title: '5 ҮТ қатар', progress: [1, 10] })
  })
  it('айлық мақсат тек осы ай', () => {
    const s = streaksOf({ att: [A('2026-10-31', 'absent'), ...days(4).map((d) => A(d, 'present'))], hw: [H('2026-11-02', 'done'), H('2026-11-04', 'none')], marks: [], quiz: [] }, '2026-11-17')
    expect(s.month).toEqual({ label: 'Қараша', attended: 4, held: 4, hwDone: 1, hwGiven: 2 })
    expect(s.badges.find((b) => b.id === 'month')!.earned).toBe(true)
  })
  it('белгілер: үздік баға, тест, өсу', () => {
    const marks = [5, 6, 9, 10].map((score, i) => ({ classId: 'm', date: days(4)[i], score, max: 10 }))
    const s = streaksOf({ att: [], hw: [], marks, quiz: [{ score: 5, total: 5 }] }, '2026-11-17')
    expect(s.badges.filter((b) => b.earned).map((b) => b.id)).toEqual(['perfect', 'quiz', 'grow'])
  })
  it('ең жақын мақсат', () => {
    const s = streaksOf({ att: days(3).map((d) => A(d, 'present')), hw: [H('2026-11-01', 'done')], marks: [], quiz: [] }, '2026-11-17')
    expect(s.next).toBe('Тағы 2 сабаққа қатарынан келсең — «5 сабақ қатар» белгісі')
  })
})
