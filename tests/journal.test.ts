import { describe, expect, it } from 'vitest'
import { fillState, isLessonDay, lessonDates, nextStatus, weekStartOf, weekStats, weekdayOf } from '../lib/journal'

describe('journal dates', () => {
  it('week starts on Monday', () => {
    expect(weekStartOf('2026-10-26')).toBe('2026-10-26') // дүйсенбі
    expect(weekStartOf('2026-11-01')).toBe('2026-10-26') // жексенбі
    expect(weekdayOf('2026-10-28')).toBe(3)
  })
  it('lesson days: schedule, cancelled and extra', () => {
    expect(isLessonDay('2026-10-26', [1, 3, 5])).toBe(true)
    expect(isLessonDay('2026-10-26', [1, 3, 5], { cancelled: true })).toBe(false)
    expect(isLessonDay('2026-10-27', [1, 3, 5], { cancelled: false })).toBe(true)
    expect(lessonDates('2026-10-26', [1, 3, 5], [{ date: '2026-10-28', topic: null, homework: null, cancelled: true }])).toEqual(['2026-10-26', '2026-10-30'])
  })
  it('cycles attendance marks', () => {
    expect(nextStatus(null)).toBe('present')
    expect(nextStatus('excused')).toBe(null)
  })
  it('fill stats ignore future lessons', () => {
    const d = {
      class: { id: 'c', teacher_id: 't', name: 'x', subject: null, group_id: null, days: [1, 3, 5], active: true, position: 0 },
      students: [{ id: 'a', full_name: 'A' }, { id: 'b', full_name: 'B' }],
      weekStart: '2026-10-26',
      week: { topic: 'Пропорция', homework: null, note: null },
      lessons: [],
      attendance: [{ student_id: 'a', date: '2026-10-26', status: 'present' as const }, { student_id: 'b', date: '2026-10-26', status: 'absent' as const }],
    }
    const s = weekStats(d, '2026-10-27')
    expect(s).toMatchObject({ lessons: 1, expected: 2, marked: 2, present: 1, absent: 1, weekTopic: true })
    expect(fillState(s).label).toBe('Толық')
  })
})
