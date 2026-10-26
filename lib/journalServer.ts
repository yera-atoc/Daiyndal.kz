// Сабақ журналы: рұқсат және дерекқор (тек серверде)
import { currentAdmin } from './requireAdmin'
import { currentTeacherId } from './requireTeacher'
import { addDays, type AttStatus, type JClass, type JDetail } from './journal'

export async function db() {
  const { supabaseAdmin } = await import('./supabaseAdmin')
  return supabaseAdmin
}

export type Who = { admin: boolean; teacherId: string | null; actor: string }

/** Әкімші (барлық топ) немесе мұғалім (тек өз топтары) */
export async function journalWho(): Promise<Who | null> {
  const [admin, teacherId] = await Promise.all([currentAdmin(), currentTeacherId()])
  if (admin) return { admin: true, teacherId, actor: admin.actor }
  if (teacherId) return { admin: false, teacherId, actor: `teacher:${teacherId}` }
  return null
}

const normClass = (c: any): JClass => ({ id: c.id, teacher_id: c.teacher_id, name: c.name, subject: c.subject ?? null, group_id: c.group_id ?? null, days: c.days ?? [], active: c.active !== false, position: c.position ?? 0 })

export async function getClass(id: string): Promise<JClass | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data } = await (await db()).from('teacher_classes').select('*').eq('id', id).maybeSingle()
  return data ? normClass(data) : null
}

export function canSee(who: Who, c: JClass) {
  return who.admin || (!!who.teacherId && c.teacher_id === who.teacherId)
}

/** Топтар тізімі: мұғалімге — өзінікі, әкімшіге — бәрі (teacher сүзгісімен) */
export async function listClasses(who: Who, teacherFilter?: string | null): Promise<JClass[]> {
  let q = (await db()).from('teacher_classes').select('*').order('position').order('name')
  if (!who.admin) q = q.eq('teacher_id', who.teacherId!)
  else if (teacherFilter) q = q.eq('teacher_id', teacherFilter)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []).map(normClass)
}

/** Бір апта бойынша бірнеше топтың журналы (бір сұраныс топтамасымен) */
export async function weekDetails(classes: JClass[], weekStart: string): Promise<JDetail[]> {
  if (!classes.length) return []
  const sb = await db()
  const ids = classes.map((c) => c.id)
  const end = addDays(weekStart, 6)
  const teacherIds = Array.from(new Set(classes.map((c) => c.teacher_id)))
  const [members, weeks, lessons, att, teachers] = await Promise.all([
    sb.from('teacher_class_students').select('class_id, student_id').in('class_id', ids),
    sb.from('class_weeks').select('*').in('class_id', ids).eq('week_start', weekStart),
    sb.from('class_lessons').select('*').in('class_id', ids).gte('date', weekStart).lte('date', end),
    sb.from('class_attendance').select('class_id, student_id, date, status').in('class_id', ids).gte('date', weekStart).lte('date', end),
    sb.from('teachers').select('id, name').in('id', teacherIds),
  ])
  for (const r of [members, weeks, lessons, att]) if (r.error) throw new Error(r.error.message)
  const sids = Array.from(new Set((members.data ?? []).map((m) => m.student_id)))
  const { data: studs } = sids.length ? await sb.from('students').select('id, full_name, status').in('id', sids) : { data: [] as any[] }
  const sById = new Map((studs ?? []).map((s: any) => [s.id, s]))
  return classes.map((c) => ({
    class: c,
    teacher: (teachers.data ?? []).find((t) => t.id === c.teacher_id)?.name ?? '',
    students: (members.data ?? [])
      .filter((m) => m.class_id === c.id)
      .map((m) => sById.get(m.student_id))
      .filter((s: any) => s && s.status !== 'left')
      .map((s: any) => ({ id: s.id, full_name: String(s.full_name).replace(/[)\s]+$/, '') }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'kk')),
    weekStart,
    week: (weeks.data ?? []).find((w) => w.class_id === c.id) ?? null,
    lessons: (lessons.data ?? []).filter((l) => l.class_id === c.id).map((l) => ({ date: l.date, topic: l.topic, homework: l.homework, cancelled: l.cancelled, updated_at: l.updated_at, updated_by: l.updated_by })),
    attendance: (att.data ?? []).filter((a) => a.class_id === c.id).map((a) => ({ student_id: a.student_id, date: a.date, status: a.status as AttStatus })),
  }))
}

/**
 * CRM-нің күндік қатысуын (crm_attendance) журналмен үйлестіру: оқушы сол күні кемінде бір сабаққа
 * келсе — келді; тек себепті болса — себепті; тек келмесе — келмеді. Журналда белгі жоқ болса, CRM-ге тимейді.
 */
export async function syncCrmAttendance(studentIds: string[], date: string) {
  if (!studentIds.length) return
  const sb = await db()
  const { data } = await sb.from('class_attendance').select('student_id, status').in('student_id', studentIds).eq('date', date)
  for (const sid of studentIds) {
    const st = (data ?? []).filter((r) => r.student_id === sid).map((r) => r.status as AttStatus)
    if (!st.length) continue
    const present = st.some((s) => s === 'present' || s === 'late')
    const excused = !present && st.some((s) => s === 'excused')
    // Бірегейлік шектеуі жоқ базада да жұмыс істеуі үшін: ескісін өшіріп, жаңасын жазамыз
    await sb.from('crm_attendance').delete().eq('student_id', sid).eq('date', date)
    await sb.from('crm_attendance').insert({ student_id: sid, date, present, excused })
  }
}

/** Мұғалімнің оқушылары: students.teacher_id бойынша + сабақ журналындағы топтары арқылы */
export async function teacherStudentIds(teacherId: string): Promise<string[]> {
  const sb = await db()
  const [own, cls] = await Promise.all([
    sb.from('students').select('id').eq('teacher_id', teacherId),
    sb.from('teacher_classes').select('id').eq('teacher_id', teacherId),
  ])
  const ids = new Set((own.data ?? []).map((r) => r.id as string))
  const classIds = (cls.data ?? []).map((c) => c.id as string) // кесте әлі жоқ болса — бос
  if (classIds.length) {
    const { data } = await sb.from('teacher_class_students').select('student_id').in('class_id', classIds)
    for (const r of data ?? []) ids.add(r.student_id as string)
  }
  return Array.from(ids)
}
