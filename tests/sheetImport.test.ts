import { describe, expect, it } from 'vitest'
import { methodOf, normPhone, parseGroupHeader, parseLabel, parsePayments, parseWorkbook, type Sheet } from '@/lib/sheetImport'

// Ойдан шығарылған деректер (нақты оқушылардың аттары кодта сақталмайды)
const sheets: Sheet[] = [
  { name: 'Оқушылар тізімі', rows: [['№', 'Оқушының аты-жөні', 'бағыт', 'сынып', 'мектеп', 'мекен-жай', 'ата-анасының аты-жөні', 'телефон номері'], [1, 'Тестов Арман', 'НЗМ', 6, 7, 'x', 'Тестова Айгүл', 87001112233]] },
  {
    name: '6 кл ЖОЛТАЙ ағай',
    rows: [
      ['ЖОЛТАЙ АҒАЙ НЗМ 1 - ТОП', 'ЖОЛТАЙ АҒАЙ НЗМ 1 - ТОП'],
      ['№', 'Аты-жөні', 'Тел номері', 'Мектебі', 'Бағыты'],
      [1, 'Тестов Арман)', 87001112233, '7-мектеп', 'НЗМ/БИЛ'],
      [2, 'Ойдан Дана', '8 700 222 33 44 папасы', '', 'НЗМ'],
      [3],
      ['ЖОЛТАЙ АҒАЙ НЗМ 2 - АУСЫМ'],
      ['№', 'Аты-жөні', 'Тел номері'],
      [1, 'Үшінші Бала', null],
      ['ЖОЛТАЙ АҒАЙ БИЛ 2 - ТОП'],
      ['№', 'Аты-жөні', 'Тел номері'],
      [1],
    ],
  },
  { name: '11 кл', rows: [['ҰБТ 11-СЫНЫП 1 - ТОП'], ['№', 'Аты-жөні', 'Тел номері'], [1, 'Он Бір', 87005556677]] },
  {
    name: 'ЖОЛТАЙ АҒАЙ',
    rows: [
      ['Уақыт', 'Дүйсенбі', null, 'Сейсенбі'],
      ['08:30-09:30', 'Математика', 'Ағылшын т', 'Қазақ т'],
      [null, 'ЖОЛТАЙ АҒАЙ'],
      ['Уақыт', 'Дүйсенбі', 'Сейсенбі', 'Сәрсенбі', 'Бейсенбі', 'Жұма', 'Сенбі'],
      ['08:30-09:30', 'НЗМ 1', null, 'НЗМ 1', null, 'НЗМ 1', 'НЗМ 1'],
      ['15:00-16:00', null, 'НЗМ 2', null, 'БИЛ 2', null, 'Белгісіз 9'],
    ],
  },
  {
    name: 'Асан ағай',
    rows: [
      ['Асан ағай'],
      ['Уақыт', 'Дүйсенбі', 'Сейсенбі', 'Сәрсенбі', 'Бейсенбі', 'Жұма', 'Сенбі', 'Жексенбі'],
      ['17:00-18:00', '11-сынып,1-топ', null, null, null, null, null, '11-сынып, 1-топ'],
      ['18:00-19:00', '5-сынып'],
    ],
  },
  { name: 'толық төлемдер', rows: [['Аты-жөні', 'Сынып', 'Сентябрь', 'Октябрь'], ['Тестов Арман', 6, '118 000 тг 10.09 кюар', '118к 9.10 нал, 118к 9.10 нал'], ['Он Бір', 11, '52 800тг', null]] },
]

