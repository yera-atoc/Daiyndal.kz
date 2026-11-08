import { NextRequest, NextResponse } from 'next/server'
import { ISO, addDays, todayAlmaty } from '@/lib/journal'
import { canSee, db, getClass, journalWho } from '@/lib/journalServer'
import { lessonView, recordPayment, saveLesson, todayItems } from '@/lib/lessonServer'
import { askLLM, friendlyError, provider } from '@/lib/llm'
import { parseQuestions } from '@/lib/aiTest'
import { throttleCheck, throttleFail } from '@/lib/security'
import { logServerError } from '@/lib/serverLog'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
export const maxDuration = 60

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
const MIGRATE = 'Алдымен 20261109_01_lesson_flow.sql миграциясын іске қосыңыз'

async function actorName(who: { admin: boolean; teacherId: string | null }) {
  if (who.admin && !who.teacherId) return 'әкімші'
  const { data } = await (await db()).from('teachers').select('name').eq('id', who.teacherId!).maybeSingle()
  return data?.name ?? 'мұғалім'
}

// GET               — бүгінгі сабақтар (?date= басқа күн)
// GET ?class=&date= — бір сабақтың экраны
export async function GET(req: NextRequest) {
  const who = await journalWho()
  if (!who) return bad('Кіру керек', 401)
  try {
    const sp = req.nextUrl.searchParams
    const d = sp.get('date') ?? ''
    const date = ISO.test(d) ? d : todayAlmaty()
    const quizId = sp.get('quiz')
    if (quizId) {
      const { data: q } = await (await db()).from('class_quizzes').select('id, class_id, date, topic, questions, open').eq('id', quizId).maybeSingle()
      const c = q ? await getClass(q.class_id) : null
      if (!c || !canSee(who, c)) return bad('Тест табылмады', 404)
      return NextResponse.json({ ...q, className: c.name, subject: c.subject })
    }
    const classId = sp.get('class')
    if (!classId) return NextResponse.json({ date, items: await todayItems(who, date) }, { headers: { 'Cache-Control': 'no-store' } })
    const c = await getClass(classId)
    if (!c || !canSee(who, c)) return bad('Топ табылмады', 404)
    const { data: t } = await (await db()).from('teachers').select('name').eq('id', c.teacher_id).maybeSingle()
    return NextResponse.json(await lessonView(c, date, t?.name ?? ''), { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    if (/class_plan|class_homework|class_quiz|plan_id/.test(e.message)) return bad(MIGRATE, 500)
    await logServerError('lesson', e)
    return bad(e.message, 500)
  }
}

// POST:
//   save  { classId, date, topic, homework, planId, attendance:{sid:status}, homeworkMarks:{sid:mark|null} }
//   pay   { classId, studentId, amount?, method }
//   quiz  { classId, date, topic, count? }   — ИИ сабақ тесті
//   quizClose { quizId, open }
export async function POST(req: NextRequest) {
  const who = await journalWho()
  if (!who) return bad('Кіру керек', 401)
  try {
    const b = await req.json().catch(() => null)
    const sb = await db()
    if (b?.action === 'quizClose') {
      const { data: q } = await sb.from('class_quizzes').select('id, class_id').eq('id', String(b.quizId ?? '')).maybeSingle()
      const c = q ? await getClass(q.class_id) : null
      if (!c || !canSee(who, c)) return bad('Тест табылмады', 404)
      const { error } = await sb.from('class_quizzes').update({ open: !!b.open }).eq('id', q!.id)
      if (error) return bad(error.message, 500)
      return NextResponse.json({ ok: true })
    }
    const c = await getClass(String(b?.classId ?? ''))
    if (!c || !canSee(who, c)) return bad('Топ табылмады', 404)
    const date = String(b?.date ?? todayAlmaty())
    if (!ISO.test(date)) return bad('Күні дұрыс емес')
    if (date > addDays(todayAlmaty(), 14)) return bad('Болашақ күнге белгі қоюға болмайды')

    if (b.action === 'save') return NextResponse.json(await saveLesson(c, date, who.actor, b))

    if (b.action === 'pay') return NextResponse.json(await recordPayment(c, String(b.studentId ?? ''), who.actor, await actorName(who), b))

    if (b.action === 'quiz') {
      if (!provider()) return bad('ИИ кілті орнатылмаған (Vercel-де ANTHROPIC_API_KEY немесе GEMINI_API_KEY)', 503)
      const topic = String(b.topic ?? '').trim().slice(0, 300)
      if (!topic) return bad('Алдымен сабақ тақырыбын жазыңыз')
      const key = [`lesson-quiz:${who.teacherId ?? 'admin'}`]
      if (await throttleCheck(key)) return bad('Бір сағатта тым көп тест құрастырылды. Кейінірек көріңіз.', 429)
      await throttleFail(key)
      const count = Math.min(15, Math.max(3, Number(b.count) || 8))
      const prompt = `«${c.subject ?? ''}» пәні, топ: «${c.name}». Сабақ тақырыбы: «${topic}».
Осы тақырыпты бекітуге ${count} тест сұрағын құрастыр: оңайдан қиынға қарай, сабақта өтілгенді тексеретін.
Тілі: топ атауы мен пәнге қарай (ағылшын пәні болса — ағылшынша, орыс сыныбы болса — орысша, әйтпесе — қазақша, әдеби, қатесіз).
Әр сұрақта 4 нұсқа, тек біреуі дұрыс, дұрыс жауаптың орны әртүрлі. Есеп болса — сандары нақты, жауабы тексерілген.
ТЕК JSON массивін қайтар: [{"question":"...","options":["...","...","...","..."],"correct":0}]`
      let text = ''
      try {
        text = await askLLM({ system: ['Сен — тәжірибелі мұғалім және тест құрастырушысың. Сұрақтарың нақты, бір мағыналы, жауабы дұрыс.'], messages: [{ role: 'user', content: prompt }], maxTokens: 4000 })
      } catch (e) {
        return bad(friendlyError(e), 502)
      }
      const qs = parseQuestions(text, count).map((q) => ({ q: q.questionText, options: q.options, correct: q.correctIndex }))
      if (!qs.length) return bad('ИИ дұрыс форматта жауап бермеді. Қайта басып көріңіз.', 502)
      const { data, error } = await sb.from('class_quizzes').insert({ class_id: c.id, date, topic, questions: qs, open: true }).select('id').single()
      if (error) return bad(/class_quizzes/.test(error.message) ? MIGRATE : error.message, 500)
      return NextResponse.json({ ok: true, id: data.id, questions: qs })
    }
    return bad('Белгісіз әрекет')
  } catch (e: any) {
    if (e.status) return bad(e.message, e.status)
    if (/class_plan|class_homework|class_quiz|plan_id/.test(e.message)) return bad(MIGRATE, 500)
    await logServerError('lesson', e)
    return bad(e.message, 500)
  }
}
