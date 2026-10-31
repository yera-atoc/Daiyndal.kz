import { NextRequest, NextResponse } from 'next/server'
import { currentStudent } from '@/lib/bilimTestAuth'
import { listStudents } from '@/lib/bilimTestStore'
import { shortName } from '@/lib/bilimTest'
import { TRACK_NAMES, dailyTrack, dayKey, pickIndices, streak, type DailyTrack } from '@/lib/daily'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

type PoolRow = { id: number; text: string; options: string[]; answer: string; topic: string | null; explain: string | null }

async function todays(track: DailyTrack, day: string): Promise<PoolRow[]> {
  const { data, error } = await supabaseAdmin
    .from('bt_daily_pool')
    .select('id, text, options, answer, topic, explain')
    .eq('track', track)
    .eq('active', true)
    .order('id')
  if (error) throw new Error(error.message)
  const pool = (data ?? []) as PoolRow[]
  return pickIndices(day, pool.length).map((i) => pool[i])
}

async function view(me: { id: string; full_name: string; group_id: string }, track: DailyTrack, day: string) {
  const qs = await todays(track, day)
  const students = await listStudents(me.group_id)
  const ids = students.map((s) => s.id)
  const month = day.slice(0, 7)
  const { data: rows, error } = await supabaseAdmin
    .from('bt_daily_answers')
    .select('student_id, day, answers, correct')
    .in('student_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
    .gte('day', `${month}-01`)
    .lte('day', day)
  if (error) throw new Error(error.message)
  // streak үшін өз жауаптарымның барлық күндері
  const { data: myDays } = await supabaseAdmin.from('bt_daily_answers').select('day').eq('student_id', me.id).order('day', { ascending: false }).limit(400)
  const mine = (rows ?? []).find((r) => r.student_id === me.id && r.day === day) ?? null
  const board = students
    .map((s) => {
      const r = (rows ?? []).filter((x) => x.student_id === s.id)
      return { name: s.id === me.id ? s.full_name : shortName(s.full_name), me: s.id === me.id, days: r.length, correct: r.reduce((a, x) => a + x.correct, 0) }
    })
    .filter((x) => x.days > 0)
    .sort((a, b) => b.correct - a.correct || b.days - a.days)
  return {
    day,
    track,
    trackName: TRACK_NAMES[track],
    questions: qs.map((q) => ({ id: q.id, text: q.text, options: q.options, topic: q.topic })),
    result: mine
      ? { answers: mine.answers as string[], correct: mine.correct, key: qs.map((q) => q.answer), explain: qs.map((q) => q.explain ?? '') }
      : null,
    streak: streak((myDays ?? []).map((d) => d.day as string), day),
    board,
  }
}

export async function GET() {
  try {
    const me = await currentStudent()
    if (!me) return NextResponse.json({ error: 'Кіру керек' }, { status: 401 })
    const track = dailyTrack(me.group_id)
    if (!track) return NextResponse.json({ error: 'Бұл топқа күнделікті сұрақтар жоқ' }, { status: 404 })
    return NextResponse.json(await view(me, track, dayKey()), { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await currentStudent()
    if (!me) return NextResponse.json({ error: 'Кіру керек' }, { status: 401 })
    const track = dailyTrack(me.group_id)
    if (!track) return NextResponse.json({ error: 'Бұл топқа күнделікті сұрақтар жоқ' }, { status: 404 })
    const day = dayKey()
    const qs = await todays(track, day)
    if (!qs.length) return NextResponse.json({ error: 'Бүгінгі сұрақтар әлі қосылмаған' }, { status: 404 })
    const body = await req.json().catch(() => null)
    const answers = qs.map((_, i) => {
      const a = String(body?.answers?.[i] ?? '').toUpperCase()
      return /^[A-E]$/.test(a) ? a : ''
    })
    const correct = qs.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0)
    const { error } = await supabaseAdmin.from('bt_daily_answers').insert({ student_id: me.id, day, track, answers, correct })
    if (error && !/duplicate|unique/i.test(error.message)) throw new Error(error.message)
    return NextResponse.json(await view(me, track, day))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
