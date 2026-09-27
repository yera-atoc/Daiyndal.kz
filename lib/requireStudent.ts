import { cookies } from 'next/headers'
import { STUDENT_COOKIE_NAME, verifyStudentSession } from './studentAuth'

/** Returns the logged-in student's id, or null if not authenticated. */
export async function currentStudentId(): Promise<string | null> {
  const token = cookies().get(STUDENT_COOKIE_NAME)?.value
  return verifyStudentSession(token)
}
