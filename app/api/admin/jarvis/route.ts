import { NextResponse } from 'next/server'
import { currentAdmin } from '@/lib/requireAdmin'
import { loadJarvis } from '@/lib/jarvisServer'
import { adminFirstName } from '@/lib/jarvis'
import { getWeather } from '@/lib/weather'
import { logServerError } from '@/lib/serverLog'

export const dynamic = 'force-dynamic'

// Online Beles Manager панелі: KPI, дабылдар, брифинг, ауа райы. Тек әкімшіге.
export async function GET() {
  const me = await currentAdmin()
  if (!me) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  try {
    const [{ data }, weather] = await Promise.all([loadJarvis(), getWeather()])
    return NextResponse.json(
      { ...data, weather, name: adminFirstName(me, process.env.OWNER_NAME), assistant: !!process.env.ANTHROPIC_API_KEY },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e) {
    await logServerError('jarvis', e)
    return NextResponse.json({ error: 'Деректерді жүктеу мүмкін болмады' }, { status: 500 })
  }
}
