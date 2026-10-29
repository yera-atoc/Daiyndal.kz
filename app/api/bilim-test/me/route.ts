import { NextResponse } from 'next/server'
import { currentStudent } from '@/lib/bilimTestAuth'
import { listExams, listGroups, listStudents, listSubmissions } from '@/lib/bilimTestStore'
import { DEFAULT_SUBJECTS, examTitle, gradeSubject, ranking, rowTotal, shortName } from '@/lib/bilimTest'
import { resultSummary } from '@/lib/bilimTestResults'
import { seasonView } from '@/lib/bilimSeasonServer'
import { seasonFor } from '@/lib/bilimSeason'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// Оқушының кабинеті: ашық сынақтар және жарияланған нәтижелер
export async function GET() {
  try {
    const me = await currentStudent()
    if (!me) return NextResponse.json({ error: 'Кіру керек' }, { status: 401 })
    const [groups, exams, peers, drills] = await Promise.all([
      listGroups(),
      listExams(me.group_id),
      listStudents(me.group_id),
      listExams(me.group_id, 'only'),
    ])
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
    // Дайындық: өткен айлардың сынағы. Әр пән бойынша соңғы тапсырғандағы балл.
    const practice = []
    for (const e of [...drills].reverse()) {
      const mine = (await listSubmissions(e.id)).filter((s) => s.student_name === me.full_name)
      practice.push({
        id: e.id,
        title: e.title,
        month: e.month,
        subjects: e.subjects.map((s) => {
          const sub = mine.find((m) => m.subject === s.id)
          const g = sub ? gradeSubject(s, e.answer_key[s.id], sub.answers) : null
          return { id: s.id, name: s.name, questions: s.questions, max: s.max, score: g?.score ?? null, correct: g?.correct ?? null }
        }),
      })
    }

    // Сайтқа дейін тапсырылған айлар (Excel-ден енгізілген баллдар, мысалы Қыркүйек): кабинетте де көрінсін
    const grp = groups.find((g) => g.id === me.group_id)
    const tmpl = grp?.subjects?.length ? grp.subjects : DEFAULT_SUBJECTS
    const mineRow = peers.find((p) => p.id === me.id)?.legacy_scores ?? {}
    for (const month of Object.keys(mineRow).sort().reverse()) {
      if (exams.some((e) => e.month === month)) continue
      const row = mineRow[month]
      const subj = tmpl.filter((t) => typeof row?.[t.id] === 'number')
      const total = rowTotal(row)
      if (!subj.length || total === null) continue
      const others = peers
        .map((p) => ({ p, t: rowTotal(p.legacy_scores?.[month]) }))
        .filter((x): x is { p: (typeof peers)[number]; t: number } => x.t !== null)
        .sort((a, b) => b.t - a.t)
      results.push({
        examId: `legacy:${month}`,
        legacy: true,
        title: examTitle(month),
        month,
        subjects: subj.length,
        taken: subj.length,
        correct: null,
        wrong: null,
        blank: null,
        score: total,
        max: subj.reduce((a, t) => a + t.max, 0),
        place: 1 + others.filter((x) => x.t > total).length,
        of: others.length,
        rows: subj.map((t) => ({ id: t.id, name: t.name, short: t.short, score: row[t.id] as number, max: t.max })),
        // Топ рейтингі: басқалардың аты қысқа («Оразалы Ж.»)
        table: others.map((x) => ({
          place: 1 + others.filter((y) => y.t > x.t).length,
          name: x.p.id === me.id ? x.p.full_name : shortName(x.p.full_name),
          me: x.p.id === me.id,
          scores: x.p.legacy_scores[month],
          total: x.t,
        })),
      } as any)
    }

    return NextResponse.json(
      {
        student: { id: me.id, name: me.full_name },
        group: { id: me.group_id, name: groups.find((g) => g.id === me.group_id)?.name ?? '' },
        open,
        results,
        practice,
        // Маусым: айлар бойынша нәтиже және рейтинг (НЗМ: Қыркүйек → Наурыз)
        season: seasonFor(me.group_id) ? await seasonView(me.group_id, { id: me.id }) : null,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
