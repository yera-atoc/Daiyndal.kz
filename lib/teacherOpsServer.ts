// Мұғалімдер есебіне деректер жинау (тек серверде)
import { supabaseAdmin as sb } from './supabaseAdmin'
import { todayAlmatyISO } from './payments'
import { teacherReports, type OpsTeacher, type TeacherReport } from './teacherOps'

export async function loadTeachers(): Promise<OpsTeacher[]> {
  let r: any = await sb.from('teachers').select('id, name, subject, phone, lesson_rate').order('name')
  if (r.error) r = await sb.from('teachers').select('id, name, subject').order('name') // миграция әлі іске қосылмаған
  return (r.data ?? []).map((t: any) => ({ id: t.id, name: t.name, subject: t.subject ?? null, phone: t.phone ?? null, lesson_rate: t.lesson_rate ?? null }))
}

export async function loadReports(from: string, to: string, teacherId?: string): Promise<TeacherReport[]> {
  const today = todayAlmatyISO()
  let teachers = await loadTeachers()
  if (teacherId) teachers = teachers.filter((t) => t.id === teacherId)
  let cq = sb.from('teacher_classes').select('id, teacher_id, name, days, active')
  if (teacherId) cq = cq.eq('teacher_id', teacherId)
  const { data: classes } = await cq
  const ids = (classes ?? []).map((c: any) => c.id)
  const none = { data: [] as any[] }
  const [att, lessons, members] = await Promise.all([
    ids.length ? sb.from('class_attendance').select('class_id, student_id, date, status').in('class_id', ids).gte('date', from).lte('date', to).limit(20000) : none,
    ids.length ? sb.from('class_lessons').select('class_id, date, cancelled, topic, homework').in('class_id', ids).gte('date', from).lte('date', to) : none,
    ids.length ? sb.from('teacher_class_students').select('class_id, student_id').in('class_id', ids) : none,
  ])
  const sids = Array.from(new Set((members.data ?? []).map((m: any) => m.student_id)))
  const students = sids.length ? (await sb.from('students').select('id, status').in('id', sids)).data ?? [] : []
  return teacherReports({
    from,
    to,
    today,
    teachers,
    classes: (classes ?? []).map((c: any) => ({ id: c.id, teacher_id: c.teacher_id, name: c.name, days: c.days ?? [], active: c.active !== false })),
    attendance: att.data ?? [],
    lessons: lessons.data ?? [],
    members: members.data ?? [],
    students,
  })
}
