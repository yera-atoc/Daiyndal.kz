import { NextRequest, NextResponse } from 'next/server'
import { currentStudent } from '@/lib/bilimTestAuth'
import { getExam, timerStart } from '@/lib/bilimTestStore'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// Уақыт шегі: оқушы бланкті алғаш ашқанда сервер уақытты жазады. Қайта жүктеу немесе басқа құрылғы уақыт қоспайды.
export async function GET(req: NextRequest) {
  const me = await currentStudent()
  if (!me) return NextResponse.json({ error: 'Кіру керек' }, { status: 401 })
  const exam = await getExam(req.nextUrl.searchParams.get('exam') ?? '')
  const subject = req.nextUrl.searchParams.get('subject') ?? ''
  const cfg = exam?.subjects.find((s) => s.id === subject)
  if (!exam || !cfg || exam.group_id !== me.group_id || exam.practice || !exam.open_subjects.includes(subject) || !cfg.minutes) {
    return NextResponse.json({ timer: null }, { headers: { 'Cache-Control': 'no-store' } })
  }
  const started = await timerStart(exam.id, me.full_name, subject).catch(() => null)
  if (!started) return NextResponse.json({ timer: null }, { headers: { 'Cache-Control': 'no-store' } })
  const left = Math.max(0, Math.round((new Date(started).getTime() + cfg.minutes * 60000 - Date.now()) / 1000))
  return NextResponse.json({ timer: { minutes: cfg.minutes, left } }, { headers: { 'Cache-Control': 'no-store' } })
}
