import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { currentTeacherId } from '@/lib/requireTeacher'

// GET /api/teacher/attendance?date=YYYY-MM-DD
// Returns attendance rows for the given date, but only for this teacher's
// own students (never the whole school's).
export async function GET(req: NextRequest) {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const date = req.nextUrl.searchParams.get('date')
  if (!date) {
    return NextResponse.json({ error: 'date параметрі міндетті' }, { status: 400 })
  }

  const { data: myStudents, error: studentsError } = await supabaseAdmin
    .from('students')
    .select('id')
    .eq('teacher_id', teacherId)

  if (studentsError) return NextResponse.json({ error: studentsError.message }, { status: 500 })

  const ids = (myStudents ?? []).map((s) => s.id)
  if (ids.length === 0) return NextResponse.json([])

  const { data, error } = await supabaseAdmin
    .from('attendance')
    .select('*')
    .eq('date', date)
    .in('student_id', ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST { studentId, date, present } — marks attendance, but only after
// confirming the student actually belongs to this teacher, so one teacher
// can never mark another teacher's students.
export async function POST(req: NextRequest) {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.studentId || !body?.date || typeof body.present !== 'boolean') {
    return NextResponse.json(
      { error: 'studentId, date, present міндетті' },
      { status: 400 }
    )
  }

  const { data: student, error: studentError } = await supabaseAdmin
    .from('students')
    .select('id, teacher_id')
    .eq('id', body.studentId)
    .maybeSingle()

  if (studentError) return NextResponse.json({ error: studentError.message }, { status: 500 })
  if (!student || student.teacher_id !== teacherId) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 403 })
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
