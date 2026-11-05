import { NextRequest, NextResponse } from 'next/server'
import { currentStudent, db, getAttempt, getTest, staff, canEdit } from '@/lib/ieltsServer'
import { aiAvailable, gradeSpeaking, gradeWriting, transcribeAudio, type AiResult, type SpeakingTask, type WritingTask } from '@/lib/aiGrade'
import { AI_LIMITS, BANKS, findTopic } from '@/lib/aiTopics'
import { friendlyError } from '@/lib/llm'
import { logServerError } from '@/lib/serverLog'
import { PRIVATE_BUCKET, REF_PREFIX } from '@/lib/speakingStorage'
import type { Attempt, IeltsTest } from '@/lib/ielts'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
const W_TASKS: WritingTask[] = ['task1', 'task2', 'email', 'discussion']
const S_TASKS: SpeakingTask[] = ['part1', 'part2', 'part3', 'interview', 'repeat']

function dayStart() {
  const d = new Date(Date.now() + 5 * 3600e3)
  d.setUTCHours(0, 0, 0, 0)
  return new Date(d.getTime() - 5 * 3600e3).toISOString()
}

async function usage(studentId: string) {
  const sb = await db()
  const { data } = await sb.from('ai_practice').select('kind').eq('student_id', studentId).gte('created_at', dayStart())
  const used = { writing: 0, speaking: 0 }
  for (const r of data ?? []) used[r.kind as 'writing' | 'speaking']++
  return used
}

// GET ?exam=ielts|toefl — тапсырмалар қоры, тарих, күнделікті шек
export async function GET(req: NextRequest) {
  const me = await currentStudent()
  if (!me) return bad('Кіру керек', 401)
  const exam = req.nextUrl.searchParams.get('exam') === 'toefl' ? 'toefl' : 'ielts'
  const sb = await db()
  const { data, error } = await sb
    .from('ai_practice')
    .select('id, created_at, kind, task, prompt, answer, seconds, band, result')
    .eq('student_id', me.id)
    .eq('exam', exam)
    .order('created_at', { ascending: false })
    .limit(30)
  return NextResponse.json({
    available: aiAvailable(),
    ready: !error, // кесте жоқ болса — миграция қолданылмаған
    banks: BANKS[exam],
    history: data ?? [],
    used: error ? { writing: 0, speaking: 0 } : await usage(me.id),
    limits: AI_LIMITS,
  })
}

type Ai = { writing?: Record<string, AiResult>; speaking?: Record<string, AiResult>; at?: string; error?: string }

