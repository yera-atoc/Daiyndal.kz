// Ата-анаға есеп — дерекқор және жабық сілтеме (тек серверде).
import { addDays, isLessonDay, todayAlmaty, weekdayOf, type AttStatus, type JClass } from './journal'
import { db } from './journalServer'
import { classStudents } from './lessonServer'
import { HW, type HwMark } from './lesson'
import { paymentStatus, waPhone } from './payments'
import { reportToken } from './reportToken'
import { examTitle, rowTotal, scoresForExam, type ScoreRow } from './bilimTest'
import { getStudent, listExams, listSubmissions } from './bilimTestStore'
import { notesOf, reportMessage, type BtReport, type ReportClass, type StudentReport } from './report'

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : null)
const hm = (t: string | null | undefined) => (t ? String(t).slice(0, 5) : null)
const clean = (n: string) => String(n).replace(/[)\s]+$/, '')
const DAYS = 30

export async function studentReport(studentId: string): Promise<StudentReport | null> {
  const sb = await db()
  const today = todayAlmaty()
  const from = addDays(today, -DAYS)
  const { data: s } = await sb.from('students').select('*, student_groups(name)').eq('id', studentId).maybeSingle()
  if (!s || (s as any).status === 'left') return null
  const { data: mem } = await sb.from('teacher_class_students').select('class_id').eq('student_id', studentId)
  const ids = (mem ?? []).map((m) => m.class_id)
  const { data: cls } = ids.length ? await sb.from('teacher_classes').select('*').in('id', ids).eq('active', true).order('position') : { data: [] as any[] }
  const classes = (cls ?? []) as any[]
  const cids = classes.map((c) => c.id)
  const tids = Array.from(new Set(classes.map((c) => c.teacher_id)))
  const none = Promise.resolve({ data: [] as any[] })
  const [teachers, lessons, att, hw, marks, quizzes, slots] = await Promise.all([
    tids.length ? sb.from('teachers').select('id, name').in('id', tids) : none,
    cids.length ? sb.from('class_lessons').select('class_id, date, topic, homework, cancelled').in('class_id', cids).gte('date', from).lte('date', addDays(today, 7)) : none,
    cids.length ? sb.from('class_attendance').select('class_id, date, status').eq('student_id', studentId).in('class_id', cids).gte('date', from).lte('date', today) : none,
    cids.length ? sb.from('class_homework').select('class_id, date, mark').eq('student_id', studentId).in('class_id', cids).gte('date', from).lte('date', today) : none,
    cids.length ? sb.from('class_marks').select('class_id, date, score, max, comment').eq('student_id', studentId).in('class_id', cids).gte('date', from).lte('date', today) : none,
    cids.length ? sb.from('class_quizzes').select('id, class_id').in('class_id', cids).gte('date', from) : none,
    cids.length ? sb.from('schedule_slots').select('teacher_id, group_id, day_of_week, start_time, title') : none,
  ])
  const qids = ((quizzes as any).data ?? []).map((q: any) => q.id)
  const { data: qa } = qids.length ? await sb.from('class_quiz_answers').select('quiz_id, score, total').eq('student_id', studentId).in('quiz_id', qids) : { data: [] as any[] }
  const tName = new Map((((teachers as any).data ?? []) as any[]).map((t) => [t.id, t.name as string]))
  const L = (((lessons as any).data ?? []) as any[])
  const S = (((slots as any).data ?? []) as any[])

  const out: ReportClass[] = classes.map((c) => {
    const a = (((att as any).data ?? []) as any[]).filter((x) => x.class_id === c.id).sort((x, y) => x.date.localeCompare(y.date))
    const h = (((hw as any).data ?? []) as any[]).filter((x) => x.class_id === c.id)
    const m = (((marks as any).data ?? []) as any[]).filter((x) => x.class_id === c.id).sort((x, y) => y.date.localeCompare(x.date))
    const counted = a.filter((x) => x.status !== 'excused')
    const present = counted.filter((x) => x.status === 'present' || x.status === 'late').length
    let absStreak = 0
    for (let i = a.length - 1; i >= 0 && a[i].status === 'absent'; i--) absStreak++
    const own = L.filter((x) => x.class_id === c.id && !x.cancelled && x.date <= today).sort((x, y) => y.date.localeCompare(x.date))
    const qOf = new Set((((quizzes as any).data ?? []) as any[]).filter((q) => q.class_id === c.id).map((q) => q.id))
    const q = ((qa ?? []) as any[]).filter((x) => qOf.has(x.quiz_id))
    let next: ReportClass['next'] = null
    for (let i = 1; i <= 7 && !next; i++) {
      const d = addDays(today, i)
      if (!isLessonDay(d, c.days ?? [], L.find((x) => x.class_id === c.id && x.date === d))) continue
      const sl = S.filter((x) => x.teacher_id === c.teacher_id && x.day_of_week === weekdayOf(d))
      const hit = (c.group_id && sl.find((x) => x.group_id === c.group_id)) || sl.find((x) => (x.title ?? '').toLowerCase() === String(c.name).toLowerCase())
      next = { date: d, time: hit ? hm(hit.start_time) : null }
    }
    const lastHw = own.find((x) => (x.homework ?? '').trim())
    return {
      id: c.id,
      name: c.name,
      subject: c.subject ?? null,
      teacher: tName.get(c.teacher_id) ?? '',
      lessons: counted.length,
      present,
      absent: counted.filter((x) => x.status === 'absent').length,
      late: counted.filter((x) => x.status === 'late').length,
      att: pct(present, counted.length),
      hw: h.length ? Math.round((h.reduce((sum, x) => sum + HW[x.mark as HwMark].score, 0) / h.length) * 100) : null,
      hwNone: h.filter((x) => x.mark === 'none').length,
      markPct: m.length ? Math.round((m.reduce((sum, x) => sum + Number(x.score) / (x.max || 10), 0) / m.length) * 100) : null,
      marks: m.slice(0, 10).map((x) => ({ date: x.date, score: Number(x.score), max: x.max || 10, comment: x.comment ?? null, topic: own.find((l) => l.date === x.date)?.topic ?? null })),
      quiz: pct(q.reduce((sum, x) => sum + x.score, 0), q.reduce((sum, x) => sum + x.total, 0)),
      topics: own.filter((x) => (x.topic ?? '').trim()).slice(0, 5).map((x) => ({ date: x.date, topic: x.topic })),
      homework: lastHw ? { date: lastHw.date, text: lastHw.homework } : null,
      next,
      absStreak,
    }
  })

  const bt = (s as any).bt_student_id ? await btReport((s as any).bt_student_id).catch(() => null) : null
  const ps = paymentStatus((s as any).payment_deadline, today)
  return {
    student: { name: clean(s.full_name), grade: (s as any).grade ?? null, group: (s as any).student_groups?.name ?? null },
    from,
    to: today,
    classes: out,
    pay: ps.kind === 'none' || ps.days == null ? null : { deadline: (s as any).payment_deadline, kind: ps.kind, days: ps.days, amount: (s as any).payment_amount ?? null },
    bt,
    notes: notesOf(out, bt),
  }
}

