import { NextRequest, NextResponse } from 'next/server'
import { currentAdmin } from '@/lib/requireAdmin'
import { addDays, todayAlmaty, type AttStatus } from '@/lib/journal'
import { db, journalWho } from '@/lib/journalServer'
import { recordPaymentFor, todayItems } from '@/lib/lessonServer'
import { progressOf, type HwMark } from '@/lib/lesson'
import { paymentStatus } from '@/lib/payments'
import { logServerError } from '@/lib/serverLog'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

// GET — әкімшінің «Бүгін» беті: тек әрекет керек нәрселер
export async function GET() {
  const who = await journalWho()
  if (!who?.admin) return bad('Рұқсат жоқ', 401)
  try {
    const sb = await db()
    const today = todayAlmaty()
    const from = addDays(today, -28)
    const [lessons, teachers, studs, groups, pays, att, hw, leads] = await Promise.all([
      todayItems(who, today),
      sb.from('teachers').select('id, name, phone').then((r) => (r.error ? sb.from('teachers').select('id, name') : r)),
      sb.from('students').select('id, full_name, phone, parent_phone, status, payment_deadline, payment_amount, group_id').neq('status', 'left'),
      sb.from('student_groups').select('id, name'),
      sb.from('crm_payments').select('*').gte('paid_on', addDays(today, -7)).order('paid_on', { ascending: false }),
      sb.from('class_attendance').select('student_id, class_id, date, status').gte('date', from),
      sb.from('class_homework').select('student_id, date, mark').gte('date', from),
      sb.from('site_leads').select('id', { count: 'exact', head: true }).eq('status', 'new'),
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
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e: any) {
    await logServerError('admin/today', e)
    return bad(e.message, 500)
  }
}

// POST { action:'pay', studentId, amount, method } — әкімші төлемді бір басумен жазады
export async function POST(req: NextRequest) {
  const admin = await currentAdmin()
  if (!admin) return bad('Рұқсат жоқ', 401)
  try {
    const b = await req.json().catch(() => null)
    if (b?.action !== 'pay') return bad('Белгісіз әрекет')
    return NextResponse.json(await recordPaymentFor(String(b.studentId ?? ''), admin.actor, 'әкімші', b))
  } catch (e: any) {
    if (e.status) return bad(e.message, e.status)
    await logServerError('admin/today', e)
    return bad(e.message, 500)
  }
}
