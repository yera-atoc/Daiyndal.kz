import { NextResponse } from 'next/server'
import { currentStudent } from '@/lib/bilimTestAuth'
import { listExams, listGroups, listStudents, listSubmissions } from '@/lib/bilimTestStore'
import { ranking } from '@/lib/bilimTest'
import { resultSummary } from '@/lib/bilimTestResults'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// Оқушының кабинеті: ашық сынақтар және жарияланған нәтижелер
export async function GET() {
  try {
    const me = await currentStudent()
    if (!me) return NextResponse.json({ error: 'Кіру керек' }, { status: 401 })
    const [groups, exams, peers] = await Promise.all([listGroups(), listExams(me.group_id), listStudents(me.group_id)])
    const names = new Set(peers.map((p) => p.full_name))

    const open = []
    const results = []
    for (const e of [...exams].reverse()) {
      const isOpen = e.open_subjects.length > 0
      if (!isOpen && !e.published) continue
      const subs = await listSubmissions(e.id)
      const mine = subs.filter((s) => s.student_name === me.full_name)
      if (isOpen) {
        open.push({
          id: e.id,
          title: e.title,
          subjects: e.subjects.map((s) => ({
            id: s.id,
            name: s.name,
            questions: s.questions,
            options: s.options,
            open: e.open_subjects.includes(s.id),
            done: mine.some((m) => m.subject === s.id),
          })),
        })
      }
      if (e.published && mine.length) {
        const rk = ranking(e, subs.filter((s) => names.has(s.student_name)))
        results.push(resultSummary(e, mine, rk.place[me.full_name] ?? null, rk.of))
      }
    }
    return NextResponse.json(
      {
        student: { id: me.id, name: me.full_name },
        group: { id: me.group_id, name: groups.find((g) => g.id === me.group_id)?.name ?? '' },
        open,
        results,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
