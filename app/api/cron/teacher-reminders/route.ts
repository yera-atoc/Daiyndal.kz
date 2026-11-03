import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { loadReports } from '@/lib/teacherOpsServer'
import { reminderText } from '@/lib/teacherOps'
import { addDays } from '@/lib/journal'
import { todayAlmatyISO } from '@/lib/payments'

export const dynamic = 'force-dynamic'

// Күн сайын кешке (Vercel Cron, vercel.json): соңғы 3 күнде журналда белгіленбеген сабақтар.
// Мұғалімнің Telegram чат id-і болса — өзіне; әкімшіге (TELEGRAM_CHAT_ID) — жалпы тізім.
// Vercel `Authorization: Bearer $CRON_SECRET` жібереді; CRON_SECRET жоқ болса — жабық.
async function tgSend(token: string, chat: string, text: string) {
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text }) })
  return r.ok
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  const today = todayAlmatyISO()
  const rows = (await loadReports(addDays(today, -3), today)).filter((r) => r.unmarked.length)
  const token = process.env.TELEGRAM_BOT_TOKEN
  let teachersSent = 0
  if (token && rows.length) {
    const { data } = await supabaseAdmin.from('teachers').select('id, telegram_chat_id').in('id', rows.map((r) => r.id))
    const chat = new Map((data ?? []).map((t: any) => [t.id, t.telegram_chat_id as string | null]))
    for (const r of rows) {
      const c = chat.get(r.id)
      const text = reminderText(r)
      if (c && text && (await tgSend(token, c, text))) teachersSent++
    }
    if (process.env.TELEGRAM_CHAT_ID)
      await tgSend(token, process.env.TELEGRAM_CHAT_ID, `📒 Журнал белгіленбеген (${today}):\n\n${rows.map((r) => `• ${r.name}: ${r.unmarked.length} сабақ`).join('\n')}`)
  }
  return NextResponse.json({ today, teachers: rows.length, teachersSent })
}
