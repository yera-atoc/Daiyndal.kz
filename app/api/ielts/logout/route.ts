import { NextResponse } from 'next/server'
import { clearStudent } from '@/lib/ieltsServer'

export async function POST() {
  clearStudent()
  return NextResponse.json({ ok: true })
}
