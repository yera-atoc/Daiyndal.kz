import { NextRequest, NextResponse } from 'next/server'
import { canSee, db, getClass, journalWho, listClasses } from '@/lib/journalServer'
import { getPlan } from '@/lib/lessonServer'
import { parsePlan } from '@/lib/lesson'
import { TEMPLATES, buildPlan, pickTemplate, templateById } from '@/lib/ktp'
import { todayAlmaty } from '@/lib/journal'
import { askLLM, friendlyError, provider } from '@/lib/llm'
import { throttleCheck, throttleFail } from '@/lib/security'
import { logServerError } from '@/lib/serverLog'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
export const maxDuration = 60

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
const MIGRATE = 'Алдымен 20261109_01_lesson_flow.sql миграциясын іске қосыңыз'

// GET ?class= — КТП тақырыптары; ?class= болмаса — топтар және әрқайсысының КТП саны (көшіру үшін)
export async function GET(req: NextRequest) {
  const who = await journalWho()
  if (!who) return bad('Кіру керек', 401)
  try {
    const classId = req.nextUrl.searchParams.get('class')
    if (classId) {
      const c = await getClass(classId)
      if (!c || !canSee(who, c)) return bad('Топ табылмады', 404)
      const { data: used } = await (await db()).from('class_lessons').select('plan_id, date').eq('class_id', c.id).not('plan_id', 'is', null)
      const dates = new Map((used ?? []).map((u) => [u.plan_id, u.date]))
      const sug = pickTemplate(c.subject, c.name)
      return NextResponse.json({
        class: c,
        items: (await getPlan(c.id)).map((p) => ({ ...p, date: dates.get(p.id) ?? null })),
        perWeek: c.days.length || 2,
        suggest: sug ? { id: sug.id, title: sug.title } : null,
        templates: TEMPLATES.map((t) => ({ id: t.id, title: t.title })),
      })
    }
    const classes = (await listClasses(who)).filter((c) => c.active)
    const ids = classes.map((c) => c.id)
    const sb = await db()
    const { data } = ids.length ? await sb.from('class_plan').select('class_id').in('class_id', ids) : { data: [] as any[] }
    const tids = Array.from(new Set(classes.map((c) => c.teacher_id)))
    const { data: ts } = tids.length > 1 ? await sb.from('teachers').select('id, name').in('id', tids) : { data: [] as any[] }
    const tName = new Map((ts ?? []).map((t: any) => [t.id, t.name as string]))
    return NextResponse.json({ classes: classes.map((c) => ({ id: c.id, name: c.name, subject: c.subject, teacher: tName.get(c.teacher_id) ?? null, count: (data ?? []).filter((p) => p.class_id === c.id).length })) })
  } catch (e: any) {
    if (/class_plan|plan_id/.test(e.message)) return bad(MIGRATE, 500)
    return bad(e.message, 500)
  }
}

