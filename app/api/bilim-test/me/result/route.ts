import { NextRequest, NextResponse } from 'next/server'
import { currentStudent } from '@/lib/bilimTestAuth'
import { getExam } from '@/lib/bilimTestStore'
import { studentResult } from '@/lib/bilimTestResults'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// Оқушының бір сынақ бойынша нәтижесі — тек мұғалім жариялаған соң
export async function GET(req: NextRequest) {
  try {
    const me = await currentStudent()
    if (!me) return NextResponse.json({ error: 'Кіру керек' }, { status: 401 })
    const exam = await getExam(req.nextUrl.searchParams.get('exam') ?? '')
    if (!exam || exam.group_id !== me.group_id || !exam.published) {
      return NextResponse.json({ error: 'Нәтиже әлі жарияланбаған' }, { status: 404 })
    }
    return NextResponse.json(await studentResult(exam, me.full_name, { fullNames: false }), {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
