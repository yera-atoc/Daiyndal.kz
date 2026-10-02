import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isAdmin } from '@/lib/requireAdmin'
import { ISO_RE } from '@/lib/payments'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.fullName) {
    return NextResponse.json({ error: 'Аты-жөні міндетті' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('students')
    .update({
      full_name: body.fullName,
      grade: body.grade ?? null,
      teacher_id: body.teacherId ?? null,
      // Only touch the group when the caller sent one, so older callers
      // can't accidentally wipe a student's group.
      ...(body.groupId !== undefined ? { group_id: body.groupId || null } : {}),
      // CRM fields: same rule — only touched when the caller sent them.
      ...(body.paymentDate !== undefined
        ? { payment_date: ISO_RE.test(body.paymentDate ?? '') ? body.paymentDate : null }
        : {}),
      ...(body.paymentDeadline !== undefined
        ? { payment_deadline: ISO_RE.test(body.paymentDeadline ?? '') ? body.paymentDeadline : null }
        : {}),
      ...(body.paymentAmount !== undefined
        ? {
            payment_amount:
              body.paymentAmount === null || body.paymentAmount === '' || !(Number(body.paymentAmount) >= 0)
                ? null
                : Math.round(Number(body.paymentAmount)),
          }
        : {}),
      ...(body.phone !== undefined ? { phone: String(body.phone ?? '').trim() || null } : {}),
      ...(body.comment !== undefined ? { comment: String(body.comment ?? '').trim() || null } : {}),
    })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { password_hash, password_salt, ...safe } = data as any
  return NextResponse.json(safe)
}

// Changes only the student's group (used by the Groups tab to add/remove members).
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body || body.groupId === undefined) {
    return NextResponse.json({ error: 'groupId міндетті' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('students')
    .update({ group_id: body.groupId || null })
    .eq('id', params.id)
    .select()
    .maybeSingle()

  if (error) {
    if (error.code === '23503') {
      return NextResponse.json({ error: 'Топ табылмады' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Оқушы табылмады' }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const { error } = await supabaseAdmin.from('students').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
