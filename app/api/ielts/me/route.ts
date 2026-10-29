import { NextResponse } from 'next/server'
import { currentStudent, db } from '@/lib/ieltsServer'
import { sectionsOf, type IeltsTest } from '@/lib/ielts'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// Оқушының кабинеті: тесттері және нәтижелері
export async function GET() {
  try {
    const me = await currentStudent()
    if (!me) return NextResponse.json({ error: 'Кіру керек' }, { status: 401 })
    const sb = await db()
    const { data: acc } = await sb.from('ielts_access').select('*').eq('student_id', me.id)
    const ids = (acc ?? []).map((a) => a.test_id)
    const [{ data: tests }, { data: attempts }] = await Promise.all([
      ids.length ? sb.from('ielts_tests').select('*').in('id', ids).eq('published', true) : Promise.resolve({ data: [] as any[] }),
      sb.from('ielts_attempts').select('id, test_id, status, scores, published, started_at, submitted_at, state').eq('student_id', me.id).order('started_at', { ascending: false }),
    ])
    const list = (tests ?? []).map((t: IeltsTest) => {
      const mine = (attempts ?? []).filter((a) => a.test_id === t.id)
      const allowed = acc?.find((a) => a.test_id === t.id)?.attempts_allowed ?? 1
      return {
        id: t.id,
        title: t.title,
        exam: t.exam ?? 'ielts',
        variant: t.variant,
        mode: t.mode,
        sections: sectionsOf(t.content),
        combos: (acc?.find((a: any) => a.test_id === t.id) as any)?.combos ?? null,
        canStart: !mine.some((a) => a.status === 'in_progress') && mine.length < allowed,
        attempts: mine.map((a) => ({
          id: a.id,
          status: a.status,
          started_at: a.started_at,
          submitted_at: a.submitted_at,
          published: a.published,
          // L/R бірден көрінеді; W/S мен overall — мұғалім жариялағанда
          combo: (a.state as any)?.combo ?? null,
          scores: a.published || t.exam === 'ubt' ? a.scores : { listening: a.scores?.listening, reading: a.scores?.reading },
        })),
      }
    })
    return NextResponse.json({ student: me, tests: list }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
