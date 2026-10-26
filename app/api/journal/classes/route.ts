import { NextRequest, NextResponse } from 'next/server'
import { currentAdmin } from '@/lib/requireAdmin'
import { db } from '@/lib/journalServer'
import { logServerError } from '@/lib/serverLog'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
const UUID = /^[0-9a-f-]{36}$/i

// Тек әкімші: мұғалімдердің топтары және олардың оқушылары
export async function GET() {
  if (!(await currentAdmin())) return bad('Рұқсат жоқ', 401)
  const sb = await db()
  const [classes, members, teachers, students, groups] = await Promise.all([
    sb.from('teacher_classes').select('*').order('position').order('name'),
    sb.from('teacher_class_students').select('class_id, student_id'),
    sb.from('teachers').select('id, name, subject').order('name'),
    sb.from('students').select('id, full_name, grade, group_id, status').neq('status', 'left').order('full_name'),
    sb.from('student_groups').select('id, name').order('name'),
  ])
  if (classes.error) return bad(/teacher_classes/.test(classes.error.message) ? 'Алдымен 20261026_05_class_journal.sql миграциясын іске қосыңыз' : classes.error.message, 500)
  return NextResponse.json(
    {
      classes: (classes.data ?? []).map((c) => ({ ...c, student_ids: (members.data ?? []).filter((m) => m.class_id === c.id).map((m) => m.student_id) })),
      teachers: teachers.data ?? [],
      students: students.data ?? [],
      groups: groups.data ?? [],
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

// save { id?, teacher_id, name, subject, group_id, days, active, student_ids } | delete { id }
export async function POST(req: NextRequest) {
  if (!(await currentAdmin())) return bad('Рұқсат жоқ', 401)
  try {
    const b = await req.json().catch(() => null)
    const sb = await db()
    if (b?.action === 'delete') {
      if (!UUID.test(String(b.id))) return bad('Топ табылмады')
      const { error } = await sb.from('teacher_classes').delete().eq('id', b.id)
      if (error) return bad(error.message, 500)
      return NextResponse.json({ ok: true })
    }
    if (b?.action !== 'save') return bad('Белгісіз әрекет')
    const c = b.class ?? {}
    const name = String(c.name ?? '').trim().slice(0, 100)
    if (!name) return bad('Топ атауын жазыңыз')
    if (!UUID.test(String(c.teacher_id ?? ''))) return bad('Мұғалімді таңдаңыз')
    const days = Array.from(new Set((Array.isArray(c.days) ? c.days : []).map(Number).filter((d: number) => d >= 1 && d <= 7))).sort()
    const row = {
      teacher_id: c.teacher_id,
      name,
      subject: String(c.subject ?? '').trim().slice(0, 60) || null,
      group_id: UUID.test(String(c.group_id ?? '')) ? c.group_id : null,
      days,
      active: c.active !== false,
      position: Math.round(Number(c.position) || 0),
    }
    let id = UUID.test(String(c.id ?? '')) ? (c.id as string) : null
    if (id) {
      const { error } = await sb.from('teacher_classes').update(row).eq('id', id)
      if (error) return bad(error.message, 500)
    } else {
      const { data, error } = await sb.from('teacher_classes').insert(row).select('id').single()
      if (error) return bad(error.message, 500)
      id = data.id as string
    }
    // Оқушылар құрамы: артығын алып тастап, жаңаларын қосу (журнал белгілері сақталады)
    const want = new Set<string>((Array.isArray(c.student_ids) ? c.student_ids : []).filter((s: unknown) => typeof s === 'string' && UUID.test(s)))
    const { data: cur } = await sb.from('teacher_class_students').select('student_id').eq('class_id', id)
    const have = new Set((cur ?? []).map((r) => r.student_id as string))
    const drop = Array.from(have).filter((s) => !want.has(s))
    const add = Array.from(want).filter((s) => !have.has(s))
    if (drop.length) {
      const { error } = await sb.from('teacher_class_students').delete().eq('class_id', id).in('student_id', drop)
      if (error) return bad(error.message, 500)
    }
    if (add.length) {
      const { error } = await sb.from('teacher_class_students').insert(add.map((student_id) => ({ class_id: id, student_id })))
      if (error) return bad(error.message, 500)
    }
    return NextResponse.json({ ok: true, id })
  } catch (e: any) {
    await logServerError('journal/classes', e)
    return bad(e.message, 500)
  }
}