describe('sheetImport', () => {
  it('headers, labels, phones', () => {
    expect(parseGroupHeader('ЖОЛТАЙ АҒАЙ 5-СЫНЫП  2 - ауысым', 5)).toMatchObject({ name: '5-сынып 2-ауысым', teacherHint: 'Жолтай', kind: 'plain' })
    expect(parseGroupHeader('ҰБТ 11-СЫНЫП 3 - ТОП', 11)).toMatchObject({ name: '11-сынып 3-топ', teacherHint: '' })
    expect(parseGroupHeader('Математика', 5)).toBeNull()
    expect(parseLabel('Математика')).toBeNull()
    expect(parseLabel('7-8-9 сынып')).toEqual({ grades: [7, 8, 9], kind: null, num: null })
    expect(parseLabel('4 сынып-3')).toEqual({ grades: [4], kind: null, num: 3 })
    expect(parseLabel('6 сынып НЗМ-2')).toEqual({ grades: [6], kind: 'nzm', num: 2 })
    expect(parseLabel('БИЛ 1')).toEqual({ grades: [], kind: 'bil', num: 1 })
    expect(normPhone(87001112233)).toBe('77001112233')
    expect(normPhone('123')).toBe('')
    expect(methodOf('9.11 удл')).toBe('Kaspi (қашықтан)')
  })
  it('payments: amounts, dates, ranges, fallback', () => {
    expect(parsePayments('17.08-31.08 ар-ғы 9000 жіберді 04.09, 36 000тг кюар 5.09', 9, 2026).map((p) => [p.amount, p.paidOn])).toEqual([[9000, '2026-09-04'], [36000, '2026-09-05']])
    expect(parsePayments('62 000тг', 1, 2026)[0]).toMatchObject({ amount: 62000, paidOn: '2027-01-01' })
    expect(parsePayments('бастады 24.09', 9, 2026)).toEqual([])
  })
  it('whole workbook', () => {
    const r = parseWorkbook(sheets)
    expect(r.groups.map((g) => g.name)).toEqual(['НЗМ 1-топ', 'НЗМ 2-ауысым', '11-сынып 1-топ'])
    const nzm = r.groups[0]
    expect(nzm.students).toEqual([
      { name: 'Тестов Арман', parentName: 'Тестова Айгүл', parentPhone: '77001112233', note: 'НЗМ/БИЛ' },
      { name: 'Ойдан Дана', parentName: '', parentPhone: '77002223344', note: 'НЗМ' },
    ])
    expect(nzm.lessons).toEqual([{ days: [1, 3, 5, 6], start: '08:30', end: '09:30', teacherHint: 'Жолтай' }])
    expect(r.groups[1].lessons).toEqual([{ days: [2], start: '15:00', end: '16:00', teacherHint: 'Жолтай' }])
    expect(r.groups[2].lessons).toEqual([{ days: [1, 7], start: '17:00', end: '18:00', teacherHint: 'Асан' }])
    expect(r.warnings.some((w) => w.includes('БИЛ 2-топ') && w.includes('оқушы жоқ'))).toBe(true)
    expect(r.warnings.some((w) => w.includes('«5-сынып»'))).toBe(true)
    expect(r.payments).toEqual([
      { name: 'Тестов Арман', grade: 6, amount: 118000, paidOn: '2026-09-10', note: 'Кестеден · Kaspi QR' },
      { name: 'Тестов Арман', grade: 6, amount: 118000, paidOn: '2026-10-09', note: 'Кестеден · қолма-қол' },
      { name: 'Он Бір', grade: 11, amount: 52800, paidOn: '2026-09-01', note: 'Кестеден · күні жазылмаған' },
    ])
  })
})

import { driveId } from '@/lib/sheetImport'
describe('driveId', () => {
  it('only google links', () => {
    expect(driveId('https://docs.google.com/spreadsheets/d/1QzGRgsX0AA8-vuacc_B9Gcbn0PK79Xju/edit?usp=drive_link')).toBe('1QzGRgsX0AA8-vuacc_B9Gcbn0PK79Xju')
    expect(driveId('https://drive.google.com/open?id=1QzGRgsX0AA8-vuacc_B9Gcbn0PK79Xju')).toBe('1QzGRgsX0AA8-vuacc_B9Gcbn0PK79Xju')
    expect(driveId('https://evil.com/d/1QzGRgsX0AA8-vuacc_B9Gcbn0PK79Xju')).toBeNull()
    expect(driveId('not a url')).toBeNull()
  })
})
