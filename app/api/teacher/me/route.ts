import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { currentTeacherId } from '@/lib/requireTeacher'

export async function GET() {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('teachers')
    .select('id, name, subject, username')
    .eq('id', teacherId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// A teacher can change their own display name — nothing else. The id comes
// from the signed session cookie, never from the request body, so one teacher
// can't edit another; subject/login stay under the admin's control.
export async function PATCH(req: NextRequest) {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 100) : ''
  if (!name) {
    return NextResponse.json({ error: 'Аты-жөні міндетті' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('teachers')
    .update({ name })
    .eq('id', teacherId)
    .select('id, name, subject, username')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Мұғалім табылмады' }, { status: 404 })
  return NextResponse.json(data)
}
