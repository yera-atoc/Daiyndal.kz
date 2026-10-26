import { NextResponse } from 'next/server'
import { currentStudent } from '@/lib/ieltsServer'
import { mySubjects } from '@/lib/subjectStore'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// Оқушының пән тесттері (физика т.б.): өз баллдары, топ және жалпы орташа, орны
export async function GET() {
  try {
    const me = await currentStudent()
    if (!me) return NextResponse.json({ error: 'Кіру керек' }, { status: 401 })
    return NextResponse.json({ student: me, subjects: await mySubjects(me.id) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