export type ReportLink = { id: string; name: string; url: string; wa: string | null; att: number | null; hw: number | null; mark: number | null; risk: boolean }

/** Топтың әр оқушысына: есептің сілтемесі және ата-анаға дайын WhatsApp хабарламасы (соңғы 30 күн, осы пән). */
export async function classReportLinks(c: JClass & { mark_scale?: number }, origin: string): Promise<ReportLink[]> {
  const sb = await db()
  const today = todayAlmaty()
  const from = addDays(today, -DAYS)
  const students = await classStudents(c.id)
  const ids = students.map((s: any) => s.id as string)
  if (!ids.length) return []
  const [phones, att, hw, marks] = await Promise.all([
    sb.from('students').select('id, parent_phone').in('id', ids),
    sb.from('class_attendance').select('student_id, date, status').eq('class_id', c.id).gte('date', from).lte('date', today),
    sb.from('class_homework').select('student_id, mark').eq('class_id', c.id).gte('date', from).lte('date', today),
    sb.from('class_marks').select('student_id, score').eq('class_id', c.id).gte('date', from).lte('date', today),
  ])
  const phone = new Map(((phones.data ?? []) as any[]).map((p) => [p.id, waPhone(p.parent_phone)]))
  const scale = c.mark_scale || 10
  return students.map((s: any) => {
    const a = ((att.data ?? []) as any[]).filter((x) => x.student_id === s.id && x.status !== 'excused').sort((x, y) => x.date.localeCompare(y.date))
    const h = ((hw.data ?? []) as any[]).filter((x) => x.student_id === s.id)
    const m = ((marks.data ?? []) as any[]).filter((x) => x.student_id === s.id)
    const sum = {
      att: pct(a.filter((x) => (x.status as AttStatus) !== 'absent').length, a.length),
      hw: h.length ? Math.round((h.reduce((t, x) => t + HW[x.mark as HwMark].score, 0) / h.length) * 100) : null,
      mark: m.length ? Math.round((m.reduce((t, x) => t + Number(x.score), 0) / m.length) * 10) / 10 : null,
    }
    const url = `${origin}/r/${reportToken(s.id)}`
    const p = phone.get(s.id)
    const last2 = a.slice(-2)
    return {
      id: s.id,
      name: s.full_name,
      url,
      wa: p ? `https://wa.me/${p}?text=${encodeURIComponent(reportMessage(s.full_name, { subject: c.subject, ...sum, scale }, url))}` : null,
      ...sum,
      risk: (last2.length === 2 && last2.every((x) => x.status === 'absent')) || (sum.att != null && sum.att < 70) || (sum.hw != null && sum.hw < 50) || (sum.mark != null && sum.mark / scale < 0.5),
    }
  })
}

