import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { hashTeacherPassword, signTeacherSession, TEACHER_COOKIE_NAME } from '@/lib/teacherAuth'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json().catch(() => ({ username: '', password: '' }))

  if (!username || !password) {
    return NextResponse.json({ error: 'Логин мен құпия сөзді енгізіңіз' }, { status: 400 })
  }

  // Logins are stored lowercase; phones often capitalise the first letter,
  // so try the login as typed and in lowercase.
  const typed = String(username).trim()
  const candidates = Array.from(new Set([typed, typed.toLowerCase()]))
  const { data: rows, error } = await supabaseAdmin
    .from('teachers')
    .select('id, password_hash, password_salt')
    .in('username', candidates)
    .limit(1)
  const teacher = rows?.[0]

  if (error || !teacher || !teacher.password_hash || !teacher.password_salt) {
    return NextResponse.json({ error: 'Логин немесе құпия сөз қате' }, { status: 401 })
  }

  const attemptHash = await hashTeacherPassword(password, teacher.password_salt)
  if (attemptHash !== teacher.password_hash) {
    return NextResponse.json({ error: 'Логин немесе құпия сөз қате' }, { status: 401 })
  }

  const token = await signTeacherSession(teacher.id)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(TEACHER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 күн
  })
  return res
}
