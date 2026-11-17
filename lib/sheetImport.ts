// «BELES EDUCATION.xlsx» кестесін талдау: сынып беттерінен топтар мен оқушылар, мұғалім беттерінен сабақ кестесі,
// «толық төлемдер» бетінен айлық төлемдер. Таза функциялар: жолдар → жоспар (енгізу бетінде тексеріліп, сосын енгізіледі).
// Оқушылардың жеке деректері кодта сақталмайды — файлды әкімші өзі жүктейді.

export type Cell = string | number | null
export type Sheet = { name: string; rows: Cell[][] }

export type SheetLesson = { days: number[]; start: string; end: string; teacherHint: string }
export type SheetStudent = { name: string; parentName: string; parentPhone: string; note: string }
export type SheetGroup = { key: string; name: string; grade: number | null; kind: 'nzm' | 'bil' | 'plain'; num: number; teacherHint: string; lessons: SheetLesson[]; students: SheetStudent[] }
export type SheetPayment = { name: string; grade: number | null; amount: number; paidOn: string; note: string }
export type SheetResult = { groups: SheetGroup[]; payments: SheetPayment[]; warnings: string[] }

const TEACHERS = ['Жолтай', 'Айдын', 'Ернар', 'Диана', 'Асан']
// «жексенбі» сөзінде «сенбі» бар — сондықтан жексенбі бірінші тексеріледі
const DAY_WORDS: [RegExp, number][] = [[/жексен/i, 7], [/дүйсен/i, 1], [/сейсен/i, 2], [/сәрсен/i, 3], [/бейсен/i, 4], [/жұма/i, 5], [/сенбі/i, 6]]

const str = (c: Cell) => (c === null || c === undefined ? '' : String(c)).replace(/\s+/g, ' ').trim()
export const cleanPerson = (s: string) => str(s).replace(/[()]+/g, ' ').replace(/\s+/g, ' ').trim()
const low = (s: string) => s.toLowerCase().replace(/ё/g, 'е')

export function normPhone(c: Cell): string {
  let d = str(c).replace(/\.0+$/, '').replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('8')) d = '7' + d.slice(1)
  if (d.length === 10) d = '7' + d
  return d.length === 11 && d.startsWith('7') ? d : ''
}

export function teacherOf(text: string): string {
  return TEACHERS.find((t) => low(text).includes(low(t))) ?? ''
}

// ── Топ тақырыбы: «ЖОЛТАЙ АҒАЙ НЗМ 1 - ТОП», «АЙДЫН АҒАЙ 5-СЫНЫП 2 - ТОП», «ЖОЛТАЙ АҒАЙ 5-СЫНЫП 2 - ауысым», «ҰБТ 11-СЫНЫП 3 - ТОП»
export function parseGroupHeader(text: string, sheetGrade: number | null) {
  const t = str(text)
  if (!/топ|ау[ы]?сым/i.test(t)) return null
  const kind: SheetGroup['kind'] = /нзм|ниш/i.test(t) ? 'nzm' : /бил|біл/i.test(t) ? 'bil' : 'plain'
  const g = /(\d{1,2})\s*-?\s*сынып/i.exec(t)
  const grade = g ? Number(g[1]) : kind === 'plain' ? sheetGrade : 6
  const n = /(\d)\s*-?\s*(топ|ау[ы]?сым)/i.exec(t)
  const shift = /ау[ы]?сым/i.test(t)
  const num = n ? Number(n[1]) : 1
  const label = kind === 'nzm' ? 'НЗМ' : kind === 'bil' ? 'БИЛ' : `${grade}-сынып`
  const name = `${label} ${num}-${shift ? 'ауысым' : 'топ'}`
  return { kind, grade, name, teacherHint: teacherOf(t), shift, num }
}

const sheetGradeOf = (name: string) => {
  const m = /^(\d{1,2})\s*кл/i.exec(str(name))
  return m ? Number(m[1]) : null
}

// ── Кесте торы: «Уақыт» жолы, күндер бағандары, «08:30-09:30» жолдары
type GridCell = { teacher: string; day: number; start: string; end: string; label: string }

function hhmm(s: string) {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(s.trim())
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : ''
}

