import { describe, expect, it } from 'vitest'
import { busyMinutes, homeRoom, isNow, normalizeRoom, roomDay, roomOf, type SlotLike } from '@/lib/rooms'

const T: Record<string, string> = { t1: 'Жолтай Қайрат', t2: 'Айдын Әбілқайыр', t3: 'Ернар Белгібаев', t4: 'Асан ағай', t9: 'Диана' }
const slot = (id: string, teacher: string, dow: number, a: string, b: string, room: string | null = null): SlotLike => ({ id, teacher_id: teacher, group_id: null, day_of_week: dow, start_time: a + ':00', end_time: b + ':00', title: id, room })

describe('rooms', () => {
  it('normalizes room text and home rooms', () => {
    expect(normalizeRoom('3')).toBe('3-кабинет')
    expect(normalizeRoom('Кабинет 2')).toBe('2-кабинет')
    expect(normalizeRoom('қосымша')).toBe('5-кабинет')
    expect(normalizeRoom('9')).toBeNull()
    expect(normalizeRoom('')).toBeNull()
    expect(homeRoom('Асан ағай')).toBe('4-кабинет')
    expect(homeRoom('Диана')).toBeNull()
  })
  it('room of a slot: set → home → extra', () => {
    expect(roomOf(slot('a', 't1', 1, '16:00', '17:00'), T.t1)).toEqual({ room: '1-кабинет', auto: true })
    expect(roomOf(slot('a', 't1', 1, '16:00', '17:00', '5'), T.t1)).toEqual({ room: '5-кабинет', auto: false })
    expect(roomOf(slot('a', 't9', 1, '16:00', '17:00'), T.t9)).toEqual({ room: '5-кабинет', auto: true })
  })
  it('day plan with free gaps and clashes', () => {
    const slots = [
      slot('x', 't9', 1, '10:00', '11:00'),
      slot('y', 't1', 1, '10:30', '11:30', '5'),
      slot('z', 't9', 1, '15:00', '16:30'),
      slot('w', 't9', 2, '10:00', '11:00'),
    ]
    const p = roomDay(slots, 1, (id) => T[id], '5-кабинет')
    expect(p.map((x) => (x.kind === 'free' ? `free ${x.start}-${x.end}` : `${x.slot.id}${x.clash ? '!' : ''}`))).toEqual([
      'free 08:30-10:00', 'x!', 'y!', 'free 11:30-15:00', 'z', 'free 16:30-20:00',
    ])
    expect(busyMinutes(p)).toBe(210)
    const sat = roomDay([slot('s', 't1', 6, '09:00', '10:00')], 6, (id) => T[id], '1-кабинет')
    expect(sat[0].kind).toBe('lesson')
    expect(isNow(p[4], 1, 1, 15 * 60 + 10)).toBe(true)
    expect(isNow(p[4], 1, 2, 15 * 60 + 10)).toBe(false)
  })
})
