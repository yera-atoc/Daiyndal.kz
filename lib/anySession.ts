// Кез келген кабинетке кірген адам: әкімші, мұғалім не оқушы (Білім тексеру, IELTS, оқушы кабинеті).
import { currentAdmin } from './requireAdmin'
import { currentTeacherId } from './requireTeacher'
import { currentStudentId } from './requireStudent'
import { currentStudent as btStudent } from './bilimTestAuth'
import { currentStudent as ieltsStudent } from './ieltsServer'

export type Who = { actor: string; kind: 'admin' | 'teacher' | 'student'; name: string | null }

export async function whoIsLoggedIn(): Promise<string | null> {
  return (await whoDetails())?.actor ?? null
}

export async function whoDetails(): Promise<Who | null> {
  const [admin, teacher] = await Promise.all([currentAdmin().catch(() => null), currentTeacherId().catch(() => null)])
  if (admin) return { actor: admin.actor, kind: 'admin', name: admin.name }
  if (teacher) return { actor: `teacher:${teacher}`, kind: 'teacher', name: null }
  const [bt, ielts, crm] = await Promise.all([btStudent().catch(() => null), ieltsStudent().catch(() => null), currentStudentId().catch(() => null)])
  if (bt) return { actor: `bt:${bt.id}`, kind: 'student', name: bt.full_name }
  if (ielts) return { actor: `ielts:${ielts.id}`, kind: 'student', name: ielts.full_name }
  if (crm) return { actor: `student:${crm}`, kind: 'student', name: null }
  return null
}
