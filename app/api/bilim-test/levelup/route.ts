import { NextRequest, NextResponse } from 'next/server'
import { currentStudent } from '@/lib/bilimTestAuth'
import { listExams, listGroups, listSubmissions } from '@/lib/bilimTestStore'
import { seasonView } from '@/lib/bilimSeasonServer'
import { topicStats } from '@/lib/bilimTest'
import { dayKey, streak } from '@/lib/daily'
import { buildLevelUp, isNishGroup, levelEvent, rankBoard, type MonthScores, type TopicRow } from '@/lib/levelUp'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

const SUBJECTS = ['math', 'quant', 'science', 'english', 'kazakh', 'russian']
type State = { seen_level: number; seen_rank: string; points: Record<string, number> }

/** Кесте жоқ болса — null (миграция әлі іске қосылмаған) */
async function loadState(id: string): Promise<State | null> {
  const { data, error } = await supabaseAdmin.from('bt_levelup').select('seen_level, seen_rank, points').eq('student_id', id).maybeSingle()
  if (error) return null
  return (data as State) ?? { seen_level: 0, seen_rank: '', points: {} }
}

async function saveState(id: string, st: State) {
  const { error } = await supabaseAdmin.from('bt_levelup').upsert({ student_id: id, ...st, updated_at: new Date().toISOString() })
  if (error) throw new Error('Деңгей кестесі әлі жоқ: Supabase-те 20261104_03_levelup.sql іске қосу керек')
}

async function compute(me: { id: string; full_name: string; group_id: string }, state: State | null) {
  const [season, exams, drills, daily] = await Promise.all([
    seasonView(me.group_id, { id: me.id }),
    listExams(me.group_id),
    listExams(me.group_id, 'only'),
    supabaseAdmin.from('bt_daily_answers').select('day, answers, correct').eq('student_id', me.id).order('day', { ascending: false }).limit(400),
  ])
  if (daily.error) throw new Error(daily.error.message)

  const row = season.rows.find((r) => r.me)
  const months: MonthScores[] = season.months
    .filter((m) => m.shown && row?.cells[m.month])
    .map((m) => ({ month: m.month, name: m.name, scores: row!.cells[m.month]!.scores, maxes: Object.fromEntries(m.subjects.map((s) => [s.id, s.max])) }))

  // Тақырыптар: менің тапсырған ең соңғы жарияланған сынағым
  const topics: TopicRow[] = []
  for (const e of [...exams].filter((x) => x.published).reverse()) {
    const mine = (await listSubmissions(e.id)).filter((s) => s.student_name === me.full_name)
    if (!mine.length) continue
    for (const sub of mine) {
      const cfg = e.subjects.find((s) => s.id === sub.subject)
      if (!cfg) continue
      for (const t of topicStats(cfg, e.answer_key[cfg.id], sub.answers, e.questions?.[cfg.id])) topics.push({ subject: cfg.id, ...t })
    }
    break
  }

  // Фокус-квест: бүгін дайындық сынағын тапсырған пәндер (соңғы 2 айдың дайындық сынақтары)
  const today = dayKey()
  const practiceToday = new Set<string>()
  for (const e of drills.slice(-2)) {
    for (const s of await listSubmissions(e.id)) {
      if (s.student_name === me.full_name && s.submitted_at && dayKey(new Date(s.submitted_at)) === today) practiceToday.add(s.subject)
    }
  }

  const rows = (daily.data ?? []) as { day: string; answers: string[]; correct: number }[]
  const data = buildLevelUp({
    months,
    topics,
    daily: rows.map((r) => ({ day: r.day, correct: r.correct, total: r.answers?.length ?? 0 })),
    streak: streak(rows.map((r) => r.day), today),
    today,
    points: state?.points ?? {},
    practiceToday: Array.from(practiceToday),
  })
  // Ранг рейтингі: менің соңғы айымдағы топ (басқалардың аты қысқа — seasonView оны өзі жасайды)
  const board = data ? rankBoard(season.rows.map((r) => ({ name: r.name, me: r.me, total: r.cells[data.month]?.total }))) : []
  return { data, board }
}

async function guard() {
  const me = await currentStudent()
  if (!me) return { err: NextResponse.json({ error: 'Кіру керек' }, { status: 401 }) }
  const groupName = (await listGroups()).find((g) => g.id === me.group_id)?.name
  if (!isNishGroup(me.group_id, groupName)) return { err: NextResponse.json({ error: 'Бұл бөлім НИШ тобына арналған' }, { status: 404 }) }
  return { me }
}

// НИШ оқушысының «Менің деңгейім» статтары: тек өзінікі
export async function GET() {
  try {
    const g = await guard()
    if (g.err) return g.err
    const me = g.me!
    const state = await loadState(me.id)
    const { data, board } = await compute(me, state)
    // Жүйе хабарламасы: соңғы көрген деңгейден өсті ме (бірінші кіргенде — тек есте сақтаймыз)
    let event = null
    if (data && state) {
      event = levelEvent(state.seen_level ? { level: state.seen_level, rank: state.seen_rank } : null, { level: data.level, rank: data.rank.id })
      if (!state.seen_level) await saveState(me.id, { ...state, seen_level: data.level, seen_rank: data.rank.id }).catch(() => {})
    }
    return NextResponse.json({ name: me.full_name, data, board, event, stored: !!state }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// action: 'seen' — хабарламаны жабу; 'alloc' — пәнге 1 ұпай салу; 'reset' — ұпайларды қайта бөлу
export async function POST(req: NextRequest) {
  try {
    const g = await guard()
    if (g.err) return g.err
    const me = g.me!
    const state = await loadState(me.id)
    if (!state) return NextResponse.json({ error: 'Деңгей кестесі әлі жоқ: Supabase-те 20261104_03_levelup.sql іске қосу керек' }, { status: 503 })
    const body = await req.json().catch(() => null)
    const { data } = await compute(me, state)
    if (!data) return NextResponse.json({ error: 'Нәтиже әлі жоқ' }, { status: 400 })
    const next: State = { ...state, points: { ...(state.points ?? {}) } }
    if (body?.action === 'seen') {
      next.seen_level = data.level
      next.seen_rank = data.rank.id
    } else if (body?.action === 'alloc') {
      const sub = String(body?.subject ?? '')
      if (!SUBJECTS.includes(sub)) return NextResponse.json({ error: 'Пән қате' }, { status: 400 })
      if (data.points.free <= 0) return NextResponse.json({ error: 'Бос ұпай жоқ. Келесі деңгейде тағы беріледі' }, { status: 400 })
      next.points[sub] = (next.points[sub] ?? 0) + 1
    } else if (body?.action === 'reset') {
      next.points = {}
    } else return NextResponse.json({ error: 'Белгісіз әрекет' }, { status: 400 })
    await saveState(me.id, next)
    const out = await compute(me, next)
    return NextResponse.json({ name: me.full_name, ...out, event: null, stored: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
