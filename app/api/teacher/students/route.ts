import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { currentTeacherId } from '@/lib/requireTeacher'
import { teacherStudentIds } from '@/lib/journalServer'
import { isEnglishTeacher } from '@/lib/teacherScope'
import { isEnglishSubject } from '@/lib/teacherSubject'

// Ағылшын тілі мұғаліміне: ағылшын бойынша тест тапсырған барлық оқушы
// (IELTS/TOEFL/ҰБТ-шет тілі тапсырулары және ағылшын пән тесттері парақтары)
async function englishTestTakerIds(): Promise<string[]> {
  const ids = new Set<string>()
  let { data: tests, error } = (await supabaseAdmin.from('ielts_tests').select('id, exam')) as { data: any[] | null; error: any }
  if (error && /exam/.test(error.message)) ({ data: tests } = (await supabaseAdmin.from('ielts_tests').select('id')) as { data: any[] | null; error: any })
  const testIds = (tests ?? []).map((t) => t.id as string)
  if (testIds.length) {
    const { data: att } = await supabaseAdmin
      .from('ielts_attempts')
      .select('student_id, scores, test_id')
      .in('test_id', testIds)
      .neq('status', 'in_progress')
    const exam = new Map((tests ?? []).map((t) => [t.id as string, (t.exam ?? 'ielts') as string]))
    for (const a of att ?? []) {
      if (!a.student_id) continue
      if (exam.get(a.test_id) === 'ubt' && !(a.scores?.ubt?.subjects ?? []).some((x: any) => x.key === 'english')) continue
      ids.add(a.student_id)
    }
  }
  const { data: sheets } = await supabaseAdmin.from('subject_sheets').select('id, subject')
  const en = (sheets ?? []).filter((x) => isEnglishSubject(x.subject)).map((x) => x.id as string)
  if (en.length) {
    const { data: rows } = await supabaseAdmin.from('subject_rows').select('student_id').in('sheet_id', en).not('student_id', 'is', null)
    for (const r of rows ?? []) ids.add(r.student_id as string)
  }
  return Array.from(ids)
}

// A teacher can only ever see their own students — never the full list,
// and never another teacher's.
export async function GET() {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  // Өз оқушылары: CRM-де бекітілгендер және әкімші берген сабақ топтарындағылар
  const own = await teacherStudentIds(teacherId)
  const ids = (await isEnglishTeacher(teacherId))
    ? Array.from(new Set([...own, ...(await englishTestTakerIds().catch(() => []))]))
    : own
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
