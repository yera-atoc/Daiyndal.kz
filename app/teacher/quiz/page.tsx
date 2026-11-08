'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { QuizQ } from '@/lib/lesson'

type Q = { id: string; date: string; topic: string; questions: QuizQ[]; className: string; subject: string | null }

/** Сабақ тестін қағазға басып шығару: сұрақтар + соңғы бетте жауап кілті (мұғалімге) */
function QuizPrint() {
  const id = useSearchParams().get('id') ?? ''
  const [q, setQ] = useState<Q | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    fetch(`/api/lesson?quiz=${id}`, { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error || 'Табылмады')
        setQ(j)
      })
      .catch((e) => setErr(e.message))
  }, [id])
  if (err) return <p className="p-10 text-center text-red-700">{err}</p>
  if (!q) return <p className="p-10 text-center text-zinc-500">Жүктелуде…</p>
  const L = 'ABCD'
  return (
    <main className="mx-auto max-w-[190mm] p-6 text-[#0E1424] print:p-0">
      <style>{`@page{size:A4;margin:12mm} @media print{.np{display:none}} .pb{break-before:page}`}</style>
      <div className="np mb-4 flex gap-2">
        <button onClick={() => window.print()} className="rounded-xl bg-[#0E1424] px-4 py-2 text-sm font-semibold text-white">Басып шығару / PDF</button>
      </div>
      <header className="flex items-end justify-between border-b-2 border-[#0E1424] pb-2">
        <div>
          <div className="text-[10px] font-bold tracking-[.2em] text-[#2B6BF3]">BELES EDUCATION</div>
          <h1 className="text-xl font-bold">{q.topic}</h1>
          <div className="text-xs text-zinc-500">{[q.className, q.subject, q.date.split('-').reverse().join('.')].filter(Boolean).join(' · ')}</div>
        </div>
        <div className="text-right text-xs">Аты-жөні: ______________________<br /><br />Балл: ____ / {q.questions.length}</div>
      </header>
      <ol className="mt-4 space-y-3">
        {q.questions.map((x, i) => (
          <li key={i} className="break-inside-avoid text-[13px]">
            <div className="font-semibold">{i + 1}. {x.q}</div>
            <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 pl-4">
              {x.options.map((o, j) => <div key={j}>{L[j]}) {o}</div>)}
            </div>
          </li>
        ))}
      </ol>
      <section className="pb mt-8 border-t pt-3 text-xs print:mt-0 print:border-0">
        <b>Жауап кілті (мұғалімге):</b> {q.questions.map((x, i) => `${i + 1}–${L[x.correct]}`).join(', ')}
      </section>
    </main>
  )
}

export default function Page() {
  return (
    <Suspense>
      <QuizPrint />
    </Suspense>
  )
}
