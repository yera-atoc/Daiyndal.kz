// Per-teacher auth. Unlike the single shared ADMIN_PASSWORD, each teacher
// has their own username + password stored in the `teachers` table
// (password_salt + password_hash, both plain SHA-256 via Web Crypto — same
// approach as lib/adminAuth.ts, kept simple and dependency-free so it also
// runs in the Edge middleware runtime).
//
// The session cookie stores `${teacherId}.${signature}` where signature is
// an HMAC-SHA256 of teacherId, keyed by SESSION_SECRET. This lets
// middleware verify a session without querying the database on every
// request, while still identifying *which* teacher is logged in.

export const TEACHER_COOKIE_NAME = 'beles_teacher'

function getSessionSecret(): string {
  // Falls back to ADMIN_PASSWORD only so local setups that haven't added a
  // dedicated SESSION_SECRET yet still work — set SESSION_SECRET in
  // production for a secret that isn't also a login password.
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

export async function signTeacherSession(teacherId: string): Promise<string> {
  const sig = await hmacHex(getSessionSecret(), teacherId)
  return `${teacherId}.${sig}`
}

export async function verifyTeacherSession(token: string | undefined | null): Promise<string | null> {
  if (!token) return null
  const dot = token.lastIndexOf('.')
  if (dot === -1) return null
  const teacherId = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (!teacherId || !sig) return null
  const expected = await hmacHex(getSessionSecret(), teacherId)
  return sig === expected ? teacherId : null
}

export function generateSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function hashTeacherPassword(password: string, salt: string): Promise<string> {
  return sha256Hex(`${salt}:${password}`)
}
