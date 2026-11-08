import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/requireAdmin'
import { db, randomPin } from '@/lib/ieltsServer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

// GET — топтар және оқушылардың PIN-дері (тек әкімшіге, карточка басып шығару үшін)
export async function GET() {
  if (!(await isAdmin())) return bad('Рұқсат жоқ', 401)
  const sb = await db()
  const [st, gr] = await Promise.all([
    sb.from('students').select('id, full_name, group_id, ielts_pin, status').neq('status', 'left').order('full_name'),
    sb.from('student_groups').select('id, name').order('name'),
  ])
  if (st.error) return bad(st.error.message, 500)
  const students = (st.data ?? []).map((s: any) => ({ id: s.id, name: String(s.full_name).replace(/[)\s]+$/, ''), group: s.group_id ?? null, pin: s.ielts_pin ?? null }))
  return NextResponse.json({ groups: gr.data ?? [], students })
}

// POST { groupId | 'all' } — PIN-і жоқ оқушыларға PIN беру (бар PIN өзгермейді)
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return bad('Рұқсат жоқ', 401)
  const b = await req.json().catch(() => null)
  const sb = await db()
  let q = sb.from('students').select('id').is('ielts_pin', null).neq('status', 'left')
  if (b?.groupId && b.groupId !== 'all') q = b.groupId === 'none' ? q.is('group_id', null) : q.eq('group_id', String(b.groupId))
  const { data, error } = await q
  if (error) return bad(error.message, 500)
  for (const s of data ?? []) await sb.from('students').update({ ielts_pin: randomPin() }).eq('id', s.id)
  return NextResponse.json({ ok: true, made: (data ?? []).length })
}
