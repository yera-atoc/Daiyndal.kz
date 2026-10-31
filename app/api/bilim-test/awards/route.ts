import { NextRequest, NextResponse } from 'next/server'
import { currentAdmin } from '@/lib/requireAdmin'
import { currentStudent } from '@/lib/bilimTestAuth'
import { getExam } from '@/lib/bilimTestStore'
import { examAwards } from '@/lib/bilimTestResults'

export const dynamic = 'force-dynamic'

// Мадақтама: әкімшіге — барлығы; оқушыға — тек өзінікі (нәтиже жарияланған соң)
export async function GET(req: NextRequest) {
  try {
    const exam = await getExam(req.nextUrl.searchParams.get('exam') ?? '')
    if (!exam || exam.practice) return NextResponse.json({ error: 'Сынақ табылмады' }, { status: 404 })
    if (await currentAdmin()) return NextResponse.json(await examAwards(exam), { headers: { 'Cache-Control': 'no-store' } })
    const me = await currentStudent()
    if (!me) return NextResponse.json({ error: 'Кіру керек' }, { status: 401 })
    if (exam.group_id !== me.group_id || !exam.published) return NextResponse.json({ error: 'Нәтиже әлі жарияланбаған' }, { status: 404 })
    const all = await examAwards(exam)
    return NextResponse.json({ ...all, awards: all.awards.filter((a) => a.name === me.full_name) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
