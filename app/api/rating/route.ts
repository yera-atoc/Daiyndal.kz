import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Public leaderboard — no login required. Only shows the fields families
// already see on a school notice board: name, grade, teacher/subject,
// points. Never selects login/contact/payment fields.
export async function GET(req: NextRequest) {
  const limitParam = req.nextUrl.searchParams.get('limit')
  const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 100)

  const { data, error } = await supabaseAdmin
    .from('students')
    .select('id, full_name, grade, rating_points, teachers(name, subject)')
    .order('rating_points', { ascending: false })
    .order('full_name')
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
