import { NextRequest, NextResponse } from 'next/server'
import { currentAdmin } from '@/lib/requireAdmin'
import { addDays, todayAlmaty, type AttStatus } from '@/lib/journal'
import { db, journalWho } from '@/lib/journalServer'
import { recordPaymentFor, todayItems } from '@/lib/lessonServer'
import { progressOf, type HwMark } from '@/lib/lesson'
import { paymentStatus } from '@/lib/payments'
import { planScheduleSync } from '@/lib/scheduleSync'
import { weekdayOf } from '@/lib/journal'
import { logServerError } from '@/lib/serverLog'
import { planBtLink } from '@/lib/btLink'
import { todayAlmatyISO } from '@/lib/payments'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

/** Кесте мен журнал топтарын салыстыру (sync = true болса — жетіспейтінін жазады) */
async function scheduleSync(sync: boolean) {
  const sb = await db()
  const [slots, classes, groups] = await Promise.all([
    sb.from('schedule_slots').select('teacher_id, group_id, day_of_week, title'),
    sb.from('teacher_classes').select('id, teacher_id, name, group_id, days, active'),
    sb.from('student_groups').select('id, name'),
  ])
  if (slots.error || classes.error) return { missingToday: 0, create: 0, update: 0 }
  const plan = planScheduleSync(slots.data ?? [], (classes.data ?? []).map((c: any) => ({ ...c, days: c.days ?? [], active: c.active !== false })), groups.data ?? [], weekdayOf(todayAlmaty()))
  if (!sync) return { missingToday: plan.missingToday, create: plan.create.length, update: plan.addDays.length }
  for (const u of plan.addDays) await sb.from('teacher_classes').update({ days: u.days, active: true }).eq('id', u.id)
  let students = 0
  if (plan.create.length) {
    const { data: teachers } = await sb.from('teachers').select('id, subject')
    const subj = new Map((teachers ?? []).map((t: any) => [t.id, t.subject ?? null]))
    const { data: made, error } = await sb
      .from('teacher_classes')
      .insert(plan.create.map((c) => ({ teacher_id: c.teacher_id, name: c.name, subject: subj.get(c.teacher_id) ?? null, group_id: c.group_id, days: c.days, active: true })))
      .select('id, group_id')
    if (error) throw new Error(error.message)
    const gids = Array.from(new Set((made ?? []).map((m: any) => m.group_id).filter(Boolean)))
    if (gids.length) {
      const { data: st } = await sb.from('students').select('id, group_id').in('group_id', gids).neq('status', 'left')
      const rows = (made ?? []).flatMap((m: any) => (st ?? []).filter((x: any) => m.group_id && x.group_id === m.group_id).map((x: any) => ({ class_id: m.id, student_id: x.id })))
      if (rows.length) {
        const { error: e2 } = await sb.from('teacher_class_students').upsert(rows)
        if (e2) throw new Error(e2.message)
      }
      students = rows.length
    }
  }
  return { missingToday: 0, create: plan.create.length, update: plan.addDays.length, students }
}

