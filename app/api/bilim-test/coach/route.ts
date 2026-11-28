import { NextRequest, NextResponse } from 'next/server'
import { currentStudent } from '@/lib/bilimTestAuth'
import { listGroups } from '@/lib/bilimTestStore'
import { countdown, seasonFor } from '@/lib/bilimSeason'
import { cleanMessages, coachAllowed, coachContext, coachSystem, firstName } from '@/lib/coach'
import { computeLevelUp, loadState } from '@/lib/levelUpServer'
import { askLLM, provider } from '@/lib/llm'
import { throttleCheck, throttleFail } from '@/lib/security'
import { logServerError } from '@/lib/serverLog'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Оқушының анықтамасы 5 минут кэште: әр хабарламада бүкіл статистиканы қайта есептемейміз
const ctxCache = new Map<string, { at: number; text: string }>()

async function access() {
  const me = await currentStudent()
  if (!me) return { err: NextResponse.json({ error: 'Кіру керек' }, { status: 401 }) }
  const group = (await listGroups()).find((g) => g.id === me.group_id)
  if (!coachAllowed(me.group_id, group?.name)) return { err: NextResponse.json({ error: 'Көмекші 6-сыныптың НЗМ тобына арналған' }, { status: 404 }) }
  return { me, group }
}

// GET: көмекші бар ма және сәлемдесу
export async function GET() {
  const a = await access()
  if (a.err) return a.err
  return NextResponse.json({ ok: true, ready: !!provider(), name: firstName(a.me!.full_name) })
}

export async function POST(req: NextRequest) {
  const a = await access()
  if (a.err) return a.err
  const me = a.me!
  if (!provider()) return NextResponse.json({ error: 'Көмекші әлі қосылмаған. Мұғаліміңе айт.' }, { status: 503 })
  const key = [`chat:bt:${me.id}`]
  if (await throttleCheck(key)) return NextResponse.json({ error: 'Бір сағатта тым көп сұрақ қойдың. Сәл демалып, кейінірек жаз.' }, { status: 429 })
  const messages = cleanMessages((await req.json().catch(() => null))?.messages)
  if (!messages.length) return NextResponse.json({ error: 'Сұрағыңды жаз' }, { status: 400 })
  await throttleFail(key) // әр хабарлама санауышқа қосылады

  try {
    let ctx = ctxCache.get(me.id)
    if (!ctx || Date.now() - ctx.at > 5 * 60_000) {
      const { data, week } = await computeLevelUp(me, await loadState(me.id))
      const season = seasonFor(me.group_id, a.group?.name)
      const left = season ? countdown(new Date(), new Date(season.examDate)) : null
      ctx = { at: Date.now(), text: coachContext({ name: me.full_name, data, week, examLabel: season?.examLabel, daysLeft: left && !left.done ? left.totalDays : null }) }
      ctxCache.set(me.id, ctx)
    }
    const answer = (await askLLM({ system: [coachSystem(ctx.text)], messages, maxTokens: 700, model: { anthropic: process.env.CHAT_MODEL ?? 'claude-haiku-5-5' } })).trim()
    return NextResponse.json({ answer })
  } catch (e) {
    await logServerError('coach', e)
    return NextResponse.json({ error: 'Көмекші қазір жауап бере алмады. Сәлден кейін қайта жаз.' }, { status: 502 })
  }
}
