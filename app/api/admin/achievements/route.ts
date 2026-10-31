import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { currentAdmin } from '@/lib/requireAdmin'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

const FIELDS = 'id, year, student, exam, result, school, published, position'

export async function GET() {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Кіру керек' }, { status: 401 })
  const { data, error } = await supabaseAdmin.from('site_achievements').select(FIELDS).order('year', { ascending: false }).order('position')
  if (error) return NextResponse.json({ error: error.message, missing: /does not exist|schema cache/i.test(error.message) }, { status: 500 })
  return NextResponse.json({ items: data })
}

// Қосу / өзгерту
export async function POST(req: NextRequest) {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Кіру керек' }, { status: 401 })
  const b = await req.json().catch(() => null)
  const row = {
    year: Number(b?.year) || new Date().getFullYear(),
    student: String(b?.student ?? '').trim().slice(0, 80),
    exam: String(b?.exam ?? '').trim().slice(0, 40),
    result: String(b?.result ?? '').trim().slice(0, 80),
    school: String(b?.school ?? '').trim().slice(0, 80) || null,
    published: b?.published !== false,
    position: Number(b?.position) || 0,
  }
  if (!row.student || !row.exam || !row.result) return NextResponse.json({ error: 'Аты, емтихан және нәтиже міндетті' }, { status: 400 })
  const q = b?.id ? supabaseAdmin.from('site_achievements').update(row).eq('id', String(b.id)) : supabaseAdmin.from('site_achievements').insert(row)
  const { error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidatePath('/zhetistikter')
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Кіру керек' }, { status: 401 })
  const { error } = await supabaseAdmin.from('site_achievements').delete().eq('id', req.nextUrl.searchParams.get('id') ?? '')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidatePath('/zhetistikter')
  return NextResponse.json({ ok: true })
}
