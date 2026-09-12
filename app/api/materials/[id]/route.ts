import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { currentTeacherId } from '@/lib/requireTeacher'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  // Ownership check: a teacher can only delete their own materials.
  const { error } = await supabaseAdmin
    .from('materials')
    .delete()
    .eq('id', params.id)
    .eq('teacher_id', teacherId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
