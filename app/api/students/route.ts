import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isAdmin } from '@/lib/requireAdmin'
import { ISO_RE } from '@/lib/payments'

// Admin only. (The teacher's own student list lives in /api/teacher/students.)
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const teacherId = req.nextUrl.searchParams.get('teacherId')

  let query = supabaseAdmin.from('students').select('*').order('full_name')
  if (teacherId) query = query.eq('teacher_id', teacherId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // password_hash/password_salt must never leave the server, even to an admin's browser.
  const safe = (data ?? []).map(({ password_hash, password_salt, ...rest }: any) => rest)
  return NextResponse.json(safe)
}

function cleanDate(v: unknown): string | null {
  return typeof v === 'string' && ISO_RE.test(v) ? v : null
}

function cleanAmount(v: unknown): number | null {
  const n = Number(v)
  return v === null || v === '' || v === undefined || !Number.isFinite(n) || n < 0
    ? null
    : Math.round(n)
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.fullName) {
    return NextResponse.json({ error: 'Аты-жөні міндетті' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('students')
    .insert({
      full_name: String(body.fullName).trim(),
      grade: body.grade ?? null,
      teacher_id: body.teacherId ?? null,
      group_id: body.groupId || null,
      phone: typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null,
      payment_date: cleanDate(body.paymentDate),
      payment_deadline: cleanDate(body.paymentDeadline),
      payment_amount: cleanAmount(body.paymentAmount),
      comment: typeof body.comment === 'string' && body.comment.trim() ? body.comment.trim() : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If the admin entered a paid date + amount, log it in the history too.
  if (data.payment_date && data.payment_amount != null) {
    await supabaseAdmin.from('payments').insert({
      student_id: data.id,
      student_name: data.full_name,
      amount: data.payment_amount,
      paid_on: data.payment_date,
      period_end: data.payment_deadline,
      note: 'Оқушы қосылғанда енгізілген',
    })
  }

  const { password_hash, password_salt, ...safe } = data as any
  return NextResponse.json(safe)
}
