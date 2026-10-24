'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import ReportPages from '@/components/bilim/ReportPages'
import PrintStyles from '@/components/bilim/PrintStyles'
import type { StudentResult } from '@/lib/bilimTestResults'

function Report() {
  const examId = useSearchParams().get('exam') ?? ''
  const [data, setData] = useState<StudentResult | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch(`/api/bilim-test/me/result?exam=${encodeURIComponent(examId)}`, { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error)
        setData(j)
        document.title = `${j.student} — ${j.exam.title}` // PDF файлының атауы
      })
      .catch((e) => setErr(e.message))
  }, [examId])

  return (
    <>
      <div className="bt-toolbar sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <a href="/bilim-test" className="text-sm text-blue-600">← Кабинет</a>
        <button onClick={() => window.print()} disabled={!data} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          PDF сақтау
        </button>
      </div>
      {err && <p className="p-10 text-center text-rose-600">{err}</p>}
      {!data && !err && <p className="p-10 text-center text-slate-400">Жүктелуде…</p>}
      {data && (
        <div className="bt-pages space-y-8 py-6">
          <ReportPages history={data.history} exam={data.exam} student={data.student} subs={data.subs} prev={data.prev} rank={data.rank} groupName={data.groupName} />
        </div>
      )}
    </>
  )
}

export default function Page() {
  return (
    <div id="bt-report" className="min-h-screen bg-slate-200">
      <PrintStyles />
      <Suspense fallback={null}>
        <Report />
      </Suspense>
    </div>
  )
}
