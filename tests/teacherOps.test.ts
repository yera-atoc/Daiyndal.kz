import { describe, expect, it } from 'vitest'
import { monthRange, reminderText, teacherReports, weekStart, weeklyText } from '@/lib/teacherOps'
import { parseQuestions } from '@/lib/aiTest'

// 2026-11-02 — дүйсенбі
const base = {
  from: '2026-11-02',
  to: '2026-11-08',
  today: '2026-11-06', // жұма
  teachers: [
    { id: 't1', name: 'Жолтай Қайрат', subject: 'Математика', phone: '77011112233', lesson_rate: 5000 },
    { id: 't2', name: 'Айдын ағай', subject: 'Математика', phone: null, lesson_rate: null },
  ],
  classes: [
    { id: 'c1', teacher_id: 't1', name: 'НЗМ 1-топ', days: [1, 3, 5], active: true },
    { id: 'c2', teacher_id: 't2', name: '3-сынып', days: [2, 4], active: true },
  ],
  members: [{ class_id: 'c1', student_id: 's1' }, { class_id: 'c1', student_id: 's2' }, { class_id: 'c2', student_id: 's3' }],
  students: [{ id: 's1', status: 'active' }, { id: 's2', status: 'left' }, { id: 's3', status: 'active' }],
}

describe('teacher reports', () => {
  it('counts held vs scheduled lessons up to today, unmarked past lessons, pay', () => {
    const rows = teacherReports({
      ...base,
      attendance: [
        { class_id: 'c1', student_id: 's1', date: '2026-11-02', status: 'present' as const },
        { class_id: 'c1', student_id: 's1', date: '2026-11-04', status: 'absent' as const },
      ],
      lessons: [{ class_id: 'c1', date: '2026-11-02', cancelled: false, topic: 'Бөлшектер', homework: null }],
    })
    const t1 = rows.find((r) => r.id === 't1')!
    expect(t1.scheduled).toBe(3) // дс, ср, жм (жұма — бүгін)
    expect(t1.held).toBe(2)
    expect(t1.unmarked).toEqual([]) // жұма бүгін — әлі ерте
    expect(t1.topics).toBe(1)
    expect(t1.attendance).toBe(50)
    expect(t1.journal).toBe(67)
    expect(t1.retention).toBe(50)
    expect(t1.pay).toBe(10000)
    const t2 = rows.find((r) => r.id === 't2')!
    expect(t2.scheduled).toBe(2) // сс, бс
    expect(t2.unmarked.map((u) => u.date)).toEqual(['2026-11-03', '2026-11-05'])
    expect(t2.pay).toBeNull()
    expect(rows[0].id).toBe('t1') // рейтинг бойынша жоғары
  })
  it('helpers', () => {
    expect(weekStart('2026-11-06')).toBe('2026-11-02')
    expect(monthRange('2026-02')).toEqual(['2026-02-01', '2026-02-28'])
    const r = teacherReports({ ...base, attendance: [], lessons: [] }).find((x) => x.id === 't2')!
    expect(reminderText(r)).toContain('3-сынып (03.11)')
    expect(weeklyText(r, '2026-11-02', '2026-11-08')).toContain('белгіленбеген')
  })
})

describe('AI test parsing', () => {
  it('keeps only valid questions', () => {
    const text = 'Міне:\n[{"question":"2+2?","options":["3","4","5","6"],"correct":1},{"question":"","options":["a"],"correct":0},{"question":"x","options":["a","b","c","d"],"correct":7}]'
    const q = parseQuestions(text, 10)
    expect(q).toHaveLength(1)
    expect(q[0]).toEqual({ questionText: '2+2?', options: ['3', '4', '5', '6'], correctIndex: 1 })
  })
})
