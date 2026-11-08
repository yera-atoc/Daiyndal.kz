import { NextRequest, NextResponse } from 'next/server'
import { checkPin } from '@/lib/bilimTestStore'
import { setStudentSession } from '@/lib/bilimTestAuth'
import { setStudent } from '@/lib/ieltsServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { clientIp, lockedMessage, throttleCheck, throttleFail } from '@/lib/security'

// Тек Білім тексерудегі оқушының кіруі (CRM оқушысы /api/ielts/login арқылы кіреді)
export async function POST(req: NextRequest) {
  try {
    const b = await req.json().catch(() => null)
    const id = String(b?.studentId ?? '')
    const pin = String(b?.pin ?? '').trim()
    if (!/^\d{4}$/.test(pin)) return NextResponse.json({ error: 'PIN — 4 сан' }, { status: 400 })
    const ipKey = [`ip:${clientIp(req.headers)}`]
    const wait = await throttleCheck(ipKey)
    if (wait) return NextResponse.json({ error: lockedMessage(wait) }, { status: 429 })
    const res = await checkPin(id, pin)
    if (res === 'ok') {
      await setStudentSession(id)
      const { data: crm } = await supabaseAdmin.from('students').select('id').eq('bt_student_id', id).limit(1).maybeSingle()
      if (crm?.id) await setStudent(crm.id)
      return NextResponse.json({ ok: true })
    }
    await throttleFail(ipKey)
    if (res === 'locked') return NextResponse.json({ error: 'Тым көп қате. 10 минуттан кейін қайталаңыз.' }, { status: 429 })
    if (res === 'missing') return NextResponse.json({ error: 'Оқушы табылмады' }, { status: 404 })
    return NextResponse.json({ error: 'PIN қате' }, { status: 401 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
