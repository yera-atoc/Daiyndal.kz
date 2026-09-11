// Uses the Web Crypto API (global `crypto`), available both in Next.js
// middleware (Edge runtime) and in route handlers (Node 20+). This keeps the
// admin session cookie as a hash rather than storing the plain password.
export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const ADMIN_COOKIE_NAME = 'beles_admin'
