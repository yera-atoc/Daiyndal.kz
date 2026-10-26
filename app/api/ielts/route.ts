import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/ieltsServer'
import { maskNames } from '@/lib/security'
import { studentsWithSubjects } from '@/lib/subjectStore'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// Кіру беті: жарияланған тестке рұқсаты бар оқушылардың аттары (PIN жіберілмейді)
// ?exam=ubt|ielts|toefl – тек сол емтиханның тесттері
export async function GET(req: NextRequest) {
  try {
    const sb = await db()
    const exam = req.nextUrl.searchParams.get('exam')
    let { data: tests, error } = await sb.from('ielts_tests').select('id, exam').eq('published', true)
    if (error) ({ data: tests } = (await sb.from('ielts_tests').select('id').eq('published', true)) as any) // exam бағаны әлі жоқ болса
    const ids = (tests ?? []).filter((t: any) => !exam || (t.exam ?? 'ielts') === exam).map((t: any) => t.id)
    const { data: acc } = ids.length ? await sb.from('ielts_access').select('student_id').in('test_id', ids) : { data: [] as { student_id: string }[] }
    // ҰБТ кабинетіне пән тесттері (физика т.б.) бар оқушылар да кіреді
    const extra = exam === 'ubt' ? await studentsWithSubjects() : []
    const sids = Array.from(new Set([...(acc ?? []).map((a) => a.student_id), ...extra]))
    if (!sids.length) return NextResponse.json({ students: [] })
    const { data: st } = await sb.from('students').select('id, full_name, group_id, student_groups(name)').in('id', sids).order('full_name')
    return NextResponse.json(
      // Ашық тізімде толық тегі көрсетілмейді: «Айтбек А.»
      { students: maskNames((st ?? []).map((s: any) => ({ id: s.id, name: s.full_name, group: s.student_groups?.name ?? '' }))) },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
