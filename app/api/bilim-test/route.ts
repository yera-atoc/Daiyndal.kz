import { NextResponse } from 'next/server'
import { listExams, listStudents, listSubmissions } from '@/lib/bilimTestStore'

export const dynamic = 'force-dynamic'

// Ашық: оқушы беті үшін. Жауап кілті мұнда ешқашан жіберілмейді.
export async function GET() {
  try {
    const [exams, students] = await Promise.all([listExams(), listStudents()])
    const exam =
      [...exams].reverse().find((e) => e.open_subjects.length > 0) ?? exams[exams.length - 1] ?? null
    const submitted: Record<string, string[]> = {}
    if (exam) {
      for (const s of await listSubmissions(exam.id)) {
        ;(submitted[s.student_name] ??= []).push(s.subject)
      }
    }
    return NextResponse.json({
      exam: exam && {
        id: exam.id,
        title: exam.title,
        subjects: exam.subjects.map((s) => ({
          id: s.id,
          name: s.name,
          questions: s.questions,
          options: s.options,
          open: exam.open_subjects.includes(s.id),
        })),
      },
      roster: students.map((s) => s.full_name),
      submitted,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
