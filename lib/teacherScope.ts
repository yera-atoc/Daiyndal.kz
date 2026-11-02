// Мұғалімнің пәні бойынша қамту аймағы.
// Ағылшын тілі мұғалімі орталықтағы ағылшынға қатысты барлық нәрсені көреді:
// IELTS/TOEFL тесттері мен оқушылардың нәтижелері, ағылшын тілі тесттері мен материалдары —
// оларды кім құрғанына қарамастан (әкімші немесе басқа мұғалім).
import { supabaseAdmin } from './supabaseAdmin'
import { isEnglishSubject } from './teacherSubject'

export { isEnglishSubject }

export async function isEnglishTeacher(teacherId: string | null | undefined): Promise<boolean> {
  if (!teacherId) return false
  const { data } = await supabaseAdmin.from('teachers').select('subject').eq('id', teacherId).maybeSingle()
  return isEnglishSubject(data?.subject)
}
