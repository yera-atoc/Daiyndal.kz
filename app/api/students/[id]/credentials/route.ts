import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isAdmin } from '@/lib/requireAdmin'
import { generateSalt, hashStudentPassword } from '@/lib/studentAuth'
import { PASSWORD_HINT, PASSWORD_MIN_LENGTH, USERNAME_HINT, normalizeUsername } from '@/lib/credentials'

// Admin sets or changes a student's login and/or password by hand — same
// rules as app/api/teachers/[id]/route.ts's PATCH. Nothing is generated
// automatically or at random; the admin always types both in.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const rawUsername = typeof body?.username === 'string' ? body.username : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!rawUsername.trim() && !password) {
    return NextResponse.json({ error: 'Логин немесе құпия сөзді енгізіңіз' }, { status: 400 })
  }

  let username: string | null = null
  if (rawUsername.trim()) {
    username = normalizeUsername(rawUsername)
    if (!username) return NextResponse.json({ error: USERNAME_HINT }, { status: 400 })
  }
  if (password && (password.length < PASSWORD_MIN_LENGTH || password.length > 100)) {
    return NextResponse.json({ error: PASSWORD_HINT }, { status: 400 })
  }

  const { data: current, error: currentError } = await supabaseAdmin
    .from('students')
    .select('id, username, password_hash')
    .eq('id', params.id)
    .maybeSingle()

  if (currentError) return NextResponse.json({ error: currentError.message }, { status: 500 })
  if (!current) return NextResponse.json({ error: 'Оқушы табылмады' }, { status: 404 })

  // A student must end up with BOTH a login and a password.
  if (!(username || current.username) || !(password || current.password_hash)) {
    return NextResponse.json(
      { error: 'Алғаш рет логин мен құпия сөзді екеуін де енгізіңіз' },
      { status: 400 }
    )
  }

  const update: Record<string, string> = {}
  if (username) update.username = username
  if (password) {
    const salt = generateSalt()
    update.password_salt = salt
    update.password_hash = await hashStudentPassword(password, salt)
  }

  const { data, error } = await supabaseAdmin
    .from('students')
    .update(update)
    .eq('id', params.id)
    .select('id, full_name, username')
    .maybeSingle()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Бұл логин бос емес' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
