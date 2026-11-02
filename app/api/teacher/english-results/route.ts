import { NextResponse } from 'next/server'
import { currentTeacherId } from '@/lib/requireTeacher'
import { isAdmin } from '@/lib/requireAdmin'
import { isEnglishTeacher } from '@/lib/teacherScope'
import { db } from '@/lib/ieltsServer'
import { listSheets } from '@/lib/subjectStore'
import { listExams, listGroups, listStudents, listSubmissions } from '@/lib/bilimTestStore'
import { gradeSubject, monthName } from '@/lib/bilimTest'
import { isEnglishSubject } from '@/lib/teacherSubject'
import { logServerError } from '@/lib/serverLog'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// Ағылшын тілі бойынша барлық нәтиже бір жерде (ағылшын мұғалімі мен әкімшіге):
//  · IELTS / TOEFL mock тапсырулары
//  · ҰБТ сынағындағы «Шет тілі (ағылшын)» пәні
//  · Білім тексеру сынағындағы «Ағылшын тілі»
//  · Пән тесттерінің ағылшын парақтары
export type EnglishResult = {
  student: string
  studentId: string | null
  source: 'IELTS' | 'TOEFL' | 'ҰБТ' | 'Білім сынағы' | 'Пән тесті'
  test: string
  score: string
  pct: number | null // салыстыру үшін 0–100
  date: string | null
  status?: string
  attemptId?: string
}

const fmtBand = (b: number | null | undefined) => (typeof b === 'number' ? b.toFixed(1) : null)

async function ieltsResults(): Promise<EnglishResult[]> {
  const sb = await db()
  // exam бағаны ескі базада болмауы мүмкін — онда бәрі IELTS
  let { data: tests, error } = (await sb.from('ielts_tests').select('id, title, exam')) as { data: any[] | null; error: any }
  if (error && /exam/.test(error.message)) ({ data: tests, error } = (await sb.from('ielts_tests').select('id, title')) as { data: any[] | null; error: any })
  if (error) {
    if (/ielts_tests/.test(error.message)) return []
    throw new Error(error.message)
  }
  if (!tests?.length) return []
  const byId = new Map(tests.map((t: any) => [t.id as string, t]))
  const { data: attempts, error: e2 } = await sb
    .from('ielts_attempts')
    .select('id, test_id, student_id, status, scores, started_at, submitted_at, graded_at')
    .in('test_id', Array.from(byId.keys()))
    .neq('status', 'in_progress')
  if (e2) throw new Error(e2.message)
  const ids = Array.from(new Set((attempts ?? []).map((a: any) => a.student_id).filter(Boolean)))
  const { data: students } = ids.length ? await sb.from('students').select('id, full_name').in('id', ids) : { data: [] }
  const names = new Map((students ?? []).map((s: any) => [s.id as string, s.full_name as string]))

  const out: EnglishResult[] = []
  for (const a of attempts ?? []) {
    const t: any = byId.get(a.test_id)
    if (!t) continue
    const exam = t.exam ?? 'ielts'
    const s: any = a.scores ?? {}
    const base = {
      student: names.get(a.student_id) ?? 'Белгісіз оқушы',
      studentId: a.student_id ?? null,
      test: t.title as string,
      date: (a.graded_at ?? a.submitted_at ?? a.started_at ?? null) as string | null,
      status: a.status === 'graded' ? 'тексерілді' : 'тексеруді күтуде',
      attemptId: a.id as string,
    }
    if (exam === 'ubt') {
      const en = (s.ubt?.subjects ?? []).find((x: any) => x.key === 'english')
      if (!en) continue
      out.push({ ...base, source: 'ҰБТ', score: `${en.points}/${en.max}`, pct: en.max ? Math.round((en.points / en.max) * 100) : null })
      continue
    }
    const isToefl = exam === 'toefl'
    const parts: string[] = []
    for (const [k, label] of [['listening', 'L'], ['reading', 'R'], ['writing', 'W'], ['speaking', 'S']] as const) {
      const b = fmtBand(s[k]?.band)
      if (b) parts.push(`${label} ${b}`)
    }
    const overall = fmtBand(s.overall)
    const max = isToefl ? 6 : 9
    out.push({
      ...base,
      source: isToefl ? 'TOEFL' : 'IELTS',
      score: overall ? `${overall}${parts.length ? ` (${parts.join(', ')})` : ''}` : parts.join(', ') || '—',
      pct: typeof s.overall === 'number' ? Math.round((s.overall / max) * 100) : null,
    })
  }
  return out
}

