import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/requireAdmin'
import { listNotes } from '@/lib/teacherNotes'

export const dynamic = 'force-dynamic'

// Әкімші PDF есебі үшін: сынақтың барлық пікірлері
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  try {
    return NextResponse.json({ notes: await listNotes(req.nextUrl.searchParams.get('exam') ?? '') })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
