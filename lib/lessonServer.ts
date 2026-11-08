// «Бір экран — бір сабақ»: дерекқор (тек серверде)
import { addDays, isLessonDay, todayAlmaty, weekdayOf, type AttStatus, type JClass } from './journal'
import { db, listClasses, syncCrmAttendance, type Who } from './journalServer'
import { nextDeadlineAfter, paymentStatus } from './payments'
import { signRefs } from './privateFiles'
import { nextPlanItem, progressOf, type HwMark, type LessonView, type PlanItem, type QuizQ, type TodayItem } from './lesson'

const hm = (t: string | null | undefined) => (t ? t.slice(0, 5) : null)

/** Кестеден сабақ уақыты: мұғалім + топ + апта күні бойынша */
function timeOf(slots: any[], c: JClass, dow: number): string | null {
  const own = slots.filter((s) => s.teacher_id === c.teacher_id && s.day_of_week === dow)
  const s = (c.group_id && own.find((x) => x.group_id === c.group_id)) || own.find((x) => (x.title ?? '').toLowerCase() === c.name.toLowerCase())
  return s ? `${hm(s.start_time)}–${hm(s.end_time)}` : null
}

/** Бүгінгі (немесе берілген күнгі) сабақтар: мұғалімге — өзінікі, әкімшіге — бәрі */
export async function todayItems(who: Who, date = todayAlmaty()): Promise<TodayItem[]> {
  const sb = await db()
  const classes = (await listClasses(who)).filter((c) => c.active)
  if (!classes.length) return []
  const ids = classes.map((c) => c.id)
  const dow = weekdayOf(date)
  const [lessons, att, members, slots, plan, used, teachers] = await Promise.all([
    sb.from('class_lessons').select('class_id, date, topic, cancelled').in('class_id', ids).eq('date', date),
    sb.from('class_attendance').select('class_id, student_id').in('class_id', ids).eq('date', date),
    sb.from('teacher_class_students').select('class_id, student_id, students(status)').in('class_id', ids),
    sb.from('schedule_slots').select('teacher_id, group_id, day_of_week, start_time, end_time, title').eq('day_of_week', dow),
    sb.from('class_plan').select('id, class_id, position, topic').in('class_id', ids),
    sb.from('class_lessons').select('class_id, plan_id').in('class_id', ids).not('plan_id', 'is', null),
    sb.from('teachers').select('id, name').in('id', Array.from(new Set(classes.map((c) => c.teacher_id)))),
  ])
  const out: TodayItem[] = []
  for (const c of classes) {
    const l = (lessons.data ?? []).find((x) => x.class_id === c.id)
    if (!isLessonDay(date, c.days, l)) continue
    const n = (members.data ?? []).filter((m: any) => m.class_id === c.id && m.students?.status !== 'left').length
    const marked = (att.data ?? []).filter((a) => a.class_id === c.id).length
    const np = nextPlanItem((plan.data ?? []).filter((p) => p.class_id === c.id), (used.data ?? []).filter((u) => u.class_id === c.id).map((u) => u.plan_id))
    out.push({
      classId: c.id,
      name: c.name,
      subject: c.subject,
      teacher: (teachers.data ?? []).find((t) => t.id === c.teacher_id)?.name ?? '',
      teacherId: c.teacher_id,
      time: timeOf(slots.data ?? [], c, dow),
      students: n,
      marked,
      topic: l?.topic ?? null,
      done: marked > 0 && marked >= n && !!l?.topic?.trim(),
      next: np?.topic ?? null,
    })
  }
  return out.sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99') || a.name.localeCompare(b.name))
}

async function classStudents(classId: string) {
  const sb = await db()
  const { data } = await sb.from('teacher_class_students').select('student_id, students(id, full_name, status, payment_deadline, payment_amount)').eq('class_id', classId)
  return (data ?? [])
    .map((m: any) => m.students)
    .filter((s: any) => s && s.status !== 'left')
    .map((s: any) => ({ ...s, full_name: String(s.full_name).replace(/[)\s]+$/, '') }))
    .sort((a: any, b: any) => a.full_name.localeCompare(b.full_name, 'kk'))
}

