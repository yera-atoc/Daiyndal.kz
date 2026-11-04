import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/requireAdmin'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { ROOMS } from '@/lib/rooms'

export const dynamic = 'force-dynamic'

// Сабақтың кабинетін ауыстыру. all — сол мұғалім/топтың осы уақыттағы барлық күндері (Дс/Ср/Жм бірге)
export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  const b = await req.json().catch(() => null)
  const room = String(b?.room ?? '')
  if (!ROOMS.some((r) => r.id === room)) return NextResponse.json({ error: 'Кабинет қате' }, { status: 400 })
  const { data: slot, error } = await supabaseAdmin
    .from('schedule_slots')
    .select('id, teacher_id, group_id, start_time, end_time')
    .eq('id', String(b?.id ?? ''))
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!slot) return NextResponse.json({ error: 'Сабақ табылмады' }, { status: 404 })
  let q = supabaseAdmin.from('schedule_slots').update({ room })
  if (b?.all) {
    q = q.eq('teacher_id', slot.teacher_id).eq('start_time', slot.start_time).eq('end_time', slot.end_time)
    q = slot.group_id ? q.eq('group_id', slot.group_id) : q.is('group_id', null)
  } else q = q.eq('id', slot.id)
  const r = await q.select('id')
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
  return NextResponse.json({ ok: true, updated: r.data?.length ?? 0 })
}
