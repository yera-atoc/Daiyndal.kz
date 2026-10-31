import { NextRequest, NextResponse } from 'next/server'
import { leadLimit, saveLead } from '@/lib/leads'
import { normPhone } from '@/lib/trialTests'

export const dynamic = 'force-dynamic'

// Сайттағы «Онлайн жазылу» формасы
export async function POST(req: NextRequest) {
  try {
    const b = await req.json().catch(() => null)
    if (!b || b.website) return NextResponse.json({ ok: true }) // бот (жасырын өріс толтырылған)
    const name = String(b.child_name ?? '').trim()
    const phone = normPhone(b.phone)
    if (name.length < 2) return NextResponse.json({ error: 'Баланың атын жазыңыз' }, { status: 400 })
    if (!phone) return NextResponse.json({ error: 'Телефон нөмірін дұрыс жазыңыз: +7 7XX XXX XX XX' }, { status: 400 })
    const { wait, ip } = await leadLimit(req.headers)
    if (wait) return NextResponse.json({ error: `Өтінім тым көп. ${wait} минуттан кейін қайталаңыз немесе WhatsApp-қа жазыңыз.` }, { status: 429 })
    await saveLead(ip, { source: 'form', child_name: name, phone, grade: b.grade, parent_name: b.parent_name, direction: b.direction, comment: b.comment })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Жіберілмеді. WhatsApp арқылы жазыңыз.' }, { status: 500 })
  }
}
