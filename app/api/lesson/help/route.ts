import { NextRequest, NextResponse } from 'next/server'
import { journalWho } from '@/lib/journalServer'
import { helpList } from '@/lib/helpServer'
import { logServerError } from '@/lib/serverLog'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// GET — «Көмек керек» оқушылар: мұғалімге өз топтары бойынша, әкімшіге — барлығы
export async function GET(req: NextRequest) {
  const who = await journalWho()
  if (!who) return NextResponse.json({ error: 'Кіру керек' }, { status: 401 })
  try {
    const origin = (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).replace(/\/$/, '')
    return NextResponse.json(await helpList(who, origin), { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    await logServerError('lesson/help', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
