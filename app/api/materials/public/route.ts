import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { whoIsLoggedIn } from '@/lib/anySession'

// Материалдар тізімі — тек кірген адамдарға (оқушы, мұғалім, әкімші). Бәсекелестер көшіріп алмауы үшін
// бөгде адамға ештеңе көрсетілмейді; файлдардың өзі /api/files арқылы уақытша сілтемемен беріледі.
// It only ever SELECTs from `materials` + the teacher's public name/subject
// — never password_hash/password_salt (see app/api/teachers/route.ts for
// why those are excluded from any response that isn't admin-only).
export async function GET(req: NextRequest) {
  if (!(await whoIsLoggedIn())) return NextResponse.json({ error: 'login' }, { status: 401 })
  const subject = req.nextUrl.searchParams.get('subject')
  const teacherId = req.nextUrl.searchParams.get('teacherId')

  let query = supabaseAdmin
    .from('materials')
    .select('id, title, subject, description, url, created_at, teacher_id, teachers(name)')
    .order('created_at', { ascending: false })

  if (subject) query = query.eq('subject', subject)
  if (teacherId) query = query.eq('teacher_id', teacherId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
