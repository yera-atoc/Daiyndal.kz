import { NextRequest, NextResponse } from 'next/server'
import { currentAdmin } from '@/lib/requireAdmin'
import { LEAD_STATUSES } from '@/lib/leads'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Кіру керек' }, { status: 401 })
  const { data, error } = await supabaseAdmin
    .from('site_leads')
    .select('id, created_at, source, child_name, grade, phone, parent_name, direction, comment, trial, status, note')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) return NextResponse.json({ error: error.message, missing: /does not exist|schema cache/i.test(error.message) }, { status: 500 })
  return NextResponse.json({ leads: data })
}

export async function PATCH(req: NextRequest) {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Кіру керек' }, { status: 401 })
  const b = await req.json().catch(() => null)
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (b?.status !== undefined) {
    if (!(LEAD_STATUSES as readonly string[]).includes(b.status)) return NextResponse.json({ error: 'Күй қате' }, { status: 400 })
    patch.status = b.status
  }
  if (b?.note !== undefined) patch.note = String(b.note).slice(0, 1000) || null
  const { error } = await supabaseAdmin.from('site_leads').update(patch).eq('id', String(b?.id ?? ''))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Кіру керек' }, { status: 401 })
  const { error } = await supabaseAdmin.from('site_leads').delete().eq('id', req.nextUrl.searchParams.get('id') ?? '')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
