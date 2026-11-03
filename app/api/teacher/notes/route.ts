import { NextRequest, NextResponse } from 'next/server'
import { currentTeacherId } from '@/lib/requireTeacher'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getExam, listExams, listGroups, listStudents } from '@/lib/bilimTestStore'
import { listNotes, notesReady, saveNote, NOTES_MISSING } from '@/lib/teacherNotes'

export const dynamic = 'force-dynamic'

async function me() {
  const id = await currentTeacherId()
  if (!id) return null
  const { data } = await supabaseAdmin.from('teachers').select('id, name, subject').eq('id', id).maybeSingle()
  return data as { id: string; name: string; subject: string | null } | null
}

// Мұғалім: топ → сынақ → оқушылар және менің пікірлерім (басқа мұғалімдердікі тек оқу үшін)
export async function GET(req: NextRequest) {
  const t = await me()
  if (!t) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  try {
    const groups = await listGroups()
    const gid = req.nextUrl.searchParams.get('group') || groups[0]?.id
    const group = groups.find((g) => g.id === gid) ?? null
    if (!group) return NextResponse.json({ groups: [], exams: [], students: [], notes: [], ready: await notesReady() })
    const exams = (await listExams(group.id)).slice().reverse()
    const eid = req.nextUrl.searchParams.get('exam')
    const exam = exams.find((e) => e.id === eid) ?? exams[0] ?? null
    const students = await listStudents(group.id)
    const notes = exam ? await listNotes(exam.id, students.map((s) => s.id)) : []
    return NextResponse.json({
      me: { id: t.id, name: t.name },
      ready: await notesReady(),
      groups: groups.map((g) => ({ id: g.id, name: g.name })),
      group: group.id,
      exams: exams.map((e) => ({ id: e.id, title: e.title })),
      exam: exam?.id ?? null,
      students: students.map((s) => ({ id: s.id, name: s.full_name })),
      notes,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const t = await me()
  if (!t) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  try {
    const b = await req.json().catch(() => null)
    const exam = await getExam(String(b?.exam ?? ''))
    if (!exam) return NextResponse.json({ error: 'Сынақ табылмады' }, { status: 404 })
    const sid = String(b?.student ?? '')
    if (!(await listStudents(exam.group_id)).some((s) => s.id === sid)) return NextResponse.json({ error: 'Оқушы бұл топта жоқ' }, { status: 400 })
    await saveNote({ exam_id: exam.id, student_id: sid, teacher_id: t.id, teacher_name: t.name, subject: t.subject ?? null, text: b?.text })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    const status = e.message === NOTES_MISSING ? 503 : 500
    return NextResponse.json({ error: e.message }, { status })
  }
}
