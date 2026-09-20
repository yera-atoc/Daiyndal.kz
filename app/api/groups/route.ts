import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isAdmin } from '@/lib/requireAdmin'

// Admin only: student groups are managed from /admin.
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('student_groups')
    .select('id, name, created_at')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 80) : ''
  if (!name) {
    return NextResponse.json({ error: 'Топ атауы міндетті' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('student_groups')
    .insert({ name })
    .select('id, name, created_at')
    .single()

  if (error) {
    // 23505 = unique violation
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Бұл атаумен топ бар' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
