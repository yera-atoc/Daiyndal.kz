import { NextRequest, NextResponse } from 'next/server'
import { currentStudent } from '@/lib/bilimTestAuth'
import { listGroups } from '@/lib/bilimTestStore'
import { isNishGroup, levelEvent } from '@/lib/levelUp'
import { SUBJECTS, computeLevelUp, loadState, saveState, type State } from '@/lib/levelUpServer'

export const dynamic = 'force-dynamic'

async function guard() {
  const me = await currentStudent()
  if (!me) return { err: NextResponse.json({ error: 'Кіру керек' }, { status: 401 }) }
  const groupName = (await listGroups()).find((g) => g.id === me.group_id)?.name
  if (!isNishGroup(me.group_id, groupName)) return { err: NextResponse.json({ error: 'Бұл бөлім НИШ тобына арналған' }, { status: 404 }) }
  return { me }
}

// НИШ оқушысының «Менің деңгейім» статтары: тек өзінікі
export async function GET() {
  try {
    const g = await guard()
    if (g.err) return g.err
    const me = g.me!
    const state = await loadState(me.id)
    const { data, board, week } = await computeLevelUp(me, state)
    // Жүйе хабарламасы: соңғы көрген деңгейден өсті ме (бірінші кіргенде — тек есте сақтаймыз)
    let event = null
    if (data && state) {
      event = levelEvent(state.seen_level ? { level: state.seen_level, rank: state.seen_rank } : null, { level: data.level, rank: data.rank.id })
      if (!state.seen_level) await saveState(me.id, { ...state, seen_level: data.level, seen_rank: data.rank.id }).catch(() => {})
    }
    return NextResponse.json({ name: me.full_name, data, board, week, event, stored: !!state }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// action: 'seen' — хабарламаны жабу; 'alloc' — пәнге 1 ұпай салу; 'reset' — ұпайларды қайта бөлу
export async function POST(req: NextRequest) {
  try {
    const g = await guard()
    if (g.err) return g.err
    const me = g.me!
    const state = await loadState(me.id)
    if (!state) return NextResponse.json({ error: 'Деңгей кестесі әлі жоқ: Supabase-те 20261104_03_levelup.sql іске қосу керек' }, { status: 503 })
    const body = await req.json().catch(() => null)
    const { data } = await computeLevelUp(me, state)
    if (!data) return NextResponse.json({ error: 'Нәтиже әлі жоқ' }, { status: 400 })
    const next: State = { ...state, points: { ...(state.points ?? {}) } }
    if (body?.action === 'seen') {
      next.seen_level = data.level
      next.seen_rank = data.rank.id
    } else if (body?.action === 'alloc') {
      const sub = String(body?.subject ?? '')
      if (!SUBJECTS.includes(sub)) return NextResponse.json({ error: 'Пән қате' }, { status: 400 })
      if (data.points.free <= 0) return NextResponse.json({ error: 'Бос ұпай жоқ. Келесі деңгейде тағы беріледі' }, { status: 400 })
      next.points[sub] = (next.points[sub] ?? 0) + 1
    } else if (body?.action === 'reset') {
      next.points = {}
    } else return NextResponse.json({ error: 'Белгісіз әрекет' }, { status: 400 })
    await saveState(me.id, next)
    const out = await computeLevelUp(me, next)
    return NextResponse.json({ name: me.full_name, ...out, event: null, stored: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
