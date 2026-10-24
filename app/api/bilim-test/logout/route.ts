import { NextResponse } from 'next/server'
import { clearStudentSession } from '@/lib/bilimTestAuth'

export async function POST() {
  clearStudentSession()
  return NextResponse.json({ ok: true })
}
