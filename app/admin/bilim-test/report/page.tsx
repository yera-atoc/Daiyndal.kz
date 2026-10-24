'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import ReportSheet from '@/components/bilim/ReportSheet'
import { ROSTER, ranking, type Exam, type ScoreRow, type Submission } from '@/lib/bilimTest'

type Resp = {
  exam: Exam | null
  submissions: Submission[]
  previous: { id: string; title: string; scores: Record<string, ScoreRow> } | null
  error?: string
}

function Reports() {
  const sp = useSearchParams()
  const examId = sp.get('exam') ?? ''
  const only = sp.get('student')
  const [data, setData] = useState<Resp | null>(null)

  useEffect(() => {
    fetch(`/api/bilim-test/admin?exam=${encodeURIComponent(examId)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData)
  }, [examId])

  const t = data?.exam ? (only ? `${only} — ${data.exam.title}` : `Білім тексеру — ${data.exam.title}`) : 'Білім тексеру'
  useEffect(() => {
    document.title = t // PDF файлының атауы осыдан алынады
  }, [t])

  if (!data) return <p className="p-10 text-center text-slate-400">Жүктелуде…</p>
  if (data.error || !data.exam) return <p className="p-10 text-center text-rose-600">{data.error ?? 'Сынақ табылмады'}</p>

  const exam = data.exam
  const rk = ranking(exam, data.submissions)
  const names = only
    ? [only]
    : ROSTER.filter((n) => data.submissions.some((s) => s.student_name === n))

  return (
    <>
      <div className="bt-toolbar sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <a href={`/admin/bilim-test?exam=${exam.id}`} className="text-sm text-blue-600">
          ← Нәтижелер
        </a>
        <span className="text-sm text-slate-500">
          {names.length} оқушы · {exam.title}
        </span>
        <button onClick={() => window.print()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
          PDF сақтау / басып шығару
        </button>
      </div>
      <div className="bt-pages space-y-8 py-8">
        {names.map((n) => (
          <ReportSheet
            key={n}
            exam={exam}
            student={n}
            subs={data.submissions.filter((s) => s.student_name === n)}
            prev={data.previous ? { id: data.previous.id, title: data.previous.title, row: data.previous.scores[n] } : null}
            rank={rk.place[n] ? { place: rk.place[n], of: rk.of } : null}
          />
        ))}
        {names.length === 0 && <p className="text-center text-slate-400">Әзірге жауап парағы жоқ.</p>}
      </div>
    </>
  )
}

export default function ReportPage() {
  return (
    <div id="bt-report" className="min-h-screen bg-slate-200">
      <style>{`
        .bt-sheet { width: 210mm; height: 297mm; padding: 13mm 16mm 9mm; box-sizing: border-box; overflow: hidden; }
        @page { size: A4; margin: 0; }
        @media print {
          body > :not(#bt-report) { display: none !important; }
          #bt-report { background: #fff !important; }
          .bt-toolbar { display: none !important; }
          .bt-pages { padding: 0 !important; }
          .bt-pages > * + * { margin-top: 0 !important; }
          .bt-sheet { break-after: page; box-shadow: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      <Suspense fallback={null}>
        <Reports />
      </Suspense>
    </div>
  )
}
