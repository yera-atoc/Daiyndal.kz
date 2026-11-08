import { describe, expect, it } from 'vitest'
import { planScheduleSync } from '@/lib/scheduleSync'

const groups = [
  { id: 'g5', name: '5-сынып 1-топ' },
  { id: 'g11', name: '11 кл ҰБТ' },
]

describe('planScheduleSync', () => {
  it('жоқ топты құрады, күндерін біріктіреді', () => {
    const p = planScheduleSync(
      [
        { teacher_id: 't1', group_id: 'g5', day_of_week: 1, title: null },
        { teacher_id: 't1', group_id: 'g5', day_of_week: 3, title: null },
        { teacher_id: 't2', group_id: null, day_of_week: 1, title: 'Физика 9' },
      ],
      [],
      groups,
      1
    )
    expect(p.create).toEqual([
      { teacher_id: 't1', name: '5-сынып 1-топ', group_id: 'g5', days: [1, 3] },
      { teacher_id: 't2', name: 'Физика 9', group_id: null, days: [1] },
    ])
    expect(p.missingToday).toBe(2)
  })
  it('бар топқа тек жетіспейтін күнін қосады', () => {
    const p = planScheduleSync(
      [
        { teacher_id: 't1', group_id: 'g5', day_of_week: 1, title: null },
        { teacher_id: 't1', group_id: 'g5', day_of_week: 5, title: null },
        { teacher_id: 't1', group_id: null, day_of_week: 2, title: '11 кл ҰБТ' },
      ],
      [
        { id: 'c1', teacher_id: 't1', name: 'Математика 5', group_id: 'g5', days: [1], active: true },
        { id: 'c2', teacher_id: 't1', name: '11 кл. ҰБТ', group_id: null, days: [], active: true },
      ],
      groups,
      5
    )
    expect(p.create).toEqual([])
    expect(p.addDays).toEqual([
      { id: 'c1', days: [1, 5] },
      { id: 'c2', days: [2] },
    ])
    expect(p.missingToday).toBe(1)
  })
  it('мұғалімі жоқ сабақты өткізеді', () => {
    expect(planScheduleSync([{ teacher_id: null, group_id: 'g5', day_of_week: 1, title: null }], [], groups).create).toEqual([])
  })
})
