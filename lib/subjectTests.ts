// Пән тесттері: мұғалімнің өз тесттерінің баллдары (мысалы, физика 1–5 тест).
// Таза функциялар — клиентте де, серверде де қолданылады. Құпия дерек жоқ.

export type SheetTest = { title: string; max: number }
export type Sheet = { id: string; subject: string; name: string; grade: number | null; tests: SheetTest[]; position: number }
export type SheetRow = { id?: string; sheet_id?: string; student_id: string | null; student_name: string; scores: (number | null)[]; position: number }

// Оқушы кабинетіне жіберілетін дерек (басқа оқушылардың аты жоқ)
export type MySubject = {
  sheet: Sheet
  name: string
  scores: (number | null)[]
  groupAvg: (number | null)[] // топтың орташа пайызы, әр тест бойынша
  allAvg: (number | null)[] // осы пән бойынша барлық топтар
  rank: number | null
  of: number
}

export const pctOf = (score: number | null | undefined, max: number) =>
  score === null || score === undefined || !max ? null : Math.round((100 * score) / max)

export function pcts(scores: (number | null)[], tests: SheetTest[]): (number | null)[] {
  return tests.map((t, i) => pctOf(scores[i], t.max))
}

export function mean(xs: (number | null | undefined)[]): number | null {
  const v = xs.filter((x): x is number => typeof x === 'number')
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null
}

/** Тапсырған тесттердің орташа пайызы */
export function avgPct(scores: (number | null)[], tests: SheetTest[]) {
  return mean(pcts(scores, tests))
}

/** Соңғы екі тапсырылған тест арасындағы өзгеріс (пайыздық пункт) */
export function lastDelta(p: (number | null)[]): { from: number; to: number; d: number } | null {
  const idx = p.map((x, i) => (x === null ? -1 : i)).filter((i) => i >= 0)
  if (idx.length < 2) return null
  const a = idx[idx.length - 2], b = idx[idx.length - 1]
  return { from: a, to: b, d: p[b]! - p[a]! }
}

export function level(p: number): { label: string; color: string } {
  if (p >= 75) return { label: 'Жоғары деңгей', color: '#0F9D6B' }
  if (p >= 60) return { label: 'Жақсы деңгей', color: '#2B6BF3' }
  if (p >= 45) return { label: 'Орташа деңгей', color: '#D98A00' }
  return { label: 'Қолдау керек', color: '#E5383B' }
}

export function comment(m: MySubject): string {
  const t = m.sheet.tests
  const p = pcts(m.scores, t)
  const out: string[] = []
  const missed = t.map((x, i) => (p[i] === null && p.slice(i + 1).some((y) => y !== null) ? x.title : null)).filter(Boolean)
  if (missed.length) out.push(`${missed.join(', ')} тапсырылмаған.`)
  const dl = lastDelta(p)
  if (dl) {
    const pair = `${t[dl.from].title} мен ${t[dl.to].title}`
    if (dl.d >= 10) out.push(`${pair} арасында нәтиже ${dl.d} пайыздық пунктке өсті — дайындық нәтиже беріп жатыр.`)
    else if (dl.d <= -10) out.push(`${pair} арасында нәтиже ${-dl.d} пайыздық пунктке төмендеді. Қай тақырыптарда қате кеткенін мұғаліммен бірге талдау керек.`)
    else out.push(`${pair} арасында нәтиже тұрақты.`)
  }
  const li = p.map((x, i) => (x === null ? -1 : i)).filter((i) => i >= 0).pop()
  if (li !== undefined && m.groupAvg[li] !== null) {
    const diff = p[li]! - m.groupAvg[li]!
    if (diff >= 8) out.push(`Соңғы тестте топтың орташа көрсеткішінен ${diff} пунктке жоғары.`)
    else if (diff <= -8) out.push(`Соңғы тестте топтың орташа көрсеткішінен ${-diff} пунктке төмен.`)
    else out.push('Соңғы тестте топтың орташа деңгейінде.')
  }
  return out.join(' ')
}

export function nextSteps(p: number): string[] {
  if (p >= 75) return ['ҰБТ форматындағы күрделі, контексттік есептерге көшу', 'Уақытпен жұмыс: тестті белгіленген уақытта шешу', 'Қателер дәптерін жүргізіп, ұқсас есептерді қайта шешу']
  if (p >= 60) return ['Қате жіберілген тақырыптарды мұғаліммен бірге талдау', 'Аптасына бір рет өз бетімен мини-тест жазу', 'Формулалар мен өлшем бірліктерін жүйелі қайталау']
  if (p >= 45) return ['Негізгі формулаларды және олардың мағынасын бекіту', 'Әр сабақтан кейін 8–10 есептен үй жұмысы', 'Түсінбеген тақырыпты сол аптада мұғалімнен сұрау']
  return ['Негізгі ұғымдар мен формулаларды басынан қайталау', 'Сабаққа тұрақты қатысу және әр есепті жазып шығару', 'Ата-ана мен мұғалімнің бірлескен бақылауы, жеке кеңес']
}

/** Бір пәннің барлық парақтары бойынша оқушының дерегі (сервер есептейді) */
export function buildMySubject(sheet: Sheet, rows: SheetRow[], mine: SheetRow, sameSubject: { sheet: Sheet; rows: SheetRow[] }[]): MySubject {
  const t = sheet.tests
  const groupAvg = t.map((_, i) => mean(rows.map((r) => pctOf(r.scores[i], t[i].max))))
  const all = sameSubject.flatMap((x) => x.rows.map((r) => ({ r, s: x.sheet })))
  const allAvg = t.map((_, i) => mean(all.map(({ r, s }) => (s.tests[i] ? pctOf(r.scores[i], s.tests[i].max) : null))))
  const avgs = all.map(({ r, s }) => avgPct(r.scores, s.tests)).filter((x): x is number => x !== null)
  const my = avgPct(mine.scores, t)
  return {
    sheet,
    name: mine.student_name,
    scores: mine.scores,
    groupAvg,
    allAvg,
    rank: my === null ? null : 1 + avgs.filter((a) => a > my).length,
    of: avgs.length,
  }
}

/** «14/30» немесе «14» мәтінінен балл; бос/қате — null */
export function parseScore(v: string, max: number): number | null {
  const s = v.trim()
  if (!s || s === '-' || s === '—') return null
  const n = Number(s.split('/')[0].replace(',', '.'))
  return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n) : null
}
