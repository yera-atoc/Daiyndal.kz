import { describe, expect, it } from 'vitest'
import { buildOverview, weekday, type InsightAtt } from '@/lib/teacherInsights'

const today = '2026-11-03' // сейсенбі
const cls = { id: 'c1', name: 'НЗМ-5А', subject: 'Математика', days: [1, 3], active: true }
const stu = (id: string, extra: Partial<{ payment_deadline: string | null; status: string }> = {}) => ({
  id,
  full_name: id.toUpperCase(),
  grade: 5,
  status: 'active',
  rating_points: 10,
  payment_deadline: null,
  group_name: null,
  ...extra,
})
const a = (student_id: string, date: string, status: InsightAtt['status']): InsightAtt => ({ class_id: 'c1', student_id, date, status })

describe('teacher overview', () => {
  it('weekday: 1 = дүйсенбі, 7 = жексенбі', () => {
    expect(weekday('2026-11-02')).toBe(1)
    expect(weekday('2026-11-08')).toBe(7)
  })

  it('flags absence streaks, overdue payments and unmarked lessons', () => {
    const o = buildOverview({
      today,
      classes: [cls],
      members: [{ class_id: 'c1', student_id: 'a' }, { class_id: 'c1', student_id: 'b' }, { class_id: 'c1', student_id: 'gone' }],
      students: [stu('a'), stu('b', { payment_deadline: '2026-10-30' }), stu('gone', { status: 'left' })],
      attendance: [
        a('a', '2026-10-26', 'present'),
        a('a', '2026-10-28', 'absent'),
        a('a', '2026-11-02', 'absent'),
        a('b', '2026-10-26', 'present'),
        a('b', '2026-10-28', 'excused'),
        a('b', '2026-11-02', 'late'),
      ],
      lessons: [],
    })

    expect(o.totals.students).toBe(2)
    const sa = o.students.find((s) => s.id === 'a')!
    expect(sa.absentStreak).toBe(2)
    expect(sa.rate).toBe(33)
    expect(sa.risk).toBe('high')
    const sb = o.students.find((s) => s.id === 'b')!
    expect(sb.rate).toBe(100) // себепті есепке кірмейді
    expect(sb.risk).toBe('high') // төлем кешікті
    expect(o.students[0].id).toBe('a') // қауіптілер жоғарыда

    // 28.10 (ср) және 02.11 (дс) белгіленген; 7 күн ішінде басқа сабақ күні жоқ
    expect(o.classes[0].unmarked).toEqual([])
    expect(o.alerts.some((x) => x.kind === 'absence' && x.studentId === 'a')).toBe(true)
    expect(o.alerts.some((x) => x.kind === 'payment' && x.studentId === 'b')).toBe(true)
  })

  it('reminds about scheduled days without attendance, skipping cancelled ones', () => {
    const o = buildOverview({
      today,
      classes: [cls],
      members: [{ class_id: 'c1', student_id: 'a' }],
      students: [stu('a')],
      attendance: [],
      lessons: [{ class_id: 'c1', date: '2026-10-28', cancelled: true }],
    })
    expect(o.classes[0].unmarked).toEqual(['2026-11-02'])
    expect(o.alerts.find((x) => x.kind === 'journal')?.level).toBe('info')
  })
})
