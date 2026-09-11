import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE_NAME, hashPassword } from '@/lib/adminAuth'

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: '' }))
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword) {
    return NextResponse.json(
      { error: 'ADMIN_PASSWORD орнатылмаған. .env.local файлын тексеріңіз.' },
      { status: 500 }
    )
  }

  if (!password || password !== adminPassword) {
    return NextResponse.json({ error: 'Құпия сөз қате' }, { status: 401 })
  }

  const token = await hashPassword(adminPassword)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 күн
  })
  return res
}
