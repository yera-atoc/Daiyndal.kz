import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { hashStudentPassword, signStudentSession, STUDENT_COOKIE_NAME } from '@/lib/studentAuth'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json().catch(() => ({ username: '', password: '' }))

  if (!username || !password) {
    return NextResponse.json({ error: 'Логин мен құпия сөзді енгізіңіз' }, { status: 400 })
  }

  const typed = String(username).trim()
  const candidates = Array.from(new Set([typed, typed.toLowerCase()]))
  const { data: rows, error } = await supabaseAdmin
    .from('students')
    .select('id, password_hash, password_salt')
    .in('username', candidates)
    .limit(1)
  const student = rows?.[0]

  if (error || !student || !student.password_hash || !student.password_salt) {
    return NextResponse.json({ error: 'Логин немесе құпия сөз қате' }, { status: 401 })
  }

  const attemptHash = await hashStudentPassword(password, student.password_salt)
  if (attemptHash !== student.password_hash) {
    return NextResponse.json({ error: 'Логин немесе құпия сөз қате' }, { status: 401 })
  }

  const token = await signStudentSession(student.id)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(STUDENT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 күн
  })
  return res
}
