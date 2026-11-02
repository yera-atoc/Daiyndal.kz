'use client'

// Ағылшын тілі мұғалімі: барлық оқушының ағылшын тілі бойынша нәтижелері (оқушы бойынша топталған)
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

type Row = {
  student: string
  studentId: string | null
  source: string
  test: string
  score: string
  pct: number | null
  date: string | null
  status?: string
  attemptId?: string
}

const SOURCES = ['Барлығы', 'IELTS', 'TOEFL', 'ҰБТ', 'Білім сынағы', 'Пән тесті']

const fmtDate = (d: string | null) => {
  if (!d) return ''
  const x = new Date(d)
  return Number.isNaN(x.getTime()) ? '' : x.toLocaleDateString('kk-KZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const pctColor = (p: number | null) =>
  p === null ? 'text-zinc-500' : p >= 70 ? 'text-emerald-600' : p >= 50 ? 'text-amber-600' : 'text-red-600'

export default function EnglishResults() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [fail, setFail] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [source, setSource] = useState('Барлығы')
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/teacher/english-results', { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(j.error ?? 'Жүктелмеді')
        setRows(j.results ?? [])
        setErrors(j.errors ?? [])
      })
      .catch((e) => setFail(e.message))
  }, [])

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase()
    const filtered = (rows ?? []).filter(
      (r) => (source === 'Барлығы' || r.source === source) && (!term || r.student.toLowerCase().includes(term))
    )
    const map = new Map<string, Row[]>()
    for (const r of filtered) {
      const key = r.student.trim()
      map.set(key, [...(map.get(key) ?? []), r])
    }
    return Array.from(map.entries())
      .map(([student, list]) => {
        list.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
        const pcts = list.map((r) => r.pct).filter((p): p is number => typeof p === 'number')
        return { student, list, avg: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null }
      })
      .sort((a, b) => a.student.localeCompare(b.student, 'kk'))
  }, [rows, q, source])

  if (fail) return <p className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{fail}</p>
  if (!rows) return <p className="mt-8 text-sm text-zinc-500">Жүктелуде...</p>

  return (
    <section className="mt-8 space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-zinc-600">
          Ағылшын тілі бойынша барлық тапсырулар: IELTS, TOEFL, ҰБТ (шет тілі), Білім сынағы және пән тесттері.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Оқушының аты"
            className="w-full min-w-0 rounded-lg border border-zinc-300 px-3 py-2 text-sm sm:w-64"
          />
          <div className="flex flex-wrap gap-1.5">
            {SOURCES.map((s) => (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${source === s ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-600'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          {groups.length} оқушы · {groups.reduce((n, g) => n + g.list.length, 0)} нәтиже
        </p>
        {errors.length > 0 && (
          <p className="mt-2 text-xs text-amber-700">Кейбір дерек жүктелмеді: {errors.join('; ')}</p>
        )}
      </div>

      <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {groups.map((g) => (
          <div key={g.student}>
            <button
              onClick={() => setOpen(open === g.student ? null : g.student)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-900">{g.student}</p>
                <p className="text-xs text-zinc-500">
                  {g.list.length} нәтиже · {Array.from(new Set(g.list.map((r) => r.source))).join(', ')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {g.avg !== null && <span className={`text-sm font-semibold ${pctColor(g.avg)}`}>{g.avg}%</span>}
                <span className="text-zinc-400">{open === g.student ? '▴' : '▾'}</span>
              </div>
            </button>
            {open === g.student && (
              <div className="space-y-2 bg-zinc-50 px-4 py-3">
                {g.list.map((r, i) => (
                  <div key={i} className="rounded-lg border border-zinc-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{r.source}</p>
                        <p className="text-sm text-zinc-900">{r.test}</p>
                        <p className="text-xs text-zinc-500">
                          {[fmtDate(r.date), r.status].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <p className={`shrink-0 text-right text-sm font-semibold ${pctColor(r.pct)}`}>{r.score}</p>
                    </div>
                    {r.attemptId && (
                      <Link href="/ielts/teacher" className="mt-2 inline-block text-xs font-medium text-sky-600 hover:underline">
                        Тексеру / толығырақ →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {groups.length === 0 && <p className="px-4 py-6 text-sm text-zinc-500">Ағылшын тілі бойынша нәтиже табылмады</p>}
      </div>
    </section>
  )
}
