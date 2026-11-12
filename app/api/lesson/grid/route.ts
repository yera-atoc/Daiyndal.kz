import { NextRequest, NextResponse } from 'next/server'
import { canSee, db, getClass, journalWho } from '@/lib/journalServer'
import { gridView, saveCell } from '@/lib/gridServer'
import { SCALES } from '@/lib/grid'
import { ISO, todayAlmaty } from '@/lib/journal'
import { logServerError } from '@/lib/serverLog'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

// GET ?class=&month=YYYY-MM — топтың айлық журналы
export async function GET(req: NextRequest) {
  const who = await journalWho()
  if (!who) return bad('Кіру керек', 401)
  try {
    const sp = req.nextUrl.searchParams
    const c = await getClass(sp.get('class') ?? '')
    if (!c || !canSee(who, c)) return bad('Топ табылмады', 404)
    const m = sp.get('month') ?? ''
    const month = /^\d{4}-\d{2}$/.test(m) ? m : todayAlmaty().slice(0, 7)
    const { data: t } = await (await db()).from('teachers').select('name').eq('id', c.teacher_id).maybeSingle()
    return NextResponse.json(await gridView(c as any, month, t?.name ?? ''), { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    await logServerError('lesson/grid', e)
    return bad(e.message, 500)
  }
}

// POST:
//   cell  { classId, date, studentId, att?, hw?, mark?, comment? } — null өшіреді
//   scale { classId, scale: 5 | 10 | 100 }
//   topic { classId, date, topic }
export async function POST(req: NextRequest) {
  const who = await journalWho()
  if (!who) return bad('Кіру керек', 401)
  try {
    const b = await req.json().catch(() => null)
    const c = await getClass(String(b?.classId ?? ''))
    if (!c || !canSee(who, c)) return bad('Топ табылмады', 404)
    const sb = await db()
    if (b.action === 'scale') {
      const scale = Number(b.scale)
      if (!(SCALES as readonly number[]).includes(scale)) return bad('Шкала: 5, 10 немесе 100')
      const { error } = await sb.from('teacher_classes').update({ mark_scale: scale }).eq('id', c.id)
      if (error) return bad(/mark_scale/.test(error.message) ? 'Алдымен 20261112_01_class_marks.sql миграциясын іске қосыңыз' : error.message, 500)
      return NextResponse.json({ ok: true })
    }
    const date = String(b?.date ?? '')
    if (!ISO.test(date)) return bad('Күні дұрыс емес')
    if (b.action === 'topic') {
      const { error } = await sb.from('class_lessons').upsert({ class_id: c.id, date, topic: String(b.topic ?? '').trim().slice(0, 1000) || null, cancelled: false, updated_at: new Date().toISOString(), updated_by: who.actor })
      if (error) return bad(error.message, 500)
      return NextResponse.json({ ok: true })
    }
    if (b.action === 'cell') return NextResponse.json(await saveCell(c as any, b))
    return bad('Белгісіз әрекет')
  } catch (e: any) {
    if (e.status) return bad(e.message, e.status)
    await logServerError('lesson/grid', e)
    return bad(e.message, 500)
  }
}
