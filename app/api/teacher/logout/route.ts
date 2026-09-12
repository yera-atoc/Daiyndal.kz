import { NextResponse } from 'next/server'
import { TEACHER_COOKIE_NAME } from '@/lib/teacherAuth'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(TEACHER_COOKIE_NAME, '', { path: '/', maxAge: 0 })
  return res
}