export async function getPlan(classId: string): Promise<PlanItem[]> {
  const { data, error } = await (await db()).from('class_plan').select('id, position, topic, homework').eq('class_id', classId).order('position')
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Бір сабақтың толық көрінісі */
export async function lessonView(c: JClass, date: string, teacherName: string): Promise<LessonView> {
  const sb = await db()
  const today = todayAlmaty()
  const from = addDays(date, -35)
  const [students, lesson, att, hw, prev, plan, used, quizzes, slots] = await Promise.all([
    classStudents(c.id),
    sb.from('class_lessons').select('topic, homework, plan_id, cancelled').eq('class_id', c.id).eq('date', date).maybeSingle(),
    sb.from('class_attendance').select('student_id, date, status').eq('class_id', c.id).gte('date', from).lte('date', date),
    sb.from('class_homework').select('student_id, date, mark').eq('class_id', c.id).gte('date', from).lte('date', date),
    sb.from('class_lessons').select('date, topic, homework').eq('class_id', c.id).eq('cancelled', false).lt('date', date).order('date', { ascending: false }).limit(1).maybeSingle(),
    getPlan(c.id),
    sb.from('class_lessons').select('date, plan_id').eq('class_id', c.id).not('plan_id', 'is', null),
    sb.from('class_quizzes').select('id, date, topic, open, questions').eq('class_id', c.id).gte('date', from).order('created_at', { ascending: false }),
    sb.from('schedule_slots').select('teacher_id, group_id, day_of_week, start_time, end_time, title').eq('day_of_week', weekdayOf(date)),
  ])
  for (const r of [att, hw, used, quizzes]) if (r.error) throw new Error(r.error.message)
  // Өткен сабақтың үй тапсырмасына оқушылар жіберген дәптер суреттері
  const hwFiles: Record<string, string[]> = {}
  if (prev.data?.date) {
    const { data: fl } = await sb.from('class_homework_files').select('student_id, ref').eq('class_id', c.id).eq('lesson_date', prev.data.date).order('created_at')
    const urls = await signRefs((fl ?? []).map((f) => f.ref), 3 * 3600)
    ;(fl ?? []).forEach((f, i) => {
      if (!urls[i]) return
      ;(hwFiles[f.student_id] ??= []).push(urls[i])
    })
  }
  const qIds = (quizzes.data ?? []).map((q) => q.id)
  const { data: qa } = qIds.length ? await sb.from('class_quiz_answers').select('quiz_id, student_id, score, total').in('quiz_id', qIds) : { data: [] as any[] }
  const usedIds = (used.data ?? []).filter((u) => u.date !== date).map((u) => u.plan_id)
  const doneSet = new Set((used.data ?? []).map((u) => u.plan_id))
  const todayQuiz = (quizzes.data ?? []).find((q) => q.date === date) ?? null
  const attToday: Record<string, AttStatus> = {}
  for (const a of att.data ?? []) if (a.date === date) attToday[a.student_id] = a.status as AttStatus
  const hwToday: Record<string, HwMark> = {}
  for (const h of hw.data ?? []) if (h.date === date) hwToday[h.student_id] = h.mark as HwMark
  return {
    class: { id: c.id, name: c.name, subject: c.subject, days: c.days, teacher: teacherName },
    date,
    time: timeOf(slots.data ?? [], c, weekdayOf(date)),
    students: students.map((s: any) => {
      const st = paymentStatus(s.payment_deadline, today)
      return {
        id: s.id,
        full_name: s.full_name,
        pay: { deadline: s.payment_deadline ?? null, amount: s.payment_amount ?? null, kind: st.kind, days: st.days },
        progress: progressOf(
          (att.data ?? []).filter((a) => a.student_id === s.id).map((a) => ({ date: a.date, status: a.status as AttStatus })),
          (hw.data ?? []).filter((h) => h.student_id === s.id).map((h) => ({ date: h.date, mark: h.mark as HwMark })),
          (qa ?? []).filter((x: any) => x.student_id === s.id)
        ),
      }
    }),
    lesson: lesson.data ?? null,
    attendance: attToday,
    homework: hwToday,
    prev: prev.data ?? null,
    plan: plan.map((p) => ({ ...p, done: doneSet.has(p.id) })),
    next: nextPlanItem(plan, usedIds),
    quiz: todayQuiz
      ? {
          id: todayQuiz.id,
          topic: todayQuiz.topic,
          open: todayQuiz.open,
          total: (todayQuiz.questions as QuizQ[]).length,
          results: (qa ?? []).filter((x: any) => x.quiz_id === todayQuiz.id).map((x: any) => ({ student_id: x.student_id, score: x.score, total: x.total })),
        }
      : null,
    canPay: true,
    hwFiles,
  }
}

const STATUSES: AttStatus[] = ['present', 'absent', 'excused', 'late']
const MARKS: HwMark[] = ['done', 'partial', 'none']

/** Сабақты бір рет сақтау: тақырып, тапсырма, КТП тақырыбы, қатысу (бәрі), үй тапсырмасын тексеру */
export async function saveLesson(c: JClass, date: string, actor: string, b: any) {
  const sb = await db()
  const now = new Date().toISOString()
  const ids = new Set((await classStudents(c.id)).map((s: any) => s.id as string))
  const txt = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
  let planId: string | null = typeof b.planId === 'string' && /^[0-9a-f-]{36}$/i.test(b.planId) ? b.planId : null
  if (planId) {
    const { data } = await sb.from('class_plan').select('id').eq('id', planId).eq('class_id', c.id).maybeSingle()
    if (!data) planId = null
  }
  const row: Record<string, unknown> = { class_id: c.id, date, topic: txt(b.topic, 1000), homework: txt(b.homework, 2000), cancelled: false, updated_at: now, updated_by: actor, plan_id: planId }
  let r = await sb.from('class_lessons').upsert(row)
  if (r.error && /plan_id/.test(r.error.message)) {
    delete row.plan_id // миграция әлі іске қосылмаса да сақталсын
    r = await sb.from('class_lessons').upsert(row)
  }
  if (r.error) throw new Error(r.error.message)

  const att = Object.entries(b.attendance ?? {}).filter(([sid, s]) => ids.has(sid) && STATUSES.includes(s as AttStatus))
  if (att.length) {
    const { error } = await sb.from('class_attendance').upsert(att.map(([student_id, status]) => ({ class_id: c.id, student_id, date, status, updated_at: now })))
    if (error) throw new Error(error.message)
    await syncCrmAttendance(att.map(([sid]) => sid), date)
  }
  const hwAll = Object.entries(b.homeworkMarks && typeof b.homeworkMarks === 'object' ? b.homeworkMarks : {}).filter(([sid]) => ids.has(sid))
  const hwSet = hwAll.filter(([, m]) => MARKS.includes(m as HwMark))
  const hwDel = hwAll.filter(([, m]) => m === null).map(([sid]) => sid)
  if (hwSet.length) {
    const { error } = await sb.from('class_homework').upsert(hwSet.map(([student_id, mark]) => ({ class_id: c.id, student_id, date, mark, updated_at: now })))
    if (error) throw new Error(error.message)
  }
  if (hwDel.length) await sb.from('class_homework').delete().eq('class_id', c.id).eq('date', date).in('student_id', hwDel)
  return { ok: true, at: now, marked: att.length }
}

/** Мұғалім (немесе әкімші) төлемді қабылдады: crm_payments + оқушының келесі төлем күні */
export async function recordPayment(c: JClass, studentId: string, actor: string, actorName: string, b: any) {
  const ids = new Set((await classStudents(c.id)).map((s: any) => s.id as string))
  if (!ids.has(studentId)) throw Object.assign(new Error('Оқушы бұл топта жоқ'), { status: 403 })
  return recordPaymentFor(studentId, actor, actorName, b)
}

/** Төлемді жазу (рұқсатты шақырушы тексереді) */
export async function recordPaymentFor(studentId: string, actor: string, actorName: string, b: any) {
  const sb = await db()
  const { data: s } = await sb.from('students').select('id, full_name, payment_deadline, payment_amount').eq('id', studentId).maybeSingle()
  if (!s) throw Object.assign(new Error('Оқушы табылмады'), { status: 404 })
  const paidOn = todayAlmaty()
  const raw = b.amount === undefined || b.amount === '' || b.amount === null ? s.payment_amount : b.amount
  const amount = raw == null || !(Number(raw) > 0) ? null : Math.min(2_000_000, Math.round(Number(raw)))
  if (!amount) throw Object.assign(new Error('Соманы жазыңыз'), { status: 400 })
  const method = ['kaspi', 'cash', 'transfer'].includes(b.method) ? b.method : 'kaspi'
  const METHOD = { kaspi: 'Kaspi', cash: 'Қолма-қол', transfer: 'Аударым' } as Record<string, string>
  const nextDeadline = nextDeadlineAfter(s.payment_deadline, paidOn)
  const row: Record<string, unknown> = { student_id: s.id, student_name: s.full_name, amount, paid_on: paidOn, period_end: nextDeadline, note: `${METHOD[method]} · қабылдады: ${actorName}`.slice(0, 300), method, recorded_by: actor }
  let ins = await sb.from('crm_payments').insert(row).select('id').single()
  if (ins.error && /method|recorded_by/.test(ins.error.message)) {
    delete row.method
    delete row.recorded_by
    ins = await sb.from('crm_payments').insert(row).select('id').single()
  }
  if (ins.error) throw new Error(ins.error.message)
  const { error } = await sb.from('students').update({ payment_date: paidOn, payment_deadline: nextDeadline, payment_amount: amount }).eq('id', s.id)
  if (error) throw new Error(error.message)
  return { ok: true, id: ins.data.id, amount, nextDeadline }
}
