import { NextResponse } from 'next/server'
import { currentAdmin } from '@/lib/requireAdmin'
import { getGoodNews } from '@/lib/goodNews'
import { todayAlmatyISO } from '@/lib/payments'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Күннің жағымды жаңалықтары (3 сағат кэш). Бөлек жүктеледі, себебі алғашқы іздеу 10–30 секунд алуы мүмкін.
export async function GET() {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  const news = await getGoodNews(todayAlmatyISO())
  return NextResponse.json({ news }, { headers: { 'Cache-Control': 'no-store' } })
}
