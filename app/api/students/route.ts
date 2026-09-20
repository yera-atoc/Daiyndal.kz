import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isAdmin } from '@/lib/requireAdmin'

export async function GET(req: NextRequest) {
  // Student names are personal data: admin only.
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const teacherId = req.nextUrl.searchParams.get('teacherId')

  let query = supabaseAdmin.from('students').select('*').order('full_name')
  if (teacherId) query = query.eq('teacher_id', teacherId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
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
      full_name: body.fullName,
      grade: body.grade ?? null,
      teacher_id: body.teacherId ?? null,
      group_id: body.groupId || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
