import { NextRequest, NextResponse } from 'next/server'
import { whoDetails } from '@/lib/anySession'
import { analyze, sanitize } from '@/lib/proctor'
import { clientIp } from '@/lib/security'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// Тест бақылауының есебі. Оқушы сессиясынан анықталады — басқа біреудің атынан жіберу мүмкін емес.
// audit_log кестесіне жазылады (action = 'proctor:<түрі>'), сондықтан жаңа кесте керек емес.
export async function POST(req: NextRequest) {
  const who = await whoDetails()
  if (!who) return NextResponse.json({ error: 'Кіру керек' }, { status: 401 })
  const b = await req.json().catch(() => null)
  const raw = sanitize(b?.raw)
  if (!raw) return NextResponse.json({ error: 'Дерек қате' }, { status: 400 })
  const kind = String(b?.kind ?? 'test').replace(/[^a-z0-9_-]/gi, '').slice(0, 20) || 'test'
  const partial = b?.partial === true
  const a = analyze(raw)
  if (partial && a.risk === 'ok') return NextResponse.json({ ok: true, risk: a.risk })
  await supabaseAdmin.from('audit_log').insert({
    actor: who.actor,
    action: `proctor:${kind}`,
    ip: clientIp(req.headers).slice(0, 64),
    detail: { ref: String(b?.ref ?? '').slice(0, 120), title: String(b?.title ?? '').slice(0, 160), name: who.name, partial, risk: a.risk, flags: a.flags, stats: a.stats, leaves: raw.leaves.slice(0, 30) },
  })
  return NextResponse.json({ ok: true, risk: a.risk })
}
