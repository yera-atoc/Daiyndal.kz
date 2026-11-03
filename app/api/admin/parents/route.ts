import { NextResponse } from 'next/server'
import { currentAdmin } from '@/lib/requireAdmin'
import { supabaseAdmin as sb } from '@/lib/supabaseAdmin'
import { examMax, ranking, rowTotal, type Exam } from '@/lib/bilimTest'
import { listExams, listSubmissions } from '@/lib/bilimTestStore'
import { paymentStatus, todayAlmatyISO } from '@/lib/payments'
import { logServerError } from '@/lib/serverLog'

export const dynamic = 'force-dynamic'

export type ParentResult = { title: string; month: string; score: number; max: number; place: number | null; of: number; subjects: { name: string; score: number | null; max: number }[] }
export type ParentRow = {
  id: string
  name: string
  group: string | null
  groupId: string | null
  parentName: string | null
  phone: string | null
  payment: { deadline: string | null; amount: number | null; kind: string; days: number | null }
  result: ParentResult | null
}

// Ата-аналарға хабар: әр оқушының ата-анасы, төлемі және соңғы жарияланған Білім тексеру нәтижесі.
export async function GET() {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  try {
    const today = todayAlmatyISO()
    const base = 'id, full_name, group_id, parent_name, parent_phone, phone, payment_deadline, payment_amount, status'
    let r: any = await sb.from('students').select(base + ', bt_student_id').neq('status', 'left').order('full_name')
    if (r.error) r = await sb.from('students').select(base).neq('status', 'left').order('full_name')
    if (r.error) throw new Error(r.error.message)
    const students: any[] = r.data ?? []
    const { data: groups } = await sb.from('student_groups').select('id, name')
    const gName = new Map((groups ?? []).map((g: any) => [g.id, g.name]))

    // Соңғы жарияланған сынақ нәтижесі (Білім тексеру)
    const btIds = students.map((s) => s.bt_student_id).filter(Boolean)
    const results = new Map<string, ParentResult>()
    if (btIds.length) {
      const { data: bts } = await sb.from('bt_students').select('id, full_name, group_id').in('id', btIds)
      const byGroup = new Map<string, { id: string; full_name: string }[]>()
      for (const b of bts ?? []) byGroup.set(b.group_id, [...(byGroup.get(b.group_id) ?? []), b])
      for (const [groupId, members] of Array.from(byGroup.entries())) {
        const exams = (await listExams(groupId)).filter((e: Exam) => e.published)
        const exam = exams[exams.length - 1]
        if (!exam) continue
        const rk = ranking(exam, await listSubmissions(exam.id))
        for (const m of members) {
          const row = rk.scores[m.full_name]
          const total = rowTotal(row)
          if (total === null) continue
          results.set(m.id, {
            title: exam.title,
            month: exam.month,
            score: total,
            max: examMax(exam),
            place: rk.place[m.full_name] ?? null,
            of: rk.of,
            subjects: exam.subjects.map((s) => ({ name: s.short || s.name, score: row?.[s.id] ?? null, max: s.max })),
          })
        }
      }
    }

    const rows: ParentRow[] = students.map((s) => {
      const p = paymentStatus(s.payment_deadline, today)
      return {
        id: s.id,
        name: String(s.full_name).replace(/[)\s]+$/, ''),
        group: gName.get(s.group_id) ?? null,
        groupId: s.group_id ?? null,
        parentName: s.parent_name ?? null,
        phone: s.parent_phone || s.phone || null,
        payment: { deadline: s.payment_deadline ?? null, amount: s.payment_amount ?? null, kind: p.kind, days: p.days },
        result: s.bt_student_id ? results.get(s.bt_student_id) ?? null : null,
      }
    })
    return NextResponse.json({ today, rows }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    await logServerError('parents', e)
    return NextResponse.json({ error: 'Деректерді жүктеу мүмкін болмады' }, { status: 500 })
  }
}

// Ата-ананың атын/нөмірін тез сақтау (тек осы екі өріс)
export async function PATCH(req: import('next/server').NextRequest) {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  const b = await req.json().catch(() => null)
  const id = typeof b?.id === 'string' ? b.id : ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Оқушы табылмады' }, { status: 400 })
  const { normPhone, phoneOk } = await import('@/lib/importPlan')
  const phone = typeof b?.phone === 'string' ? b.phone : ''
  if (!phoneOk(phone)) return NextResponse.json({ error: 'Нөмір қате: 8 7XX XXX XX XX форматында жазыңыз' }, { status: 400 })
  const patch: Record<string, unknown> = { parent_phone: normPhone(phone) || null }
  if (typeof b?.parentName === 'string') patch.parent_name = b.parentName.trim().slice(0, 120) || null
  const { error } = await sb.from('students').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
