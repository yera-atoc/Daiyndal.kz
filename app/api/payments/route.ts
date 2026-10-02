import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isAdmin } from '@/lib/requireAdmin'

// GET /api/payments?from=YYYY-MM-DD&to=YYYY-MM-DD — admin only
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }
  const from = req.nextUrl.searchParams.get('from')
  const to = req.nextUrl.searchParams.get('to')

  let q = supabaseAdmin
    .from('payments')
    .select('id, student_id, student_name, amount, paid_on, period_end, note')
    .order('paid_on', { ascending: false })
    .limit(5000)
  if (from) q = q.gte('paid_on', from)
  if (to) q = q.lte('paid_on', to)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
