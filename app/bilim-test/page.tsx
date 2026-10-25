'use client'

import { useCallback, useEffect, useState } from 'react'
import AnswerSheet, { type SheetSubject } from '@/components/bilim/AnswerSheet'
import {
  examMax,
  fmtPct,
  gradeSubject,
  pct,
  sign,
  commonDelta,
  rowTotal,
  topicStats,
  weakTopics,
} from '@/lib/bilimTest'
import type { StudentResult } from '@/lib/bilimTestResults'
import ProgressChart, { type ChartPoint } from '@/components/bilim/ProgressChart'
import { buildForecast } from '@/lib/bilimTestForecast'
import { UbtTrend } from '@/components/ielts/UbtGrowth'
import { monthName } from '@/lib/bilimTest'

type OpenExam = { id: string; title: string; subjects: (SheetSubject & { open: boolean; done: boolean })[] }
type Summary = {
  examId: string
  title: string
  taken: number
  subjects: number
  correct: number
  wrong: number
  blank: number
  score: number | null
  max: number
  place: number | null
  of: number
}
type Me = { student: { id: string; name: string }; group: { id: string; name: string }; open: OpenExam[]; results: Summary[] }
type Tab = 'tests' | 'results' | 'rating'

async function api<T>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method: body ? 'POST' : 'GET',
    cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(j.error || 'Қате'), { status: r.status })
  return j as T
}

export default function BilimTestPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [state, setState] = useState<'loading' | 'login' | 'in'>('loading')
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      setMe(await api<Me>('/api/bilim-test/me'))
      setState('in')
      setError('')
    } catch (e: any) {
      if (e.status === 401) setState('login')
      else setError(e.message)
    }
  }, [])

  useEffect(() => {
    refresh()
    // Мұғалім пәнді ашқанда / нәтижені жариялағанда бет өзі жаңарсын
    const t = setInterval(refresh, 20000)
    const onVis = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [refresh])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {error && <p className="mx-auto mt-4 max-w-xl rounded-xl bg-rose-50 p-4 text-rose-700">Қате: {error}</p>}
      {state === 'loading' && <p className="py-24 text-center text-slate-400">Жүктелуде…</p>}
      {state === 'login' && <Login onDone={refresh} />}
      {state === 'in' && me && (
        <Cabinet
          me={me}
          refresh={refresh}
          onLogout={async () => {
            await api('/api/bilim-test/logout', {})
            setMe(null)
            setState('login')
          }}
        />
      )}
    </div>
  )
}

function Logo() {
  return <img src="/beles-logo.png" alt="Beles education" className="h-8 w-auto" />
}

// ── Кіру: топ → аты → PIN ────────────────────────────────

type LoginGroup = { id: string; name: string; students: { id: string; name: string }[] }