export { reportToken, studentOfToken } from './reportToken'

/** Білім тексеру: тек жарияланған айлар (+ сайтқа дейінгі Excel нәтижелері). Соңғы ай — пәндер бойынша, орны топта. */
export async function btReport(btId: string): Promise<BtReport | null> {
  const st = await getStudent(btId)
  if (!st) return null
  const exams = (await listExams(st.group_id)).filter((e) => e.published)
  const legacy = (st as any).legacy_scores ?? {}
  const rows: { month: string; title: string; row: ScoreRow; max: number; all?: Record<string, ScoreRow>; subjects: { id: string; name: string; max: number }[] }[] = []
  for (const [month, row] of Object.entries(legacy as Record<string, ScoreRow>)) {
    if (exams.some((e) => e.month === month)) continue
    const subj = (exams[0]?.subjects ?? []).filter((x) => x.id in row)
    rows.push({ month, title: examTitle(month), row, max: subj.reduce((a, x) => a + x.max, 0), subjects: subj })
  }
  for (const e of exams.slice(-6)) {
    const all = scoresForExam(e, await listSubmissions(e.id))
    const row = all[st.full_name]
    if (!row) continue
    const subj = e.subjects.filter((x) => x.id in row)
    rows.push({ month: e.month, title: e.title || examTitle(e.month), row, max: subj.reduce((a, x) => a + x.max, 0), all, subjects: e.subjects })
  }
  rows.sort((a, b) => a.month.localeCompare(b.month))
  const last = rows[rows.length - 1]
  if (!last) return null
  const prev = rows[rows.length - 2]
  const totals = last.all ? Object.values(last.all).map(rowTotal).filter((x): x is number => x != null).sort((a, b) => b - a) : []
  const mine = rowTotal(last.row)
  return {
    title: last.title,
    month: last.month,
    total: mine,
    max: last.max,
    place: mine != null && totals.length > 1 ? totals.indexOf(mine) + 1 : null,
    of: totals.length,
    subjects: last.subjects.filter((x) => x.id in last.row).map((x) => ({ name: x.name, score: last.row[x.id] ?? null, max: x.max, prev: prev?.row[x.id] ?? null })),
    history: rows.slice(-6).map((r) => ({ month: r.month, title: r.title, total: rowTotal(r.row), max: r.max })),
  }
}
