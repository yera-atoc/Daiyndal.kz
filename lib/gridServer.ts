// Топ журналы — дерекқор (тек серверде): айлық кесте және бір ұяшықты сақтау.
import { isLessonDay, type AttStatus, type JClass } from './journal'
import { db, syncCrmAttendance } from './journalServer'
import { classStudents } from './lessonServer'
import { monthRange, summarize, type GridCell, type GridView } from './grid'
import type { HwMark } from './lesson'

const STATUSES: AttStatus[] = ['present', 'absent', 'excused', 'late']
const MARKS: HwMark[] = ['done', 'partial', 'none']

export async function gridView(c: JClass & { mark_scale?: number }, month: string, teacherName: string): Promise<GridView> {
  const sb = await db()
  const { from, to } = monthRange(month)
  const [students, lessons, att, hw, marks, quizzes] = await Promise.all([
    classStudents(c.id),
    sb.from('class_lessons').select('date, topic, homework, cancelled').eq('class_id', c.id).gte('date', from).lte('date', to),
    sb.from('class_attendance').select('student_id, date, status').eq('class_id', c.id).gte('date', from).lte('date', to),
    sb.from('class_homework').select('student_id, date, mark').eq('class_id', c.id).gte('date', from).lte('date', to),
    sb.from('class_marks').select('student_id, date, score, comment').eq('class_id', c.id).gte('date', from).lte('date', to),
    sb.from('class_quizzes').select('id, date, questions').eq('class_id', c.id).gte('date', from).lte('date', to),
  ])
  const qIds = (quizzes.data ?? []).map((q: any) => q.id)
  const { data: qa } = qIds.length ? await sb.from('class_quiz_answers').select('quiz_id, student_id, score, total').in('quiz_id', qIds) : { data: [] as any[] }
  const L = (lessons.data ?? []) as any[]

  // Бағандар: сабақ күндері (кесте бойынша) + қосымша сабақтар + белгі қойылған күндер; болмаған сабақтар шықпайды
  const dates = new Set<string>()
  for (let d = from; d <= to; d = next(d)) if (isLessonDay(d, c.days ?? [], L.find((x) => x.date === d))) dates.add(d)
  for (const x of [...((att.data ?? []) as any[]), ...((marks.data ?? []) as any[]), ...((hw.data ?? []) as any[])]) dates.add(x.date)
  for (const x of L) if (!x.cancelled && (x.topic || x.homework)) dates.add(x.date)
  const sorted = Array.from(dates).filter((d) => !L.find((x) => x.date === d && x.cancelled)).sort()

  const cells: Record<string, Record<string, GridCell>> = {}
  const cell = (sid: string, d: string) => ((cells[sid] ??= {})[d] ??= {})
  for (const a of (att.data ?? []) as any[]) cell(a.student_id, a.date).a = a.status
  for (const h of (hw.data ?? []) as any[]) cell(h.student_id, h.date).h = h.mark
  for (const m of (marks.data ?? []) as any[]) {
    const x = cell(m.student_id, m.date)
    x.m = Number(m.score)
    if (m.comment) x.c = m.comment
  }
  const qDate = new Map(((quizzes.data ?? []) as any[]).map((q) => [q.id, q.date]))
  for (const r of (qa ?? []) as any[]) cell(r.student_id, qDate.get(r.quiz_id)).q = [r.score, r.total]

  const scale = c.mark_scale || 10
  const summary: GridView['summary'] = {}
  for (const s of students) summary[s.id] = summarize(cells[s.id] ?? {}, scale)

  return {
    class: { id: c.id, name: c.name, subject: c.subject, scale, teacher: teacherName },
    month,
    dates: sorted.map((d) => {
      const l = L.find((x) => x.date === d)
      return { date: d, topic: l?.topic ?? null, homework: l?.homework ?? null, quiz: ((quizzes.data ?? []) as any[]).filter((q) => q.date === d).reduce((s, q) => s + (q.questions?.length ?? 0), 0) }
    }),
    students: students.map((s: any) => ({ id: s.id, name: s.full_name })),
    cells,
    summary,
  }
}

const next = (d: string) => {
  const x = new Date(`${d}T00:00:00Z`)
  x.setUTCDate(x.getUTCDate() + 1)
  return x.toISOString().slice(0, 10)
}

/** Бір ұяшық: қатысу, үй тапсырмасы, баға, пікір. null — өшіру, undefined — өзгертпеу. */
export async function saveCell(c: JClass & { mark_scale?: number }, b: any) {
  const sb = await db()
  const sid = String(b.studentId ?? '')
  const date = String(b.date ?? '')
  const ids = new Set((await classStudents(c.id)).map((s: any) => s.id as string))
  if (!ids.has(sid)) throw Object.assign(new Error('Оқушы бұл топта жоқ'), { status: 403 })
  const now = new Date().toISOString()
  if (b.att !== undefined) {
    if (b.att === null) await sb.from('class_attendance').delete().eq('class_id', c.id).eq('student_id', sid).eq('date', date)
    else if (STATUSES.includes(b.att)) {
      const { error } = await sb.from('class_attendance').upsert({ class_id: c.id, student_id: sid, date, status: b.att, updated_at: now })
      if (error) throw new Error(error.message)
    }
    await syncCrmAttendance([sid], date)
  }
  if (b.hw !== undefined) {
    if (b.hw === null) await sb.from('class_homework').delete().eq('class_id', c.id).eq('student_id', sid).eq('date', date)
    else if (MARKS.includes(b.hw)) {
      const { error } = await sb.from('class_homework').upsert({ class_id: c.id, student_id: sid, date, mark: b.hw, updated_at: now })
      if (error) throw new Error(error.message)
    }
  }
  if (b.mark !== undefined || b.comment !== undefined) {
    const scale = c.mark_scale || 10
    if (b.mark === null) await sb.from('class_marks').delete().eq('class_id', c.id).eq('student_id', sid).eq('date', date)
    else {
      const raw = b.mark === undefined ? undefined : Number(b.mark)
      if (raw !== undefined && !(raw >= 0 && raw <= scale)) throw Object.assign(new Error(`Баға 0–${scale} аралығында болуы керек`), { status: 400 })
      const row: Record<string, unknown> = { class_id: c.id, student_id: sid, date, max: scale, updated_at: now }
      if (raw !== undefined) row.score = Math.round(raw * 10) / 10
      if (b.comment !== undefined) row.comment = String(b.comment ?? '').trim().slice(0, 300) || null
      // Тек пікір өзгерсе — бар бағаның жолын жаңартамыз (score міндетті баған)
      const { error } =
        row.score === undefined
          ? await sb.from('class_marks').update({ comment: row.comment, updated_at: now }).eq('class_id', c.id).eq('student_id', sid).eq('date', date)
          : await sb.from('class_marks').upsert(row)
      if (error) throw new Error(/class_marks/.test(error.message) ? 'Алдымен 20261112_01_class_marks.sql миграциясын іске қосыңыз' : error.message)
    }
  }
  return { ok: true }
}
