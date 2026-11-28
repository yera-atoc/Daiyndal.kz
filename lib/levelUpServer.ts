// «Деңгей» деректерін серверде жинау (route-тар ортақ қолданады): сынақтар, тақырыптар, XP, апталық рейтинг.
import { listExams, listGroups, listStudents, listSubmissions } from '@/lib/bilimTestStore'
import { seasonView } from '@/lib/bilimSeasonServer'
import { shortName, topicStats } from '@/lib/bilimTest'
import { dayKey, streak } from '@/lib/daily'
import { buildLevelUp, isNishGroup, levelEvent, rankBoard, type MonthScores, type TopicRow } from '@/lib/levelUp'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { weekBoard, weekStart, xpEvents, xpSummary, type XpEvent } from '@/lib/xp'


export const SUBJECTS = ['math', 'quant', 'science', 'english', 'kazakh', 'russian']
export type State = { seen_level: number; seen_rank: string; points: Record<string, number> }

/** Кесте жоқ болса — null (миграция әлі іске қосылмаған) */
export async function loadState(id: string): Promise<State | null> {
  const { data, error } = await supabaseAdmin.from('bt_levelup').select('seen_level, seen_rank, points').eq('student_id', id).maybeSingle()
  if (error) return null
  return (data as State) ?? { seen_level: 0, seen_rank: '', points: {} }
}

export async function saveState(id: string, st: State) {
  const { error } = await supabaseAdmin.from('bt_levelup').upsert({ student_id: id, ...st, updated_at: new Date().toISOString() })
  if (error) throw new Error('Деңгей кестесі әлі жоқ: Supabase-те 20261104_03_levelup.sql іске қосу керек')
}

export async function computeLevelUp(me: { id: string; full_name: string; group_id: string }, state: State | null) {
  const [season, exams, drills, daily] = await Promise.all([
    seasonView(me.group_id, { id: me.id }),
    listExams(me.group_id, 'none', true),
    listExams(me.group_id, 'only', true),
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

  // Дайындық сынақтары: менің барлық тапсырғандарым (XP) және топтың осы аптадағылары (апталық рейтинг)
  const today = dayKey()
  const ws = weekStart(today)
  const practiceToday = new Set<string>()
  const myDrills: { day: string }[] = []
  const weekDrills = new Map<string, number>() // толық аты → осы аптадағы саны
  for (const e of drills) {
    for (const s of await listSubmissions(e.id)) {
      if (!s.submitted_at) continue
      const day = dayKey(new Date(s.submitted_at))
      if (s.student_name === me.full_name) {
        myDrills.push({ day })
        if (day === today) practiceToday.add(s.subject)
      }
      if (day >= ws) weekDrills.set(s.student_name, (weekDrills.get(s.student_name) ?? 0) + 1)
    }
  }

  const rows = (daily.data ?? []) as { day: string; answers: string[]; correct: number }[]
  // Айлық сынақтың XP-ы: жарияланған әр айдың жалпы баллы (айдың 1-күніне жазылады)
  const examXp = season.months.filter((m) => m.shown && row?.cells[m.month]).map((m) => ({ day: `${m.month}-01`, total: row!.cells[m.month]!.total }))
  const events: XpEvent[] = xpEvents({ daily: rows.map((r) => ({ day: r.day, correct: r.correct })), drills: myDrills, exams: examXp })
  const xp = xpSummary(events, today)

  // Апталық XP рейтингі: топтың барлық оқушысы, дүйсенбіден бері (серия бонусы үшін 2 күн бұрыннан аламыз)
  const students = await listStudents(me.group_id)
  const from = new Date(new Date(ws + 'T00:00:00Z').getTime() - 2 * 864e5).toISOString().slice(0, 10)
  const wk = students.length
    ? await supabaseAdmin.from('bt_daily_answers').select('student_id, day, correct').in('student_id', students.map((x) => x.id)).gte('day', from)
    : { data: [], error: null }
  if (wk.error) throw new Error(wk.error.message)
  const week = weekBoard(
    students.map((st) => {
      const ev = xpEvents({
        daily: (wk.data ?? []).filter((r: any) => r.student_id === st.id).map((r: any) => ({ day: r.day, correct: r.correct })),
        drills: Array.from({ length: weekDrills.get(st.full_name) ?? 0 }, () => ({ day: today })),
        exams: [],
      })
      return { name: st.id === me.id ? st.full_name : shortName(st.full_name), me: st.id === me.id, xp: xpSummary(ev, today).week }
    })
  )

  const data = buildLevelUp({
    xp: { total: xp.total, today: xp.today },
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
  return { data, board, week }
}

