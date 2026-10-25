import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { hashPasswordV2, signTeacherSession, TEACHER_COOKIE_NAME, verifyPassword } from '@/lib/teacherAuth'
import { audit, clientIp, lockedMessage, throttleCheck, throttleClear, throttleFail } from '@/lib/security'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json().catch(() => ({ username: '', password: '' }))

  if (!username || !password) {
    return NextResponse.json({ error: 'Логин мен құпия сөзді енгізіңіз' }, { status: 400 })
  }

  // Logins are stored lowercase; phones often capitalise the first letter,
  // so try the login as typed and in lowercase.
  const typed = String(username).trim().slice(0, 60)
  const keys = [`ip:${clientIp(req.headers)}`, `teacher:${typed.toLowerCase()}`]
  const wait = await throttleCheck(keys)
  if (wait) return NextResponse.json({ error: lockedMessage(wait) }, { status: 429 })

  const candidates = Array.from(new Set([typed, typed.toLowerCase()]))
  const { data: rows, error } = await supabaseAdmin
    .from('teachers')
    .select('id, password_hash, password_salt')
    .in('username', candidates)
    .limit(1)
  const teacher = rows?.[0]

  const check = teacher?.password_hash && teacher.password_salt ? await verifyPassword(String(password), teacher.password_salt, teacher.password_hash) : { ok: false, rehash: false }
  if (error || !teacher || !check.ok) {
    await throttleFail(keys)
    await audit(`teacher:${typed.toLowerCase()}`, 'login.fail', req.headers)
    return NextResponse.json({ error: 'Логин немесе құпия сөз қате' }, { status: 401 })
  }

  await throttleClear([keys[1]])
  if (check.rehash) await supabaseAdmin.from('teachers').update({ password_hash: await hashPasswordV2(String(password), teacher.password_salt) }).eq('id', teacher.id)
  await audit(`teacher:${teacher.id}`, 'login', req.headers)

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
