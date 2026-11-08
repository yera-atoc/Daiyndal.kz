// Beles 2.0 · оқушының бірыңғай кабинеті (тек серверде)
import { db } from './journalServer'
import { addDays, isLessonDay, todayAlmaty, weekdayOf, type AttStatus } from './journal'
import { progressOf, type HwMark, type Progress } from './lesson'
import { homeRoom, normalizeRoom } from './rooms'
import { maskNames } from './security'
import { signRefs } from './privateFiles'

export type CabLesson = { classId: string; name: string; subject: string | null; teacher: string; time: string | null; room: string | null; topic: string | null }
export type CabHomework = { classId: string; subject: string | null; className: string; date: string; text: string; mark: HwMark | null; files: { id: string; url: string }[]; canUpload: boolean }
export type CabClass = { id: string; name: string; subject: string | null; teacher: string; next: { date: string; time: string | null } | null; progress: Progress }
export type Cabinet = {
  student: { id: string; full_name: string; grade: number | null; group: string | null }
  today: string
  lessons: CabLesson[]
  homework: CabHomework[]
  classes: CabClass[]
  exams: { bilim: boolean; ubt: boolean; ielts: boolean; toefl: boolean }
}

const hm = (t: string | null | undefined) => (t ? t.slice(0, 5) : null)

/** Кіру тізімі: топ → оқушылар (аттары жасырылған, PIN жіберілмейді) */
export async function loginList() {
  const sb = await db()
  const [st, gr] = await Promise.all([
    sb.from('students').select('id, full_name, group_id, ielts_pin, status').neq('status', 'left').order('full_name'),
    sb.from('student_groups').select('id, name').order('name'),
  ])
  const pins = await pinsOf((st.data ?? []).map((s: any) => s.id))
  const rows = maskNames((st.data ?? []).map((s: any) => ({ id: s.id, name: String(s.full_name).replace(/[)\s]+$/, ''), group: s.group_id ?? '', hasPin: !!(pins.get(s.id)?.pin || pins.get(s.id)?.bt) })))
  const groups = (gr.data ?? [])
    .map((g: any) => ({ id: g.id, name: g.name, students: rows.filter((r) => r.group === g.id).map(({ id, name, hasPin }) => ({ id, name, hasPin })) }))
    .filter((g) => g.students.length)
  const other = rows.filter((r) => !r.group || !groups.some((g) => g.id === r.group))
  if (other.length) groups.push({ id: 'other', name: 'Басқа оқушылар', students: other.map(({ id, name, hasPin }) => ({ id, name, hasPin })) })
  return groups
}

function slotFor(slots: any[], c: any, dow: number) {
  const own = slots.filter((s) => s.teacher_id === c.teacher_id && s.day_of_week === dow)
  return (c.group_id && own.find((x) => x.group_id === c.group_id)) || own.find((x) => (x.title ?? '').toLowerCase() === String(c.name).toLowerCase()) || null
}

