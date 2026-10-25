import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth'
import { ADMIN_SESSION_DAYS, safeEqual, signAdmin } from '@/lib/adminSession'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { hashPasswordV2, verifyPassword } from '@/lib/teacherAuth'
import { audit, clientIp, lockedMessage, throttleCheck, throttleClear, throttleFail } from '@/lib/security'

// Екі жол:
//  1) логин бос – иесінің құпия сөзі (ADMIN_PASSWORD)
//  2) логин + құпия сөз – әкімші құқығы берілген мұғалім (әр адамның өз аккаунты, журналда аты көрінеді)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const password = String(body?.password ?? '')
  const username = String(body?.username ?? '').trim().toLowerCase().slice(0, 60)
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD орнатылмаған. .env.local файлын тексеріңіз.' }, { status: 500 })
  }
  if (!password) return NextResponse.json({ error: 'Құпия сөзді енгізіңіз' }, { status: 400 })

  const keys = [`ip:${clientIp(req.headers)}`, `admin:${username || 'owner'}`]
  const wait = await throttleCheck(keys)
  if (wait) return NextResponse.json({ error: lockedMessage(wait) }, { status: 429 })

  let who: string | null = null
  if (!username) {
    if (safeEqual(password, adminPassword)) who = 'owner'
  } else {
    const { data: t } = await supabaseAdmin.from('teachers').select('id, password_hash, password_salt, is_admin').eq('username', username).maybeSingle()
    if (t?.is_admin && t.password_hash && t.password_salt) {
      const check = await verifyPassword(password, t.password_salt, t.password_hash)
      if (check.ok) {
        who = `t-${t.id}`
        if (check.rehash) await supabaseAdmin.from('teachers').update({ password_hash: await hashPasswordV2(password, t.password_salt) }).eq('id', t.id)
      }
    }
  }

  if (!who) {
    await throttleFail(keys)
    await audit(`admin:${username || 'owner'}`, 'admin.login.fail', req.headers)
    return NextResponse.json({ error: username ? 'Логин немесе құпия сөз қате, не әкімші құқығы жоқ' : 'Құпия сөз қате' }, { status: 401 })
  }

  await throttleClear([keys[1]])
  await audit(who === 'owner' ? 'admin:owner' : `admin:${who.slice(2)}`, 'admin.login', req.headers)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE_NAME, await signAdmin(who), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * ADMIN_SESSION_DAYS,
  })
  return res
}
