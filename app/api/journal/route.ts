import { NextRequest, NextResponse } from 'next/server'
import { ISO, addDays, weekStartOf, weekStats, todayAlmaty, type AttStatus } from '@/lib/journal'
import { canSee, db, getClass, journalWho, listClasses, syncCrmAttendance, weekDetails } from '@/lib/journalServer'
import { logServerError } from '@/lib/serverLog'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
const txt = (v: unknown, max = 4000) => (typeof v === 'string' && v.trim() ? v.slice(0, max) : null)
const STATUSES: AttStatus[] = ['present', 'absent', 'excused', 'late']

// GET ?week=YYYY-MM-DD[&class=<id>][&teacher=<id>]
//   class берілсе — сол топтың апталық журналы; әйтпесе — топтар тізімі және аптаның толтырылуы
export async function GET(req: NextRequest) {
  const who = await journalWho()
  if (!who) return bad('Кіру керек', 401)
  try {
    const sp = req.nextUrl.searchParams
    const w = sp.get('week') ?? ''
    const week = weekStartOf(ISO.test(w) ? w : todayAlmaty())
    const classId = sp.get('class')
    if (classId) {
      const c = await getClass(classId)
      if (!c || !canSee(who, c)) return bad('Топ табылмады', 404)
      const [d] = await weekDetails([c], week)
      return NextResponse.json({ ...d, admin: who.admin }, { headers: { 'Cache-Control': 'no-store' } })
    }
    const classes = await listClasses(who, sp.get('teacher'))
    const details = await weekDetails(classes.filter((c) => c.active), week)
    return NextResponse.json(
      {
        admin: who.admin,
        weekStart: week,
        classes: details.map((d) => ({ class: d.class, teacher: d.teacher, students: d.students.length, stats: weekStats(d), week: d.week })),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e: any) {
    if (/teacher_classes|class_/.test(e.message)) return bad('Алдымен 20261026_05_class_journal.sql миграциясын іске қосыңыз', 500)
    return bad(e.message, 500)
  }
}

// POST — мұғалім (өз тобы) немесе әкімші:
//   week   { classId, weekStart, topic, homework, note }
//   lesson { classId, date, topic, homework }
//   day    { classId, date, on }          — бұл аптада сабақ болды/болмады
//   att    { classId, date, studentId, status|null }
//   attAll { classId, date, status }       — белгіленбегендердің бәріне
export async function POST(req: NextRequest) {
  const who = await journalWho()
  if (!who) return bad('Кіру керек', 401)
  try {
    const b = await req.json().catch(() => null)
    const c = await getClass(String(b?.classId ?? ''))
    if (!c || !canSee(who, c)) return bad('Топ табылмады', 404)
    const sb = await db()
    const now = new Date().toISOString()
    const date = String(b?.date ?? '')
    const needDate = () => {
      if (!ISO.test(date)) throw Object.assign(new Error('Күні дұрыс емес'), { status: 400 })
      // Тым алыс болашаққа белгі қоюға болмайды (қате басуды болдырмау)
      if (date > addDays(todayAlmaty(), 14)) throw Object.assign(new Error('Болашақ күнге белгі қоюға болмайды'), { status: 400 })
    }
    const members = async () => {
      const { data } = await sb.from('teacher_class_students').select('student_id').eq('class_id', c.id)
      return new Set((data ?? []).map((m) => m.student_id as string))
    }

    switch (b?.action) {
      case 'week': {
        const ws = String(b.weekStart ?? '')
        if (!ISO.test(ws) || weekStartOf(ws) !== ws) return bad('Апта дұрыс емес')
        const { error } = await sb.from('class_weeks').upsert({ class_id: c.id, week_start: ws, topic: txt(b.topic), homework: txt(b.homework), note: txt(b.note, 2000), updated_at: now, updated_by: who.actor })
        if (error) return bad(error.message, 500)
        return NextResponse.json({ ok: true, at: now })
      }
      case 'lesson': {
        needDate()
        const { data: old } = await sb.from('class_lessons').select('cancelled').eq('class_id', c.id).eq('date', date).maybeSingle()
        const { error } = await sb.from('class_lessons').upsert({ class_id: c.id, date, topic: txt(b.topic, 1000), homework: txt(b.homework, 2000), cancelled: old?.cancelled ?? false, updated_at: now, updated_by: who.actor })
        if (error) return bad(error.message, 500)
        return NextResponse.json({ ok: true, at: now })
      }
      case 'day': {
        needDate()
        const { error } = await sb.from('class_lessons').upsert({ class_id: c.id, date, cancelled: !b.on, updated_at: now, updated_by: who.actor })
        if (error) return bad(error.message, 500)
        if (!b.on) {
          // Сабақ болмаса — сол күнгі белгілер де өшеді
          const { data: gone } = await sb.from('class_attendance').delete().eq('class_id', c.id).eq('date', date).select('student_id')
          await syncCrmAttendance((gone ?? []).map((g) => g.student_id), date)
        }
        return NextResponse.json({ ok: true })
      }
      case 'att': {
        needDate()
        const sid = String(b.studentId ?? '')
        if (!(await members()).has(sid)) return bad('Оқушы бұл топта жоқ', 403)
        if (b.status === null) {
          const { error } = await sb.from('class_attendance').delete().eq('class_id', c.id).eq('student_id', sid).eq('date', date)
          if (error) return bad(error.message, 500)
        } else {
          if (!STATUSES.includes(b.status)) return bad('Белгі дұрыс емес')
          const { error } = await sb.from('class_attendance').upsert({ class_id: c.id, student_id: sid, date, status: b.status, updated_at: now })
          if (error) return bad(error.message, 500)
        }
        await syncCrmAttendance([sid], date)
        return NextResponse.json({ ok: true })
      }
      case 'attAll': {
        needDate()
        if (!STATUSES.includes(b.status)) return bad('Белгі дұрыс емес')
        const ids = Array.from(await members())
        const { data: have } = await sb.from('class_attendance').select('student_id').eq('class_id', c.id).eq('date', date)
        const done = new Set((have ?? []).map((h) => h.student_id))
        const rows = ids.filter((id) => !done.has(id)).map((student_id) => ({ class_id: c.id, student_id, date, status: b.status, updated_at: now }))
        if (rows.length) {
          const { error } = await sb.from('class_attendance').upsert(rows)
          if (error) return bad(error.message, 500)
          await syncCrmAttendance(rows.map((r) => r.student_id), date)
        }
        return NextResponse.json({ ok: true, n: rows.length })
      }
    }
    return bad('Белгісіз әрекет')
  } catch (e: any) {
    if (e.status === 400) return bad(e.message)
    await logServerError('journal', e)
    return bad(e.message, 500)
  }
}
