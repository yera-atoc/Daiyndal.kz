import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { currentTeacherId } from '@/lib/requireTeacher'
import { teacherStudentIds } from '@/lib/journalServer'
import { addDays } from '@/lib/journal'
import { todayAlmatyISO } from '@/lib/payments'
import { buildOverview, WINDOW_DAYS, type InsightStudent } from '@/lib/teacherInsights'

export const dynamic = 'force-dynamic'

// Мұғалімнің шолуы: өз топтары, өз оқушылары, талдау және ескертулер. Мұғалім id-сі тек сессиядан алынады.
export async function GET() {
  const teacherId = await currentTeacherId()
  if (!teacherId) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })

  const today = todayAlmatyISO()
  const from = addDays(today, -WINDOW_DAYS + 1)

  const [ids, cls] = await Promise.all([
    teacherStudentIds(teacherId),
    supabaseAdmin.from('teacher_classes').select('id, name, subject, days, active').eq('teacher_id', teacherId).order('position').order('name'),
  ])
  const classes = (cls.data ?? []).map((c: any) => ({ id: c.id, name: c.name, subject: c.subject ?? null, days: c.days ?? [], active: c.active !== false }))
  const classIds = classes.map((c) => c.id)

  const [studs, members, att, lessons] = await Promise.all([
    ids.length
      ? supabaseAdmin.from('students').select('id, full_name, grade, status, rating_points, payment_deadline, student_groups(name)').in('id', ids)
      : Promise.resolve({ data: [] as any[], error: null }),
    classIds.length ? supabaseAdmin.from('teacher_class_students').select('class_id, student_id').in('class_id', classIds) : Promise.resolve({ data: [] as any[], error: null }),
    classIds.length
      ? supabaseAdmin.from('class_attendance').select('class_id, student_id, date, status').in('class_id', classIds).gte('date', from).lte('date', today)
      : Promise.resolve({ data: [] as any[], error: null }),
    classIds.length
      ? supabaseAdmin.from('class_lessons').select('class_id, date, cancelled').in('class_id', classIds).gte('date', addDays(today, -7)).lte('date', today)
      : Promise.resolve({ data: [] as any[], error: null }),
  ])
  if (studs.error) return NextResponse.json({ error: studs.error.message }, { status: 500 })

  const students: InsightStudent[] = (studs.data ?? []).map((s: any) => ({
    id: s.id,
    full_name: String(s.full_name).replace(/[)\s]+$/, ''),
    grade: s.grade ?? null,
    status: s.status ?? null,
    rating_points: s.rating_points ?? 0,
    payment_deadline: s.payment_deadline ?? null,
    group_name: (Array.isArray(s.student_groups) ? s.student_groups[0]?.name : s.student_groups?.name) ?? null,
  }))

  return NextResponse.json(
    buildOverview({
      today,
      classes,
      members: members.data ?? [],
      students,
      attendance: att.data ?? [],
      lessons: lessons.data ?? [],
    }),
  )
}