function Login({ onDone }: { onDone: () => void }) {
  const [groups, setGroups] = useState<LoginGroup[] | null>(null)
  const [group, setGroup] = useState<LoginGroup | null>(null)
  const [student, setStudent] = useState<{ id: string; name: string } | null>(null)
  const [q, setQ] = useState('')
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ groups: LoginGroup[] }>('/api/bilim-test')
      .then((j) => {
        setGroups(j.groups)
        if (j.groups.length === 1) setGroup(j.groups[0])
      })
      .catch((e) => {
        setGroups([])
        setErr(`Тізім жүктелмеді: ${e.message}. Бетті жаңартып көріңіз.`)
      })
  }, [])

  const submit = async (code: string) => {
    if (!student || code.length !== 4) return
    setBusy(true)
    setErr('')
    try {
      await api('/api/bilim-test/login', { studentId: student.id, pin: code })
      onDone()
    } catch (e: any) {
      setErr(e.message)
      setPin('')
      setBusy(false)
    }
  }

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
          <Logo />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">Білім тексеру</span>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 pb-16 pt-6">
        {!groups && <p className="py-20 text-center text-slate-400">Жүктелуде…</p>}

        {groups && !group && (
          <>
            <h1 className="text-2xl font-bold">Тобыңды таңда</h1>
            <div className="mt-4 space-y-2.5">
              {groups.map((g) => (
                <button key={g.id} onClick={() => setGroup(g)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left text-lg font-semibold active:bg-blue-50">
                  {g.name}
                  <span className="text-sm font-normal text-slate-400">{g.students.length} оқушы</span>
                </button>
              ))}
              {groups.length === 0 && (err ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{err}</p> : <p className="text-slate-500">Әзірге топ жоқ.</p>)}
            </div>
          </>
        )}

        {group && !student && (
          <>
            {groups && groups.length > 1 && (
              <button onClick={() => setGroup(null)} className="-ml-2 rounded-lg px-2 py-1 text-sm text-blue-600">← Топтар</button>
            )}
            <h1 className="mt-1 text-2xl font-bold">Кіру</h1>
            <p className="text-slate-500">{group.name} · өз атыңды тап</p>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Атыңды іздеу…"
              className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {group.students
                .filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase()))
                .map((s) => (
                  <li key={s.id}>
                    <button onClick={() => setStudent(s)} className="w-full px-4 py-3.5 text-left text-base font-medium active:bg-blue-50">
                      {s.name}
                    </button>
                  </li>
                ))}
            </ul>
          </>
        )}

        {student && (
          <div className="mx-auto max-w-sm pt-6 text-center">
            <button onClick={() => { setStudent(null); setPin(''); setErr('') }} className="rounded-lg px-2 py-1 text-sm text-blue-600">← Басқа ат</button>
            <h1 className="mt-3 text-2xl font-bold">{student.name}</h1>
            <p className="mt-1 text-slate-500">Мұғалім берген 4 таңбалы PIN-ді жаз</p>
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              value={pin}
              disabled={busy}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                setPin(v)
                if (v.length === 4) submit(v)
              }}
              className="mt-6 w-48 rounded-2xl border-2 border-slate-300 bg-white py-3 text-center font-mono text-4xl tracking-[.5em] outline-none focus:border-blue-500"
              placeholder="••••"
            />
            {err && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
            {busy && <p className="mt-4 text-sm text-slate-400">Тексерілуде…</p>}
          </div>
        )}
      </main>
    </>
  )
}

// ── Кабинет ──────────────────────────────────────────────

