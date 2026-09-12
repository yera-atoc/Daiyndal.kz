import { cookies } from 'next/headers'
import { TEACHER_COOKIE_NAME, verifyTeacherSession } from './teacherAuth'

/** Returns the logged-in teacher's id, or null if not authenticated. */
export async function currentTeacherId(): Promise<string | null> {
  const token = cookies().get(TEACHER_COOKIE_NAME)?.value
  return verifyTeacherSession(token)
}
