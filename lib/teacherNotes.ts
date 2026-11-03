// Мұғалімдердің оқушы туралы пікірлері (тек серверде). Кесте: bt_teacher_notes.
import { supabaseAdmin as sb } from './supabaseAdmin'

export type TeacherNote = { student_id: string; teacher_id: string; teacher_name: string; subject: string | null; text: string; updated_at: string }

export const NOTE_MAX = 800
export const NOTES_MISSING = 'Пікірлер кестесі әлі жоқ: Supabase-те 20261104_02_teacher_notes.sql іске қосу керек'

const missing = (m?: string) => !!m && /bt_teacher_notes|does not exist|schema cache/i.test(m)

export function cleanNote(v: unknown): string {
  return String(v ?? '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, NOTE_MAX)
}

/** Сынақ бойынша пікірлер (кесте жоқ болса — бос тізім, PDF бұзылмасын) */
export async function listNotes(examId: string, studentIds?: string[]): Promise<TeacherNote[]> {
  let q = sb.from('bt_teacher_notes').select('student_id, teacher_id, teacher_name, subject, text, updated_at').eq('exam_id', examId)
  if (studentIds) q = q.in('student_id', studentIds.length ? studentIds : ['00000000-0000-0000-0000-000000000000'])
  const { data, error } = await q.order('updated_at')
  if (error) {
    if (missing(error.message)) return []
    throw new Error(error.message)
  }
  return (data ?? []) as TeacherNote[]
}

export async function saveNote(n: { exam_id: string; student_id: string; teacher_id: string; teacher_name: string; subject: string | null; text: string }) {
  const text = cleanNote(n.text)
  const r = text
    ? await sb.from('bt_teacher_notes').upsert({ ...n, text, updated_at: new Date().toISOString() }, { onConflict: 'exam_id,student_id,teacher_id' })
    : await sb.from('bt_teacher_notes').delete().eq('exam_id', n.exam_id).eq('student_id', n.student_id).eq('teacher_id', n.teacher_id)
  if (r.error) throw new Error(missing(r.error.message) ? NOTES_MISSING : r.error.message)
}

export async function notesReady(): Promise<boolean> {
  const { error } = await sb.from('bt_teacher_notes').select('id').limit(1)
  return !error
}
