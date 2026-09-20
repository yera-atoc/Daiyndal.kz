import { NextResponse } from 'next/server'
import { STUDENT_COOKIE_NAME } from '@/lib/studentAuth'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(STUDENT_COOKIE_NAME, '', { path: '/', maxAge: 0 })
  return res
}
