// Пән тесттері: дерекқормен жұмыс (тек серверде, service role)
import { db } from './ieltsServer'
import { buildMySubject, type MySubject, type Sheet, type SheetRow } from './subjectTests'

const norm = (s: any): Sheet => ({ id: s.id, subject: s.subject, name: s.name, grade: s.grade ?? null, tests: s.tests ?? [], position: s.position ?? 0 })

export async function listSheets(): Promise<{ sheet: Sheet; rows: SheetRow[] }[]> {
  const sb = await db()
  const [{ data: sh, error }, { data: rows, error: e2 }] = await Promise.all([
    sb.from('subject_sheets').select('*').order('position').order('name'),
    sb.from('subject_rows').select('*').order('position'),
  ])
  if (error || e2) throw new Error((error ?? e2)!.message)
  return (sh ?? []).map((s) => ({ sheet: norm(s), rows: (rows ?? []).filter((r) => r.sheet_id === s.id) as SheetRow[] }))
}

/** Оқушының барлық пән тесттері (кабинет пен PDF үшін) */
export async function mySubjects(studentId: string): Promise<MySubject[]> {
  const sb = await db()
  const { data: mine, error } = await sb.from('subject_rows').select('sheet_id').eq('student_id', studentId)
  if (error) {
    if (/subject_rows/.test(error.message)) return [] // кесте әлі жасалмаған
    throw new Error(error.message)
  }
  if (!mine?.length) return []
  const all = await listSheets()
  const out: MySubject[] = []
  for (const x of all) {
    const row = x.rows.find((r) => r.student_id === studentId)
    if (!row) continue
    const same = all.filter((y) => y.sheet.subject === x.sheet.subject && y.sheet.grade === x.sheet.grade)
    out.push(buildMySubject(x.sheet, x.rows, row, same))
  }
  return out
}

/** Пән тесті бар оқушылардың id-лері (кіру тізімі үшін) */
export async function studentsWithSubjects(): Promise<string[]> {
  const { data, error } = await (await db()).from('subject_rows').select('student_id').not('student_id', 'is', null)
  if (error) return []
  return Array.from(new Set((data ?? []).map((r) => r.student_id as string)))
}
