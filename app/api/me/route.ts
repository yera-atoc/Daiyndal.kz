import { NextRequest, NextResponse } from 'next/server'
import { currentStudent } from '@/lib/ieltsServer'
import { cabinet, loginList } from '@/lib/cabinetServer'
import { db } from '@/lib/journalServer'
import { ISO, addDays, todayAlmaty } from '@/lib/journal'
import { privateUploadUrl } from '@/lib/privateFiles'
import { logServerError } from '@/lib/serverLog'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
const MIGRATE = 'Алдымен 20261110_01_student_cabinet.sql миграциясын іске қосыңыз'

// GET ?list=1 — кіру тізімі (топ → аттар, PIN жоқ); GET — кірген оқушының кабинеті
export async function GET(req: NextRequest) {
  try {
    if (req.nextUrl.searchParams.get('list')) return NextResponse.json({ groups: await loginList() }, { headers: { 'Cache-Control': 'no-store' } })
    const me = await currentStudent()
    if (!me) return bad('Кіру керек', 401)
    const c = await cabinet(me.id)
    if (!c) return bad('Оқушы табылмады', 404)
    return NextResponse.json(c, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    await logServerError('me', e)
    return bad(e.message, 500)
  }
}

// POST (оқушы):
//   hwUpload { classId, date, ext } — дәптер суретін жүктеуге рұқсат (жабық қойма)
//   hwSave   { classId, date, ref }
//   hwDelete { id }
export async function POST(req: NextRequest) {
  const me = await currentStudent()
  if (!me) return bad('Қайта кіріңіз', 401)
  try {
    const b = await req.json().catch(() => null)
    const sb = await db()
    if (b?.action === 'hwDelete') {
      const { data: f } = await sb.from('class_homework_files').select('id, student_id, created_at').eq('id', String(b.id ?? '')).maybeSingle()
      if (!f || f.student_id !== me.id) return bad('Табылмады', 404)
      await sb.from('class_homework_files').delete().eq('id', f.id)
      return NextResponse.json({ ok: true })
    }
    const classId = String(b?.classId ?? '')
    const date = String(b?.date ?? '')
    if (!ISO.test(date) || date < addDays(todayAlmaty(), -30) || date > todayAlmaty()) return bad('Күні дұрыс емес')
    const { data: mem } = await sb.from('teacher_class_students').select('class_id').eq('class_id', classId).eq('student_id', me.id).maybeSingle()
    if (!mem) return bad('Бұл топта жоқсыз', 403)
    const { data: l } = await sb.from('class_lessons').select('homework').eq('class_id', classId).eq('date', date).maybeSingle()
    if (!l?.homework) return bad('Бұл күні үй тапсырмасы берілмеген')
    const { count, error: cErr } = await sb.from('class_homework_files').select('id', { count: 'exact', head: true }).eq('class_id', classId).eq('student_id', me.id).eq('lesson_date', date)
    if (cErr) return bad(/class_homework_files/.test(cErr.message) ? MIGRATE : cErr.message, 500)
    if ((count ?? 0) >= 6) return bad('Бір тапсырмаға 6 суреттен көп болмайды')

    if (b.action === 'hwUpload') {
      const ext = ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(String(b.ext)) ? String(b.ext) : 'jpg'
      const up = await privateUploadUrl('homework', `homework/${classId}/${me.id}/${date}-${crypto.randomUUID().slice(0, 10)}.${ext}`)
      return NextResponse.json(up)
    }
    if (b.action === 'hwSave') {
      const ref = String(b.ref ?? '')
      if (!new RegExp(`^storage:(homework|speaking)/homework/${classId}/${me.id}/`).test(ref)) return bad('Файл дұрыс емес')
      const { data, error } = await sb.from('class_homework_files').insert({ class_id: classId, student_id: me.id, lesson_date: date, ref }).select('id').single()
      if (error) return bad(/class_homework_files/.test(error.message) ? MIGRATE : error.message, 500)
      return NextResponse.json({ ok: true, id: data.id })
    }
    return bad('Белгісіз әрекет')
  } catch (e: any) {
    await logServerError('me', e)
    return bad(e.message, 500)
  }
}
