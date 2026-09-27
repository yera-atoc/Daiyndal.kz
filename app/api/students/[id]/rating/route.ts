import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { currentTeacherId } from '@/lib/requireTeacher'

const MAX_POINTS = 100000

// PATCH { points } — sets (not adds) the student's rating. Only that
// student's own teacher may change it.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const points = Number(body?.points)
  if (!Number.isFinite(points)) {
    return NextResponse.json({ error: 'points сан болуы керек' }, { status: 400 })
  }
  const clamped = Math.max(0, Math.min(MAX_POINTS, Math.round(points)))

  const { data: student, error: studentError } = await supabaseAdmin
    .from('students')
    .select('id, teacher_id')
    .eq('id', params.id)
    .maybeSingle()

  if (studentError) return NextResponse.json({ error: studentError.message }, { status: 500 })
  if (!student || student.teacher_id !== teacherId) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('students')
    .update({ rating_points: clamped })
    .eq('id', params.id)
    .select('id, rating_points')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
