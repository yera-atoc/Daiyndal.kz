import { NextResponse } from 'next/server'
import { listGroups, listStudents } from '@/lib/bilimTestStore'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// Кіру беті үшін: топтар және оқушылардың аттары (PIN жіберілмейді)
export async function GET() {
  try {
    const groups = await listGroups()
    const out = await Promise.all(
      groups.map(async (g) => ({
        id: g.id,
        name: g.name,
        students: (await listStudents(g.id)).map((s) => ({ id: s.id, name: s.full_name })),
      }))
    )
    return NextResponse.json({ groups: out.filter((g) => g.students.length) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
