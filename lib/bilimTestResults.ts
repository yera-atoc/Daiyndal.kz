// Оқушының бір сынақ бойынша толық нәтижесі (сервер). Кабинет те, PDF те осыны қолданады.
import {
  examMax,
  gradeSubject,
  ranking,
  rowTotal,
  shortName,
  type Exam,
  type ScoreRow,
  type Submission,
} from './bilimTest'
import { listGroups, listStudents, listSubmissions, previousScores } from './bilimTestStore'

export type RankRow = { place: number | null; name: string; me: boolean; scores: ScoreRow; total: number | null }

export type StudentResult = {
  exam: Exam
  groupName: string
  student: string
  subs: Submission[]
  prev: { id: string; month: string; title: string; row: ScoreRow | undefined } | null
  rank: { place: number; of: number } | null
  table: RankRow[]
}

export async function studentResult(exam: Exam, student: string, opts: { fullNames: boolean }): Promise<StudentResult> {
  const [subs, prev, groups, students] = await Promise.all([
    listSubmissions(exam.id),
    previousScores(exam),
    listGroups(),
    listStudents(exam.group_id),
  ])
  // Тізімнен шығарылған оқушылардың парақтары рейтингке кірмейді
  const names = new Set(students.map((s) => s.full_name))
  const rk = ranking(exam, subs.filter((s) => names.has(s.student_name)))
  const table: RankRow[] = students
    .map((s) => ({
      place: rk.place[s.full_name] ?? null,
      name: opts.fullNames || s.full_name === student ? s.full_name : shortName(s.full_name),
      me: s.full_name === student,
      scores: rk.scores[s.full_name] ?? {},
      total: rowTotal(rk.scores[s.full_name]),
    }))
    .filter((r) => r.total !== null)
    .sort((a, b) => (a.place ?? 999) - (b.place ?? 999))
  return {
    exam,
    groupName: groups.find((g) => g.id === exam.group_id)?.name ?? '',
    student,
    subs: subs.filter((s) => s.student_name === student),
    prev: prev ? { id: prev.id, month: prev.month, title: prev.title, row: prev.scores[student] } : null,
    rank: rk.place[student] ? { place: rk.place[student], of: rk.of } : null,
    table,
  }
}

// «Нәтижелерім» тізіміндегі қысқаша карточка
export function resultSummary(exam: Exam, mine: Submission[], place: number | null, of: number) {
  let correct = 0
  let wrong = 0
  let blank = 0
  let score = 0
  let graded = false
  for (const s of exam.subjects) {
    const sub = mine.find((x) => x.subject === s.id)
    if (!sub) continue
    const g = gradeSubject(s, exam.answer_key[s.id], sub.answers)
    if (!g) continue
    graded = true
    correct += g.correct
    wrong += g.wrong.length
    blank += g.blank.length
    score += g.score
  }
  return {
    examId: exam.id,
    title: exam.title,
    month: exam.month,
    subjects: exam.subjects.length,
    taken: mine.length,
    correct,
    wrong,
    blank,
    score: graded ? score : null,
    max: examMax(exam),
    place,
    of,
  }
}
