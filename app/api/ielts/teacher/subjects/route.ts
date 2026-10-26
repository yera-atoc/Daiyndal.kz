import { NextRequest, NextResponse } from 'next/server'
import { db, randomPin, staff } from '@/lib/ieltsServer'
import { listSheets } from '@/lib/subjectStore'
import { logServerError } from '@/lib/serverLog'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

// Пән тесттерінің парақтары (мұғалім/админ): тізім және оқушылар (байланыстыру үшін)
export async function GET() {
  const who = await staff()
  if (!who) return bad('Мұғалім ретінде кіріңіз', 401)
  try {
    const sb = await db()
    const [sheets, { data: students }] = await Promise.all([
      listSheets(),
      sb.from('students').select('id, full_name, grade, ielts_pin, status').neq('status', 'left').order('full_name'),
    ])
    return NextResponse.json({ sheets, students: students ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    if (/subject_(sheets|rows)/.test(e.message)) return bad('Алдымен 20261026_04_subject_tests.sql миграциясын іске қосыңыз', 500)
    return bad(e.message, 500)
  }
}

// action: save — парақ пен оның барлық жолдарын сақтау; delete — парақты өшіру
export async function POST(req: NextRequest) {
  const who = await staff()
  if (!who) return bad('Мұғалім ретінде кіріңіз', 401)
  try {
    const b = await req.json().catch(() => null)
    const sb = await db()
    if (b?.action === 'delete') {
      const { error } = await sb.from('subject_sheets').delete().eq('id', String(b.id))
      if (error) return bad(error.message, 500)
      return NextResponse.json({ ok: true })
    }
    if (b?.action !== 'save') return bad('Белгісіз әрекет')
    const sh = b.sheet ?? {}
    const subject = String(sh.subject ?? '').trim().slice(0, 60)
    const name = String(sh.name ?? '').trim().slice(0, 80)
    if (!subject || !name) return bad('Пән мен парақ атауын жазыңыз')
    const tests = (Array.isArray(sh.tests) ? sh.tests : [])
      .slice(0, 30)
      .map((t: any, i: number) => ({ title: String(t?.title ?? '').trim().slice(0, 40) || `${i + 1}-тест`, max: Math.max(1, Math.min(1000, Math.round(Number(t?.max) || 0))) }))
    if (!tests.length) return bad('Кемінде бір тест керек')
    const grade = sh.grade === null || sh.grade === '' || sh.grade === undefined ? null : Math.round(Number(sh.grade)) || null
    const seen = new Set<string>()
    const rows = (Array.isArray(b.rows) ? b.rows : [])
      .map((r: any, i: number) => ({
        student_id: typeof r?.student_id === 'string' && /^[0-9a-f-]{36}$/i.test(r.student_id) ? r.student_id : null,
        student_name: String(r?.student_name ?? '').trim().slice(0, 80),
        scores: tests.map((t: any, k: number) => {
          const v = r?.scores?.[k]
          const n = v === null || v === undefined || v === '' ? null : Math.round(Number(v))
          return n === null || !Number.isFinite(n) || n < 0 || n > t.max ? null : n
        }),
        position: i,
      }))
      .filter((r: any) => r.student_name && !seen.has(r.student_name) && seen.add(r.student_name))

    // Басқа сыныптағы оқушыға қате байланбасын (мысалы, 11 сынып парағына 5 сынып оқушысы)
    if (grade) {
      const ids = rows.map((r: any) => r.student_id).filter(Boolean)
      if (ids.length) {
        const { data: gs } = await sb.from('students').select('id, grade').in('id', ids)
        const bad = new Set((gs ?? []).filter((s: any) => s.grade !== null && s.grade !== undefined && Number(s.grade) !== grade).map((s: any) => s.id))
        for (const r of rows) if (r.student_id && bad.has(r.student_id)) r.student_id = null
      }
    }

    const row = { subject, name, grade, tests, position: Math.round(Number(sh.position) || 0) }
    let id = typeof sh.id === 'string' && sh.id ? sh.id : null
    if (id) {
      const { error } = await sb.from('subject_sheets').update(row).eq('id', id)
      if (error) return bad(error.message, 500)
    } else {
      const { data, error } = await sb.from('subject_sheets').insert({ ...row, teacher_id: who.teacherId }).select('id').single()
      if (error) return bad(error.message, 500)
      id = data.id as string
    }
    const del = await sb.from('subject_rows').delete().eq('sheet_id', id)
    if (del.error) return bad(del.error.message, 500)
    if (rows.length) {
      const ins = await sb.from('subject_rows').insert(rows.map((r: any) => ({ ...r, sheet_id: id })))
      if (ins.error) return bad(ins.error.message, 500)
    }
    // Кабинетке кіруі үшін PIN-і жоқ оқушыға PIN беру
    const linked = rows.map((r: any) => r.student_id).filter(Boolean)
    if (linked.length) {
      const { data: noPin } = await sb.from('students').select('id').in('id', linked).is('ielts_pin', null)
      for (const s of noPin ?? []) await sb.from('students').update({ ielts_pin: randomPin() }).eq('id', s.id)
    }
    return NextResponse.json({ ok: true, id })
  } catch (e: any) {
    await logServerError('ielts/teacher/subjects', e)
    return bad(e.message, 500)
  }
}
