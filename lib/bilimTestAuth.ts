// Оқушы сессиясы: cookie ішінде оқушы id-і және HMAC қолтаңбасы (қолдан жасау мүмкін емес).
import { cookies } from 'next/headers'
import { getStudent } from './bilimTestStore'
import type { Student } from './bilimTest'

export const BT_COOKIE = 'bt_student'
const MAX_AGE = 60 * 60 * 24 * 120 // 4 ай

function secret() {
  const s = process.env.BILIM_TEST_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ADMIN_PASSWORD
  if (!s) throw new Error('BILIM_TEST_SECRET орнатылмаған')
  return s
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function setStudentSession(studentId: string) {
  cookies().set(BT_COOKIE, `${studentId}.${await sign(studentId)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  })
}

export function clearStudentSession() {
  cookies().set(BT_COOKIE, '', { path: '/', maxAge: 0 })
}

export async function currentStudent(): Promise<Student | null> {
  const raw = cookies().get(BT_COOKIE)?.value
  if (!raw) return null
  const [id, sig] = raw.split('.')
  if (!id || !sig || sig !== (await sign(id))) return null
  return getStudent(id)
}
