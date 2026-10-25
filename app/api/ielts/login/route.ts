import { NextRequest, NextResponse } from 'next/server'
import { db, setStudent } from '@/lib/ieltsServer'
import { clientIp, lockedMessage, throttleCheck, throttleFail } from '@/lib/security'

// PIN тексеру: 5 рет қате енгізсе — 10 минутқа бұғатталады
export async function POST(req: NextRequest) {
  try {
    const b = await req.json().catch(() => null)
    const id = String(b?.studentId ?? '')
    const pin = String(b?.pin ?? '').trim()
    if (!/^\d{4}$/.test(pin)) return NextResponse.json({ error: 'PIN — 4 сан' }, { status: 400 })
    // Бір IP-ден көп оқушыға PIN теру (перебор) – IP бойынша бұғат
    const ipKey = [`ip:${clientIp(req.headers)}`]
    const wait = await throttleCheck(ipKey)
    if (wait) return NextResponse.json({ error: lockedMessage(wait) }, { status: 429 })
    const sb = await db()
    const { data: s } = await sb.from('students').select('id, ielts_pin, ielts_pin_fails, ielts_locked_until').eq('id', id).maybeSingle()
    if (!s || !s.ielts_pin) return NextResponse.json({ error: 'Оқушы табылмады' }, { status: 404 })
    if (s.ielts_locked_until && new Date(s.ielts_locked_until) > new Date())
      return NextResponse.json({ error: 'Тым көп қате. 10 минуттан кейін қайталаңыз немесе мұғалімнен жаңа PIN сұраңыз.' }, { status: 429 })
    if (s.ielts_pin !== pin) {
      await throttleFail(ipKey)
      const fails = (s.ielts_pin_fails ?? 0) + 1
      await sb.from('students').update(fails >= 5 ? { ielts_pin_fails: 0, ielts_locked_until: new Date(Date.now() + 600_000).toISOString() } : { ielts_pin_fails: fails }).eq('id', id)
      return NextResponse.json({ error: fails >= 5 ? 'Тым көп қате. 10 минуттан кейін қайталаңыз.' : 'PIN қате' }, { status: fails >= 5 ? 429 : 401 })
    }
    await sb.from('students').update({ ielts_pin_fails: 0, ielts_locked_until: null }).eq('id', id)
    await setStudent(id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
