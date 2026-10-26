'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { SubjectReportBody } from '@/components/ielts/SubjectView'
import { CONTACT } from '@/components/site/brand'
import type { MySubject } from '@/lib/subjectTests'

const INK = '#0E1424'
const MUTED = '#687085'
const LINE = '#E3E7F0'
const MON = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан']

// Пән тесттерінің жеке есебі: экранда көрінеді, «PDF сақтау» — A4 PDF
function Report() {
  const id = useSearchParams().get('s') ?? ''
  const [d, setD] = useState<{ name: string; m: MySubject } | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch('/api/ielts/subjects', { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}))
        if (r.status === 401) throw new Error('Есепті көру үшін ҰБТ кабинетіне өз PIN-іңізбен кіріңіз')
        if (!r.ok) throw new Error(j.error || 'Есеп ашылмады')
        const m = (j.subjects as MySubject[]).find((x) => x.sheet.id === id)
        if (!m) throw new Error('Есеп табылмады')
        setD({ name: String(j.student.full_name).replace(/[)\s]+$/, ''), m })
      })
      .catch((e) => setErr(e.message))
  }, [id])

  if (err)
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center" style={{ background: '#F5F7FB' }}>
        <div>
          <p className="font-semibold">{err}</p>
          <Link href="/ubt" className="mt-4 inline-block text-sm font-semibold text-[#2B6BF3]">ҰБТ кабинетіне өту</Link>
        </div>
      </div>
    )
  if (!d) return <div className="grid min-h-screen place-items-center" style={{ background: '#F5F7FB', color: MUTED }}>Есеп дайындалуда…</div>

  const now = new Date()
  return (
    <div className="ubt-report min-h-screen pb-10" style={{ background: '#EEF0F4', color: INK }}>
      <style>{PRINT_CSS}</style>
      <div className="no-print sticky top-0 z-10 border-b bg-white/90 backdrop-blur" style={{ borderColor: LINE }}>
        <div className="mx-auto flex max-w-[210mm] items-center justify-between gap-3 px-4 py-3">
          <Link href="/ubt" className="text-sm font-semibold" style={{ color: MUTED }}>‹ Кабинет</Link>
          <button onClick={() => window.print()} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white" style={{ background: '#2B6BF3' }}>PDF сақтау</button>
        </div>
        <p className="mx-auto max-w-[210mm] px-4 pb-2 text-xs sm:hidden" style={{ color: MUTED }}>iPhone-да: «PDF сақтау» → Бөлісу → «Файлдарға сақтау».</p>
      </div>

      <article className="sheet mx-auto mt-4 bg-white shadow-sm sm:mt-6">
        <header className="flex items-start justify-between gap-4 border-b pb-5" style={{ borderColor: LINE }}>
          <img src="/beles-logo.png" alt="Beles education" className="h-9 w-auto" />
          <div className="text-right text-xs font-semibold uppercase tracking-wider" style={{ color: '#2B6BF3' }}>
            {d.m.sheet.subject}{d.m.sheet.grade ? ` · ${d.m.sheet.grade} сынып` : ''}
            <div className="mt-0.5 font-medium normal-case tracking-normal" style={{ color: MUTED }}>{now.getDate()} {MON[now.getMonth()]} {now.getFullYear()}</div>
          </div>
        </header>
        <h1 className="font-display mt-5 text-3xl font-semibold">{d.name}</h1>
        <div className="mt-1"><SubjectReportBody m={d.m} /></div>
        <footer className="mt-6 flex flex-wrap justify-between gap-2 border-t pt-4 text-xs" style={{ borderColor: LINE, color: MUTED }}>
          <span>Beles education · {CONTACT.address}</span>
          <span>WhatsApp {CONTACT.phone}</span>
        </footer>
      </article>
    </div>
  )
}

const PRINT_CSS = `
.sheet { width: min(210mm, 100%); padding: 14mm 14mm 10mm; box-sizing: border-box; border-radius: 0; }
@media (max-width: 640px) { .sheet { padding: 20px 16px; } }
@page { size: A4; margin: 0; }
@media print {
  html, body, .ubt-report { background: #fff !important; padding: 0 !important; min-height: 0 !important; }
  .no-print { display: none !important; }
  .sheet { width: 210mm; height: 297mm; overflow: hidden; margin: 0 !important; box-shadow: none !important; padding: 12mm 14mm 8mm; }
  .avoid-break { break-inside: avoid; }
  .stripe { animation: none !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`

export default function Page() {
  return (
    <Suspense>
      <Report />
    </Suspense>
  )
}
