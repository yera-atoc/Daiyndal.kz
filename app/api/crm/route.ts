import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/requireAdmin'
import { ISO_RE, addMonthsISO, todayAlmatyISO } from '@/lib/payments'
import { syncCrmDeleteToBt, syncCrmStudentToBt } from '@/lib/crmSync'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const denied = () => NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

async function db() {
  const { supabaseAdmin } = await import('@/lib/supabaseAdmin')
  return supabaseAdmin
}

const STUDENT_FIELDS =
  'id, full_name, grade, teacher_id, group_id, phone, parent_name, parent_phone, status, start_date, payment_date, payment_deadline, payment_amount, comment, username, created_at'
// migration_crm_sync.sql іске қосылғаннан кейінгі қосымша өрістер
const STUDENT_EXTRA = ', school, address, bt_student_id'
const GROUP_EXTRA = ', bt_group_id, monthly_fee'

// GET — CRM-нің барлық деректері бір сұраныспен. Кесте жоқ болса, `missing` тізіміне жазылады.
export async function GET() {
  if (!(await isAdmin())) return denied()
  const sb = await db()
  const today = todayAlmatyISO()
  const yearAgo = addMonthsISO(today, -12)
  const twoMonths = addMonthsISO(today, -2)
  const missing: string[] = []

  const safe = async <T,>(name: string, q: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T | []> => {
    const { data, error } = await q
    if (error) {
      missing.push(`${name}: ${error.message}`)
      return []
    }
    return data ?? []
  }
  // Жаңа өрістер жоқ болса (SQL әлі іске қосылмаған), ескі өрістермен оқимыз
  const withFallback = async (name: string, full: () => PromiseLike<any>, base: () => PromiseLike<any>) => {
    const r = await full()
    if (!r.error) return r.data ?? []
    missing.push(`${name}: ${r.error.message}`)
    return safe(name, base())
  }

  const [students, groups, teachers, payments, attendance, schedule, btGroups] = await Promise.all([
    withFallback('students', () => sb.from('students').select(STUDENT_FIELDS + STUDENT_EXTRA).order('full_name'), () => sb.from('students').select(STUDENT_FIELDS).order('full_name')),
    withFallback('student_groups', () => sb.from('student_groups').select('id, name, created_at' + GROUP_EXTRA).order('name'), () => sb.from('student_groups').select('id, name, created_at').order('name')),
    safe('teachers', sb.from('teachers').select('id, name, subject, username').order('name')),
    safe('payments', sb.from('payments').select('id, student_id, student_name, amount, paid_on, period_end, note').gte('paid_on', yearAgo).order('paid_on', { ascending: false })),
    safe('attendance', sb.from('attendance').select('student_id, date, present, excused').gte('date', twoMonths)),
    safe('schedule_slots', sb.from('schedule_slots').select('id, teacher_id, group_id, day_of_week, start_time, end_time, title, note, room').order('day_of_week').order('start_time')),
    safe('bt_groups', sb.from('bt_groups').select('id, name')),
  ])

  return NextResponse.json(
    { today, students, groups, teachers, payments, attendance, schedule, btGroups, missing },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

const str = (v: unknown, max = 200) => {
  const s = typeof v === 'string' ? v.trim().slice(0, max) : ''
  return s || null
}
const date = (v: unknown) => (typeof v === 'string' && ISO_RE.test(v) ? v : null)
const money = (v: unknown) => (v === null || v === '' || v === undefined || !(Number(v) >= 0) ? null : Math.round(Number(v)))

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return denied()
  const sb = await db()
  const b = await req.json().catch(() => null)
  const action = b?.action

  try {
    // ── Оқушы: қосу / өзгерту
    if (action === 'save-student') {
      const s = b.student ?? {}
      const full_name = str(s.full_name, 120)
      if (!full_name || full_name.length < 3) return bad('Аты-жөнін толық жазыңыз')
      const row = {
        full_name,
        grade: s.grade === '' || s.grade == null ? null : Math.max(0, Math.min(12, Math.round(Number(s.grade)) || 0)) || null,
        teacher_id: str(s.teacher_id, 60),
        group_id: str(s.group_id, 60),
        phone: str(s.phone, 40),
        parent_name: str(s.parent_name, 120),
        parent_phone: str(s.parent_phone, 40),
        status: ['active', 'paused', 'left'].includes(s.status) ? s.status : 'active',
        start_date: date(s.start_date),
        payment_deadline: date(s.payment_deadline),
        payment_amount: money(s.payment_amount),
        comment: str(s.comment, 1000),
        ...(s.school !== undefined ? { school: str(s.school, 120) } : {}),
        ...(s.address !== undefined ? { address: str(s.address, 200) } : {}),
      }
      // Жаңа оқушыға сома жазылмаса — топтың айлық төлемі
      if (!s.id && row.payment_amount == null && row.group_id) {
        const { data: g } = await sb.from('student_groups').select('monthly_fee').eq('id', row.group_id).maybeSingle()
        if (g?.monthly_fee != null) row.payment_amount = g.monthly_fee
      }
      if (s.id) {
        const { error } = await sb.from('students').update(row).eq('id', s.id)
        if (error) return bad(error.message, 500)
        // Аты өзгерсе, төлем тарихындағы атты да жаңарту
        await sb.from('payments').update({ student_name: full_name }).eq('student_id', s.id)
        await syncCrmStudentToBt(s.id)
        return NextResponse.json({ ok: true, id: s.id })
      }
      const { data, error } = await sb.from('students').insert(row).select('id').single()
      if (error) return bad(error.message, 500)
      await syncCrmStudentToBt(data.id)
      return NextResponse.json({ ok: true, id: data.id })
    }

    if (action === 'delete-student') {
      const { data: link } = await sb.from('students').select('bt_student_id').eq('id', String(b.id)).maybeSingle()
      const { error } = await sb.from('students').delete().eq('id', String(b.id))
      if (error) return bad(error.message, 500)
      await syncCrmDeleteToBt((link as any)?.bt_student_id)
      return NextResponse.json({ ok: true })
    }

    if (action === 'delete-payment') {
      const { error } = await sb.from('payments').delete().eq('id', String(b.id))
      if (error) return bad(error.message, 500)
      return NextResponse.json({ ok: true })
    }

    // ── Қатысу: бір күнге бірнеше оқушы. mark: 'present' | 'absent' | 'excused' | null (белгіні алу)
    if (action === 'set-attendance') {
      const d = date(b.date)
      if (!d) return bad('Күнді таңдаңыз')
      const marks: { studentId: string; mark: string | null }[] = Array.isArray(b.marks) ? b.marks : []
      const upserts = marks
        .filter((m) => m.mark)
        .map((m) => ({ student_id: m.studentId, date: d, present: m.mark === 'present', excused: m.mark === 'excused' }))
      const clears = marks.filter((m) => !m.mark).map((m) => m.studentId)
      if (upserts.length) {
        const { error } = await sb.from('attendance').upsert(upserts, { onConflict: 'student_id,date' })
        if (error) return bad(error.message, 500)
      }
      if (clears.length) {
        const { error } = await sb.from('attendance').delete().eq('date', d).in('student_id', clears)
        if (error) return bad(error.message, 500)
      }
      return NextResponse.json({ ok: true })
    }

    // ── Топтар
    if (action === 'save-group') {
      const name = str(b.name, 80)
      if (!name) return bad('Топтың атын жазыңыз')
      const q = b.id ? sb.from('student_groups').update({ name }).eq('id', b.id) : sb.from('student_groups').insert({ name })
      const { error } = await q
      if (error) return bad(error.code === '23505' ? 'Бұл атаумен топ бар' : error.message, error.code === '23505' ? 409 : 500)
      return NextResponse.json({ ok: true })
    }
    // Топтың айлық төлемі: топқа жазылады және оқушыларға қойылады
    if (action === 'set-group-fee') {
      const amount = money(b.amount)
      const { error } = await sb.from('student_groups').update({ monthly_fee: amount }).eq('id', String(b.id))
      if (error) return bad(error.message, 500)
      if (amount != null) {
        let q = sb.from('students').update({ payment_amount: amount }).eq('group_id', String(b.id)).neq('status', 'left')
        if (!b.applyAll) q = q.is('payment_amount', null)
        const { error: e2 } = await q
        if (e2) return bad(e2.message, 500)
      }
      return NextResponse.json({ ok: true })
    }
    // CRM тобын Білім тексеру тобымен байланыстыру ('' — байланысты алу)
    if (action === 'link-group') {
      const bt = str(b.btGroup, 40)
      const { error } = await sb.from('student_groups').update({ bt_group_id: bt }).eq('id', String(b.id))
      if (error) return bad(error.message, 500)
      if (bt) {
        // Аттары сәйкес оқушыларды байланыстырып, жоқтарын Білім тексеруге қосу
        const { data: st } = await sb.from('students').select('id').eq('group_id', String(b.id)).neq('status', 'left')
        for (const x of st ?? []) await syncCrmStudentToBt(x.id)
      }
      return NextResponse.json({ ok: true })
    }
    if (action === 'delete-group') {
      const { error } = await sb.from('student_groups').delete().eq('id', String(b.id))
      if (error) return bad(error.message, 500)
      return NextResponse.json({ ok: true })
    }

    // ── Білім тексеру тобынан оқушыларды көшіру (аттары бар болса, қайталанбайды)
    if (action === 'import-bt') {
      const btGroup = String(b.btGroup ?? '')
      const [{ data: bg }, { data: bts, error: e1 }, { data: existing, error: e2 }] = await Promise.all([
        sb.from('bt_groups').select('id, name').eq('id', btGroup).maybeSingle(),
        sb.from('bt_students').select('id, full_name').eq('group_id', btGroup),
        sb.from('students').select('full_name'),
      ])
      if (e1 || e2 || !bg) return bad(e1?.message ?? e2?.message ?? 'Топ табылмады', 500)
      // CRM-де аттас топ болмаса — құрамыз
      let { data: grp } = await sb.from('student_groups').select('id').eq('name', bg.name).maybeSingle()
      if (!grp) {
        const ins = await sb.from('student_groups').insert({ name: bg.name }).select('id').single()
        if (ins.error) return bad(ins.error.message, 500)
        grp = ins.data
      }
      const have = new Set((existing ?? []).map((s: any) => s.full_name))
      const rows = (bts ?? [])
        .filter((s: any) => !have.has(s.full_name))
        .map((s: any) => ({ full_name: s.full_name, group_id: grp!.id, status: 'active', start_date: todayAlmatyISO() }))
      if (rows.length) {
        const { error } = await sb.from('students').insert(rows)
        if (error) return bad(error.message, 500)
      }
      // Топ пен оқушыларды Білім тексерумен байланыстыру (SQL іске қосылмаса — өткізіп жібереміз)
      await sb.from('student_groups').update({ bt_group_id: btGroup }).eq('id', grp!.id)
      for (const x of bts ?? []) await sb.from('students').update({ bt_student_id: (x as any).id }).eq('group_id', grp!.id).eq('full_name', (x as any).full_name)
      return NextResponse.json({ ok: true, added: rows.length, skipped: (bts ?? []).length - rows.length })
    }

    return bad('Белгісіз әрекет')
  } catch (e: any) {
    return bad(e.message, 500)
  }
}
