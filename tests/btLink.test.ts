import { describe, expect, it } from 'vitest'
import { planBtLink } from '@/lib/btLink'

const btGroups = [{ id: 'b1', name: 'НЗМ дайындық 1-топ' }, { id: 'b2', name: 'БИЛ 6 сынып' }]

describe('planBtLink', () => {
  it('екі топтағы бір баланы бір рет қосады', () => {
    const p = planBtLink(
      [
        { id: 'x1', full_name: 'Сері Аман', group_id: 'b1' },
        { id: 'x2', full_name: 'Сері Аман', group_id: 'b2' },
      ],
      btGroups,
      [],
      []
    )
    expect(p.create.map((c) => c.btId)).toEqual(['x1'])
    expect(p.ambiguous).toEqual(['Сері Аман (екі топта)'])
    // қайта басқанда — қайталанбайды
    const again = planBtLink(
      [
        { id: 'x1', full_name: 'Сері Аман', group_id: 'b1' },
        { id: 'x2', full_name: 'Сері Аман', group_id: 'b2' },
      ],
      btGroups,
      [{ id: 'c1', full_name: 'Сері Аман', group_id: 'g1', bt_student_id: 'x1' }],
      []
    )
    expect(again.create).toEqual([])
    expect(again.ambiguous).toEqual([])
  })
  it('аттас CRM оқушысын байланыстырады, жоғын құрады, топты жасайды', () => {
    const p = planBtLink(
      [
        { id: 'x1', full_name: 'Азизов Айтбек', group_id: 'b1' },
        { id: 'x2', full_name: 'Сері Аман', group_id: 'b1' },
        { id: 'x3', full_name: 'Нұрлан Ая)', group_id: 'b2' },
      ],
      btGroups,
      [{ id: 'c1', full_name: 'Айтбек  Азизов', group_id: null, bt_student_id: null }],
      [{ id: 'g1', name: 'НЗМ дайындық 1-топ', bt_group_id: null }]
    )
    expect(p.link).toEqual([{ crmId: 'c1', btId: 'x1', name: 'Азизов Айтбек' }])
    expect(p.create).toEqual([
      { btId: 'x2', full_name: 'Сері Аман', btGroupId: 'b1' },
      { btId: 'x3', full_name: 'Нұрлан Ая', btGroupId: 'b2' },
    ])
    expect(p.newGroups).toEqual([{ btGroupId: 'b2', name: 'БИЛ 6 сынып' }])
  })
  it('байланған оқушыны өткізеді, аттас екеуін қолмен тексеруге қалдырады', () => {
    const p = planBtLink(
      [
        { id: 'x1', full_name: 'Медина', group_id: 'b1' },
        { id: 'x2', full_name: 'Дана', group_id: 'b1' },
      ],
      btGroups,
      [
        { id: 'c1', full_name: 'Медина', group_id: 'g5', bt_student_id: null },
        { id: 'c2', full_name: 'Медина', group_id: 'g6', bt_student_id: null },
        { id: 'c3', full_name: 'Дана', group_id: null, bt_student_id: 'x2' },
      ],
      []
    )
    expect(p.ambiguous).toEqual(['Медина'])
    expect(p.link).toEqual([])
    expect(p.create).toEqual([])
  })
})