export function parseGrids(sheet: Sheet, teacher: string): GridCell[] {
  const out: GridCell[] = []
  let dayOfCol: (number | null)[] | null = null
  let teacherHere = teacher
  for (const row of sheet.rows) {
    const first = str(row[0] ?? null)
    if (/^уақыт/i.test(first)) {
      // Күн тақырыбы біріктірілген ұяшық болуы мүмкін: бос бағандар сол жақтағы күнге жатады
      dayOfCol = []
      let cur: number | null = null
      for (let i = 0; i < row.length; i++) {
        const v = str(row[i])
        const d = DAY_WORDS.find(([re]) => re.test(v))?.[1]
        if (d) cur = d
        dayOfCol[i] = i === 0 ? null : cur
      }
      continue
    }
    // Тордың үстіндегі жалғыз жазу — оның иесі («ЖОЛТАЙ АҒАЙ»); біріктірілген ұяшық мәні қайталанады
    const filled = Array.from(new Set(row.map(str).filter(Boolean)))
    if (filled.length === 1 && !/\d{1,2}[:.]\d{2}/.test(filled[0])) {
      dayOfCol = null
      teacherHere = teacher
      continue
    }
    const tm = /^(\d{1,2}[:.]\d{2})\s*[-–]\s*(\d{1,2}[:.]\d{2})$/.exec(first)
    if (!tm || !dayOfCol) continue
    const start = hhmm(tm[1])
    const end = hhmm(tm[2])
    for (let i = 1; i < row.length; i++) {
      const label = str(row[i])
      const day = dayOfCol[i]
      if (!label || !day) continue
      out.push({ teacher: teacherHere, day, start, end, label })
    }
  }
  return out
}

/** Тордағы жазу топқа ұқсай ма: «НЗМ 1», «5-сынып 2», «11-сынып, 3-топ», «7-8 сынып», «4 сынып-3». Пән аттарын («Математика») өткізіп жібереміз. */
export function parseLabel(label: string): { grades: number[]; kind: SheetGroup['kind'] | null; num: number | null } | null {
  const t = low(str(label))
  const kind = /нзм|ниш/.test(t) ? 'nzm' : /бил|біл/.test(t) ? 'bil' : null
  const range = /(\d{1,2})\s*-\s*(\d{1,2})(?:\s*-\s*(\d{1,2}))?\s*сынып/.exec(t)
  if (range) {
    const a = Number(range[1])
    const b = Number(range[3] ?? range[2])
    const list: number[] = []
    for (let x = a; x <= b; x++) list.push(x)
    return { grades: list, kind, num: null }
  }
  const g = /(\d{1,2})\s*-?\s*сынып/.exec(t)
  const after = g ? t.slice(g.index + g[0].length) : t
  const n = /(\d)/.exec(kind && !g ? t.replace(/нзм|ниш|бил|біл/g, '') : after)
  if (!g && !kind) return null
  return { grades: g ? [Number(g[1])] : [], kind, num: n ? Number(n[1]) : null }
}

// ── Төлем ұяшығы: «62 000 тг 07.10 Айдын ағайға, 62000тг 10.11нал», «118к 4.11 кюар»
const MONTHS = ['сентябрь', 'октябрь', 'ноябрь', 'декабрь', 'январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август']
const MONTH_NUM = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8]

export function monthOfHeader(h: string): number | null {
  const i = MONTHS.findIndex((m) => low(str(h)).startsWith(m.slice(0, 4)))
  return i < 0 ? null : MONTH_NUM[i]
}

/** Оқу жылы: тамыз–желтоқсан → baseYear, қаңтар–шілде → baseYear+1 */
const yearOf = (month: number, baseYear: number) => (month >= 8 ? baseYear : baseYear + 1)

