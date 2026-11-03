import { NextResponse } from 'next/server'
import { currentTeacherId } from '@/lib/requireTeacher'
import { loadReports } from '@/lib/teacherOpsServer'
import { todayAlmatyISO } from '@/lib/payments'
import { weekStart } from '@/lib/teacherOps'

export const dynamic = 'force-dynamic'

// Мұғалімнің өз аптасы (кабинеттегі «Менің аптам»)
export async function GET() {
  const id = await currentTeacherId()
  if (!id) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  const today = todayAlmatyISO()
  const from = weekStart(today)
  const [row] = await loadReports(from, today, id)
  return NextResponse.json({ from, to: today, row: row ?? null }, { headers: { 'Cache-Control': 'no-store' } })
}
