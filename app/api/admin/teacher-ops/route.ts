import { NextRequest, NextResponse } from 'next/server'
import { currentAdmin } from '@/lib/requireAdmin'
import { loadReports } from '@/lib/teacherOpsServer'
import { ISO_RE } from '@/lib/payments'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// Мұғалімдер есебі: кезең бойынша (апта не ай)
export async function GET(req: NextRequest) {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  const from = req.nextUrl.searchParams.get('from') ?? ''
  const to = req.nextUrl.searchParams.get('to') ?? ''
  if (!ISO_RE.test(from) || !ISO_RE.test(to) || to < from) return NextResponse.json({ error: 'Кезең қате' }, { status: 400 })
  try {
    return NextResponse.json({ rows: await loadReports(from, to) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// Мұғалімнің телефоны мен бір сабақ ақысын сақтау
export async function PATCH(req: NextRequest) {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  const b = await req.json().catch(() => null)
  const id = String(b?.id ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Мұғалім табылмады' }, { status: 400 })
  const patch: Record<string, unknown> = {}
  if (b?.phone !== undefined) {
    let d = String(b.phone ?? '').replace(/\D/g, '')
    if (d.length === 11 && d.startsWith('8')) d = '7' + d.slice(1)
    if (d.length === 10) d = '7' + d
    if (d && d.length !== 11) return NextResponse.json({ error: 'Нөмір қате: 8 7XX XXX XX XX' }, { status: 400 })
    patch.phone = d || null
  }
  if (b?.lesson_rate !== undefined) {
    const n = b.lesson_rate === '' || b.lesson_rate === null ? null : Math.round(Number(b.lesson_rate))
    if (n !== null && !(n >= 0 && n < 1_000_000)) return NextResponse.json({ error: 'Ақысы қате' }, { status: 400 })
    patch.lesson_rate = n
  }
  const { error } = await supabaseAdmin.from('teachers').update(patch).eq('id', id)
  if (error) {
    const missing = /column|schema cache/i.test(error.message)
    return NextResponse.json({ error: missing ? 'Алдымен Supabase-те supabase/migrations/20261104_01_teacher_ops.sql файлын іске қосыңыз' : error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