/** Mock тапсырудың Writing/Speaking бөлімдерін ИИ-мен бағалау → scores.ai */
async function gradeAttempt(a: Attempt, t: IeltsTest): Promise<Ai> {
  const exam = t.exam === 'toefl' ? 'toefl' : 'ielts'
  const ai: Ai = { writing: {}, speaking: {}, at: new Date().toISOString() }
  const jobs: Promise<void>[] = []
  if (a.state.order.includes('writing')) {
    for (const k of ['task1', 'task2'] as const) {
      const text = a.writing?.[k] ?? ''
      const task = t.content.writing?.[k]
      if (!task?.prompt || text.trim().split(/\s+/).length < 15) continue
      const wt: WritingTask = exam === 'toefl' ? (k === 'task1' ? 'email' : 'discussion') : k
      jobs.push(gradeWriting({ exam, task: wt, prompt: task.prompt, text, variant: t.variant, imageNote: task.image ? 'image' : undefined }).then((r) => void (ai.writing![k] = r)))
    }
  }
  if (a.state.order.includes('speaking')) {
    const parts = t.content.speaking?.parts ?? []
    const sb = await db()
    for (let pi = 0; pi < parts.length; pi++) {
      const p = parts[pi]
      const qs = exam === 'ielts' && pi === 1 ? [p.cueCard || p.questions[0] || ''] : p.questions
      for (let qi = 0; qi < qs.length; qi++) {
        const key = `p${pi + 1}q${qi}`
        let transcript = (a.speaking?.[`${key}t`] ?? '').trim()
        const secs = Number(a.speaking?.[`${key}s`]) || (exam === 'toefl' ? p.limit ?? 45 : pi === 1 ? 120 : 45)
        const ref = a.speaking?.[key]
        if (!transcript && ref?.startsWith(REF_PREFIX)) {
          // Браузер мәтінге айналдыра алмаған болса — Gemini арқылы (кілт болса)
          const dl = await sb.storage.from(PRIVATE_BUCKET).download(ref.slice(REF_PREFIX.length))
          if (dl.data) transcript = (await transcribeAudio(await dl.data.arrayBuffer(), dl.data.type || 'audio/webm')) ?? ''
        }
        if (!transcript) continue
        const st: SpeakingTask = exam === 'toefl' ? (p.hideText ? 'repeat' : 'interview') : pi === 0 ? 'part1' : pi === 1 ? 'part2' : 'part3'
        jobs.push(gradeSpeaking({ exam, task: st, question: qs[qi] || p.title, transcript, seconds: secs }).then((r) => void (ai.speaking![key] = r)))
      }
    }
  }
  const res = await Promise.allSettled(jobs)
  const fail = res.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined
  if (fail && !Object.keys(ai.writing!).length && !Object.keys(ai.speaking!).length) throw fail.reason
  if (fail) ai.error = friendlyError(fail.reason)
  return ai
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null)
  if (!aiAvailable()) return bad('ИИ кілті орнатылмаған (Vercel: ANTHROPIC_API_KEY не GEMINI_API_KEY).', 503)
  try {
    // Mock тапсыру: оқушының өзі (аяқталған соң) не мұғалім
    if (b?.action === 'attempt') {
      const a = await getAttempt(String(b.id ?? ''))
      const t = a && (await getTest(a.test_id))
      if (!a || !t || t.content.ubt) return bad('Табылмады', 404)
      const me = await currentStudent()
      const who = me?.id === a.student_id ? null : await staff()
      if (me?.id !== a.student_id && !(who && canEdit(who, t))) return bad('Рұқсат жоқ', 403)
      if (a.status === 'in_progress') return bad('Тест әлі аяқталмаған')
      const prev = (a.scores as any)?.ai as Ai | undefined
      if (prev?.at && !b.force) return NextResponse.json({ ai: prev })
      if (prev?.at && !who) return NextResponse.json({ ai: prev }) // қайта бағалауды тек мұғалім
      const ai = await gradeAttempt(a, t)
      const sb = await db()
      const { data: fresh } = await sb.from('ielts_attempts').select('scores').eq('id', a.id).single()
      await sb.from('ielts_attempts').update({ scores: { ...(fresh?.scores ?? a.scores), ai } }).eq('id', a.id)
      return NextResponse.json({ ai })
    }

    // Тренажёр
    const me = await currentStudent()
    if (!me) return bad('Кіру керек', 401)
    const exam = b?.exam === 'toefl' ? 'toefl' : 'ielts'
    const kind = b?.kind === 'speaking' ? 'speaking' : 'writing'
    const task = String(b?.task ?? '')
    if (kind === 'writing' ? !W_TASKS.includes(task as WritingTask) : !S_TASKS.includes(task as SpeakingTask)) return bad('Тапсырма түрі қате')
    const found = findTopic(exam, kind, task, String(b?.topicId ?? ''))
    const custom = String(b?.custom ?? '').trim().slice(0, 3000)
    const prompt = found?.topic?.text ?? custom
    if (!prompt) return bad('Тапсырманы таңдаңыз')
    const answer = String(b?.answer ?? '').trim().slice(0, 12000)
    const n = answer.split(/\s+/).filter(Boolean).length
    if (n < (kind === 'writing' ? 30 : 3)) return bad(kind === 'writing' ? 'Кемінде 30 сөз жазыңыз' : 'Сөйлеу танылмады. Қайта жазып көріңіз.')

    const used = await usage(me.id)
    if (used[kind] >= AI_LIMITS[kind]) return bad(`Бүгінгі шек таусылды (${AI_LIMITS[kind]}). Ертең қайта тексеріңіз.`, 429)

    const seconds = Math.min(600, Math.max(0, Math.round(Number(b?.seconds) || 0)))
    const result =
      kind === 'writing'
        ? await gradeWriting({ exam, task: task as WritingTask, prompt, text: answer, variant: 'general' })
        : await gradeSpeaking({ exam, task: task as SpeakingTask, question: prompt, transcript: answer, seconds, target: found?.topic?.target })
    const sb = await db()
    const { data, error } = await sb
      .from('ai_practice')
      .insert({ student_id: me.id, exam, kind, task, prompt: found?.topic?.target ? `${prompt}\n${found.topic.target}` : prompt, answer, seconds: seconds || null, band: result.band, result })
      .select('id, created_at')
      .single()
    if (error) return bad(/does not exist|schema cache/i.test(error.message) ? 'ИИ-тренажёр кестесі әлі жасалмаған (миграция).' : error.message, 500)
    return NextResponse.json({ id: data.id, created_at: data.created_at, result, used: { ...used, [kind]: used[kind] + 1 } })
  } catch (e: any) {
    await logServerError('ielts/ai', e)
    return bad(friendlyError(e), 500)
  }
}