function Cabinet({ me, refresh, onLogout }: { me: Me; refresh: () => Promise<void>; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('tests')
  const [sheet, setSheet] = useState<{ examId: string; subject: SheetSubject } | null>(null)
  const [detail, setDetail] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const go = (t: Tab) => {
    setTab(t)
    setSheet(null)
    setDetail(null)
    window.scrollTo({ top: 0 })
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
          <Logo />
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0 text-right leading-tight">
              <div className="truncate text-sm font-semibold">{me.student.name}</div>
              <div className="truncate text-xs text-slate-500">{me.group.name}</div>
            </div>
            <button
              onClick={() => confirm('Кабинеттен шығасың ба?') && onLogout()}
              className="shrink-0 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-medium text-slate-600 active:bg-slate-100"
            >
              Шығу
            </button>
          </div>
        </div>
        {!sheet && (
          <nav className="mx-auto flex max-w-3xl gap-1 px-2">
            {([
              ['tests', 'Сынақ'],
              ['results', 'Нәтижелерім'],
              ['rating', 'Рейтинг'],
            ] as [Tab, string][]).map(([t, l]) => (
              <button
                key={t}
                onClick={() => go(t)}
                className={`flex-1 border-b-2 py-2.5 text-sm font-semibold ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
              >
                {l}
                {t === 'results' && me.results.length > 0 && <span className="ml-1 rounded-full bg-blue-100 px-1.5 text-xs text-blue-700">{me.results.length}</span>}
              </button>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-32 pt-5">
        {sheet ? (
          <div className="mx-auto max-w-xl">
            <AnswerSheet
              examId={sheet.examId}
              student={me.student.name}
              subject={sheet.subject}
              onBack={() => setSheet(null)}
              onSubmitted={async () => {
                setDone(sheet.subject.name)
                setSheet(null)
                await refresh()
                window.scrollTo({ top: 0 })
              }}
            />
          </div>
        ) : tab === 'tests' ? (
          <Tests me={me} done={done} onOpen={(examId, subject) => { setDone(null); setSheet({ examId, subject }) }} />
        ) : tab === 'results' ? (
          detail ? (
            <ResultDetail examId={detail} onBack={() => setDetail(null)} />
          ) : (
            <Results list={me.results} onOpen={setDetail} />
          )
        ) : (
          <Rating list={me.results} />
        )}
      </main>
    </>
  )
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-1 text-slate-500">{text}</p>
    </div>
  )
}

function Tests({ me, done, onOpen }: { me: Me; done: string | null; onOpen: (examId: string, s: SheetSubject) => void }) {
  return (
    <div className="mx-auto max-w-xl">
      {done && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <b>{done}</b> жауаптары қабылданды. Жарайсың!
        </div>
      )}
      {me.open.length === 0 && <Empty title="Қазір ашық сынақ жоқ" text="Мұғалім сынақты ашқанда осында пайда болады." />}
      {me.open.map((e) => (
        <section key={e.id} className="mb-6">
          <h1 className="text-xl font-bold">{e.title}: Білім тексеру</h1>
          <div className="mt-3 space-y-2.5">
            {e.subjects.map((s) => {
              const can = s.open && !s.done
              return (
                <button
                  key={s.id}
                  disabled={!can}
                  onClick={() => onOpen(e.id, s)}
                  className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left ${can ? 'border-blue-200 bg-white shadow-sm active:scale-[.99]' : 'border-slate-200 bg-slate-100/60'}`}
                >
                  <div>
                    <div className={`text-lg font-semibold ${can ? '' : 'text-slate-500'}`}>{s.name}</div>
                    <div className="text-sm text-slate-500">{s.questions} сұрақ</div>
                  </div>
                  {s.done ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">Тапсырылды ✓</span>
                  ) : s.open ? (
                    <span className="rounded-full bg-blue-600 px-3 py-1 text-sm font-semibold text-white">Бастау →</span>
                  ) : (
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-sm text-slate-500">Жабық</span>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
function Results({ list, onOpen }: { list: Summary[]; onOpen: (id: string) => void }) {
  if (!list.length) return <Empty title="Нәтиже әлі жоқ" text="Мұғалім нәтижені жариялағанда осында шығады." />
  const scored = list.filter((r) => r.score !== null)
  return (
    <>
    {scored.length > 0 && (
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="mb-3 font-bold">Менің өсуім</h3>
        <UbtTrend points={[...scored].reverse().slice(-8).map((r) => ({ label: r.title, total: r.score!, max: r.max }))} compact />
        <p className="mt-3 text-xs text-slate-400">Әр айдың нәтижесін ашсаң – тақырыптар бойынша талдау және келесі айға жоспар шығады.</p>
      </div>
    )}
    <div className="grid gap-4 sm:grid-cols-2">
      {list.map((r) => (
        <div key={r.examId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold">Білім тексеру · {r.title}</div>
          <div className="space-y-1.5 p-4 text-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-slate-500">Балл</span>
              <span><b className="text-2xl">{r.score ?? '—'}</b> <span className="text-slate-400">/ {r.max}</span></span>
            </div>
            <div className="flex justify-between"><span className="text-slate-500">Топтағы орны</span><b>{r.place ?? '—'} / {r.of}</b></div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-700">Дұрыс {r.correct}</span>
              <span className="rounded-md bg-red-50 px-2 py-0.5 text-red-600">Қате {r.wrong}</span>
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-amber-700">Бос {r.blank}</span>
            </div>
            {r.taken < r.subjects && <p className="text-xs text-slate-400">{r.subjects - r.taken} пән тапсырылмаған</p>}
          </div>
          <div className="px-4 pb-4">
            <button onClick={() => onOpen(r.examId)} className="w-full rounded-xl bg-blue-600 py-2.5 font-semibold text-white active:bg-blue-700">Толық нәтиже</button>
          </div>
        </div>
      ))}
    </div>
    </>
  )
}

function useResult(examId: string | null) {
  const [data, setData] = useState<StudentResult | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    setData(null)
    if (!examId) return
    api<StudentResult>(`/api/bilim-test/me/result?exam=${encodeURIComponent(examId)}`).then(setData, (e) => setErr(e.message))
  }, [examId])
  return { data, err }
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-extrabold ${tone ?? ''}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

function ResultDetail({ examId, onBack }: { examId: string; onBack: () => void }) {
  const { data, err } = useResult(examId)
  const [subj, setSubj] = useState<string | null>(null)
  const [q, setQ] = useState<number | null>(null)

  if (err) return <p className="rounded-xl bg-rose-50 p-4 text-rose-700">{err}</p>
  if (!data) return <p className="py-20 text-center text-slate-400">Жүктелуде…</p>

  const { exam, subs, rank, prev } = data
  const graded = exam.subjects.map((s) => {
    const sub = subs.find((x) => x.subject === s.id)
    return { s, sub, g: sub ? gradeSubject(s, exam.answer_key[s.id], sub.answers) : null }
  })
  const total = graded.some((x) => x.g) ? graded.reduce((a, x) => a + (x.g?.score ?? 0), 0) : null
  const correct = graded.reduce((a, x) => a + (x.g?.correct ?? 0), 0)
  const wrong = graded.reduce((a, x) => a + (x.g?.wrong.length ?? 0), 0)
  const blank = graded.reduce((a, x) => a + (x.g?.blank.length ?? 0), 0)
  const max = examMax(exam)
  const nowRow = Object.fromEntries(graded.map((x) => [x.s.id, x.g?.score ?? null]))
  const delta = commonDelta(nowRow, prev?.row)
  const cur = graded.find((x) => x.s.id === subj) ?? graded.find((x) => x.sub) ?? graded[0]
  const key = exam.answer_key[cur.s.id] ?? []
  const qs = exam.questions?.[cur.s.id] ?? []
  const stats = cur.sub ? topicStats(cur.s, key, cur.sub.answers, qs) : []
  const weak = weakTopics(stats)

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={onBack} className="-ml-2 rounded-lg px-2 py-1 text-sm text-blue-600">← Нәтижелерім</button>
        <a href={`/bilim-test/report?exam=${encodeURIComponent(exam.id)}`} className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-sm font-semibold text-blue-600">PDF жүктеу</a>
      </div>
      <h1 className="mt-2 text-2xl font-bold">{exam.title}: Білім тексеру</h1>

      <div className="mt-4 grid grid-cols-6 gap-2.5 sm:grid-cols-5 [&>*:nth-child(-n+2)]:col-span-3 [&>*]:col-span-2 sm:[&>*]:col-span-1 sm:[&>*:nth-child(-n+2)]:col-span-1">
        <Stat label="Балл" value={total !== null ? `${total}` : '—'} sub={total !== null ? `${max}-ден · ${fmtPct(pct(total, max))}` : ''} />
        <Stat label="Топтағы орны" value={rank ? `${rank.place} / ${rank.of}` : '—'} sub={delta !== null ? `${monthName(prev!.month)}мен салыстырғанда: ${sign(delta)}` : ''} />
        <Stat label="Дұрыс" value={`${correct}`} tone="text-emerald-600" />
        <Stat label="Қате" value={`${wrong}`} tone="text-red-600" />
        <Stat label="Бос" value={`${blank}`} tone="text-amber-600" />
      </div>

      {(() => {
        const fc = buildForecast(exam, nowRow, data.history)
        const pts: ChartPoint[] = [
          ...data.history.filter((h) => h.month < exam.month && h.total !== null).map((h) => ({ month: h.month, value: h.total!, max: h.max || max, kind: 'actual' as const })),
          ...(total !== null ? [{ month: exam.month, value: total, max: fc?.max ?? max, kind: 'actual' as const }] : []),
          ...(fc ? fc.months.map((m, i) => ({ month: m, value: fc.totals[i], max: fc.max, kind: 'forecast' as const })) : []),
        ]
        if (pts.length < 2) return null
        const end = fc?.totals.at(-1)
        return (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-bold">Динамика және болжам</h3>
              {fc && end !== undefined && total !== null && (
                <span className="text-sm text-slate-500">
                  {monthName(fc.months.at(-1)!)}ға дейін: <b className="text-blue-600">{end}</b> (+{end - total})
                </span>
              )}
            </div>
            <ProgressChart points={pts} target={end} />
            <p className="text-xs text-slate-400">Тұтас сызық — нақты нәтиже, үзік сызық — жүйелі дайындық жалғасқандағы болжам.</p>
          </div>
        )
      })()}

      {(() => {
        // Келесі айға жоспар: әр пән бойынша мақсат және қайталайтын тақырыптар
        const fc = buildForecast(exam, nowRow, data.history)
        if (!fc) return null
        const rows = graded
          .filter((x) => x.g && fc.perSubject[x.s.id])
          .map((x) => {
            const next = fc.perSubject[x.s.id][0]
            const st = x.sub ? topicStats(x.s, exam.answer_key[x.s.id] ?? [], x.sub.answers, exam.questions?.[x.s.id] ?? []) : []
            return { id: x.s.id, name: x.s.name, now: x.g!.score, next, max: x.s.max, weak: weakTopics(st).slice(0, 3) }
          })
          .sort((a, b) => b.next - b.now - (a.next - a.now))
        if (!rows.length) return null
        const month = monthName(fc.months[0])
        return (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-bold">Келесі айға жоспар</h3>
              <span className="text-sm text-slate-500">{month}: <b className="text-blue-600">{fc.totals[0]}</b> балл мақсат</span>
            </div>
            <div className="mt-3 space-y-3.5">
              {rows.map((r) => (
                <div key={r.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{r.name}</span>
                    <span className="tabular-nums"><b>{r.now}</b>{r.next > r.now && <span className="text-blue-600"> → {r.next} (+{r.next - r.now})</span>}<span className="text-slate-400"> / {r.max}</span></span>
                  </div>
                  <div className="relative mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-blue-200" style={{ width: `${(r.next / r.max) * 100}%` }} />
                    <div className="absolute inset-y-0 left-0 rounded-full bg-blue-600" style={{ width: `${(r.now / r.max) * 100}%` }} />
                  </div>
                  {r.weak.length > 0 && <p className="mt-1 text-xs text-slate-500">Қайталау: {r.weak.join(', ')}</p>}
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {graded.map((x) => (
          <button
            key={x.s.id}
            onClick={() => { setSubj(x.s.id); setQ(null) }}
            className={`shrink-0 rounded-xl border px-3 py-2 text-left text-sm ${x.s.id === cur.s.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white'}`}
          >
            <div className="font-semibold">{x.s.name}</div>
            <div className={x.s.id === cur.s.id ? 'text-blue-100' : 'text-slate-500'}>{x.g ? `${x.g.score} / ${x.s.max}` : x.sub ? 'тексерілмеген' : 'тапсырмаған'}</div>
          </button>
        ))}
      </div>

      {!cur.sub ? (
        <div className="mt-4"><Empty title="Бұл пән тапсырылмаған" text="" /></div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded bg-emerald-500 px-2 py-0.5 text-white">дұрыс</span>
              <span className="rounded bg-red-500 px-2 py-0.5 text-white">қате</span>
              <span className="rounded bg-amber-400 px-2 py-0.5 text-white">бос</span>
              <span className="text-slate-500">Нөмірді бас — сұрақ ашылады</span>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-1.5 sm:grid-cols-10 lg:grid-cols-5">
              {Array.from({ length: cur.s.questions }, (_, i) => {
                const a = cur.sub!.answers[i]
                const ok = key[i] && a === key[i]
                const cls = !key[i] ? 'bg-slate-200 text-slate-500' : !a ? 'bg-amber-400 text-white' : ok ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                return (
                  <button key={i} onClick={() => { setQ(i); setTimeout(() => document.getElementById('bt-q')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50) }} className={`h-10 rounded-lg text-sm font-bold ${cls} ${q === i ? 'ring-2 ring-blue-600 ring-offset-2' : ''}`}>
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>

          <div id="bt-q" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-4">
            {q === null ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Сұрақтың нөмірін таңда.</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">{q + 1}-сұрақ</h3>
                  {qs[q]?.topic && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">{qs[q]!.topic}</span>}
                </div>
                {qs[q]?.text && <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{qs[q]!.text}</p>}
                {qs[q]?.image && <img src={qs[q]!.image} alt={`${q + 1}-сұрақ`} className="mt-3 max-h-[420px] w-full rounded-lg border border-slate-100 object-contain" />}
                {!qs[q]?.text && !qs[q]?.image && <p className="mt-3 text-sm text-slate-400">Сұрақтың мәтіні енгізілмеген.</p>}
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className={`rounded-xl p-3 ${!cur.sub.answers[q] ? 'bg-amber-50' : cur.sub.answers[q] === key[q] ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    <div className="text-xs text-slate-500">Сенің жауабың</div>
                    <div className="text-xl font-bold">{cur.sub.answers[q] || '—'}</div>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-3">
                    <div className="text-xs text-slate-500">Дұрыс жауап</div>
                    <div className="text-xl font-bold text-emerald-700">{key[q] || '—'}</div>
                  </div>
                </div>
              </>
            )}
          </div>

          {stats.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-2">
              <h3 className="font-bold">Тақырыптар бойынша</h3>
              <div className="mt-3 space-y-2.5">
                {stats.map((t) => {
                  const p = t.correct / t.total
                  return (
                    <div key={t.topic} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,14rem)_1fr_auto]">
                      <span className="text-sm">{t.topic}</span>
                      <span className="text-sm font-semibold tabular-nums sm:order-last">{t.correct}/{t.total}</span>
                      <div className="col-span-2 h-2 overflow-hidden rounded-full bg-slate-100 sm:col-span-1">
                        <div className={`h-full rounded-full ${p >= 0.7 ? 'bg-emerald-500' : p >= 0.4 ? 'bg-amber-400' : 'bg-red-500'}`} style={{ width: `${p * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              {weak.length > 0 && (
                <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm">
                  <b className="text-red-700">Қайталау керек тақырыптар:</b> {weak.join(' · ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}

function Rating({ list }: { list: Summary[] }) {
  const [examId, setExamId] = useState<string | null>(list[0]?.examId ?? null)
  const { data, err } = useResult(examId)
  if (!list.length) return <Empty title="Рейтинг әлі жоқ" text="Мұғалім нәтижені жариялағанда осында шығады." />
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Топ рейтингі</h1>
        <select value={examId ?? ''} onChange={(e) => setExamId(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2">
          {list.map((r) => <option key={r.examId} value={r.examId}>{r.title}</option>)}
        </select>
      </div>
      {err && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-rose-700">{err}</p>}
      {!data && !err && <p className="py-16 text-center text-slate-400">Жүктелуде…</p>}
      {data && (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2.5">№</th>
                <th className="px-3 py-2.5">Оқушы</th>
                {data.exam.subjects.map((s) => <th key={s.id} className="px-2 py-2.5 text-right">{s.short}</th>)}
                <th className="px-3 py-2.5 text-right">Жалпы</th>
              </tr>
            </thead>
            <tbody>
              {data.table.map((r, i) => (
                <tr key={i} className={`border-b border-slate-100 last:border-0 ${r.me ? 'bg-blue-50 font-semibold' : ''}`}>
                  <td className="px-3 py-2 tabular-nums text-slate-500">{r.place}</td>
                  <td className="whitespace-nowrap px-3 py-2">{r.name}{r.me && <span className="ml-1.5 rounded bg-blue-600 px-1.5 text-xs text-white">сен</span>}</td>
                  {data.exam.subjects.map((s) => <td key={s.id} className="px-2 py-2 text-right tabular-nums">{r.scores[s.id] ?? '—'}</td>)}
                  <td className="px-3 py-2 text-right font-bold tabular-nums">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
