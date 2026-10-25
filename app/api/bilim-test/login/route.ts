import { NextRequest, NextResponse } from 'next/server'
import { checkPin } from '@/lib/bilimTestStore'
import { setStudentSession } from '@/lib/bilimTestAuth'
import { clientIp, lockedMessage, throttleCheck, throttleFail } from '@/lib/security'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const id = String(body?.studentId ?? '')
    const pin = String(body?.pin ?? '').trim()
    if (!/^\d{4}$/.test(pin)) return NextResponse.json({ error: 'PIN — 4 сан' }, { status: 400 })
    const ipKey = [`ip:${clientIp(req.headers)}`]
    const wait = await throttleCheck(ipKey)
    if (wait) return NextResponse.json({ error: lockedMessage(wait) }, { status: 429 })
    const res = await checkPin(id, pin)
    if (res === 'wrong' || res === 'locked') await throttleFail(ipKey)
    if (res === 'missing') return NextResponse.json({ error: 'Оқушы табылмады' }, { status: 404 })
    if (res === 'locked')
      return NextResponse.json({ error: 'Тым көп қате. 10 минуттан кейін қайталаңыз немесе мұғалімнен жаңа PIN сұраңыз.' }, { status: 429 })
    if (res === 'wrong') return NextResponse.json({ error: 'PIN қате' }, { status: 401 })
    await setStudentSession(id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
