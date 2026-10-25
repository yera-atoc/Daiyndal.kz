import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { clientIp } from '@/lib/security'

// Браузердегі қателерді жинау (өз Sentry-іміз). Бір IP-ден 10 минутта 20-дан көп емес.
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null)
  if (!b?.message) return NextResponse.json({ ok: false }, { status: 400 })
  const ip = clientIp(req.headers)
  const since = new Date(Date.now() - 10 * 60_000).toISOString()
  const { count, error } = await supabaseAdmin.from('error_log').select('id', { count: 'exact', head: true }).eq('ip', ip).gte('at', since)
  if (error || (count ?? 0) >= 20) return NextResponse.json({ ok: false })
  await supabaseAdmin.from('error_log').insert({
    source: String(b.source ?? 'client').slice(0, 20),
    message: String(b.message).slice(0, 1000),
    stack: b.stack ? String(b.stack).slice(0, 4000) : null,
    url: b.url ? String(b.url).slice(0, 500) : null,
    ua: (req.headers.get('user-agent') ?? '').slice(0, 300),
    ip,
  })
  return NextResponse.json({ ok: true })
}
