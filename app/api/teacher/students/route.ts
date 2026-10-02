import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { currentTeacherId } from '@/lib/requireTeacher'

// A teacher can only ever see their own students — never the full list,
// and never another teacher's.
export async function GET() {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('students')
    .select('id, full_name, grade, group_id, student_groups(id, name), rating_points')
    .eq('teacher_id', teacherId)
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
