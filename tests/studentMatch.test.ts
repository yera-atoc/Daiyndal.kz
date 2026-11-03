import { describe, expect, it } from 'vitest'
import { candidates, confident, nameScore, norm } from '@/lib/studentMatch'

const db = [
  { id: '1', full_name: 'Абдрахман Айсұлтан', grade: 4, group_id: 'g4', status: 'active' },
  { id: '2', full_name: 'Абран Инабат', grade: 11, group_id: 'g11', status: 'active' },
  { id: '3', full_name: 'Мағзұмова Сабина', grade: 11, group_id: 'g11', status: 'active' },
  { id: '4', full_name: 'Әмір Сәрсенбек', grade: 3, group_id: 'g3', status: 'active' },
  { id: '5', full_name: 'Әмір Қайратұлы', grade: 5, group_id: 'g5', status: 'active' },
  { id: '6', full_name: 'Әмір Нұрланұлы', grade: 5, group_id: 'g5b', status: 'active' },
  { id: '7', full_name: 'Кеткен Бала', grade: 5, group_id: 'g5', status: 'left' },
]

describe('student matching', () => {
  it('normalises Kazakh letters', () => {
    expect(norm('Әмір Қайратұлы?')).toBe('амир каиратулы')
  })
  it('handwriting misreads still match (word order free)', () => {
    expect(nameScore('Ораз Инабат?', 'Абран Инабат')).toBeGreaterThan(0.6)
    expect(confident(candidates('Сабина Мағзумова', 11, db))).toBe('3')
    expect(confident(candidates('Сәрсенбек Әмір', 3, db))).toBe('4')
  })
  it('first name only: ambiguous within the same grade, resolved by group hint', () => {
    const c = candidates('Әмір', 5, db)
    expect(c.map((x) => x.id).sort()).toEqual(['5', '6'])
    expect(confident(c)).toBeNull()
    expect(confident(candidates('Әмір', 5, db, new Set(['g5b'])))).toBe('6')
  })
  it('wrong grade and left students are not matched', () => {
    expect(candidates('Айсұлтан', 11, db).find((c) => c.id === '1')).toBeUndefined()
    expect(candidates('Кеткен Бала', 5, db)).toHaveLength(0)
  })
})
