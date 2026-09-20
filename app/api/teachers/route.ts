import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isAdmin } from '@/lib/requireAdmin'
import { generateSalt, hashTeacherPassword } from '@/lib/teacherAuth'
import { PASSWORD_HINT, PASSWORD_MIN_LENGTH, USERNAME_HINT, normalizeUsername } from '@/lib/credentials'

export async function GET() {
  // password_hash/password_salt are never selected here — this list is
  // also used by public-ish pages (attendance grouping), so credentials
  // must never leave the server in this response.
  // Logins are only shown to the admin; anonymous visitors get names/subjects only.
  const admin = await isAdmin()
  const { data, error } = admin
    ? await supabaseAdmin
        .from('teachers')
        .select('id, name, subject, username, created_at')
        .order('name')
    : await supabaseAdmin
        .from('teachers')
        .select('id, name, subject, created_at')
        .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.name) {
    return NextResponse.json({ error: 'Аты-жөні міндетті' }, { status: 400 })
  }

  const insert: Record<string, unknown> = {
    name: body.name,
    subject: body.subject ?? null,
  }

  // Username/password are optional at creation time — an admin can add a
  // teacher first and set up their login later via PATCH.
  const rawUsername = typeof body.username === 'string' ? body.username : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (rawUsername.trim() || password) {
    const username = normalizeUsername(rawUsername)
    if (!username) return NextResponse.json({ error: USERNAME_HINT }, { status: 400 })
    if (password.length < PASSWORD_MIN_LENGTH || password.length > 100) {
      return NextResponse.json({ error: PASSWORD_HINT }, { status: 400 })
    }
    const salt = generateSalt()
    insert.username = username
    insert.password_salt = salt
    insert.password_hash = await hashTeacherPassword(password, salt)
  }

  const { data, error } = await supabaseAdmin
    .from('teachers')
    .insert(insert)
    .select('id, name, subject, username, created_at')
    .single()

  if (error) {
    // 23505 = unique violation (login already taken)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Бұл логин бос емес' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
