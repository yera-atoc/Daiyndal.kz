// Jarvis деректерін жинау (тек серверде). Кесте жоқ болса — бос деп есептеп, `missing`-ке жазамыз.
import { supabaseAdmin as sb } from './supabaseAdmin'
import { addDays } from './journal'
import { addMonthsISO, paymentStatus, todayAlmatyISO } from './payments'
import { buildOverview, WINDOW_DAYS, weekday } from './teacherInsights'
import { buildJarvis, type JarvisData, type JLesson } from './jarvis'

type Res<T> = { data: T[] | null; error: { message: string } | null }

export async function loadJarvis(): Promise<{ data: JarvisData; context: string }> {
  const today = todayAlmatyISO()
  const now = new Date().toISOString()
  const day1 = new Date(Date.now() - 86400000).toISOString()
  const missing: string[] = []
  const safe = async <T,>(name: string, q: PromiseLike<Res<T>>): Promise<T[]> => {
    const { data, error } = await q
    if (error) {
      missing.push(name)
      return []
    }
    return data ?? []
  }

  const [students, groups, teachers, payments, crmAtt, leads, errors, actions, slots, classes, members, classAtt, classLessons] = await Promise.all([
    safe<any>('students', sb.from('students').select('id, full_name, grade, status, teacher_id, group_id, payment_deadline, payment_amount, rating_points')),
    safe<any>('student_groups', sb.from('student_groups').select('id, name')),
    safe<any>('teachers', sb.from('teachers').select('id, name, subject').order('name')),
    safe<any>('crm_payments', sb.from('crm_payments').select('student_id, amount, paid_on').gte('paid_on', addMonthsISO(today, -6))),
    safe<any>('crm_attendance', sb.from('crm_attendance').select('student_id, date, present, excused').gte('date', addDays(today, -60))),
    safe<any>('site_leads', sb.from('site_leads').select('created_at, status, source, child_name, direction').order('created_at', { ascending: false }).limit(300)),
    safe<any>('error_log', sb.from('error_log').select('source, message').gte('at', day1).limit(500)),
    safe<any>('audit_log', sb.from('audit_log').select('id').gte('at', day1).limit(2000)),
    safe<any>('schedule_slots', sb.from('schedule_slots').select('teacher_id, group_id, day_of_week, start_time, end_time, title, room').order('start_time')),
    safe<any>('teacher_classes', sb.from('teacher_classes').select('id, teacher_id, name, subject, days, active')),
    safe<any>('teacher_class_students', sb.from('teacher_class_students').select('class_id, student_id')),
    safe<any>('class_attendance', sb.from('class_attendance').select('class_id, student_id, date, status').gte('date', addDays(today, -WINDOW_DAYS))),
    safe<any>('class_lessons', sb.from('class_lessons').select('class_id, date, cancelled').gte('date', addDays(today, -7))),
  ])

  const gName = new Map(groups.map((g: any) => [g.id, g.name]))
  const tName = new Map(teachers.map((t: any) => [t.id, t.name]))
  const cleanName = (n: string) => String(n).replace(/[)\s]+$/, '')

  const classTeacher: Record<string, string> = Object.fromEntries(classes.map((c: any) => [c.id, c.teacher_id]))

  const overview = buildOverview({
    today,
    classes: classes.map((c: any) => ({ id: c.id, name: c.name, subject: c.subject ?? null, days: c.days ?? [], active: c.active !== false })),
    members,
    students: students.map((s: any) => ({
      id: s.id,
      full_name: cleanName(s.full_name),
      grade: s.grade ?? null,
      status: s.status ?? null,
      rating_points: s.rating_points ?? 0,
      payment_deadline: s.payment_deadline ?? null,
      group_name: gName.get(s.group_id) ?? null,
    })),
    attendance: classAtt,
    lessons: classLessons,
  })

  const wd = weekday(today)
  const lessonsToday: JLesson[] = slots
    .filter((s: any) => s.day_of_week === wd)
    .map((s: any) => ({ time: String(s.start_time).slice(0, 5), end: String(s.end_time).slice(0, 5), title: s.title || gName.get(s.group_id) || 'Сабақ', teacher: tName.get(s.teacher_id) ?? '—', room: s.room ?? null }))

  // Тест бақылауы: соңғы 24 сағаттағы күдікті тапсырулар
  const proctor = await sb.from('audit_log').select('detail').like('action', 'proctor:%').gte('at', day1).limit(500)
  const suspicious = (proctor.data ?? []).filter((r: any) => r.detail?.risk === 'high')

  const data = buildJarvis({
    today,
    now,
    students: students.map((s: any) => ({ ...s, full_name: cleanName(s.full_name) })),
    teachers: teachers.map((t: any) => ({ id: t.id, name: t.name, subject: t.subject ?? null })),
    classTeacher,
    payments,
    crmAttendance: crmAtt,
    leads,
    errors24: errors,
    actions24: actions.length,
    lessonsToday,
    overview,
    missing,
  })

  if (suspicious.length) {
    const names = Array.from(new Set(suspicious.map((r: any) => r.detail?.name).filter(Boolean))).slice(0, 5)
    data.alerts.unshift({ level: 'high', area: 'student', href: '/admin?view=proctor', text: `Тест бақылауы: соңғы тәулікте ${suspicious.length} күдікті тапсыру${names.length ? ` (${names.join(', ')})` : ''}` })
  }

  // ИИ-көмекшіге арналған қысқа мәтін (телефон, PIN сияқты жеке байланыс деректері жоқ)
  const insight = new Map(overview.students.map((s) => [s.id, s]))
  const paidBy = new Map<string, string>()
  for (const p of payments) if (p.student_id && (!paidBy.has(p.student_id) || p.paid_on > paidBy.get(p.student_id)!)) paidBy.set(p.student_id, p.paid_on)
  const studentLines = students
    .filter((s: any) => s.status !== 'left')
    .sort((a: any, b: any) => String(a.full_name).localeCompare(String(b.full_name), 'kk'))
    .map((s: any) => {
      const i = insight.get(s.id)
      const p = paymentStatus(s.payment_deadline, today)
      return [
        cleanName(s.full_name),
        s.grade ? `${s.grade}-сынып` : null,
        `топ: ${gName.get(s.group_id) ?? '—'}`,
        `мұғалім: ${tName.get(s.teacher_id) ?? '—'}`,
        s.status === 'paused' ? 'үзілісте' : null,
        i?.classes.length ? `сабақ топтары: ${i.classes.join('/')}` : null,
        `қатысу30: ${i?.rate == null ? '—' : i.rate + '%'}`,
        i?.absentStreak ? `қатарынан келмеді: ${i.absentStreak}` : null,
        `төлем: ${s.payment_amount ?? '—'}₸, мерзімі ${s.payment_deadline ?? '—'} (${p.kind})`,
        paidBy.get(s.id) ? `соңғы төлем ${paidBy.get(s.id)}` : null,
        `рейтинг: ${s.rating_points ?? 0}`,
        i && i.risk !== 'ok' ? `ҚАУІП: ${i.reasons.join('; ')}` : null,
      ]
        .filter(Boolean)
        .join(' | ')
    })

  const context = [
    `Бүгін: ${today}.`,
    `KPI: ${JSON.stringify(data.kpi)}`,
    `Түсім 6 ай: ${data.revenue6.map((r) => `${r.month}=${r.value}`).join(', ')}`,
    `Бүгінгі сабақтар: ${data.lessonsToday.map((l) => `${l.time}-${l.end} ${l.title} (${l.teacher}${l.room ? ', ' + l.room : ''})`).join('; ') || 'жоқ'}`,
    `Мұғалімдер: ${data.teachers.map((t) => `${t.name} (${t.subject ?? '—'}): ${t.students} оқушы, ${t.classes} топ, қатысу ${t.rate ?? '—'}%, назар керек ${t.atRisk}, белгіленбеген сабақ ${t.unmarked}`).join('; ')}`,
    `Сабақ топтары: ${overview.classes.map((c) => `${c.name} (${c.subject ?? '—'}, мұғалім ${tName.get(classTeacher[c.id]) ?? '—'}): ${c.students} оқушы, қатысу ${c.rate ?? '—'}%`).join('; ')}`,
    `Өтінімдер (соңғы 30): ${leads.slice(0, 30).map((l: any) => `${l.created_at.slice(0, 10)} ${l.child_name} [${l.source}/${l.direction ?? '—'}] ${l.status}`).join('; ') || 'жоқ'}`,
    `Дабылдар: ${data.alerts.map((a) => `[${a.level}] ${a.text}`).join('; ') || 'жоқ'}`,
    `Оқушылар (${studentLines.length}):\n${studentLines.join('\n')}`,
  ].join('\n')

  return { data, context }
}
