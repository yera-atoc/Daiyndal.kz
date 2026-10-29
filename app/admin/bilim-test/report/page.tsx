'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import ReportPages from '@/components/bilim/ReportPages'
import type { HistPoint } from '@/lib/bilimTestForecast'
import PrintStyles from '@/components/bilim/PrintStyles'
import { personalizeFor } from '@/lib/bilimShuffle'
import { ranking, type Exam, type Group, type ScoreRow, type Student, type Submission } from '@/lib/bilimTest'

type Resp = {
  group: Group | null
  students: Student[]
  exam: Exam | null
  submissions: Submission[]
  previous: { id: string; month: string; title: string; scores: Record<string, ScoreRow> } | null
  histories: Record<string, HistPoint[]>
  error?: string
}

function Reports() {
  const sp = useSearchParams()
  const groupId = sp.get('group') ?? ''
  const examId = sp.get('exam') ?? ''
  const only = sp.get('student')
  const [data, setData] = useState<Resp | null>(null)

  useEffect(() => {
    fetch(`/api/bilim-test/admin?group=${encodeURIComponent(groupId)}&exam=${encodeURIComponent(examId)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData)
  }, [groupId, examId])

  const t = data?.exam ? (only ? `${only} — ${data.exam.title}` : `Білім тексеру — ${data.group?.name} — ${data.exam.title}`) : 'Білім тексеру'
  useEffect(() => {
    document.title = t // PDF файлының атауы осыдан алынады
  }, [t])

  if (!data) return <p className="p-10 text-center text-slate-400">Жүктелуде…</p>
  if (data.error || !data.exam) return <p className="p-10 text-center text-rose-600">{data.error ?? 'Сынақ табылмады'}</p>

  const exam = data.exam
  const roster = data.students.map((s) => s.full_name)
  const subs = data.submissions.filter((s) => roster.includes(s.student_name))
  const rk = ranking(exam, subs)
  const names = only ? [only] : roster.filter((n) => subs.some((s) => s.student_name === n))

  return (
    <>
      <div className="bt-toolbar sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <a href={`/admin/bilim-test?group=${exam.group_id}&exam=${exam.id}`} className="text-sm text-blue-600">← Нәтижелер</a>
        <span className="text-sm text-slate-500">{names.length} оқушы · {data.group?.name} · {exam.title}</span>
        <button onClick={() => window.print()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
          PDF сақтау / басып шығару
        </button>
      </div>
      <div className="bt-pages space-y-8 py-8">
        {names.map((n) => {
          // Жеке нұсқа болса — оқушының өз парағындағы нөмірлермен
          const mine = personalizeFor(exam, subs.filter((s) => s.student_name === n), n)
          return (
          <ReportPages
            key={n}
            history={data.histories?.[n] ?? []}
            exam={mine.exam}
            student={n}
            groupName={data.group?.name ?? ''}
            subs={mine.subs}
            prev={data.previous ? { id: data.previous.id, month: data.previous.month, title: data.previous.title, row: data.previous.scores[n] } : null}
            rank={rk.place[n] ? { place: rk.place[n], of: rk.of } : null}
          />
          )
        })}
        {names.length === 0 && <p className="text-center text-slate-400">Әзірге жауап парағы жоқ.</p>}
      </div>
    </>
  )
}

export default function ReportPage() {
  return (
    <div id="bt-report" className="min-h-screen bg-slate-200">
      <PrintStyles />
      <Suspense fallback={null}>
        <Reports />
      </Suspense>
    </div>
  )
}
