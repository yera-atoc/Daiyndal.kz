// Per-student auth. Mirrors lib/teacherAuth.ts exactly: each student has
// their own username + password stored in the `students` table
// (password_salt + password_hash), assigned by the admin — never generated
// automatically or at random.

export const STUDENT_COOKIE_NAME = 'beles_student'

function getSessionSecret(): string {
  return process.env.SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? 'beles-dev-secret'
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sha256Hex(message: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function signStudentSession(studentId: string): Promise<string> {
  const sig = await hmacHex(getSessionSecret(), studentId)
  return `${studentId}.${sig}`
}

export async function verifyStudentSession(token: string | undefined | null): Promise<string | null> {
  if (!token) return null
  const dot = token.lastIndexOf('.')
  if (dot === -1) return null
  const studentId = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (!studentId || !sig) return null
  const expected = await hmacHex(getSessionSecret(), studentId)
  return sig === expected ? studentId : null
}

export function generateSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function hashStudentPassword(password: string, salt: string): Promise<string> {
  return sha256Hex(`${salt}:${password}`)
}