async function bilimResults(): Promise<EnglishResult[]> {
  const out: EnglishResult[] = []
  const [exams, groups] = await Promise.all([listExams(undefined, 'none'), listGroups()])
  for (const exam of exams) {
    const cfg = exam.subjects.find((x) => x.id === 'english')
    if (!cfg) continue
    const subs = (await listSubmissions(exam.id)).filter((x) => x.subject === 'english')
    const group = groups.find((g) => g.id === exam.group_id)?.name
    for (const sub of subs) {
      const g = gradeSubject(cfg, exam.answer_key.english, sub.answers)
      out.push({
        student: sub.student_name,
        studentId: null,
        source: 'Білім сынағы',
        test: `${exam.title}${group ? ` · ${group}` : ''}`,
        score: g ? `${g.score}/${cfg.max}` : 'кілт әлі енгізілмеген',
        pct: g ? Math.round((g.score / cfg.max) * 100) : null,
        date: sub.submitted_at,
      })
    }
  }
  // Сайтқа дейінгі айлардың баллдары
  for (const gr of groups) {
    for (const st of await listStudents(gr.id)) {
      for (const [month, row] of Object.entries(st.legacy_scores ?? {})) {
        const v = row?.english
        if (typeof v !== 'number') continue
        out.push({
          student: st.full_name,
          studentId: null,
          source: 'Білім сынағы',
          test: `${monthName(month)} · ${gr.name}`,
          score: `${v}/200`,
          pct: Math.round((v / 200) * 100),
          date: `${month}-01`,
        })
      }
    }
  }
  return out
}

async function sheetResults(): Promise<EnglishResult[]> {
  const out: EnglishResult[] = []
  for (const { sheet, rows } of await listSheets()) {
    if (!isEnglishSubject(sheet.subject)) continue
    for (const r of rows) {
      sheet.tests.forEach((t, i) => {
        const v = r.scores?.[i]
        if (typeof v !== 'number') return
        out.push({
          student: r.student_name,
          studentId: r.student_id,
          source: 'Пән тесті',
          test: `${sheet.name} · ${t.title}`,
          score: `${v}/${t.max}`,
          pct: t.max ? Math.round((v / t.max) * 100) : null,
          date: null,
        })
      })
    }
  }
  return out
}

// Бір көзде қате болса (кесте әлі жоқ т.б.), қалғандары бәрібір көрсетіледі
async function safe(name: string, fn: () => Promise<EnglishResult[]>): Promise<{ rows: EnglishResult[]; error?: string }> {
  try {
    return { rows: await fn() }
  } catch (e: any) {
    await logServerError(`english-results:${name}`, e)
    return { rows: [], error: `${name}: ${e?.message ?? e}` }
  }
}

export async function GET() {
  const [teacherId, admin] = await Promise.all([currentTeacherId(), isAdmin()])
  if (!teacherId && !admin) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  if (!admin && !(await isEnglishTeacher(teacherId))) {
    return NextResponse.json({ error: 'Тек ағылшын тілі мұғаліміне' }, { status: 403 })
  }
  const parts = await Promise.all([
    safe('IELTS/TOEFL/ҰБТ', ieltsResults),
    safe('Білім сынағы', bilimResults),
    safe('Пән тесттері', sheetResults),
  ])
  const results = parts.flatMap((p) => p.rows)
  const errors = parts.map((p) => p.error).filter(Boolean)
  return NextResponse.json({ results, errors }, { headers: { 'Cache-Control': 'no-store' } })
}