/** Білім тексеру оқушыларын CRM-ге қосу: run = false — тек санайды, true — жазады */
async function btToCrm(run: boolean) {
  const sb = await db()
  const [bts, btg, crm, cg] = await Promise.all([
    sb.from('bt_students').select('id, full_name, group_id'),
    sb.from('bt_groups').select('id, name'),
    sb.from('students').select('id, full_name, group_id, bt_student_id'),
    sb.from('student_groups').select('id, name, bt_group_id, monthly_fee'),
  ])
  if (bts.error || crm.error || cg.error) return { link: 0, create: 0, newGroups: 0, ambiguous: [] as string[], error: (crm.error ?? cg.error ?? bts.error)!.message }
  const plan = planBtLink(bts.data ?? [], btg.data ?? [], (crm.data ?? []) as any, (cg.data ?? []) as any)
  const summary = { link: plan.link.length, create: plan.create.length, newGroups: plan.newGroups.length, ambiguous: plan.ambiguous.slice(0, 20) }
  if (!run) return summary
  // 1) Жоқ топтарды құру (Білім тексеру тобының атымен, байланыспен)
  const groups = [...((cg.data ?? []) as any[])]
  for (const g of plan.newGroups) {
    const { data, error } = await sb.from('student_groups').insert({ name: g.name, bt_group_id: g.btGroupId }).select('id, name, bt_group_id, monthly_fee').single()
    if (error) throw new Error(error.message)
    groups.push(data)
  }
  const btName = new Map(((btg.data ?? []) as any[]).map((g) => [g.id, g.name]))
  const groupFor = (btGroupId: string) => groups.find((g) => g.bt_group_id === btGroupId) ?? groups.find((g) => String(g.name).toLowerCase().trim() === String(btName.get(btGroupId) ?? '').toLowerCase().trim()) ?? null
  // 2) Аттас CRM оқушыларын байланыстыру (жаңа жазба ашылмайды)
  for (const l of plan.link) await sb.from('students').update({ bt_student_id: l.btId }).eq('id', l.crmId).is('bt_student_id', null)
  // 3) Жаңа оқушылар: аты, тобы, күйі; телефон мен төлемді әкімші кейін толтырады
  const today = todayAlmatyISO()
  const rows = plan.create.map((c) => {
    const g = groupFor(c.btGroupId)
    return { full_name: c.full_name, group_id: g?.id ?? null, status: 'active', start_date: today, payment_amount: g?.monthly_fee ?? null, bt_student_id: c.btId, comment: 'Білім тексеруден қосылды — телефон мен төлемді толтыру керек' }
  })
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await sb.from('students').insert(rows.slice(i, i + 100))
    if (error) throw new Error(error.message)
  }
  // Байланған CRM топтарын Білім тексеру тобымен белгілеу (CRM ↔ Білім тексеру синхрондауы үшін)
  for (const g of groups) if (!g.bt_group_id) {
    const bt = ((btg.data ?? []) as any[]).find((x) => String(x.name).toLowerCase().trim() === String(g.name).toLowerCase().trim())
    if (bt) await sb.from('student_groups').update({ bt_group_id: bt.id }).eq('id', g.id)
  }
  return summary
}

