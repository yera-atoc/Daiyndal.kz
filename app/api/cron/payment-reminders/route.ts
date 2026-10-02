import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { paymentStatus, statusLabel, todayAlmatyISO, money, SOON_DAYS } from '@/lib/payments'

// Called once a day by Vercel Cron (see vercel.json). Vercel sends
// `Authorization: Bearer $CRON_SECRET`; without CRON_SECRET set the route is closed.
// If TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID are set, the admin gets a Telegram message.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const today = todayAlmatyISO()
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('full_name, payment_deadline, payment_amount')
    .not('payment_deadline', 'is', null)
    .order('payment_deadline')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const due = (data ?? [])
    .map((s) => ({ ...s, st: paymentStatus(s.payment_deadline, today) }))
    .filter((s) => s.st.kind === 'overdue' || s.st.kind === 'today' || s.st.kind === 'soon')

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  let sent = false

  if (token && chatId && due.length > 0) {
    const lines = due.map(
      (s) => `• ${s.full_name} — ${money(s.payment_amount)} — ${s.payment_deadline} (${statusLabel(s.st)})`
    )
    const text = `💳 Төлем еске салу (${today})\nКешіккен / ${SOON_DAYS} күн ішінде:\n\n${lines.join('\n')}`
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
    sent = res.ok
  }

  return NextResponse.json({ today, count: due.length, telegramSent: sent })
}
