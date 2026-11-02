import { describe, expect, it } from 'vitest'
import { buildJarvis, forecastRevenue } from '@/lib/jarvis'
import { buildOverview } from '@/lib/teacherInsights'

const today = '2026-11-03'
const now = '2026-11-03T06:00:00.000Z'
const students = [
  { id: 'a', full_name: 'Әли', status: 'active', payment_deadline: '2026-10-25', payment_amount: 30000, teacher_id: 't1' },
  { id: 'b', full_name: 'Дана', status: 'active', payment_deadline: '2026-11-05', payment_amount: 25000, teacher_id: 't1' },
  { id: 'c', full_name: 'Ерлан', status: 'paused', payment_deadline: null, payment_amount: null, teacher_id: null },
]

describe('jarvis', () => {
  it('forecast = received + this month deadlines of active students', () => {
    expect(forecastRevenue(today, 100000, students)).toBe(155000)
  })

  it('builds KPIs, alerts and briefing', () => {
    const overview = buildOverview({
      today,
      classes: [{ id: 'c1', name: 'НЗМ-5', subject: 'Математика', days: [1, 3], active: true }],
      members: [{ class_id: 'c1', student_id: 'a' }, { class_id: 'c1', student_id: 'b' }],
      students: students.map((s) => ({ ...s, grade: 5, rating_points: 0, group_name: null })),
      attendance: [
        { class_id: 'c1', student_id: 'a', date: '2026-10-28', status: 'absent' },
        { class_id: 'c1', student_id: 'a', date: '2026-11-02', status: 'absent' },
        { class_id: 'c1', student_id: 'b', date: '2026-10-28', status: 'present' },
        { class_id: 'c1', student_id: 'b', date: '2026-11-02', status: 'present' },
      ],
      lessons: [],
    })
    const j = buildJarvis({
      today,
      now,
      students,
      teachers: [{ id: 't1', name: 'Ернар', subject: 'Ағылшын' }],
      classTeacher: { c1: 't1' },
      payments: [
        { student_id: 'b', amount: 25000, paid_on: '2026-11-01' },
        { student_id: 'a', amount: 30000, paid_on: '2026-10-01' },
      ],
      crmAttendance: [
        { student_id: 'a', date: '2026-11-02', present: false, excused: false },
        { student_id: 'b', date: '2026-11-02', present: true, excused: false },
      ],
      leads: [
        { created_at: '2026-11-02T10:00:00Z', status: 'new', source: 'form', child_name: 'X' },
        { created_at: '2026-10-20T10:00:00Z', status: 'enrolled', source: 'trial', child_name: 'Y' },
      ],
      errors24: [],
      actions24: 4,
      lessonsToday: [{ time: '15:00', end: '16:30', title: 'НЗМ-5', teacher: 'Ернар', room: null }],
      overview,
      missing: [],
    })

    expect(j.kpi.activeStudents).toBe(2)
    expect(j.kpi.revenueMonth).toBe(25000)
    expect(j.kpi.revenuePrev).toBe(30000)
    expect(j.kpi.overdue).toBe(1)
    expect(j.kpi.debt).toBe(30000)
    expect(j.kpi.attendance30).toBe(50)
    expect(j.kpi.newLeads).toBe(1)
    expect(j.kpi.conversion30).toBe(50)
    expect(j.kpi.atRisk).toBe(1)
    expect(j.teachers[0]).toMatchObject({ name: 'Ернар', students: 2, classes: 1, rate: 50, atRisk: 1 })
    expect(j.alerts[0].level).toBe('high')
    expect(j.alerts.some((a) => a.area === 'lead')).toBe(true)
    expect(j.briefing[0]).toContain('15:00')
    expect(j.revenue6).toHaveLength(6)
  })
})

import { adminFirstName, greeting } from '@/lib/jarvis'
import { weatherSentence, wmo } from '@/lib/weather'

describe('manager greeting & weather', () => {
  it('greets by Almaty hour', () => {
    expect(greeting(7)).toBe('Қайырлы таң')
    expect(greeting(13)).toBe('Қайырлы күн')
    expect(greeting(19)).toBe('Қайырлы кеш')
    expect(greeting(2)).toBe('Қайырлы түн')
  })
  it('names the admin', () => {
    expect(adminFirstName({ kind: 'owner', name: 'Иесі' })).toBe('Ернар')
    expect(adminFirstName({ kind: 'teacher', name: 'Диана Серікқызы' })).toBe('Диана')
  })
  it('describes weather', () => {
    expect(wmo(0).label).toContain('ашық')
    const w = { city: 'Жезқазған', now: { temp: -3, code: 3, label: 'бұлтты', icon: '', wind: 4 }, today: { date: '2026-11-03', min: -6, max: 2, code: 3, label: 'бұлтты', icon: '', rain: 10, wind: 5 }, tomorrow: { date: '2026-11-04', min: -8, max: -1, code: 71, label: 'қар', icon: '', rain: 60, wind: 7 } }
    expect(weatherSentence(w)).toBe('Жезқазғанда бүгін бұлтты, -6…+2°C (қазір -3°). Ертең қар, -8…-1°C.')
  })
})
