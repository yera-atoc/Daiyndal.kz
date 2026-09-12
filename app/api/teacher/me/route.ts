import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { currentTeacherId } from '@/lib/requireTeacher'

export async function GET() {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('teachers')
    .select('id, name, subject')
    .eq('id', teacherId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
