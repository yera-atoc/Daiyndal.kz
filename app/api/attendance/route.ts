import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isAdmin } from '@/lib/requireAdmin'

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const date = req.nextUrl.searchParams.get('date')
  if (!date) {
    return NextResponse.json({ error: 'date параметрі міндетті' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('attendance')
    .select('*')
    .eq('date', date)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.studentId || !body?.date || typeof body.present !== 'boolean') {
    return NextResponse.json(
      { error: 'studentId, date, present міндетті' },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from('attendance')
    .upsert(
      { student_id: body.studentId, date: body.date, present: body.present },
      { onConflict: 'student_id,date' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
