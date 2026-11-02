import { NextResponse } from 'next/server'
import { currentAdmin } from '@/lib/requireAdmin'
import { loadJarvis } from '@/lib/jarvisServer'
import { logServerError } from '@/lib/serverLog'

export const dynamic = 'force-dynamic'

// Jarvis панелі: KPI, дабылдар, брифинг. Тек әкімшіге.
export async function GET() {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  try {
    const { data } = await loadJarvis()
    return NextResponse.json({ ...data, assistant: !!process.env.ANTHROPIC_API_KEY }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    await logServerError('jarvis', e)
    return NextResponse.json({ error: 'Деректерді жүктеу мүмкін болмады' }, { status: 500 })
  }
}
