import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { currentTeacherId } from '@/lib/requireTeacher'
import { isEnglishTeacher } from '@/lib/teacherScope'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  // Ownership check: a teacher can only delete their own tests.
  // test_questions rows cascade-delete via the FK in supabase/schema.sql.
  // Ағылшын тілі мұғалімі ағылшын пәніндегі кез келген жазбаны өшіре алады.
  const english = await isEnglishTeacher(teacherId)
  let query = supabaseAdmin.from('tests').delete().eq('id', params.id)
  query = english ? query.or(`teacher_id.eq.${teacherId},subject.eq.english`) : query.eq('teacher_id', teacherId)
  const { error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