// GET — әкімшінің «Бүгін» беті: тек әрекет керек нәрселер
export async function GET() {
  const who = await journalWho()
  if (!who?.admin) return bad('Рұқсат жоқ', 401)
  try {
    const sb = await db()
    const today = todayAlmaty()
    const from = addDays(today, -28)
    const [lessons, teachers, studs, groups, pays, att, hw, leads, sched, bt] = await Promise.all([
      todayItems(who, today),
      sb.from('teachers').select('id, name, phone').then((r) => (r.error ? sb.from('teachers').select('id, name') : r)),
      sb.from('students').select('id, full_name, phone, parent_phone, status, payment_deadline, payment_amount, group_id').neq('status', 'left'),
      sb.from('student_groups').select('id, name'),
      sb.from('crm_payments').select('*').gte('paid_on', addDays(today, -7)).order('paid_on', { ascending: false }),
      sb.from('class_attendance').select('student_id, class_id, date, status').gte('date', from),
      sb.from('class_homework').select('student_id, date, mark').gte('date', from),
      sb.from('site_leads').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      scheduleSync(false),
      btToCrm(false).catch(() => null),
    ])
    const tPhone = new Map((teachers.data ?? []).map((t: any) => [t.id, t.phone ?? null]))
    const gName = new Map((groups.data ?? []).map((g: any) => [g.id, g.name]))
    const active = (studs.data ?? []).filter((s: any) => s.status !== 'paused')

    const debts = active
      .map((s: any) => ({ s, st: paymentStatus(s.payment_deadline, today) }))
      .filter((x) => x.st.kind === 'overdue' || x.st.kind === 'today')
      .sort((a, b) => (a.st.days ?? 0) - (b.st.days ?? 0))
      .map(({ s, st }) => ({ id: s.id, name: s.full_name, group: gName.get(s.group_id) ?? null, phone: s.parent_phone || s.phone || null, amount: s.payment_amount ?? null, deadline: s.payment_deadline, days: st.days ?? 0 }))
    const soon = active.filter((s: any) => paymentStatus(s.payment_deadline, today).kind === 'soon').length

    // Қатарынан келмеу / үй тапсырмасын орындамау (барлық топтар бойынша)
    const byId = new Map(active.map((s: any) => [s.id, s]))
    const watch: { id: string; name: string; phone: string | null; absStreak: number; hwStreak: number; att: number | null; hw: number | null }[] = []
    const attBy = new Map<string, { date: string; status: AttStatus }[]>()
    for (const a of att.data ?? []) {
      if (!attBy.has(a.student_id)) attBy.set(a.student_id, [])
      attBy.get(a.student_id)!.push({ date: a.date, status: a.status as AttStatus })
    }
    const hwBy = new Map<string, { date: string; mark: HwMark }[]>()
    for (const h of (hw as any).data ?? []) {
      if (!hwBy.has(h.student_id)) hwBy.set(h.student_id, [])
      hwBy.get(h.student_id)!.push({ date: h.date, mark: h.mark as HwMark })
    }
    for (const id of Array.from(new Set([...Array.from(attBy.keys()), ...Array.from(hwBy.keys())]))) {
      const s: any = byId.get(id)
      if (!s) continue
      const p = progressOf(attBy.get(id) ?? [], hwBy.get(id) ?? [], [])
      if (p.absStreak >= 2 || p.hwStreak >= 3) watch.push({ id, name: s.full_name, phone: s.parent_phone || s.phone || null, absStreak: p.absStreak, hwStreak: p.hwStreak, att: p.att, hw: p.hw })
    }
    watch.sort((a, b) => b.absStreak - a.absStreak || b.hwStreak - a.hwStreak)

    const recent = (pays.data ?? []).map((p: any) => ({
      id: p.id,
      name: p.student_name,
      amount: p.amount,
      date: p.paid_on,
      note: p.note,
      byTeacher: typeof p.recorded_by === 'string' ? p.recorded_by.startsWith('teacher:') : /қабылдады:/.test(p.note ?? '') && !/әкімші/.test(p.note ?? ''),
    }))

    return NextResponse.json(
      {
        today,
        lessons: lessons.map((l) => ({ ...l, phone: tPhone.get(l.teacherId) ?? null })),
        debts,
        soon,
        watch: watch.slice(0, 40),
        payments: recent.slice(0, 40),
        paidToday: recent.filter((p) => p.date === today).reduce((a, p) => a + (p.amount ?? 0), 0),
        leads: leads.count ?? 0,
        schedule: sched,
        btLink: bt,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e: any) {
    await logServerError('admin/today', e)
    return bad(e.message, 500)
  }
}

// POST { action:'pay', studentId, amount, method } — әкімші төлемді бір басумен жазады
//      { action:'btToCrm' } — Білім тексерудегі барлық оқушыны CRM-ге қосу (аттасы бар болса — байланыстыру)
//      { action:'syncSchedule' } — кестедегі сабақтарды журнал топтарына қосу (жоғын құру, күнін толтыру)
export async function POST(req: NextRequest) {
  const admin = await currentAdmin()
  if (!admin) return bad('Рұқсат жоқ', 401)
  try {
    const b = await req.json().catch(() => null)
    if (b?.action === 'btToCrm') return NextResponse.json({ ok: true, ...(await btToCrm(true)) })
    if (b?.action === 'syncSchedule') return NextResponse.json({ ok: true, ...(await scheduleSync(true)) })
    if (b?.action !== 'pay') return bad('Белгісіз әрекет')
    return NextResponse.json(await recordPaymentFor(String(b.studentId ?? ''), admin.actor, 'әкімші', b))
  } catch (e: any) {
    if (e.status) return bad(e.message, e.status)
    await logServerError('admin/today', e)
    return bad(e.message, 500)
  }
}
