import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Бұрын кіру беті үшін топтар мен оқушылар тізімін беретін. Енді оқушы атын өзі жазады —
// тізім ешкімге көрсетілмейді (басқа оқушылар мен топтардың аттары, саны жасырын).
export async function GET() {
  return NextResponse.json({ groups: [] }, { headers: { 'Cache-Control': 'no-store' } })
}