function validDate(y: number, m: number, d: number) {
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

export function methodOf(text: string): string {
  const t = low(text)
  if (/кюар|qr|каспи|kaspi/.test(t)) return 'Kaspi QR'
  if (/удл|удал/.test(t)) return 'Kaspi (қашықтан)'
  if (/народ|халық/.test(t)) return 'Халық банк'
  if (/нал|қолма/.test(t)) return 'қолма-қол'
  return ''
}

const AMOUNT_RE = /(\d{1,3}(?:[  ]\d{3})+|\d{4,6}|\d{2,3}\s*к)(?=\s*(?:тг|тенге|т\b|к\b|$|[^\d.]))/gi

export function parsePayments(text: string, columnMonth: number, baseYear: number): { amount: number; paidOn: string; note: string }[] {
  const t = str(text)
  if (!t) return []
  const hits = Array.from(t.matchAll(AMOUNT_RE)).filter((m) => {
    // Күн (07.10) не ай аралығы бөлігі емес екенін тексереміз
    const prev = t[(m.index ?? 0) - 1]
    const next = t[(m.index ?? 0) + m[0].length]
    return prev !== '.' && next !== '.'
  })
  const out: { amount: number; paidOn: string; note: string }[] = []
  hits.forEach((m, i) => {
    const raw = m[1].replace(/[\s ]/g, '')
    const amount = /к$/i.test(raw) ? Number(raw.slice(0, -1)) * 1000 : Number(raw)
    if (!(amount >= 1000 && amount <= 1_000_000)) return
    const from = m.index ?? 0
    const to = i + 1 < hits.length ? hits[i + 1].index ?? t.length : t.length
    const seg = t.slice(Math.max(0, from - 12), to)
    // Аралықтың («17.08-31.08») бөлігі емес күн — төлем күні
    const dates = Array.from(seg.matchAll(/(?<![\d.\-–])(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?(?![\d.]*\s*[-–]\s*\d)/g))
    let paidOn = ''
    for (const d of dates.reverse()) {
      const day = Number(d[1])
      const mon = Number(d[2])
      const y = d[3] ? (d[3].length === 2 ? 2000 + Number(d[3]) : Number(d[3])) : yearOf(mon, baseYear)
      if (mon >= 1 && mon <= 12 && validDate(y, mon, day)) {
        paidOn = `${y}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        break
      }
    }
    const fallback = !paidOn
    if (fallback) paidOn = `${yearOf(columnMonth, baseYear)}-${String(columnMonth).padStart(2, '0')}-01`
    const how = methodOf(seg)
    out.push({ amount, paidOn, note: ['Кестеден', how, fallback ? 'күні жазылмаған' : ''].filter(Boolean).join(' · ') })
  })
  return out
}

// ── Негізгі талдау
const normName = (s: string) => low(cleanPerson(s)).replace(/[^a-zа-яәғқңөұүһі ]/gi, '').split(' ').filter(Boolean).sort().join(' ')
export { normName }

export function parseWorkbook(sheets: Sheet[], baseYear = 2026): SheetResult {
  const warnings: string[] = []
  const groups: SheetGroup[] = []

  // 1) «Оқушылар тізімі»: ата-ананың аты (телефон не аты-жөні бойынша)
  const parentByPhone = new Map<string, string>()
  const parentByName = new Map<string, { parent: string; phone: string }>()
  const master = sheets.find((s) => /оқушылар тізімі/i.test(s.name))
  if (master) {
    const hi = master.rows.findIndex((r) => r.some((c) => /аты-жөні/i.test(str(c))))
    const h = (master.rows[hi] ?? []).map((c) => low(str(c)))
    const iName = h.findIndex((x) => x.includes('оқушының'))
    const iParent = h.findIndex((x) => x.includes('ата-ана'))
    const iPhone = h.findIndex((x) => x.includes('телефон'))
    for (const r of master.rows.slice(hi + 1)) {
      const name = cleanPerson(str(r[iName] ?? null))
      const parent = cleanPerson(str(r[iParent] ?? null))
      const phone = normPhone(r[iPhone] ?? null)
      if (!name) continue
      if (phone && parent) parentByPhone.set(phone, parent)
      parentByName.set(normName(name), { parent, phone })
    }
  }

  // 2) Сынып беттері: топтар мен оқушылар
  for (const sh of sheets) {
    const sGrade = sheetGradeOf(sh.name)
    if (sGrade === null) continue
    let cur: SheetGroup | null = null
    let cols: { name: number; phone: number; dir: number } | null = null
    for (const row of sh.rows) {
      const filled = Array.from(new Set(row.map(str).filter(Boolean)))
      if (!filled.length) continue
      if (filled.length === 1) {
        const hd = parseGroupHeader(filled[0], sGrade)
        if (hd) {
          const keyBase = `xl-${hd.kind}-${hd.grade}-${hd.shift ? 's' : 't'}${hd.num}-${low(hd.teacherHint) || 'x'}`
          let key = keyBase
          for (let k = 2; groups.some((g) => g.key === key); k++) key = `${keyBase}-${k}`
          const sameName = groups.filter((g) => g.name === hd.name).length
          cur = { key, name: sameName ? `${hd.name} (${hd.teacherHint || sameName + 1})` : hd.name, grade: hd.grade, kind: hd.kind, num: hd.num, teacherHint: hd.teacherHint, lessons: [], students: [] }
          // Бір атаумен бұрын қосылған топқа да мұғалімін жазамыз (5-сынып Жолтай/Айдын)
          for (const g of groups) if (g.name === hd.name && g.teacherHint) g.name = `${hd.name} (${g.teacherHint})`
          if (sameName && hd.teacherHint) cur.name = `${hd.name} (${hd.teacherHint})`
          groups.push(cur)
          cols = null
        }
        continue
      }
      const lows = row.map((c) => low(str(c)))
      if (lows.some((x) => x === 'аты-жөні' || x.startsWith('аты-жөні'))) {
        cols = { name: lows.findIndex((x) => x.startsWith('аты-жөні')), phone: lows.findIndex((x) => x.includes('тел')), dir: lows.findIndex((x) => x.startsWith('бағыт')) }
        continue
      }
      if (!cur || !cols) continue
      const name = cleanPerson(str(row[cols.name] ?? null))
      if (!name || !/[a-zа-яәғқңөұүһі]/i.test(name)) continue
      const phone = normPhone(row[cols.phone] ?? null)
      const m = parentByName.get(normName(name))
      cur.students.push({
        name,
        parentPhone: phone || m?.phone || '',
        parentName: (phone && parentByPhone.get(phone)) || m?.parent || '',
        note: cols.dir >= 0 ? str(row[cols.dir] ?? null).slice(0, 80) : '',
      })
    }
  }

  // 3) Мұғалім беттері: кесте торлары → топтың сабақтары
  const cells: GridCell[] = []
  for (const sh of sheets) {
    const t = teacherOf(sh.name)
    if (!t || sheetGradeOf(sh.name) !== null) continue
    cells.push(...parseGrids(sh, t))
  }
  const resolve = (c: GridCell): SheetGroup[] | null => {
    const p = parseLabel(c.label)
    if (!p) return null // пән аты — топ емес
    const pick = (grade: number | null): SheetGroup[] => {
      let pool = groups.filter((g) => (p.kind ? g.kind === p.kind : g.kind === 'plain' || grade === null) && (grade === null || g.grade === grade))
      if (!p.kind && grade !== null) pool = groups.filter((g) => g.grade === grade && (g.kind === 'plain'))
      if (p.num === null) pool = pool.filter((g) => g.students.length) // нөмірсіз жазуда бос топтарды есептемейміз
      const own = pool.filter((g) => g.teacherHint === c.teacher)
      if (p.num !== null) {
        const ordered = own.length >= p.num ? own : pool
        return ordered[p.num - 1] ? [ordered[p.num - 1]] : []
      }
      if (own.length === 1) return own
      return pool.length === 1 ? pool : []
    }
    if (!p.grades.length) {
      const r = pick(null)
      return r.length ? r : []
    }
    const all: SheetGroup[] = []
    for (const gr of p.grades) {
      const r = pick(gr)
      if (!r.length) return []
      all.push(...r)
    }
    return all
  }
  type Placed = { g: SheetGroup; c: GridCell }
  const placed: Placed[] = []
  const unresolved = new Map<string, Set<string>>()
  for (const c of cells) {
    const r = resolve(c)
    if (r === null) continue
    if (!r.length) {
      const k = `${c.teacher}: «${c.label}»`
      if (!unresolved.has(k)) unresolved.set(k, new Set())
      unresolved.get(k)!.add(`${['', 'Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс'][c.day]} ${c.start}`)
      continue
    }
    for (const g of r) placed.push({ g, c })
  }
  // Бір мұғалім бір уақытта екі түрлі сабақта бола алмайды (біріктірілген «7-8 сынып» — бір жазу, ол рұқсат)
  const slotKey = (p: Placed) => `${p.c.teacher}|${p.c.day}|${p.c.start}`
  const labelsAt = new Map<string, Set<string>>()
  for (const p of placed) {
    const k = slotKey(p)
    if (!labelsAt.has(k)) labelsAt.set(k, new Set())
    labelsAt.get(k)!.add(low(p.c.label))
  }
  const clashes = new Set<string>()
  for (const [k, labels] of Array.from(labelsAt.entries())) if (labels.size > 1) clashes.add(k)
  for (const k of Array.from(clashes)) {
    const [t, d, s] = k.split('|')
    warnings.push(`${t}: ${['', 'Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс'][Number(d)]} ${s} уақытында екі түрлі топ жазылған (${Array.from(labelsAt.get(k)!).join(' / ')}) — енгізілмеді, қолмен нақтылаңыз`)
  }
  for (const p of placed) {
    if (clashes.has(slotKey(p))) continue
    const l = p.g.lessons.find((x) => x.teacherHint === p.c.teacher && x.start === p.c.start && x.end === p.c.end)
    if (l) {
      if (!l.days.includes(p.c.day)) l.days.push(p.c.day)
      l.days.sort()
    } else p.g.lessons.push({ days: [p.c.day], start: p.c.start, end: p.c.end, teacherHint: p.c.teacher })
  }
  for (const [k, when] of Array.from(unresolved.entries())) warnings.push(`${k} (${Array.from(when).join(', ')}) — қай топ екені анық емес, сабақ уақытын топқа қолмен қосыңыз`)
  // Оқушысы жоқ топтар енгізілмейді (кестеде уақыты болса да)
  for (const g of groups) if (!g.students.length) warnings.push(`«${g.name}» тобында оқушы жоқ — енгізілмейді`)
  const kept = groups.filter((g) => g.students.length)
  for (const g of kept) if (!g.lessons.length) warnings.push(`«${g.name}»: кестеде сабақ уақыты табылмады — қолмен қосыңыз`)

  // 4) «толық төлемдер»
  const payments: SheetPayment[] = []
  const paySheet = sheets.find((s) => /төлем/i.test(s.name))
  if (paySheet) {
    const hi = paySheet.rows.findIndex((r) => r.some((c) => /аты-жөні/i.test(str(c))))
    const h = (paySheet.rows[hi] ?? []).map((c) => str(c))
    const iName = h.findIndex((x) => /аты-жөні/i.test(x))
    const iGrade = h.findIndex((x) => /сынып/i.test(x))
    const monthCols = h.map((x, i) => ({ i, m: monthOfHeader(x) })).filter((x) => x.m !== null) as { i: number; m: number }[]
    for (const r of paySheet.rows.slice(hi + 1)) {
      const name = cleanPerson(str(r[iName] ?? null))
      if (!name || !/[a-zа-яәғқңөұүһі]/i.test(name)) continue
      const gr = Number(str(r[iGrade] ?? null)) || null
      for (const { i, m } of monthCols) {
        for (const p of parsePayments(str(r[i] ?? null), m, baseYear)) payments.push({ name, grade: gr, ...p })
      }
    }
  } else warnings.push('«толық төлемдер» беті табылмады')
  // Бір оқушының бір күнгі бірдей сомасы — бір төлем (бір ұяшықта қайталанса)
  const seen = new Set<string>()
  const uniq = payments.filter((p) => {
    const k = `${normName(p.name)}|${p.paidOn}|${p.amount}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  payments.length = 0
  payments.push(...uniq)

  return { groups: kept, payments, warnings }
}

/** Google Drive сілтемесінен файл ID-ін алу (тек Google доменіндегі сілтемелер) */
export function driveId(link: string): string | null {
  let u: URL
  try {
    u = new URL(link.trim())
  } catch {
    return null
  }
  if (!/^(docs|drive)\.google\.com$/.test(u.hostname)) return null
  const m = /\/d\/([\w-]{20,})/.exec(u.pathname)
  const id = m?.[1] ?? u.searchParams.get('id')
  return id && /^[\w-]{20,}$/.test(id) ? id : null
}

