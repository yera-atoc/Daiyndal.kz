import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { currentTeacherId } from '@/lib/requireTeacher'
import { isEnglishTeacher } from '@/lib/teacherScope'

export async function GET() {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  // Ағылшын тілі мұғалімі ағылшын пәніндегі барлық жазбаны көреді (кім құрса да)
  const english = await isEnglishTeacher(teacherId)
  let query = supabaseAdmin.from('materials').select('*')
  query = english ? query.or(`teacher_id.eq.${teacherId},subject.eq.english`) : query.eq('teacher_id', teacherId)
  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.title || !body?.subject) {
    return NextResponse.json({ error: 'Тақырып пен пән міндетті' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('materials')
    .insert({
      teacher_id: teacherId,
      subject: body.subject,
      title: body.title,
      description: body.description ?? null,
      url: body.url ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
