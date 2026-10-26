import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { currentTeacherId } from '@/lib/requireTeacher'
import { teacherStudentIds } from '@/lib/journalServer'

// A teacher can only ever see their own students — never the full list,
// and never another teacher's.
export async function GET() {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  // Өз оқушылары: CRM-де бекітілгендер және әкімші берген сабақ топтарындағылар
  const ids = await teacherStudentIds(teacherId)
  if (!ids.length) return NextResponse.json([])
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('id, full_name, grade, group_id, student_groups(id, name), rating_points')
    .in('id', ids)
    .neq('status', 'left')
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