// POST:
//   save { classId, items:[{id?, topic, homework}] } — бүкіл КТП-ны осы тізіммен ауыстыру (бар id-лер сақталады)
//   parse { text } — мәтінді тақырыптарға бөліп қайтару (сақтамайды)
//   ai { classId, grade, count, notes } — ИИ КТП құрастырады (сақтамайды)
//   copy { classId, fromClassId } — басқа топтың КТП-сын көшіру (тізімді қайтарады, сақтамайды)
export async function POST(req: NextRequest) {
  const who = await journalWho()
  if (!who) return bad('Кіру керек', 401)
  try {
    const b = await req.json().catch(() => null)
    if (b?.action === 'parse') return NextResponse.json({ items: parsePlan(String(b.text ?? '').slice(0, 100_000)) })
    const c = await getClass(String(b?.classId ?? ''))
    if (!c || !canSee(who, c)) return bad('Топ табылмады', 404)
    const sb = await db()

    // Үлгі КТП: топтың аптасына сабақ санына бейімделеді (сақтамайды — алдын ала қарау)
    if (b.action === 'template') {
      const t = templateById(String(b.templateId ?? '')) ?? pickTemplate(c.subject, c.name)
      if (!t) return bad('Лайық үлгі табылмады — тізімнен таңдаңыз')
      return NextResponse.json({ template: { id: t.id, title: t.title }, items: buildPlan(t, c.days.length || 2, todayAlmaty()).map((x) => ({ topic: x.topic, homework: x.homework })) })
    }

    if (b.action === 'copy') {
      const from = await getClass(String(b.fromClassId ?? ''))
      if (!from || !canSee(who, from)) return bad('Топ табылмады', 404)
      return NextResponse.json({ items: (await getPlan(from.id)).map((p) => ({ topic: p.topic, homework: p.homework })) })
    }

    if (b.action === 'ai') {
      if (!provider()) return bad('ИИ кілті орнатылмаған (Vercel-де ANTHROPIC_API_KEY немесе GEMINI_API_KEY)', 503)
      const key = [`lesson-plan:${who.teacherId ?? 'admin'}`]
      if (await throttleCheck(key)) return bad('Бір сағатта тым көп сұраныс. Кейінірек көріңіз.', 429)
      await throttleFail(key)
      const count = Math.min(120, Math.max(4, Number(b.count) || 32))
      const grade = String(b.grade ?? '').slice(0, 30)
      const notes = String(b.notes ?? '').slice(0, 600)
      const prompt = `Оқу орталығындағы топқа күнтізбелік-тақырыптық жоспар (КТП) құрастыр.
Пән: «${c.subject ?? ''}». Топ: «${c.name}»${grade ? `, сынып/деңгей: ${grade}` : ''}. Сабақ саны: ${count}.
${notes ? `Мұғалімнің талабы: ${notes}\n` : ''}Қазақстанның мектеп бағдарламасына және топ мақсатына (НЗМ/БИЛ/ҰБТ/IELTS дайындығы болса — сол емтихан форматына) сай, оңайдан қиынға.
Әр 6–8 сабақтан кейін бір «Қайталау және бөлім бойынша тест» сабағы болсын.
Әр сабаққа: қысқа нақты тақырып және үй тапсырмасы (1 сөйлем). Тілі: пәнге қарай (ағылшын — ағылшынша, әйтпесе қазақша).
ТЕК JSON массивін қайтар, дәл ${count} элемент: [{"topic":"...","homework":"..."}]`
      let text = ''
      try {
        text = await askLLM({ system: ['Сен — тәжірибелі әдіскер-мұғалімсің. Жоспарың нақты, жүйелі және орындалатын.'], messages: [{ role: 'user', content: prompt }], maxTokens: 8000 })
      } catch (e) {
        return bad(friendlyError(e), 502)
      }
      let arr: any[] = []
      try {
        arr = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1))
      } catch {}
      const items = (Array.isArray(arr) ? arr : [])
        .map((x) => ({ topic: String(x?.topic ?? '').trim().slice(0, 300), homework: String(x?.homework ?? '').trim().slice(0, 500) || null }))
        .filter((x) => x.topic)
        .slice(0, count)
      if (!items.length) return bad('ИИ дұрыс форматта жауап бермеді. Қайта басып көріңіз.', 502)
      return NextResponse.json({ items })
    }

    if (b.action === 'save') {
      const raw: any[] = Array.isArray(b.items) ? b.items.slice(0, 400) : []
      const items = raw
        .map((x, i) => ({ id: typeof x?.id === 'string' && /^[0-9a-f-]{36}$/i.test(x.id) ? x.id : null, topic: String(x?.topic ?? '').trim().slice(0, 300), homework: String(x?.homework ?? '').trim().slice(0, 500) || null, position: i }))
        .filter((x) => x.topic)
      const old = await getPlan(c.id)
      const keep = new Set(items.map((x) => x.id).filter(Boolean))
      const gone = old.filter((o) => !keep.has(o.id)).map((o) => o.id)
      if (gone.length) {
        const { error } = await sb.from('class_plan').delete().in('id', gone)
        if (error) return bad(error.message, 500)
      }
      const oldIds = new Set(old.map((o) => o.id))
      const upd = items.filter((x) => x.id && oldIds.has(x.id)).map((x) => ({ id: x.id!, class_id: c.id, position: x.position, topic: x.topic, homework: x.homework }))
      const ins = items.filter((x) => !x.id || !oldIds.has(x.id)).map((x) => ({ class_id: c.id, position: x.position, topic: x.topic, homework: x.homework }))
      if (upd.length) {
        const { error } = await sb.from('class_plan').upsert(upd)
        if (error) return bad(error.message, 500)
      }
      if (ins.length) {
        const { error } = await sb.from('class_plan').insert(ins)
        if (error) return bad(error.message, 500)
      }
      return NextResponse.json({ ok: true, count: items.length })
    }
    return bad('Белгісіз әрекет')
  } catch (e: any) {
    if (/class_plan|plan_id/.test(e.message)) return bad(MIGRATE, 500)
    await logServerError('lesson/plan', e)
    return bad(e.message, 500)
  }
}
