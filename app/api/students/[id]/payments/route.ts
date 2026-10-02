import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isAdmin } from '@/lib/requireAdmin'
import { ISO_RE, nextDeadlineAfter, todayAlmatyISO } from '@/lib/payments'

// GET — payment history of one student (admin only)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }
  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('id, amount, paid_on, period_end, note, created_at')
    .eq('student_id', params.id)
    .order('paid_on', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST { amount?, paidOn?, nextDeadline?, note? } — records a payment and rolls
// the student's next payment date forward (default: +1 month).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Қате сұраныс' }, { status: 400 })

  const { data: student, error: sErr } = await supabaseAdmin
    .from('students')
    .select('id, full_name, payment_deadline, payment_amount')
    .eq('id', params.id)
    .maybeSingle()
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })
  if (!student) return NextResponse.json({ error: 'Оқушы табылмады' }, { status: 404 })

  const paidOn =
    typeof body.paidOn === 'string' && ISO_RE.test(body.paidOn) ? body.paidOn : todayAlmatyISO()

  const rawAmount = body.amount === undefined || body.amount === '' ? student.payment_amount : body.amount
  const amount =
    rawAmount === null || rawAmount === undefined || !(Number(rawAmount) >= 0)
      ? null
      : Math.round(Number(rawAmount))

  const nextDeadline =
    typeof body.nextDeadline === 'string' && ISO_RE.test(body.nextDeadline)
      ? body.nextDeadline
      : nextDeadlineAfter(student.payment_deadline, paidOn)

  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 300) || null : null

  const { error: pErr } = await supabaseAdmin.from('payments').insert({
    student_id: student.id,
    student_name: student.full_name,
    amount,
    paid_on: paidOn,
    period_end: nextDeadline,
    note,
  })
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  const { error: uErr } = await supabaseAdmin
    .from('students')
    .update({
      payment_date: paidOn,
      payment_deadline: nextDeadline,
      ...(amount != null ? { payment_amount: amount } : {}),
    })
    .eq('id', student.id)
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, paidOn, nextDeadline, amount })
}
