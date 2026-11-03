import { NextRequest, NextResponse } from 'next/server'
import { currentAdmin } from '@/lib/requireAdmin'
import { supabaseAdmin as sb } from '@/lib/supabaseAdmin'
import { syncCrmStudentToBt } from '@/lib/crmSync'
import { cleanName, normPhone, planGroup, validateGroup, type ImpGroup } from '@/lib/importPlan'
import { logServerError } from '@/lib/serverLog'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Counts = { groups: number; students: number; updated: number; classes: number; members: number; slots: number }

// Бір топты енгізу. Қайта жіберсе де екі есе жазбайды: бар топ, оқушы, журнал тобы, кесте жолы қайта пайдаланылады.
async function importGroup(g: ImpGroup, c: Counts) {
  const name = cleanName(g.name)

  // 1) CRM тобы
  let { data: grp } = await sb.from('student_groups').select('id').eq('name', name).maybeSingle()
  if (!grp) {
    const r = await sb.from('student_groups').insert({ name }).select('id').single()
    if (r.error) throw new Error(`Топ «${name}»: ${r.error.message}`)
    grp = r.data
    c.groups++
  }
  const groupId = grp!.id as string

  // 2) Оқушылар (аты бойынша: алдымен осы топтан, болмаса топсыз/басқа топтағы аттасы емес — жаңасы)
  const ids = new Map<string, string>()
  for (const s of g.students) {
    const full = cleanName(s.name)
    if (!full) continue
    const phone = normPhone(s.parentPhone) || null
    const parent = cleanName(s.parentName) || null
    const { data: same } = await sb.from('students').select('id, group_id, grade, parent_phone, parent_name').eq('full_name', full).neq('status', 'left')
    // Аттас оқушы: осы топта болса не топсыз болса — сол. Басқа топта болса, тек толық аты-жөні (2+ сөз) мен сыныбы
    // бірдей болғанда ғана бір бала деп есептейміз (мысалы, математика мен ағылшынға екі топта барады).
    // «Әмір» сияқты жалғыз есім әртүрлі балалар болуы мүмкін — бөлек жазылады.
    const existing =
      (same ?? []).find((x: any) => x.group_id === groupId) ??
      (same ?? []).find((x: any) => !x.group_id) ??
      (full.split(' ').length >= 2 ? (same ?? []).find((x: any) => x.grade === g.grade) : undefined)
    if (existing) {
      const patch: Record<string, unknown> = {}
      if (!existing.group_id) patch.group_id = groupId
      if (phone && phone !== existing.parent_phone) patch.parent_phone = phone
      if (parent && parent !== existing.parent_name) patch.parent_name = parent
      if (Object.keys(patch).length) {
        await sb.from('students').update(patch).eq('id', existing.id)
        c.updated++
      }
      ids.set(full, existing.id)
      continue
    }
    const r = await sb
      .from('students')
      .insert({ full_name: full, grade: g.grade, group_id: groupId, teacher_id: g.teacherId || null, parent_phone: phone, parent_name: parent, status: 'active', start_date: null, comment: cleanName(s.note) || null })
      .select('id')
      .single()
    if (r.error) throw new Error(`Оқушы «${full}»: ${r.error.message}`)
    ids.set(full, r.data.id)
    c.students++
    await syncCrmStudentToBt(r.data.id)
  }

  // 3) Сабақ журналы: мұғалім + пән бойынша топ, оқушыларын бекіту
  const plan = planGroup(g)
  for (const cl of plan.classes) {
    if (!cl.teacherId) continue
    let { data: tc } = await sb.from('teacher_classes').select('id, days').eq('teacher_id', cl.teacherId).eq('name', cl.name).maybeSingle()
    if (!tc) {
      const r = await sb.from('teacher_classes').insert({ teacher_id: cl.teacherId, name: cl.name, subject: cl.subject || null, group_id: groupId, days: cl.days, active: true }).select('id, days').single()
      if (r.error) throw new Error(`Журнал «${cl.name}»: ${r.error.message}`)
      tc = r.data
      c.classes++
    } else if (cl.days.length) {
      await sb.from('teacher_classes').update({ days: cl.days, group_id: groupId, active: true }).eq('id', tc.id)
    }
    const rows = cl.students.map((n) => ids.get(n)).filter(Boolean).map((sid) => ({ class_id: tc!.id, student_id: sid }))
    if (rows.length) {
      const r = await sb.from('teacher_class_students').upsert(rows, { onConflict: 'class_id,student_id', ignoreDuplicates: true }).select('student_id')
      if (r.error) throw new Error(`Журнал «${cl.name}»: ${r.error.message}`)
      c.members += r.data?.length ?? 0
    }
  }

  // 4) Кесте
  for (const sl of plan.slots) {
    if (!sl.teacherId) continue
    const { data: ex } = await sb.from('schedule_slots').select('id').eq('teacher_id', sl.teacherId).eq('group_id', groupId).eq('day_of_week', sl.day).eq('start_time', sl.start).maybeSingle()
    if (ex) continue
    const r = await sb.from('schedule_slots').insert({ teacher_id: sl.teacherId, group_id: groupId, day_of_week: sl.day, start_time: sl.start, end_time: sl.end, title: sl.title })
    if (r.error) throw new Error(`Кесте «${sl.title}»: ${r.error.message}`)
    c.slots++
  }
}

export async function POST(req: NextRequest) {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  const b = await req.json().catch(() => null)
  const groups: ImpGroup[] = Array.isArray(b?.groups) ? b.groups.slice(0, 50) : []
  if (!groups.length) return NextResponse.json({ error: 'Топ таңдалмаған' }, { status: 400 })
  for (const g of groups) {
    const errs = validateGroup(g)
    if (errs.length) return NextResponse.json({ error: `«${g.name}»: ${errs.join('; ')}` }, { status: 400 })
  }
  const c: Counts = { groups: 0, students: 0, updated: 0, classes: 0, members: 0, slots: 0 }
  const done: string[] = []
  try {
    for (const g of groups) {
      await importGroup(g, c)
      done.push(g.key)
    }
    return NextResponse.json({ ok: true, done, counts: c })
  } catch (e: any) {
    await logServerError('import', e)
    return NextResponse.json({ error: e?.message ?? 'Қате', done, counts: c }, { status: 500 })
  }
}
