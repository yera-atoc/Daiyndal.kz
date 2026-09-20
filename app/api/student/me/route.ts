import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { currentStudentId } from '@/lib/requireStudent'

export async function GET() {
  const studentId = await currentStudentId()
  if (!studentId) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('students')
    .select('id, full_name, grade, username')
    .eq('id', studentId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
