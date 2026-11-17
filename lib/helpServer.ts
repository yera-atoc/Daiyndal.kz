// «Көмек керек» тізімі — дерекқор (тек серверде).
import { addDays, todayAlmaty, type AttStatus } from './journal'
import { db, type Who } from './journalServer'
import type { HwMark } from './lesson'
import { waPhone } from './payments'
import { reportToken } from './reportToken'
import { helpMessage, helpReasons, helpScore, type HelpStudent } from './help'

const DAYS = 30
const PAGE = 1000

/** Supabase бір сұрауда 1000 жолдан артық бермейді — беттеп аламыз. */
async function allRows<T = any>(make: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await make(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if (!data || data.length < PAGE) return out
  }
}

/** Мұғалімге — өз топтары, әкімшіге — барлық белсенді топ. */
export async function helpList(who: Who, origin: string): Promise<{ students: HelpStudent[]; checked: number }> {
  const sb = await db()
  const today = todayAlmaty()
  const from = addDays(today, -DAYS)
  let q = sb.from('teacher_classes').select('id, name, subject, teacher_id').eq('active', true)
  if (!who.admin) q = q.eq('teacher_id', who.teacherId!)
  const { data: cls, error } = await q
  if (error) throw new Error(error.message)
  const classes = (cls ?? []) as any[]
  const cids = classes.map((c) => c.id)
  if (!cids.length) return { students: [], checked: 0 }

  const chunks: string[][] = []
  for (let i = 0; i < cids.length; i += 80) chunks.push(cids.slice(i, i + 80))
  const per = async <T,>(f: (ids: string[]) => (a: number, b: number) => PromiseLike<{ data: T[] | null; error: any }>) => (await Promise.all(chunks.map((ids) => allRows<T>(f(ids))))).flat()

  const [mem, att, hw, quizzes, marksRes, teachers] = await Promise.all([
    per<any>((ids) => (a, b) => sb.from('teacher_class_students').select('class_id, student_id').in('class_id', ids).range(a, b)),
    per<any>((ids) => (a, b) => sb.from('class_attendance').select('class_id, student_id, date, status').in('class_id', ids).gte('date', from).lte('date', today).range(a, b)),
    per<any>((ids) => (a, b) => sb.from('class_homework').select('class_id, student_id, date, mark').in('class_id', ids).gte('date', from).lte('date', today).range(a, b)),
    per<any>((ids) => (a, b) => sb.from('class_quizzes').select('id, class_id').in('class_id', ids).gte('date', from).range(a, b)),
    // Бағалар кестесі әлі жасалмаған базада — бос
    per<any>((ids) => (a, b) => sb.from('class_marks').select('class_id, student_id, date, score, max').in('class_id', ids).gte('date', from).lte('date', today).range(a, b)).catch(() => [] as any[]),
    sb.from('teachers').select('id, name'),
  ])
  const qids = quizzes.map((x) => x.id)
  const qClass = new Map(quizzes.map((x) => [x.id, x.class_id]))
  const answers: any[] = []
  for (let i = 0; i < qids.length; i += 150) answers.push(...(await allRows((a, b) => sb.from('class_quiz_answers').select('quiz_id, student_id, score, total').in('quiz_id', qids.slice(i, i + 150)).range(a, b))))

  const sids = Array.from(new Set(mem.map((m) => m.student_id)))
  const studs: any[] = []
  for (let i = 0; i < sids.length; i += 200) {
    const { data } = await sb.from('students').select('id, full_name, status, parent_phone, student_groups(name)').in('id', sids.slice(i, i + 200))
    studs.push(...(data ?? []))
  }
  const sMap = new Map(studs.filter((s) => s.status !== 'left').map((s) => [s.id, s]))
  const tName = new Map(((teachers.data ?? []) as any[]).map((t) => [t.id, t.name as string]))
  const cMap = new Map(classes.map((c) => [c.id, c]))

  const key = (c: string, s: string) => `${c}|${s}`
  const bucket = new Map<string, { att: any[]; hw: any[]; marks: any[]; quiz: any[] }>()
  const get = (k: string) => {
    let b = bucket.get(k)
    if (!b) bucket.set(k, (b = { att: [], hw: [], marks: [], quiz: [] }))
    return b
  }
  for (const x of att) get(key(x.class_id, x.student_id)).att.push({ date: x.date, status: x.status as AttStatus })
  for (const x of hw) get(key(x.class_id, x.student_id)).hw.push({ date: x.date, mark: x.mark as HwMark })
  for (const x of marksRes) get(key(x.class_id, x.student_id)).marks.push({ date: x.date, score: Number(x.score), max: x.max || 10 })
  for (const x of answers) {
    const c = qClass.get(x.quiz_id)
    if (c) get(key(c, x.student_id)).quiz.push({ score: x.score, total: x.total })
  }

  const byStudent = new Map<string, HelpStudent>()
  for (const m of mem) {
    const s = sMap.get(m.student_id)
    const c = cMap.get(m.class_id)
    const b = bucket.get(key(m.class_id, m.student_id))
    if (!s || !c || !b) continue
    const reasons = helpReasons(b)
    if (!reasons.length) continue
    let h = byStudent.get(s.id)
    if (!h) {
      const url = `${origin}/r/${reportToken(s.id)}`
      byStudent.set(s.id, (h = { id: s.id, name: String(s.full_name).replace(/[)\s]+$/, ''), group: s.student_groups?.name ?? null, score: 0, classes: [], reportUrl: url, wa: waPhone(s.parent_phone) }))
    }
    h.classes.push({ classId: c.id, className: c.name, subject: c.subject ?? null, teacher: tName.get(c.teacher_id) ?? '', reasons })
    h.score += helpScore(reasons)
  }
  const students = Array.from(byStudent.values())
    .map((h) => ({ ...h, wa: h.wa ? `https://wa.me/${h.wa}?text=${encodeURIComponent(helpMessage(h.name, h.classes, h.reportUrl))}` : null }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
  return { students, checked: sMap.size }
}
