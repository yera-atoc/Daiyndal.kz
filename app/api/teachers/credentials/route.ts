import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isAdmin } from '@/lib/requireAdmin'
import { generateSalt, hashTeacherPassword } from '@/lib/teacherAuth'
import { generatePassword, loginBase } from '@/lib/credentials'

// Admin only. Issues a login + a random, different password per teacher and
// returns them in plain text ONCE — only the salted hash is stored, so a
// password can't be read back later (use "reset" to issue a new one).
//
// Body:
//   { mode: 'create',  people: [{ name, subject }] }  new teachers + logins
//   { mode: 'missing' }                               every teacher without a login
//   { mode: 'reset',   teacherId }                    new password for one teacher
//
// Logins come from the subject: IELTS -> ielts1, ielts2 ... ; DET -> det1 ...
// (Kazakh/Russian subjects are transliterated).

type Credential = {
  id: string
  name: string
  subject: string | null
  username: string
  password: string
}

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const mode = body?.mode

  const { data: rows, error: loadError } = await supabaseAdmin
    .from('teachers')
    .select('id, name, subject, username, password_hash')
  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 })
  }
  const teachers = rows ?? []

  const taken = new Set(
    teachers.map((t) => (t.username ?? '').toLowerCase()).filter(Boolean)
  )
  function nextUsername(subject: string | null): string {
    const base = loginBase(subject)
    let n = 1
    while (taken.has(`${base}${n}`)) n++
    const username = `${base}${n}`
    taken.add(username)
    return username
  }

  async function newSecret() {
    const password = generatePassword()
    const salt = generateSalt()
    return { password, salt, hash: await hashTeacherPassword(password, salt) }
  }

  const credentials: Credential[] = []
  // If something fails halfway, still return the credentials already issued:
  // those passwords are already saved and could not be shown again otherwise.
  const fail = (message: string, status = 500) =>
    NextResponse.json({ error: message, credentials }, { status, headers: NO_STORE })

  if (mode === 'create') {
    const people: unknown[] = Array.isArray(body.people) ? body.people : []
    const cleaned = people
      .map((p: any) => ({
        name: typeof p?.name === 'string' ? p.name.trim().slice(0, 100) : '',
        subject: typeof p?.subject === 'string' ? p.subject.trim().slice(0, 60) : '',
      }))
      .filter((p) => p.name)

    if (cleaned.length === 0 || cleaned.length > 30) {
      return NextResponse.json(
        { error: 'Мұғалімдер тізімі бос немесе тым ұзын (ең көбі 30)' },
        { status: 400 }
      )
    }

    for (const p of cleaned) {
      const subject = p.subject || null
      const username = nextUsername(subject)
      const { password, salt, hash } = await newSecret()

      const { data, error } = await supabaseAdmin
        .from('teachers')
        .insert({
          name: p.name,
          subject,
          username,
          password_salt: salt,
          password_hash: hash,
        })
        .select('id')
        .single()

      if (error) return fail(error.message)
      credentials.push({ id: data.id, name: p.name, subject, username, password })
    }

    return NextResponse.json({ credentials }, { headers: NO_STORE })
  }

  let targets: typeof teachers
  if (mode === 'missing') {
    targets = teachers.filter((t) => !t.username || !t.password_hash)
  } else if (mode === 'reset') {
    const one = teachers.find((t) => t.id === body?.teacherId)
    if (!one) return NextResponse.json({ error: 'Мұғалім табылмады' }, { status: 404 })
    targets = [one]
  } else {
    return NextResponse.json({ error: 'Белгісіз режим' }, { status: 400 })
  }

  for (const t of targets) {
    // Keep an existing login (teachers may already know it); only issue one if missing.
    const username = t.username ?? nextUsername(t.subject)
    const { password, salt, hash } = await newSecret()

    const { error } = await supabaseAdmin
      .from('teachers')
      .update({ username, password_salt: salt, password_hash: hash })
      .eq('id', t.id)

    if (error) return fail(error.message)
    credentials.push({ id: t.id, name: t.name, subject: t.subject, username, password })
  }

  return NextResponse.json({ credentials }, { headers: NO_STORE })
}
