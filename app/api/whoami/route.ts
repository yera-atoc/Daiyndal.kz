import { NextResponse } from 'next/server'
import { whoDetails } from '@/lib/anySession'

export const dynamic = 'force-dynamic'

// Су белгісі үшін: кім кірген (аты). Кірмесе — null.
export async function GET() {
  const w = await whoDetails()
  return NextResponse.json(w ? { kind: w.kind, name: w.name } : null, { headers: { 'Cache-Control': 'no-store' } })
}
