import { NextResponse } from 'next/server'
import { db } from '@/lib/ieltsServer'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// Кіру беті: жарияланған тестке рұқсаты бар оқушылардың аттары (PIN жіберілмейді)
export async function GET() {
  try {
    const sb = await db()
    const { data: tests } = await sb.from('ielts_tests').select('id').eq('published', true)
    const ids = (tests ?? []).map((t) => t.id)
    if (!ids.length) return NextResponse.json({ students: [] })
    const { data: acc } = await sb.from('ielts_access').select('student_id').in('test_id', ids)
    const sids = Array.from(new Set((acc ?? []).map((a) => a.student_id)))
    if (!sids.length) return NextResponse.json({ students: [] })
    const { data: st } = await sb.from('students').select('id, full_name, group_id, student_groups(name)').in('id', sids).order('full_name')
    return NextResponse.json(
      { students: (st ?? []).map((s: any) => ({ id: s.id, name: s.full_name, group: s.student_groups?.name ?? '' })) },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
