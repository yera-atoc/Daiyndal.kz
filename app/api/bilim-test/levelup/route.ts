import { NextResponse } from 'next/server'
import { currentStudent } from '@/lib/bilimTestAuth'
import { listExams, listGroups, listSubmissions } from '@/lib/bilimTestStore'
import { seasonView } from '@/lib/bilimSeasonServer'
import { topicStats } from '@/lib/bilimTest'
import { dayKey, streak } from '@/lib/daily'
import { buildLevelUp, isNishGroup, rankBoard, type MonthScores, type TopicRow } from '@/lib/levelUp'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// НИШ оқушысының «Менің деңгейім» статтары: тек өзінікі
export async function GET() {
  try {
    const me = await currentStudent()
    if (!me) return NextResponse.json({ error: 'Кіру керек' }, { status: 401 })
    const groupName = (await listGroups()).find((g) => g.id === me.group_id)?.name
    if (!isNishGroup(me.group_id, groupName)) return NextResponse.json({ error: 'Бұл бөлім НИШ тобына арналған' }, { status: 404 })

    const [season, exams, daily] = await Promise.all([
      seasonView(me.group_id, { id: me.id }),
      listExams(me.group_id),
      supabaseAdmin.from('bt_daily_answers').select('day, answers, correct').eq('student_id', me.id).order('day', { ascending: false }).limit(400),
    ])
    if (daily.error) throw new Error(daily.error.message)

    const row = season.rows.find((r) => r.me)
    const months: MonthScores[] = season.months
      .filter((m) => m.shown && row?.cells[m.month])
      .map((m) => ({
        month: m.month,
        name: m.name,
        scores: row!.cells[m.month]!.scores,
        maxes: Object.fromEntries(m.subjects.map((s) => [s.id, s.max])),
      }))

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

    const today = dayKey()
    const rows = (daily.data ?? []) as { day: string; answers: string[]; correct: number }[]
    const data = buildLevelUp({
      months,
      topics,
      daily: rows.map((r) => ({ day: r.day, correct: r.correct, total: r.answers?.length ?? 0 })),
      streak: streak(rows.map((r) => r.day), today),
      today,
    })
    // Ранг рейтингі: менің соңғы айымдағы топ (басқалардың аты қысқа — seasonView оны өзі жасайды)
    const board = data ? rankBoard(season.rows.map((r) => ({ name: r.name, me: r.me, total: r.cells[data.month]?.total }))) : []
    return NextResponse.json({ name: me.full_name, data, board }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
