// «Жетістіктер» беті: осы оқу жылының үздік нәтижелері (Білім тексеру сынақтарынан), НЗМ / БИЛ / ҰБТ бойынша.
// Аттар қысқартылып көрсетіледі («Айтбек А.») — оқушылардың жеке деректері ашық бетке шықпайды.
import { examMax, ranking, rowTotal, shortName, type Exam } from './bilimTest'
import { listExams, listGroups, listSubmissions, listStudents } from './bilimTestStore'

export type Category = 'НЗМ' | 'БИЛ' | 'ҰБТ'
export type TopItem = { name: string; group: string; exam: string; month: string; score: number; max: number; pct: number; place: number }

const KZ_LETTERS = 'А-ЯӘҒҚҢӨҰҮҺІа-яәғқңөұүһі'
const word = (w: string) => new RegExp(`(^|[^${KZ_LETTERS}])(${w})([^${KZ_LETTERS}]|$)`, 'i')

export function categoryOf(id: string, name: string): Category | null {
  if (/^nzm/.test(id) || word('НЗМ|НИШ').test(name)) return 'НЗМ'
  if (/^bil/.test(id) || word('БИЛ|БІЛ').test(name)) return 'БИЛ'
  if (/^(ubt|phys)/.test(id) || word('ҰБТ|УБТ|ЕНТ').test(name)) return 'ҰБТ'
  return null
}

/** Оқу жылының басы: қыркүйек */
export function schoolYearStart(today = new Date()) {
  const y = today.getUTCMonth() >= 8 ? today.getUTCFullYear() : today.getUTCFullYear() - 1
  return `${y}-09`
}

/** Бір сынақтың үздіктері (оқушы тізімінде бар, тапсырғандар) */
export function topOfExam(exam: Exam, subs: Parameters<typeof ranking>[1], names: Set<string>, group: string, n = 3): TopItem[] {
  const rk = ranking(exam, subs.filter((s) => names.has(s.student_name)))
  const max = examMax(exam)
  return Object.entries(rk.scores)
    .map(([name, row]) => ({ name, total: rowTotal(row) }))
    .filter((x): x is { name: string; total: number } => x.total !== null && names.has(x.name))
    .sort((a, b) => b.total - a.total)
    .slice(0, n)
    .map((x) => ({ name: shortName(x.name), group, exam: exam.title, month: exam.month, score: x.total, max, pct: max ? Math.round((x.total / max) * 1000) / 10 : 0, place: rk.place[x.name] ?? 0 }))
}

export async function loadTopResults(perCategory = 6): Promise<Record<Category, TopItem[]>> {
  const out: Record<Category, TopItem[]> = { НЗМ: [], БИЛ: [], ҰБТ: [] }
  const since = schoolYearStart()
  const groups = await listGroups()
  for (const g of groups) {
    const cat = categoryOf(g.id, g.name)
    if (!cat) continue
    const exams = (await listExams(g.id)).filter((e) => e.published && e.month >= since)
    const exam = exams[exams.length - 1] // ең соңғы жарияланған сынақ
    if (!exam) continue
    const [subs, students] = await Promise.all([listSubmissions(exam.id), listStudents(g.id)])
    out[cat].push(...topOfExam(exam, subs, new Set(students.map((s) => s.full_name)), g.name))
  }
  for (const c of Object.keys(out) as Category[]) out[c] = out[c].sort((a, b) => b.pct - a.pct).slice(0, perCategory)
  return out
}
