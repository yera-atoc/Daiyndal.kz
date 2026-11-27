import { NextResponse } from 'next/server'
import { currentStudent } from '@/lib/bilimTestAuth'
import { listExams, listGroups, listStudents, listSubmissions, saveExam } from '@/lib/bilimTestStore'
import { almatyDay, dailyVocabEnabled, dailyVocabExam, dailyVocabId, isDailyVocabId } from '@/lib/vocabDaily'
import { DEFAULT_SUBJECTS, liveSubjects, opensLater, examTitle, gradeSubject, ranking, rowTotal, shortName } from '@/lib/bilimTest'
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
    const [groups, all, peers] = await Promise.all([listGroups(), listExams(me.group_id, 'all'), listStudents(me.group_id)])
    const exams = all.filter((e) => !e.practice && !e.standalone)
    // Күнделікті сөздік (English-Adults, Pre-IELTS): бүгінгі 100 сөз жоқ болса — жасаймыз
    const groupName = groups.find((g) => g.id === me.group_id)?.name
    const today = almatyDay()
    if (dailyVocabEnabled(groupName) && !all.some((e) => e.id === dailyVocabId(me.group_id, today))) {
      const ex = dailyVocabExam(me.group_id, today)
      await saveExam(ex).catch(() => null)
      all.push({ ...ex, questions: {} })
    }
    // Күнделікті сөздіктің тек соңғы 7 күні көрінеді
    const weekAgo = almatyDay(Date.now() - 6 * 86400000)
    const drills = all.filter((e) => e.practice && !(isDailyVocabId(e.id) && e.id.slice(-10) < weekAgo))
    const tests = all.filter((e) => !e.practice && !!e.standalone)
    const names = new Set(peers.map((p) => p.full_name))

    const open = []
    const upcoming = []
    const results = []
    // Жеке ресми тесттер (сөздік тест т.б.) — айлық сынақтармен бірге: ашық болса тапсырады, жарияланса нәтижесі мен орны көрінеді
    for (const e of [...exams, ...tests].sort((a, b) => a.month.localeCompare(b.month) || Number(!!a.standalone) - Number(!!b.standalone)).reverse()) {
      // Кесте бойынша кейін ашылатын сынақ: кері санақ үшін ғана (пәндер жабық)
      if (opensLater(e)) {
        upcoming.push({ id: e.id, title: e.title, opens_at: e.opens_at, subjects: e.subjects.map((s) => s.name) })
        continue
      }
      const live = liveSubjects(e)
      const isOpen = live.length > 0
      if (!isOpen && !e.published) continue
      const subs = await listSubmissions(e.id)
      const mine = subs.filter((s) => s.student_name === me.full_name)
      if (isOpen) {
        open.push({
          id: e.id,
          title: e.title,
          shuffle: !!e.shuffle,
          ...(e.standalone ? { standalone: true } : {}),
          subjects: e.subjects.map((s) => ({
            id: s.id,
            name: s.name,
            questions: s.questions,
            options: s.options,
            ...(s.minutes ? { minutes: s.minutes } : {}),
            open: live.includes(s.id),
            done: mine.some((m) => m.subject === s.id),
          })),
        })
      }
      if (e.published && mine.length) {
        const rk = ranking(e, subs.filter((s) => names.has(s.student_name)))
        results.push({ ...resultSummary(e, mine, rk.place[me.full_name] ?? null, rk.of), ...(e.standalone ? { standalone: true } : {}) })
      }
    }
    // Дайындық: өткен айлардың сынағы. Әр пән бойынша соңғы тапсырғандағы балл.
    const practice = []
    // Дайындық: жаңа ай жоғарыда, бір айдың ішінде — 1-нұсқадан 10-нұсқаға қарай
    // Күнделікті сөздік — ең жоғарыда, бүгінгісі бірінші
    const dayFirst = (a: string, b: string) => Number(isDailyVocabId(b)) - Number(isDailyVocabId(a)) || (isDailyVocabId(a) ? b.localeCompare(a) : 0)
    for (const e of [...drills].sort((a, b) => dayFirst(a.id, b.id) || b.month.localeCompare(a.month) || a.id.localeCompare(b.id))) {
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
      // Сол айда топта тапсырылған пәндер (біреуі болса да): максимум толық болсын, тапсырмаған пән «Тапсырмаған» деп көрінсін
      const subj = tmpl.filter((t) => peers.some((p) => typeof p.legacy_scores?.[month]?.[t.id] === 'number'))
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
        taken: subj.filter((t) => typeof row?.[t.id] === 'number').length,
        correct: null,
        wrong: null,
        blank: null,
        score: total,
        max: subj.reduce((a, t) => a + t.max, 0),
        place: 1 + others.filter((x) => x.t > total).length,
        of: others.length,
        rows: subj.map((t) => ({ id: t.id, name: t.name, short: t.short, score: typeof row[t.id] === 'number' ? (row[t.id] as number) : null, max: t.max })),
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
        upcoming,
        now: Date.now(),
        results,
        practice,
        // Маусым: айлар бойынша нәтиже және рейтинг (НЗМ: Қыркүйек → Наурыз)
        season: seasonFor(me.group_id, groups.find((g) => g.id === me.group_id)?.name) ? await seasonView(me.group_id, { id: me.id }) : null,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
