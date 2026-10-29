// Маусым кестесінің деректерін жинау (сервер)
import { DEFAULT_SUBJECTS, scoresForExam } from './bilimTest'
import { buildSeason, seasonFor, type SeasonInput, type SeasonView } from './bilimSeason'
import { listExams, listGroups, listStudents, listSubmissions } from './bilimTestStore'

export async function seasonInput(groupId: string): Promise<SeasonInput> {
  const [groups, exams, students] = await Promise.all([listGroups(), listExams(groupId), listStudents(groupId)])
  const group = groups.find((g) => g.id === groupId)
  const names = new Set(students.map((s) => s.full_name))
  const ex = await Promise.all(
    exams.map(async (e) => {
      const subs = (await listSubmissions(e.id)).filter((s) => names.has(s.student_name))
      return {
        id: e.id,
        month: e.month,
        title: e.title,
        subjects: e.subjects,
        published: e.published,
        open: e.open_subjects.length > 0,
        scores: scoresForExam(e, subs),
        submitted: Array.from(new Set(subs.map((s) => s.student_name))),
      }
    })
  )
  return {
    months: seasonFor(groupId, group?.name)?.months ?? [],
    students: students.map((s) => ({ id: s.id, full_name: s.full_name, legacy_scores: s.legacy_scores ?? {} })),
    exams: ex,
    template: group?.subjects?.length ? group.subjects : DEFAULT_SUBJECTS,
  }
}

export async function seasonView(groupId: string, viewer: 'admin' | { id: string }): Promise<SeasonView> {
  return buildSeason(await seasonInput(groupId), viewer)
}
