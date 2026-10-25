import { NextRequest, NextResponse } from 'next/server'
import { canWrite, catchUp, currentStudent, db, deadline, finishSection, getAttempt, getTest, newState } from '@/lib/ieltsServer'
import { sectionItems, stripAnswers, type Attempt } from '@/lib/ielts'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

async function load(id: string, studentId: string) {
  const a = await getAttempt(id)
  if (!a || a.student_id !== studentId) return null
  const t = await getTest(a.test_id)
  if (!t) return null
  return { a: await catchUp(t, a), t }
}

function view(a: Attempt, t: Awaited<ReturnType<typeof getTest>>) {
  const sec = a.state.order[a.state.current]
  const review = a.published
  return {
    attempt: {
      id: a.id,
      status: a.status,
      state: a.state,
      answers: a.answers,
      writing: a.writing,
      speaking: a.speaking,
      published: a.published,
      scores: a.published ? a.scores : { listening: a.scores?.listening, reading: a.scores?.reading },
      feedback: a.published ? a.feedback : {},
    },
    test: { id: t!.id, title: t!.title, exam: t!.exam ?? 'ielts', variant: t!.variant, mode: t!.mode, content: review ? t!.content : stripAnswers(t!.content) },
    now: Date.now(),
    deadline: sec ? deadline(t!, a, sec) : null,
  }
}

// GET ?id= — тапсыруды жалғастыру (уақыты өткен бөлімдер өзі аяқталады)
export async function GET(req: NextRequest) {
  const me = await currentStudent()
  if (!me) return bad('Кіру керек', 401)
  const r = await load(req.nextUrl.searchParams.get('id') ?? '', me.id)
  if (!r) return bad('Табылмады', 404)
  return NextResponse.json(view(r.a, r.t), { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
  const me = await currentStudent()
  if (!me) return bad('Қайта кіріңіз', 401)
  const sb = await db()
  const b = await req.json().catch(() => null)
  const action = b?.action
  try {
    if (action === 'start') {
      const t = await getTest(String(b.testId))
      if (!t || !t.published) return bad('Тест табылмады', 404)
      const { data: acc } = await sb.from('ielts_access').select('attempts_allowed').eq('test_id', t.id).eq('student_id', me.id).maybeSingle()
      if (!acc) return bad('Бұл тестке рұқсат жоқ', 403)
      const { data: prev } = await sb.from('ielts_attempts').select('id, status').eq('test_id', t.id).eq('student_id', me.id)
      const open = prev?.find((p) => p.status === 'in_progress')
      if (open) return NextResponse.json({ ok: true, id: open.id })
      if ((prev?.length ?? 0) >= acc.attempts_allowed) return bad('Тапсыру саны біткен. Мұғалімге хабарласыңыз.', 403)
      const state = newState(t)
      if (!state.order.length) return bad('Тест әлі толтырылмаған', 400)
      const { data, error } = await sb.from('ielts_attempts').insert({ test_id: t.id, student_id: me.id, state }).select('id').single()
      if (error) return bad(error.message, 500)
      return NextResponse.json({ ok: true, id: data.id })
    }

    const r = await load(String(b?.id ?? ''), me.id)
    if (!r) return bad('Табылмады', 404)
    const { a, t } = r

    // Жауаптарды сақтау (әр бірнеше секунд сайын)
    if (action === 'save') {
      const sec = String(b.section)
      if (!canWrite(t, a, sec as any)) return NextResponse.json({ ok: false, reason: 'closed', ...view(a, t) })
      if (sec === 'listening' || sec === 'reading') {
        const valid = new Set(sectionItems(t.content, sec).map((it) => String(it.n)))
        const ans: Record<string, string> = {}
        for (const [k, v] of Object.entries(b.answers ?? {})) if (valid.has(k)) ans[k] = String(v ?? '').slice(0, 200)
        const { error } = await sb.from('ielts_attempts').update({ answers: { ...a.answers, [sec]: ans } }).eq('id', a.id)
        if (error) return bad(error.message, 500)
      } else if (sec === 'writing') {
        const w = { task1: String(b.writing?.task1 ?? '').slice(0, 20000), task2: String(b.writing?.task2 ?? '').slice(0, 20000) }
        const patch: Record<string, unknown> = { writing: w }
        // TOEFL Build a Sentence жауаптары
        if (b.build && typeof b.build === 'object') {
          const valid = new Set(sectionItems(t.content, 'build').map((it) => String(it.n)))
          const ans: Record<string, string> = {}
          for (const [k, v] of Object.entries(b.build)) if (valid.has(k)) ans[k] = String(v ?? '').slice(0, 300)
          patch.answers = { ...a.answers, build: ans }
        }
        const { error } = await sb.from('ielts_attempts').update(patch).eq('id', a.id)
        if (error) return bad(error.message, 500)
      }
      return NextResponse.json({ ok: true })
    }

    // Бөлімді аяқтау → келесісіне өту
    if (action === 'finish') {
      if (a.status !== 'in_progress') return NextResponse.json(view(a, t))
      if (b.section && a.state.order[a.state.current] !== b.section) return NextResponse.json(view(a, t)) // басқа қойындыдан қайталанған
      const next = await finishSection(t, a)
      return NextResponse.json(view(next, t))
    }

    // Speaking: жазбаны жүктеуге рұқсат
    if (action === 'speaking-url') {
      if (!canWrite(t, a, 'speaking')) return bad('Speaking бөлімі ашық емес', 403)
      const key = String(b.key ?? '').replace(/[^a-z0-9]/gi, '').slice(0, 10)
      const ext = ['webm', 'ogg', 'mp4', 'm4a'].includes(b.ext) ? b.ext : 'webm'
      const path = `ielts/speaking/${a.id}/${key}-${crypto.randomUUID().slice(0, 12)}.${ext}`
      const { data, error } = await sb.storage.from('materials').createSignedUploadUrl(path)
      if (error) return bad(error.message, 500)
      const { data: pub } = sb.storage.from('materials').getPublicUrl(path)
      return NextResponse.json({ path: data.path, token: data.token, publicUrl: pub.publicUrl })
    }
    if (action === 'speaking-save') {
      if (!canWrite(t, a, 'speaking')) return bad('Speaking бөлімі ашық емес', 403)
      const key = String(b.key ?? '').replace(/[^a-z0-9]/gi, '').slice(0, 10)
      const u = String(b.url ?? '')
      if (!u.includes(`/ielts/speaking/${a.id}/`)) return bad('Жазба дұрыс емес')
      const { error } = await sb.from('ielts_attempts').update({ speaking: { ...a.speaking, [key]: u } }).eq('id', a.id)
      if (error) return bad(error.message, 500)
      return NextResponse.json({ ok: true })
    }

    return bad('Белгісіз әрекет')
  } catch (e: any) {
    return bad(e.message, 500)
  }
}
