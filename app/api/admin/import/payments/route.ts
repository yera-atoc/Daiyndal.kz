import { NextRequest, NextResponse } from 'next/server'
import { currentAdmin } from '@/lib/requireAdmin'
import { supabaseAdmin as sb } from '@/lib/supabaseAdmin'
import { normName, type SheetPayment } from '@/lib/sheetImport'
import { logServerError } from '@/lib/serverLog'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ISO = /^\d{4}-\d{2}-\d{2}$/
const plusMonth = (iso: string) => {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCMonth(d.getUTCMonth() + 1)
  return d.toISOString().slice(0, 10)
}

// Кестедегі төлемдер → crm_payments. Оқушы аты-жөні (және сыныбы) бойынша табылады; қайта жіберсе, екі рет жазылмайды.
export async function POST(req: NextRequest) {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  try {
    const b = await req.json().catch(() => null)
    const list: SheetPayment[] = (Array.isArray(b?.payments) ? b.payments : []).slice(0, 3000)
    const { data: studs, error } = await sb.from('students').select('id, full_name, grade, status, payment_date').neq('status', 'left')
    if (error) throw new Error(error.message)
    const byName = new Map<string, { id: string; full_name: string; grade: number | null; payment_date: string | null }[]>()
    for (const s of studs ?? []) {
      const k = normName(s.full_name)
      if (!byName.has(k)) byName.set(k, [])
      byName.get(k)!.push(s as any)
    }
    const { data: ex, error: e2 } = await sb.from('crm_payments').select('student_id, paid_on, amount').gte('paid_on', '2026-08-01')
    if (e2) throw new Error(e2.message)
    const have = new Set((ex ?? []).map((p) => `${p.student_id}|${p.paid_on}|${p.amount}`))

    const missing = new Set<string>()
    const ambiguous = new Set<string>()
    const rows: any[] = []
    const latest = new Map<string, { paidOn: string; amount: number }>()
    let skipped = 0
    for (const p of list) {
      const amount = Math.round(Number(p.amount))
      if (!ISO.test(String(p.paidOn)) || !(amount > 0)) continue
      let cands = byName.get(normName(String(p.name))) ?? []
      if (cands.length > 1 && p.grade) cands = cands.filter((c) => c.grade === p.grade)
      if (!cands.length) {
        missing.add(String(p.name))
        continue
      }
      if (cands.length > 1) {
        ambiguous.add(String(p.name))
        continue
      }
      const s = cands[0]
      const k = `${s.id}|${p.paidOn}|${amount}`
      if (have.has(k)) {
        skipped++
        continue
      }
      have.add(k)
      rows.push({ student_id: s.id, student_name: s.full_name, amount, paid_on: p.paidOn, period_end: plusMonth(p.paidOn), note: String(p.note ?? '').slice(0, 300) || null })
      const l = latest.get(s.id)
      if (!l || p.paidOn > l.paidOn) latest.set(s.id, { paidOn: p.paidOn, amount })
    }
    for (let i = 0; i < rows.length; i += 200) {
      const r = await sb.from('crm_payments').insert(rows.slice(i, i + 200))
      if (r.error) throw new Error(r.error.message)
    }
    // Оқушының соңғы төлемі мен келесі төлем күні (базадағысынан жаңа болса ғана)
    let updated = 0
    for (const [id, l] of Array.from(latest.entries())) {
      const s = (studs ?? []).find((x) => x.id === id)
      if (s?.payment_date && s.payment_date >= l.paidOn) continue
      const r = await sb.from('students').update({ payment_date: l.paidOn, payment_deadline: plusMonth(l.paidOn) }).eq('id', id)
      if (!r.error) updated++
    }
    return NextResponse.json({ ok: true, added: rows.length, skipped, updated, missing: Array.from(missing), ambiguous: Array.from(ambiguous) })
  } catch (e: any) {
    await logServerError('import-payments', e)
    return NextResponse.json({ error: e?.message ?? 'Қате' }, { status: 500 })
  }
}
