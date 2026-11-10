import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/requireAdmin'
import { db } from '@/lib/journalServer'
import { SUBJECT_NAME, planAssign, type SubjKey } from '@/lib/assign'
import { logServerError } from '@/lib/serverLog'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

async function load() {
  const sb = await db()
  let groups: any = await sb.from('student_groups').select('id, name, bt_group_id').order('name')
  if (groups.error) groups = await sb.from('student_groups').select('id, name').order('name')
  const [bt, students, teachers, slots, classes] = await Promise.all([
    sb.from('bt_groups').select('id, name, subjects'),
    sb.from('students').select('id, full_name, group_id, status'),
    sb.from('teachers').select('id, name, subject').order('name'),
    sb.from('schedule_slots').select('teacher_id, group_id, day_of_week'),
    sb.from('teacher_classes').select('id, teacher_id, group_id, name, subject, days, active'),
  ])
  if (students.error) throw new Error(students.error.message)
  return { groups: groups.data ?? [], bt: bt.data ?? [], students: students.data ?? [], teachers: teachers.data ?? [], slots: slots.data ?? [], classes: classes.data ?? [] }
}

// GET — ереже бойынша ұсыныс (ештеңе жазылмайды)
export async function GET() {
  if (!(await isAdmin())) return bad('Рұқсат жоқ', 401)
  try {
    const d = await load()
    const rows = planAssign({ groups: d.groups, btGroups: d.bt as any, students: d.students, teachers: d.teachers, slots: d.slots as any })
    // Бұрыннан бекітілгені (мұғалімнің осы топқа журнал тобы бар ма)
    const linked = rows.map((r) => ({
      ...r,
      linked: d.classes.some((c: any) => c.group_id === r.groupId && c.teacher_id === r.teacherId && (c.subject === SUBJECT_NAME[r.subject] || !c.subject)),
    }))
    return NextResponse.json({ rows: linked, teachers: d.teachers, subjects: SUBJECT_NAME }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    await logServerError('admin/assign', e)
    return bad(e.message, 500)
  }
}

// POST { rows: [{ groupId, subject, teacherId }] } — бекіту: мұғалімге журнал тобы (бар болса — сол) және топ оқушылары
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return bad('Рұқсат жоқ', 401)
  try {
    const b = await req.json().catch(() => null)
    const want: { groupId: string; subject: SubjKey; teacherId: string }[] = (Array.isArray(b?.rows) ? b.rows : []).filter((r: any) => r?.groupId && r?.teacherId && SUBJECT_NAME[r.subject as SubjKey])
    if (!want.length) return bad('Бекітетін жол жоқ')
    const d = await load()
    const sb = await db()
    let created = 0
    let reused = 0
    let links = 0
    const classes = [...(d.classes as any[])]
    for (const r of want) {
      const g = (d.groups as any[]).find((x) => x.id === r.groupId)
      const t = (d.teachers as any[]).find((x) => x.id === r.teacherId)
      if (!g || !t) continue
      const subj = SUBJECT_NAME[r.subject]
      const days = Array.from(new Set((d.slots as any[]).filter((s) => s.teacher_id === t.id && s.group_id === g.id).map((s) => s.day_of_week))).sort()
      let c =
        classes.find((x) => x.teacher_id === t.id && x.group_id === g.id && x.subject === subj) ??
        classes.find((x) => x.teacher_id === t.id && x.group_id === g.id && (!x.subject || x.subject === t.subject))
      if (c) {
        reused++
        const patch: Record<string, unknown> = {}
        if (!c.active) patch.active = true
        if (!(c.days ?? []).length && days.length) patch.days = days
        if (Object.keys(patch).length) await sb.from('teacher_classes').update(patch).eq('id', c.id)
      } else {
        const { data, error } = await sb.from('teacher_classes').insert({ teacher_id: t.id, name: `${g.name} · ${subj}`, subject: subj, group_id: g.id, days, active: true }).select('*').single()
        if (error) throw new Error(error.message)
        c = data
        classes.push(c)
        created++
      }
      const members = (d.students as any[]).filter((s) => s.group_id === g.id && s.status !== 'left').map((s) => ({ class_id: c.id, student_id: s.id }))
      if (members.length) {
        const { error } = await sb.from('teacher_class_students').upsert(members, { onConflict: 'class_id,student_id', ignoreDuplicates: true })
        if (error) throw new Error(error.message)
        links += members.length
      }
    }
    return NextResponse.json({ ok: true, created, reused, links })
  } catch (e: any) {
    await logServerError('admin/assign', e)
    return bad(e.message, 500)
  }
}
