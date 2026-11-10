import { describe, expect, it } from 'vitest'
import { gradeOfGroup, isAidynFifthGroup, planAssign, subjectsFromText } from '@/lib/assign'

const teachers = [
  { id: 'er', name: 'Ернар Белгібаев', subject: 'Ағылшын тілі' },
  { id: 'zh', name: 'Жолтай Қайрат', subject: 'Математика' },
  { id: 'as', name: 'Асан Жанұл', subject: 'Физика' },
  { id: 'ai', name: 'Айдын Әбілқайыр', subject: 'Математика' },
  { id: 'ak', name: 'Ақниет Рамазанова', subject: 'Қазақ тілі' },
  { id: 'al', name: 'Алуа', subject: 'Қазақстан тарихы' },
  { id: 'ru', name: 'Светлана', subject: 'Орыс тілі' },
]
const bt = [
  { id: 'nzm', name: 'НЗМ дайындық тобы', subjects: ['math', 'quant', 'science', 'kazakh', 'russian', 'english'].map((id) => ({ id })) },
  { id: 'eng5g3', name: '5 сынып · 3-топ (English)', subjects: ['reading', 'grammar', 'math'].map((id) => ({ id })) },
  { id: 'phys1', name: 'ҰБТ: Физика · 1-топ', subjects: [{ id: 'physics' }] },
  { id: 'eng5e', name: '5 сынып - English', subjects: ['reading', 'grammar', 'math'].map((id) => ({ id })) },
]
const groups = [
  { id: 'g1', name: 'НЗМ дайындық тобы', bt_group_id: 'nzm' },
  { id: 'g2', name: '5 сынып · 3-топ (English)', bt_group_id: 'eng5g3' },
  { id: 'g3', name: 'ҰБТ: Физика · 1-топ', bt_group_id: 'phys1' },
  { id: 'g4', name: '11-сынып ҰБТ 2-топ' },
  { id: 'g5', name: '3-сынып 1-топ' },
  { id: 'g6', name: '5 сынып - English', bt_group_id: 'eng5e' },
  { id: 'g7', name: '11-сынып ҰБТ: жеке пәндер' },
  { id: 'g8', name: 'Бос топ' },
]
const students = [
  { id: 's1', full_name: 'Нұрсат', group_id: 'g1' },
  { id: 's2', full_name: 'Бибі', group_id: 'g2' },
  { id: 's3', full_name: 'Алима', group_id: 'g2' },
  { id: 's4', full_name: 'Зере', group_id: 'g2' },
  { id: 's5', full_name: 'Арман', group_id: 'g3' },
  { id: 's6', full_name: 'Дана', group_id: 'g4' },
  { id: 's7', full_name: 'Аружан', group_id: 'g5' },
  { id: 's8', full_name: 'Айзере', group_id: 'g6' },
  { id: 's9', full_name: 'Мейір', group_id: 'g7' },
]

describe('planAssign', () => {
  const rows = planAssign({ groups, btGroups: bt, students, teachers, slots: [] })
  const pick = (g: string, s: string) => rows.find((r) => r.groupId === g && r.subject === s)?.teacherId
  it('НЗМ: математика — Жолтай, ағылшын — Ернар, қазақ — Ақниет, орыс — орыс тілі мұғалімі', () => {
    expect(pick('g1', 'math')).toBe('zh')
    expect(pick('g1', 'english')).toBe('er')
    expect(pick('g1', 'kazakh')).toBe('ak')
    expect(pick('g1', 'russian')).toBe('ru')
    expect(pick('g1', 'science')).toBeNull()
  })
  it('Бибі, Алима, Зере тобы: математика — Айдын, ағылшын — Ернар', () => {
    expect(pick('g2', 'math')).toBe('ai')
    expect(pick('g2', 'english')).toBe('er')
  })
  it('басқа 5 сынып математикасы — Жолтай (Айзере есептелмейді)', () => expect(pick('g6', 'math')).toBe('zh'))
  it('физика — Асан', () => expect(pick('g3', 'physics')).toBe('as'))
  it('11 сынып ҰБТ және 3 сынып — Айдын', () => {
    expect(pick('g4', 'math')).toBe('ai')
    expect(pick('g5', 'math')).toBe('ai')
  })
  it('жеке пәндер — қолмен, бос топ — жоқ', () => {
    expect(rows.find((r) => r.groupId === 'g7')?.teacherId).toBeNull()
    expect(rows.some((r) => r.groupId === 'g8')).toBe(false)
  })
})

describe('көмекшілер', () => {
  it('сынып', () => {
    expect(gradeOfGroup('4 class - English')).toBe(4)
    expect(gradeOfGroup('Pre-IELTS 9–10 сынып · 1-топ')).toBe(9)
    expect(gradeOfGroup('11-сынып ҰБТ 1-топ')).toBe(11)
    expect(gradeOfGroup('ҰБТ: Физика · 3-топ')).toBe(11)
    expect(gradeOfGroup('БИЛ дайындық тобы')).toBe(6)
  })
  it('пән атаудан', () => {
    expect(subjectsFromText('Информатика 9 сынып')).toEqual(['informatics'])
    expect(subjectsFromText('English A1–A2')).toEqual(['english'])
  })
  it('Бибі тобы', () => {
    expect(isAidynFifthGroup(['Бибі', 'Зере', 'Арман'])).toBe(true)
    expect(isAidynFifthGroup(['Айзере', 'Айбибі', 'Алима'])).toBe(false)
  })
})
