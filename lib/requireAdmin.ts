import { cookies } from 'next/headers'
import { ADMIN_COOKIE_NAME, hashPassword } from './adminAuth'

export async function isAdmin(): Promise<boolean> {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value
  if (!token) return false
  if (!process.env.ADMIN_PASSWORD) return false
  const expected = await hashPassword(process.env.ADMIN_PASSWORD)
  return token === expected
}
