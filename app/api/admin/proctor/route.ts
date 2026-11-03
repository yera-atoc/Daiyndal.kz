import { NextRequest, NextResponse } from 'next/server'
import { currentAdmin } from '@/lib/requireAdmin'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// Тест бақылауының журналы (әкімшіге): соңғы 400 тапсыру
export async function GET(req: NextRequest) {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  const days = Math.min(90, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 14))
  const since = new Date(Date.now() - days * 86400e3).toISOString()
  const { data, error } = await supabaseAdmin
    .from('audit_log')
    .select('id, at, actor, action, detail')
    .like('action', 'proctor:%')
    .gte('at', since)
    .order('at', { ascending: false })
    .limit(400)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rows: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}
