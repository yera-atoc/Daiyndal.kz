'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { comboName, type UbtScores } from '@/lib/ubt'
import { UbtPlanView, UbtTrend } from '@/components/ielts/UbtGrowth'
import { CONTACT } from '@/components/site/brand'

const INK = '#0E1424'
const MUTED = '#687085'
const LINE = '#E3E7F0'
const MON = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан']
const fullDate = (s: string) => { const d = new Date(s); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}` }
const short = (s: string) => { const d = new Date(s); return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}` }

type Data = {
  name: string
  title: string
  at: string
  s: UbtScores
  history: { label: string; total: number; max: number }[]
}

function Report() {
  const id = useSearchParams().get('a') ?? ''
  const [d, setD] = useState<Data | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    ;(async () => {
      const [a, me] = await Promise.all([
        fetch(`/api/ielts/attempt?id=${encodeURIComponent(id)}`, { cache: 'no-store' }).then(async (r) => (r.ok ? r.json() : Promise.reject(new Error((await r.json().catch(() => ({}))).error || 'Нәтиже табылмады')))),
        fetch('/api/ielts/me', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
      ])
      const s: UbtScores | undefined = a.attempt.scores?.ubt
      if (!s) throw new Error('Бұл тест әлі аяқталмаған')
      const history = (me?.tests ?? [])
        .filter((t: any) => t.exam === 'ubt')
        .flatMap((t: any) => t.attempts)
        .filter((x: any) => x.scores?.ubt && x.status !== 'in_progress')
        .sort((x: any, y: any) => (x.submitted_at ?? x.started_at).localeCompare(y.submitted_at ?? y.started_at))
        .map((x: any) => ({ label: short(x.submitted_at ?? x.started_at), total: x.scores.ubt.total, max: x.scores.ubt.max }))
      const mine = (me?.tests ?? []).flatMap((t: any) => t.attempts).find((x: any) => x.id === id)
      setD({ name: me?.student?.full_name ?? '', title: a.test.title, at: mine?.submitted_at ?? mine?.started_at ?? new Date().toISOString(), s, history })
    })().catch((e) => setErr(e.message))
  }, [id])

  if (err)
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center" style={{ background: '#F5F7FB' }}>
        <div>
          <p className="font-semibold">{err}</p>
          <Link href="/ubt" className="mt-4 inline-block text-sm font-semibold text-[#2B6BF3]">ҰБТ кабинетіне оралу</Link>
        </div>
      </div>
    )
  if (!d) return <div className="grid min-h-screen place-items-center" style={{ background: '#F5F7FB', color: MUTED }}>Есеп дайындалуда…</div>

  const s = d.s
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
          <div>
            <img src="/beles-logo.png" alt="Beles education" className="h-9 w-auto" />
            <h1 className="font-display mt-4 text-2xl font-semibold">ҰБТ сынағының нәтижесі</h1>
            <p className="mt-1 text-sm" style={{ color: MUTED }}>{d.title}</p>
          </div>
          <div className="text-right text-sm">
            <div className="font-semibold">{d.name}</div>
            <div style={{ color: MUTED }}>{fullDate(d.at)}</div>
            <div className="mt-1" style={{ color: MUTED }}>{comboName(s.combo)}</div>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-[auto_1fr] items-center gap-6">
          <div className="rounded-3xl px-6 py-5 text-white" style={{ background: INK }}>
            <div className="text-xs opacity-70">Жалпы балл</div>
            <div className="font-display text-5xl font-semibold tabular-nums">{s.total}<span className="text-xl opacity-60"> / {s.max}</span></div>
          </div>
          <div>
            <p className="text-lg font-semibold" style={{ color: s.passed ? '#0B7A4B' : '#C2262B' }}>{s.passed ? 'Барлық пән бойынша шекті балдан өтті' : 'Кейбір пәндер бойынша шекті балл жиналмады'}</p>
            <p className="mt-1 text-sm" style={{ color: MUTED }}>Шекті балл: бейіндік пәндер мен Қазақстан тарихы – 5, сауаттылық пәндері – 3.</p>
          </div>
        </section>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b text-left" style={{ borderColor: LINE, color: MUTED }}>
              <th className="py-2 font-medium">Пән</th>
              <th className="py-2 text-right font-medium">Балл</th>
              <th className="py-2 text-right font-medium">Пайыз</th>
              <th className="py-2 text-right font-medium">Шекті балл</th>
            </tr>
          </thead>
          <tbody>
            {s.subjects.map((x) => (
              <tr key={x.key} className="border-b" style={{ borderColor: LINE }}>
                <td className="py-2.5 font-medium">{x.name}</td>
                <td className="whitespace-nowrap py-2.5 text-right font-semibold tabular-nums">{x.points} / {x.max}</td>
                <td className="py-2.5 text-right tabular-nums">{Math.round((x.points / x.max) * 100)}%</td>
                <td className="py-2.5 text-right" style={{ color: x.passed ? '#0B7A4B' : '#C2262B' }}>{x.passed ? 'өтті' : `${x.threshold} керек`}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="avoid-break mt-8"><UbtPlanView s={s} /></section>

        {d.history.length > 1 && (
          <section className="avoid-break mt-8">
            <h3 className="font-display text-lg font-semibold">Сынақтар бойынша өсу</h3>
            <div className="mt-3"><UbtTrend points={d.history.slice(-8)} compact /></div>
          </section>
        )}

        <footer className="mt-10 flex flex-wrap justify-between gap-2 border-t pt-4 text-xs" style={{ borderColor: LINE, color: MUTED }}>
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
  html, body, .ubt-report { background: #fff !important; }
  .no-print { display: none !important; }
  .sheet { width: 210mm; min-height: 297mm; margin: 0 !important; box-shadow: none !important; padding: 14mm; }
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
