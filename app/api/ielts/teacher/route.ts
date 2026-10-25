import { NextRequest, NextResponse } from 'next/server'
import { canEdit, db, getAttempt, getTest, randomPin, staff } from '@/lib/ieltsServer'
import { overallBand, speakingBand, toeflOverall, toeflSpeakingBand, toeflWritingBand, writingBand, type Attempt, type IeltsTest, type Scores } from '@/lib/ielts'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

// GET — мұғалімнің кабинеті: тесттер, оқушылар, рұқсаттар, тапсырулар.
//   ?test=<id>    — тесттің толық мазмұны (жауаптарымен)
//   ?attempt=<id> — тексеруге: тапсырудың толық деректері
export async function GET(req: NextRequest) {
  const who = await staff()
  if (!who) return bad('Мұғалім ретінде кіріңіз', 401)
  const sb = await db()
  const testId = req.nextUrl.searchParams.get('test')
  const attemptId = req.nextUrl.searchParams.get('attempt')

  if (testId) {
    const t = await getTest(testId)
    if (!t || !canEdit(who, t)) return bad('Тест табылмады', 404)
    return NextResponse.json(t)
  }
  if (attemptId) {
    const a = await getAttempt(attemptId)
    const t = a && (await getTest(a.test_id))
    if (!a || !t || !canEdit(who, t)) return bad('Табылмады', 404)
    const { data: st } = await sb.from('students').select('id, full_name').eq('id', a.student_id).maybeSingle()
    return NextResponse.json({ attempt: a, test: t, student: st })
  }

  // exam бағаны migration_toefl.sql іске қосылғанға дейін болмауы мүмкін
  const listTests = async (cols: string, withUbt: boolean) => {
    let tq = sb.from('ielts_tests').select(cols).order('created_at', { ascending: false })
    if (!who.admin) tq = withUbt ? tq.or(`teacher_id.eq.${who.teacherId},exam.eq.ubt`) : tq.eq('teacher_id', who.teacherId!)
    return tq
  }
  let { data: tests, error } = (await listTests('id, teacher_id, title, exam, variant, mode, published, created_at, updated_at', true)) as { data: any[] | null; error: any }
  if (error && /exam/.test(error.message)) ({ data: tests, error } = (await listTests('id, teacher_id, title, variant, mode, published, created_at, updated_at', false)) as { data: any[] | null; error: any })
  if (error) return bad(error.message, 500)
  const ids = (tests ?? []).map((t) => t.id)
  const [teacher, students, groups, access, attempts] = await Promise.all([
    who.teacherId ? sb.from('teachers').select('id, name, subject').eq('id', who.teacherId).maybeSingle() : Promise.resolve({ data: null }),
    sb.from('students').select('id, full_name, group_id, grade, status, ielts_pin').neq('status', 'left').order('full_name'),
    sb.from('student_groups').select('id, name').order('name'),
    ids.length ? sb.from('ielts_access').select('test_id, student_id, attempts_allowed').in('test_id', ids) : Promise.resolve({ data: [] }),
    ids.length
      ? sb.from('ielts_attempts').select('id, test_id, student_id, status, scores, published, started_at, submitted_at, graded_at').in('test_id', ids).order('started_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])
  return NextResponse.json({
    me: { admin: who.admin, teacher: teacher.data },
    tests: tests ?? [],
    students: students.data ?? [],
    groups: groups.data ?? [],
    access: access.data ?? [],
    attempts: attempts.data ?? [],
  })
}

const clip = (v: unknown, n: number) => String(v ?? '').slice(0, n)
// https:// сілтеме немесе сайттың өз файлы (/ielts-media/...)
const url = (v: unknown) => (/^(https:\/\/[^\s"'<>]{4,600}|\/ielts-media\/[\w.-]{1,120})$/.test(String(v ?? '')) ? String(v) : undefined)
const num = (v: unknown, lo: number, hi: number, d: number) => Math.min(hi, Math.max(lo, Math.round(Number(v)) || d))

function cleanGroups(gs: any): any[] {
  return (Array.isArray(gs) ? gs : []).slice(0, 20).map((g: any) => ({
    type: ['mcq', 'tfng', 'ynng', 'gap', 'matching', 'cloze', 'order'].includes(g?.type) ? g.type : 'gap',
    instructions: clip(g?.instructions, 1000),
    ...(g?.text ? { text: clip(g.text, 6000) } : {}),
    ...(Array.isArray(g?.options) ? { options: g.options.slice(0, 15).map((o: any) => clip(o, 300)) } : {}),
    items: (Array.isArray(g?.items) ? g.items : []).slice(0, 40).map((it: any) => ({
      n: num(it?.n, 1, 80, 1),
      prompt: clip(it?.prompt, 1000),
      ...(Array.isArray(it?.options) ? { options: it.options.slice(0, 20).map((o: any) => clip(o, 300)) } : {}),
      answer: clip(it?.answer, 300),
    })),
  }))
}

function cleanContent(c: any) {
  return {
    listening: {
      audio: url(c?.listening?.audio),
      minutes: num(c?.listening?.minutes, 5, 90, 32),
      parts: (c?.listening?.parts ?? []).slice(0, 12).map((p: any) => ({ title: clip(p?.title, 120), groups: cleanGroups(p?.groups) })),
    },
    reading: {
      minutes: num(c?.reading?.minutes, 5, 120, 60),
      passages: (c?.reading?.passages ?? []).slice(0, 12).map((p: any) => ({ title: clip(p?.title, 200), text: clip(p?.text, 20000), groups: cleanGroups(p?.groups) })),
    },
    writing: {
      minutes: num(c?.writing?.minutes, 5, 120, 60),
      task1: { prompt: clip(c?.writing?.task1?.prompt, 3000), image: url(c?.writing?.task1?.image), minWords: num(c?.writing?.task1?.minWords, 50, 400, 150) },
      task2: { prompt: clip(c?.writing?.task2?.prompt, 3000), minWords: num(c?.writing?.task2?.minWords, 50, 500, 250) },
      ...(Array.isArray(c?.writing?.build) && c.writing.build.length ? { build: cleanGroups(c.writing.build) } : {}),
    },
    speaking: {
      parts: (c?.speaking?.parts ?? []).slice(0, 4).map((p: any) => ({
        title: clip(p?.title, 120),
        questions: (Array.isArray(p?.questions) ? p.questions : []).slice(0, 15).map((q: any) => clip(q, 500)).filter(Boolean),
        ...(p?.cueCard !== undefined ? { cueCard: clip(p.cueCard, 1500) } : {}),
        ...(Array.isArray(p?.audios) ? { audios: p.audios.slice(0, 15).map(url) } : {}),
        ...(p?.hideText ? { hideText: true } : {}),
        ...(p?.limit ? { limit: num(p.limit, 5, 180, 45) } : {}),
      })),
    },
  }
}

export async function POST(req: NextRequest) {
  const who = await staff()
  if (!who) return bad('Мұғалім ретінде кіріңіз', 401)
  const sb = await db()
  const b = await req.json().catch(() => null)
  const action = b?.action

  try {
    if (action === 'save-test') {
      const t = b.test ?? {}
      const title = clip(t.title, 120).trim()
      if (title.length < 2) return bad('Тесттің атын жазыңыз')
      const row = {
        title,
        exam: t.exam === 'toefl' ? 'toefl' : 'ielts',
        variant: t.variant === 'general' ? 'general' : 'academic',
        mode: t.mode === 'practice' ? 'practice' : 'exam',
        content: cleanContent(t.content),
        published: !!t.published,
        updated_at: new Date().toISOString(),
      }
      // ҰБТ тесттерінің мазмұны тек SQL арқылы жүктеледі: мұнда атауы, режимі, ашықтығы ғана өзгереді
      if (t.id) {
        const old0 = await getTest(String(t.id))
        if (old0?.content?.ubt) {
          if (!canEdit(who, old0)) return bad('Тест табылмады', 404)
          const { error } = await sb.from('ielts_tests').update({ title: row.title, mode: row.mode, published: row.published, updated_at: row.updated_at }).eq('id', old0.id)
          if (error) return bad(error.message, 500)
          return NextResponse.json({ ok: true, id: old0.id })
        }
      }
      if (t.exam === 'ubt') return bad('ҰБТ тесттері SQL арқылы қосылады')
      if (row.exam === 'ielts' && t.exam !== 'toefl') delete (row as Partial<typeof row>).exam // ескі базамен үйлесімділік
      if (t.id) {
        const old = await getTest(String(t.id))
        if (!old || !canEdit(who, old)) return bad('Тест табылмады', 404)
        const { error } = await sb.from('ielts_tests').update(row).eq('id', old.id)
        if (error) return bad(error.message, 500)
        return NextResponse.json({ ok: true, id: old.id })
      }
      const { data, error } = await sb.from('ielts_tests').insert({ ...row, teacher_id: who.teacherId }).select('id').single()
      if (error) return bad(error.message, 500)
      return NextResponse.json({ ok: true, id: data.id })
    }

    if (action === 'delete-test') {
      const t = await getTest(String(b.id))
      if (!t || !canEdit(who, t)) return bad('Тест табылмады', 404)
      if (t.exam === 'ubt' && !who.admin) return bad('ҰБТ тестін тек әкімші өшіре алады', 403)
      const { error } = await sb.from('ielts_tests').delete().eq('id', t.id)
      if (error) return bad(error.message, 500)
      return NextResponse.json({ ok: true })
    }

    // Тестке рұқсат берілген оқушылар тізімін толық ауыстыру
    if (action === 'set-access') {
      const t = await getTest(String(b.testId))
      if (!t || !canEdit(who, t)) return bad('Тест табылмады', 404)
      const ids: string[] = (Array.isArray(b.studentIds) ? b.studentIds : []).map(String).slice(0, 500)
      const tries = num(b.attemptsAllowed, 1, 20, 1)
      const { error: e1 } = await sb.from('ielts_access').delete().eq('test_id', t.id)
      if (e1) return bad(e1.message, 500)
      if (ids.length) {
        const { error: e2 } = await sb.from('ielts_access').insert(ids.map((id) => ({ test_id: t.id, student_id: id, attempts_allowed: tries })))
        if (e2) return bad(e2.message, 500)
        // PIN-і жоқтарға код беру
        const { data: noPin } = await sb.from('students').select('id').in('id', ids).is('ielts_pin', null)
        for (const s of noPin ?? []) await sb.from('students').update({ ielts_pin: randomPin() }).eq('id', s.id)
      }
      return NextResponse.json({ ok: true })
    }

    if (action === 'reset-pin') {
      const { error } = await sb.from('students').update({ ielts_pin: randomPin(), ielts_pin_fails: 0, ielts_locked_until: null }).eq('id', String(b.studentId))
      if (error) return bad(error.message, 500)
      return NextResponse.json({ ok: true })
    }

    // Writing/Speaking бағалау, пікір, нәтижені оқушыға көрсету
    if (action === 'grade') {
      const a = await getAttempt(String(b.attemptId))
      const t = a && (await getTest(a.test_id))
      if (!a || !t || !canEdit(who, t)) return bad('Табылмады', 404)
      const band = (v: unknown) => {
        const n = Number(v)
        return v === '' || v === null || v === undefined || Number.isNaN(n) ? null : Math.min(9, Math.max(0, Math.round(n * 2) / 2))
      }
      const crit = (o: any, keys: string[]) => Object.fromEntries(keys.map((k) => [k, band(o?.[k])]))
      const scores: Scores = { ...a.scores }
      if (t.content.ubt) {
        // ҰБТ: балл автоматты, мұнда тек пікір мен жариялау
      } else if (t.exam === 'toefl') {
        const b16 = (v: unknown) => {
          const n = Number(v)
          return v === '' || v === null || v === undefined || Number.isNaN(n) ? null : Math.min(6, Math.max(1, Math.round(n * 2) / 2))
        }
        if (a.state.order.includes('writing')) {
          const w = { ...scores.writing, email: b16(b.writing?.email), discussion: b16(b.writing?.discussion) }
          scores.writing = { ...w, band: toeflWritingBand(w) }
        }
        if (a.state.order.includes('speaking')) {
          const sp = { repeat: b16(b.speaking?.repeat), interview: b16(b.speaking?.interview) }
          scores.speaking = { ...sp, band: toeflSpeakingBand(sp) }
        }
        scores.overall = toeflOverall(scores, a.state.order)
      } else {
      if (a.state.order.includes('writing')) {
        const w = { task1: crit(b.writing?.task1, ['ta', 'cc', 'lr', 'gra']), task2: crit(b.writing?.task2, ['ta', 'cc', 'lr', 'gra']) }
        scores.writing = { ...w, band: writingBand(w) }
      }
      if (a.state.order.includes('speaking')) {
        const s = { criteria: crit(b.speaking?.criteria, ['fc', 'lr', 'gra', 'p']) }
        scores.speaking = { ...s, band: speakingBand(s) }
      }
      scores.overall = overallBand(scores, a.state.order)
      }
      const complete = t.content.ubt ? true : scores.overall !== null
      const patch: Partial<Attempt> = {
        scores,
        feedback: { writing: clip(b.feedback?.writing, 4000), speaking: clip(b.feedback?.speaking, 4000), general: clip(b.feedback?.general, 4000) },
        published: !!b.publish,
        ...(complete && a.status !== 'in_progress' ? { status: 'graded', graded_at: new Date().toISOString() } : {}),
      }
      const { error } = await sb.from('ielts_attempts').update(patch).eq('id', a.id)
      if (error) return bad(error.message, 500)
      return NextResponse.json({ ok: true, overall: scores.overall })
    }

    // Тапсыруды өшіру — оқушы қайта бастай алады
    if (action === 'delete-attempt') {
      const a = await getAttempt(String(b.attemptId))
      const t = a && (await getTest(a.test_id))
      if (!a || !t || !canEdit(who, t)) return bad('Табылмады', 404)
      const { error } = await sb.from('ielts_attempts').delete().eq('id', a.id)
      if (error) return bad(error.message, 500)
      return NextResponse.json({ ok: true })
    }

    // Аудио/сурет жүктеу: браузер файлды тікелей Supabase Storage-ке салады
    if (action === 'upload-url') {
      const safe = String(b.fileName ?? 'file').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80)
      const path = `ielts/${who.teacherId ?? 'admin'}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safe}`
      const { data, error } = await sb.storage.from('materials').createSignedUploadUrl(path)
      if (error) return bad(error.message, 500)
      const { data: pub } = sb.storage.from('materials').getPublicUrl(path)
      return NextResponse.json({ path: data.path, token: data.token, publicUrl: pub.publicUrl })
    }

    return bad('Белгісіз әрекет')
  } catch (e: any) {
    return bad(e.message, 500)
  }
}