export async function cabinet(studentId: string): Promise<Cabinet | null> {
  const sb = await db()
  const today = todayAlmaty()
  const dow = weekdayOf(today)
  const from = addDays(today, -35)
  const { data: s } = await sb.from('students').select('id, full_name, grade, group_id, bt_student_id, student_groups(name)').eq('id', studentId).maybeSingle()
  if (!s) return null
  const { data: mem } = await sb.from('teacher_class_students').select('class_id').eq('student_id', studentId)
  const ids = (mem ?? []).map((m) => m.class_id)
  const { data: cls } = ids.length ? await sb.from('teacher_classes').select('*').in('id', ids).eq('active', true) : { data: [] as any[] }
  const classes = cls ?? []
  const cids = classes.map((c: any) => c.id)
  const tids = Array.from(new Set(classes.map((c: any) => c.teacher_id)))
  const [teachers, lessons, att, hw, files, slots, quizzes, access, subj] = await Promise.all([
    tids.length ? sb.from('teachers').select('id, name').in('id', tids) : Promise.resolve({ data: [] as any[] }),
    cids.length ? sb.from('class_lessons').select('class_id, date, topic, homework, cancelled').in('class_id', cids).gte('date', from).lte('date', addDays(today, 7)) : Promise.resolve({ data: [] as any[] }),
    cids.length ? sb.from('class_attendance').select('class_id, date, status').eq('student_id', studentId).in('class_id', cids).gte('date', from) : Promise.resolve({ data: [] as any[] }),
    cids.length ? sb.from('class_homework').select('class_id, date, mark').eq('student_id', studentId).in('class_id', cids).gte('date', from) : Promise.resolve({ data: [] as any[] }),
    cids.length ? sb.from('class_homework_files').select('id, class_id, lesson_date, ref').eq('student_id', studentId).gte('lesson_date', from) : Promise.resolve({ data: [] as any[] }),
    sb.from('schedule_slots').select('teacher_id, group_id, day_of_week, start_time, end_time, title, room'),
    cids.length ? sb.from('class_quizzes').select('id, class_id').in('class_id', cids).gte('date', from) : Promise.resolve({ data: [] as any[] }),
    sb.from('ielts_access').select('test_id, ielts_tests(exam, published)').eq('student_id', studentId),
    sb.from('subject_rows').select('id').eq('student_id', studentId).limit(1),
  ])
  const qids = (quizzes.data ?? []).map((q: any) => q.id)
  const { data: qa } = qids.length ? await sb.from('class_quiz_answers').select('quiz_id, score, total').eq('student_id', studentId).in('quiz_id', qids) : { data: [] as any[] }
  const tName = new Map((teachers.data ?? []).map((t: any) => [t.id, t.name]))
  const L = (lessons.data ?? []) as any[]
  const slotsAll = (slots as any).data ?? []

  // Бүгінгі сабақтар
  const todayLessons: CabLesson[] = []
  for (const c of classes as any[]) {
    const l = L.find((x) => x.class_id === c.id && x.date === today)
    if (!isLessonDay(today, c.days ?? [], l)) continue
    const sl = slotFor(slotsAll, c, dow)
    todayLessons.push({
      classId: c.id,
      name: c.name,
      subject: c.subject,
      teacher: tName.get(c.teacher_id) ?? '',
      time: sl ? `${hm(sl.start_time)}–${hm(sl.end_time)}` : null,
      room: (sl && normalizeRoom(sl.room)) || homeRoom(tName.get(c.teacher_id)) || null,
      topic: l?.topic ?? null,
    })
  }
  todayLessons.sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99'))

  // Үй тапсырмасы: әр топтың соңғы берілген тапсырмасы
  const homework: CabHomework[] = []
  const fileRows = (files.data ?? []) as any[]
  const urls = await signRefs(fileRows.map((f) => f.ref))
  for (const c of classes as any[]) {
    const last = L.filter((x) => x.class_id === c.id && !x.cancelled && x.date <= today && (x.homework ?? '').trim()).sort((a, b) => b.date.localeCompare(a.date))[0]
    if (!last) continue
    const mark = ((hw.data ?? []) as any[]).filter((h) => h.class_id === c.id && h.date > last.date).sort((a, b) => a.date.localeCompare(b.date))[0]?.mark ?? null
    homework.push({
      classId: c.id,
      subject: c.subject,
      className: c.name,
      date: last.date,
      text: last.homework,
      mark,
      files: fileRows.map((f, i) => ({ f, url: urls[i] })).filter((x) => x.f.class_id === c.id && x.f.lesson_date === last.date && x.url).map((x) => ({ id: x.f.id, url: x.url })),
      canUpload: !mark,
    })
  }

  // Топтар: келесі сабақ және прогресс
  const classRows: CabClass[] = (classes as any[]).map((c) => {
    let next: CabClass['next'] = null
    for (let i = 0; i <= 7 && !next; i++) {
      const d = addDays(today, i)
      if (!isLessonDay(d, c.days ?? [], L.find((x) => x.class_id === c.id && x.date === d))) continue
      const sl = slotFor(slotsAll, c, weekdayOf(d))
      if (i === 0 && sl && hm(sl.end_time)! < new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(11, 16)) continue // бүгінгісі өтіп кетті
      next = { date: d, time: sl ? hm(sl.start_time) : null }
    }
    const qOf = new Set(((quizzes.data ?? []) as any[]).filter((q) => q.class_id === c.id).map((q) => q.id))
    return {
      id: c.id,
      name: c.name,
      subject: c.subject,
      teacher: tName.get(c.teacher_id) ?? '',
      next,
      progress: progressOf(
        ((att.data ?? []) as any[]).filter((a) => a.class_id === c.id).map((a) => ({ date: a.date, status: a.status as AttStatus })),
        ((hw.data ?? []) as any[]).filter((h) => h.class_id === c.id).map((h) => ({ date: h.date, mark: h.mark as HwMark })),
        ((qa ?? []) as any[]).filter((x) => qOf.has(x.quiz_id))
      ),
    }
  })

  const ex = new Set(((access.data ?? []) as any[]).filter((a) => a.ielts_tests?.published !== false).map((a) => a.ielts_tests?.exam ?? 'ielts'))
  return {
    student: { id: s.id, full_name: String(s.full_name).replace(/[)\s]+$/, ''), grade: (s as any).grade ?? null, group: (s as any).student_groups?.name ?? null },
    today,
    lessons: todayLessons,
    homework,
    classes: classRows,
    exams: { bilim: !!(s as any).bt_student_id, ubt: ex.has('ubt') || !!(subj.data ?? []).length, ielts: ex.has('ielts'), toefl: ex.has('toefl') },
  }
}

/**
 * Оқушылардың PIN-дері: кабинет PIN-і (students.ielts_pin) және Білім тексерудегі PIN (bt_students.pin).
 * Бала қайсысын білсе де кіре алады. bt_student_id бағаны жоқ базада — тек кабинет PIN-і.
 */
export async function pinsOf(ids: string[]): Promise<Map<string, { pin: string | null; bt: string | null }>> {
  const sb = await db()
  const out = new Map<string, { pin: string | null; bt: string | null }>()
  if (!ids.length) return out
  let rows: any[] = []
  for (let i = 0; i < ids.length; i += 300) {
    const part = ids.slice(i, i + 300)
    let r: any = await sb.from('students').select('id, ielts_pin, bt_student_id').in('id', part)
    if (r.error) r = await sb.from('students').select('id, ielts_pin').in('id', part)
    rows = rows.concat(r.data ?? [])
  }
  const btIds = Array.from(new Set(rows.map((r) => r.bt_student_id).filter(Boolean)))
  const bt = new Map<string, string | null>()
  for (let i = 0; i < btIds.length; i += 300) {
    const { data } = await sb.from('bt_students').select('id, pin').in('id', btIds.slice(i, i + 300))
    for (const b of data ?? []) bt.set(b.id, b.pin ?? null)
  }
  for (const r of rows) out.set(r.id, { pin: r.ielts_pin ?? null, bt: (r.bt_student_id && bt.get(r.bt_student_id)) || null })
  return out
}
