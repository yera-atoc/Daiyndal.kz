'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Runner, { UbtAnswer, UbtResult, type AttemptView } from '@/components/ielts/Runner'
import { UBT_COMBOS, comboName } from '@/lib/ubt'
import { UbtPlanView, UbtTrend } from '@/components/ielts/UbtGrowth'
import { SubjectCard } from '@/components/ielts/SubjectView'
import type { MySubject } from '@/lib/subjectTests'
import Questions, { BLUE, INK, LINE, MUTED } from '@/components/ielts/Questions'
import { CEFR, SECTION_NAME, SPEAKING_CRITERIA, WRITING_CRITERIA, isCorrect, sectionItems, type Exam, type Scores, type Section } from '@/lib/ielts'

// ── Әр емтиханның өз беті: /ubt, /ielts, /toefl ─────────────────────────────

export const EXAMS: Record<Exam, { name: string; title: string; tagline: string; accent: string; soft: string; href: string; materials?: string }> = {
  ubt: { name: 'ҰБТ', title: 'ҰБТ сынағы', tagline: '120 тапсырма · 140 балл · 240 минут', accent: '#2B6BF3', soft: '#EEF3FE', href: '/ubt' },
  ielts: { name: 'IELTS', title: 'IELTS mock', tagline: 'Listening · Reading · Writing · Speaking', accent: '#E5383B', soft: '#FDEDEE', href: '/ielts', materials: '/ielts/materials' },
  toefl: { name: 'TOEFL', title: 'TOEFL iBT mock', tagline: 'Reading · Listening · Writing · Speaking · 2026 формат', accent: '#0B0F19', soft: '#EDEFF3', href: '/toefl', materials: '/ielts/materials' },
}
const ORDER: Exam[] = ['ubt', 'ielts', 'toefl']
const PAPER = '#F5F7FB'

type Row = { id: string; name: string; group: string }
type Attempt = { id: string; status: string; started_at: string; submitted_at: string | null; published: boolean; scores: Scores; combo?: [string, string] | null }
type MyTest = {
  id: string
  title: string
  exam: Exam
  variant: 'academic' | 'general'
  mode: 'exam' | 'practice'
  sections: Section[]
  canStart: boolean
  attempts: Attempt[]
  combos?: [string, string][] | null // ҰБТ: мұғалім рұқсат еткен комбинациялар (бос — бәрі)
}
type Me = { student: { id: string; full_name: string }; tests: MyTest[] }

const band = (b: number | null | undefined) => (typeof b === 'number' ? b.toFixed(1) : '—')
const MON = ['қаң', 'ақп', 'нау', 'сәу', 'мам', 'мау', 'шіл', 'там', 'қыр', 'қаз', 'қар', 'жел']
const date = (s: string) => { const d = new Date(s); return `${d.getDate()} ${MON[d.getMonth()]}` }

export default function Portal({ exam }: { exam: Exam }) {
  const E = EXAMS[exam]
  const router = useRouter()
  const path = usePathname()
  const aid = useSearchParams().get('a')

  const [me, setMe] = useState<Me | null | undefined>(undefined)
  const [view, setView] = useState<AttemptView | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [pick, setPick] = useState<string | null>(null) // ҰБТ комбинациясын таңдау
  const [subjects, setSubjects] = useState<MySubject[]>([]) // пән тесттері (физика т.б.)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/ielts/me', { cache: 'no-store' })
      setMe(r.ok ? await r.json() : null)
      if (r.ok && exam === 'ubt')
        fetch('/api/ielts/subjects', { cache: 'no-store' })
          .then((x) => (x.ok ? x.json() : { subjects: [] }))
          .then((j) => setSubjects(j.subjects ?? []))
          .catch(() => {})
    } catch {
      setMe(null)
    }
  }, [exam])
  useEffect(() => {
    load()
  }, [load])

  // ?a=<attemptId> – тест немесе нәтиже ашық. Браузердің «артқа» батырмасы кабинетке қайтарады.
  const fetchView = useCallback(async (id: string) => {
    setErr('')
    const r = await fetch(`/api/ielts/attempt?id=${id}`, { cache: 'no-store' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) {
      setErr(j.error || 'Тест ашылмады')
      router.replace(path)
      return
    }
    setView(j)
  }, [router, path])
  useEffect(() => {
    if (aid) fetchView(aid)
    else setView(null)
  }, [aid, fetchView])

  const open = (id: string) => router.push(`${path}?a=${id}`)
  const home = () => {
    router.push(path)
    load()
  }
  const start = async (testId: string, combo?: [string, string]) => {
    setErr('')
    setBusy(true)
    try {
      const r = await fetch('/api/ielts/attempt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start', testId, combo }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) return setErr(j.error || 'Тест басталмады')
      setPick(null)
      open(j.id)
    } finally {
      setBusy(false)
    }
  }
  const logout = async () => {
    await fetch('/api/ielts/logout', { method: 'POST' })
    setMe(null)
    router.replace(path)
  }

  const cur = view && view.attempt.id === aid ? view : null
  if (me === undefined || (aid && !cur && !err)) return <Splash />
  if (me === null) return <Login exam={exam} onDone={load} />

  if (aid && cur) {
    const view = cur
    if (view.attempt.status === 'in_progress')
      return <Runner key={view.attempt.id} initial={view} student={me.student.full_name} onExit={home} onReview={() => fetchView(view.attempt.id)} />
    return (
      <Shell exam={exam} me={me} onLogout={logout}>
        <button onClick={() => router.push(path)} className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: BLUE }}>← Барлық тесттер</button>
        {view.test.content.ubt ? <UbtReview v={view} /> : <Review v={view} />}
      </Shell>
    )
  }

  const tests = me.tests.filter((t) => (t.exam ?? 'ielts') === exam)
  const others = ORDER.filter((x) => x !== exam && me.tests.some((t) => (t.exam ?? 'ielts') === x))
  const done = tests.flatMap((t) => t.attempts.filter((a) => a.status !== 'in_progress'))
  const best = exam === 'ubt'
    ? Math.max(...done.map((a) => a.scores?.ubt?.total ?? -1))
    : Math.max(...done.filter((a) => a.published).map((a) => (typeof a.scores?.overall === 'number' ? a.scores.overall : -1)))

  return (
    <Shell exam={exam} me={me} onLogout={logout}>
      <section className="rounded-3xl p-6 sm:p-8" style={{ background: E.soft }}>
        <p className="text-sm font-semibold" style={{ color: E.accent === INK ? MUTED : E.accent }}>Сәлем, {me.student.full_name.split(' ')[0]}!</p>
        <h1 className="font-display mt-1 text-2xl font-semibold sm:text-3xl">{E.title}</h1>
        <p className="mt-1 text-sm" style={{ color: MUTED }}>{E.tagline}</p>
        {(tests.length > 0 || !subjects.length) && <div className="mt-5 grid max-w-md grid-cols-3 gap-2">
          <Stat label="Тест" value={String(tests.length)} />
          <Stat label="Тапсырылды" value={String(done.length)} />
          {best >= 0 && <Stat label="Ең жақсы" value={exam === 'ubt' ? `${best} / 140` : band(best)} />}
        </div>}
      </section>

      {err && <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}

      {exam === 'ubt' && (() => {
        // Менің өсуім: сынақтан сынаққа балл және келесі сынаққа жоспар
        const hist = done
          .filter((a) => a.scores?.ubt)
          .sort((a, b) => (a.submitted_at ?? a.started_at).localeCompare(b.submitted_at ?? b.started_at))
        if (!hist.length) return null
        const last = hist[hist.length - 1]
        return (
          <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <div className="rounded-3xl bg-white p-5 ring-1 ring-[#E3E7F0] sm:p-6">
              <h2 className="font-display text-lg font-semibold">Менің өсуім</h2>
              <div className="mt-4">
                <UbtTrend points={hist.slice(-8).map((a) => ({ label: date(a.submitted_at ?? a.started_at), total: a.scores.ubt!.total, max: a.scores.ubt!.max }))} />
              </div>
              <a href={`/ubt/report?a=${last.id}`} className="mt-5 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white" style={{ background: INK }}>
                Соңғы нәтиженің PDF есебі
              </a>
            </div>
            <div className="rounded-3xl bg-white p-5 ring-1 ring-[#E3E7F0] sm:p-6">
              <UbtPlanView s={last.scores.ubt!} />
            </div>
          </section>
        )
      })()}

      {subjects.length > 0 && (
        <section className="mt-5">
          <h2 className="font-display mb-3 text-lg font-semibold">Пән тесттері</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {subjects.map((m) => <SubjectCard key={m.sheet.id} m={m} />)}
          </div>
        </section>
      )}

      <div className="mt-5 space-y-4">
        {tests.map((t) => (
          <TestCard key={t.id} t={t} exam={exam} busy={busy} onOpen={open} onStart={() => (exam === 'ubt' ? setPick(t.id) : start(t.id))} />
        ))}
      </div>

      {!tests.length && !subjects.length && (
        <div className="mt-5 rounded-3xl border bg-white p-8 text-center" style={{ borderColor: LINE }}>
          <p className="text-lg font-semibold">{E.name} бойынша сізге әлі тест ашылмаған</p>
          <p className="mt-1 text-sm" style={{ color: MUTED }}>Мұғалім тест ашқанда ол осы жерде пайда болады.</p>
          {others.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {others.map((x) => (
                <Link key={x} href={EXAMS[x].href} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white" style={{ background: EXAMS[x].accent }}>
                  {EXAMS[x].title} →
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {pick && <ComboSheet busy={busy} err={err} allowed={me?.tests.find((t) => t.id === pick)?.combos ?? null} onPick={(c) => start(pick, c)} onClose={() => setPick(null)} />}
    </Shell>
  )
}

// ── Қаңқа: жоғарғы жолақ + емтихан ауыстырғыш ─────────────────────────────

function Shell({ exam, me, onLogout, children }: { exam: Exam; me: Me; onLogout: () => void; children: React.ReactNode }) {
  const E = EXAMS[exam]
  const count = (x: Exam) => me.tests.filter((t) => (t.exam ?? 'ielts') === x).length
  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur" style={{ borderColor: LINE }}>
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
          <Link href="/" aria-label="Басты бет" className="shrink-0"><img src="/beles-logo.png" alt="Beles" className="h-7 w-auto" /></Link>
          <Switcher exam={exam} count={count} className="ml-2 hidden sm:flex" />
          <div className="ml-auto flex items-center gap-3">
            {E.materials && <Link href={E.materials} className="hidden text-sm font-semibold md:block" style={{ color: BLUE }}>Материалдар</Link>}
            <div className="text-right leading-tight">
              <div className="max-w-[140px] truncate text-sm font-semibold">{me.student.full_name}</div>
              <button onClick={onLogout} className="text-xs" style={{ color: MUTED }}>Шығу</button>
            </div>
          </div>
        </div>
        <div className="px-4 pb-2 sm:hidden"><Switcher exam={exam} count={count} /></div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-5 sm:py-8">{children}</main>
    </div>
  )
}

function Switcher({ exam, count, className = 'flex' }: { exam: Exam; count: (x: Exam) => number; className?: string }) {
  return (
    <nav className={`${className} rounded-xl p-1`} style={{ background: '#EEF0F4' }} aria-label="Емтихан">
      {ORDER.map((x) => {
        const on = x === exam
        return (
          <Link
            key={x}
            href={EXAMS[x].href}
            aria-current={on ? 'page' : undefined}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition"
            style={on ? { background: '#fff', color: INK, boxShadow: '0 1px 2px rgba(0,0,0,.08)' } : { color: MUTED }}
          >
            {EXAMS[x].name}
            {count(x) > 0 && <span className="rounded-full px-1.5 text-[11px] leading-4 text-white" style={{ background: on ? EXAMS[x].accent : '#A3AAB8' }}>{count(x)}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/80 px-3 py-2.5 sm:px-4">
      <div className="truncate text-xs" style={{ color: MUTED }}>{label}</div>
      <div className="whitespace-nowrap text-lg font-bold tabular-nums">{value}</div>
    </div>
  )
}

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: PAPER }}>
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200" style={{ borderTopColor: BLUE }} aria-label="Жүктелуде" />
    </div>
  )
}

// ── Тест карточкасы ─────────────────────────────────────────

function TestCard({ t, exam, busy, onOpen, onStart }: { t: MyTest; exam: Exam; busy: boolean; onOpen: (id: string) => void; onStart: () => void }) {
  const E = EXAMS[exam]
  const live = t.attempts.find((a) => a.status === 'in_progress')
  const past = t.attempts.filter((a) => a.status !== 'in_progress')
  const meta = exam === 'ubt'
    ? '3 міндетті + 2 бейіндік пән'
    : `${exam === 'toefl' ? 'TOEFL iBT' : t.variant === 'academic' ? 'Academic' : 'General Training'} · ${t.sections.map((s) => SECTION_NAME[s]).join(', ')}`
  return (
    <section className="overflow-hidden rounded-3xl border bg-white" style={{ borderColor: LINE }}>
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold leading-snug">{t.title}</h2>
            <p className="mt-1 text-sm" style={{ color: MUTED }}>{meta}</p>
            <span className="mt-2 inline-block rounded-md px-2 py-0.5 text-xs font-semibold" style={{ background: t.mode === 'exam' ? E.soft : '#ECFDF3', color: t.mode === 'exam' ? (E.accent === INK ? INK : E.accent) : '#027A48' }}>
              {t.mode === 'exam' ? 'Емтихан режимі · уақытпен' : 'Жаттығу режимі'}
            </span>
          </div>
          {live ? (
            <button onClick={() => onOpen(live.id)} className="w-full rounded-xl px-5 py-3 font-semibold text-white sm:w-auto" style={{ background: BLUE }}>Жалғастыру →</button>
          ) : t.canStart ? (
            <button disabled={busy} onClick={onStart} className="w-full rounded-xl px-5 py-3 font-semibold text-white disabled:opacity-60 sm:w-auto" style={{ background: E.accent }}>Бастау</button>
          ) : past.length ? (
            <span className="self-start rounded-lg px-3 py-1.5 text-sm font-semibold" style={{ background: '#ECFDF3', color: '#027A48' }}>✓ Тапсырылды</span>
          ) : null}
        </div>
        {live && <p className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: '#EEF3FE', color: '#1E40AF' }}>Тест басталған. Жауаптарыңыз сақталған – «Жалғастыру» арқылы тоқтаған жерден жалғастырыңыз.</p>}
        {!live && t.canStart && t.mode === 'exam' && (
          <p className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: '#FFF7ED', color: '#9A3412' }}>
            {exam === 'ubt' ? 'Бастағаннан кейін 240 минуттық таймер тоқтамайды. Калькулятор, Менделеев және ерігіштік кестесі рұқсат етіледі.' : 'Бастағаннан кейін таймер тоқтамайды. Listening аудиосы бір-ақ рет ойнайды. Құлаққап пен микрофонды алдын ала дайындаңыз.'}
          </p>
        )}
      </div>
      {past.map((a) => (
        <button key={a.id} onClick={() => onOpen(a.id)} className="flex w-full items-center gap-3 border-t px-5 py-3.5 text-left transition hover:bg-slate-50 sm:px-6" style={{ borderColor: LINE }}>
          <span className="w-14 shrink-0 text-sm" style={{ color: MUTED }}>{date(a.submitted_at ?? a.started_at)}</span>
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {exam === 'ubt' && a.scores?.ubt ? (
              <>
                <span className="truncate text-sm">{comboName(a.scores.ubt.combo)}</span>
                <span className="rounded-lg px-2 py-0.5 text-sm font-bold text-white" style={{ background: E.accent }}>{a.scores.ubt.total} / {a.scores.ubt.max}</span>
              </>
            ) : (
              <>
                {t.sections.map((s) => (
                  <span key={s} className="rounded-md border px-1.5 py-0.5 text-xs" style={{ borderColor: LINE }}>{SECTION_NAME[s]} <b>{band(a.scores?.[s]?.band)}</b></span>
                ))}
                <span className="rounded-md px-1.5 py-0.5 text-xs font-bold text-white" style={{ background: a.published ? E.accent : '#9CA3AF' }}>
                  {a.published ? `Overall ${band(a.scores?.overall)}` : 'Тексерілуде'}
                </span>
              </>
            )}
          </span>
          <span className="shrink-0 text-sm font-semibold" style={{ color: BLUE }}>Нәтиже ›</span>
        </button>
      ))}
    </section>
  )
}

function ComboSheet({ busy, err, allowed, onPick, onClose }: { busy: boolean; err: string; allowed: [string, string][] | null; onPick: (c: [string, string]) => void; onClose: () => void }) {
  const list = allowed?.length ? UBT_COMBOS.filter((c) => allowed.some((a) => a[0] === c[0] && a[1] === c[1])) : UBT_COMBOS
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 sm:max-w-lg sm:rounded-3xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h2 className="text-lg font-bold">Бейіндік пәндерді таңдаңыз</h2>
            <p className="mt-1 text-sm" style={{ color: MUTED }}>Міндетті пәндер барлығына ортақ: Қазақстан тарихы, Математикалық сауаттылық, Оқу сауаттылығы.</p>
          </div>
          <button onClick={onClose} aria-label="Жабу" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-lg">×</button>
        </div>
        {err && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        <div className="mt-4 grid gap-2">
          {list.map((c) => (
            <button key={c.join()} disabled={busy} onClick={() => onPick(c)} className="rounded-2xl border px-4 py-3.5 text-left font-semibold transition hover:border-[#2B6BF3] hover:bg-[#EEF3FE] disabled:opacity-60" style={{ borderColor: LINE }}>
              {comboName(c)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Кіру: аты → PIN ─────────────────────────────────────────

function Login({ exam, onDone }: { exam: Exam; onDone: () => void }) {
  const E = EXAMS[exam]
  const [list, setList] = useState<Row[] | null>(null)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Row | null>(null)
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    fetch(`/api/ielts?exam=${exam}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setList(j.students ?? []))
      .catch(() => {
        setList([])
        setErr('Тізім жүктелмеді. Интернетті тексеріп, бетті жаңартыңыз.')
      })
  }, [exam])
  const shown = useMemo(() => (list ?? []).filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase())), [list, q])

  const submit = async (code: string) => {
    if (!sel || code.length !== 4) return
    setBusy(true)
    setErr('')
    try {
      const r = await fetch('/api/ielts/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId: sel.id, pin: code }) })
      if (!r.ok) {
        setErr((await r.json().catch(() => ({}))).error || 'PIN қате')
        setPin('')
        return
      }
      onDone()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: PAPER, color: INK }}>
      <header className="mx-auto flex h-14 w-full max-w-md items-center justify-between px-4">
        <Link href="/" aria-label="Басты бет"><img src="/beles-logo.png" alt="Beles" className="h-7 w-auto" /></Link>
        <Link href="/login" className="text-sm font-medium" style={{ color: MUTED }}>Басқа кабинет</Link>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-10 pt-4 sm:pt-10">
        <div className="rounded-3xl border bg-white p-6 shadow-sm" style={{ borderColor: LINE }}>
          <span className="inline-block rounded-lg px-2.5 py-1 text-xs font-bold text-white" style={{ background: E.accent }}>{E.name}</span>
          <h1 className="font-display mt-3 text-2xl font-semibold">{E.title}</h1>
          <p className="mt-1 text-sm" style={{ color: MUTED }}>{E.tagline}</p>

          {!sel ? (
            <>
              <p className="mt-6 text-sm font-semibold">Атыңызды таңдаңыз</p>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Іздеу…" className="mt-2 w-full rounded-xl border bg-[#F5F7FB] px-4 py-3 text-base outline-none focus:border-[#2B6BF3] focus:bg-white" style={{ borderColor: LINE }} />
              <div className="-mx-2 mt-2 max-h-[45vh] overflow-y-auto">
                {list === null && <p className="py-8 text-center text-sm" style={{ color: MUTED }}>Жүктелуде…</p>}
                {shown.map((s) => (
                  <button key={s.id} onClick={() => { setSel(s); setErr('') }} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50 active:bg-slate-100">
                    <span className="font-medium">{s.name}</span>
                    <span className="shrink-0 text-xs" style={{ color: MUTED }}>{s.group} ›</span>
                  </button>
                ))}
                {list !== null && !list.length && !err && (
                  <p className="px-2 py-6 text-center text-sm leading-relaxed" style={{ color: MUTED }}>
                    {E.name} бойынша әзірге ашық тест жоқ. Мұғалім тест ашып, сізге рұқсат бергенде атыңыз осында шығады.
                  </p>
                )}
                {list !== null && list.length > 0 && !shown.length && <p className="py-6 text-center text-sm" style={{ color: MUTED }}>Ешкім табылмады</p>}
              </div>
              {err && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
            </>
          ) : (
            <div className="mt-6 text-center">
              <p className="text-lg font-semibold">{sel.name}</p>
              <p className="mt-1 text-sm" style={{ color: MUTED }}>Мұғалім берген 4 таңбалы PIN</p>
              <input
                value={pin}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setPin(v)
                  if (v.length === 4) submit(v)
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                disabled={busy}
                aria-label="PIN"
                placeholder="••••"
                className="mt-5 w-48 rounded-2xl border-2 bg-white py-3 text-center font-mono text-4xl tracking-[.5em] outline-none focus:border-[#2B6BF3]"
                style={{ borderColor: LINE }}
              />
              {busy && <p className="mt-3 text-sm" style={{ color: MUTED }}>Тексерілуде…</p>}
              {err && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
              <button type="button" onClick={() => { setSel(null); setPin(''); setErr('') }} className="mt-5 text-sm font-medium" style={{ color: BLUE }}>← Басқа оқушы</button>
            </div>
          )}
        </div>
        {E.materials && (
          <Link href={E.materials} className="mt-4 block rounded-2xl border bg-white px-5 py-4 text-sm font-semibold" style={{ borderColor: LINE }}>
            {E.name} дайындық материалдары <span style={{ color: BLUE }}>→</span>
          </Link>
        )}
      </main>
    </div>
  )
}

// ── Нәтиже ──────────────────────────────────────────────────

function Review({ v }: { v: AttemptView }) {
  const a = v.attempt
  const c = v.test.content
  const s: Scores = a.scores ?? {}
  const order = a.state.order
  const toefl = v.test.exam === 'toefl'
  return (
    <>
      <h1 className="mt-3 text-2xl font-bold">{v.test.title}</h1>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {order.map((sec) => (
          <div key={sec} className="rounded-2xl border bg-white p-4" style={{ borderColor: LINE }}>
            <div className="text-xs font-semibold uppercase" style={{ color: MUTED }}>{SECTION_NAME[sec]}</div>
            <div className="mt-1 text-3xl font-bold">{band(s[sec]?.band)}</div>
            {(sec === 'listening' || sec === 'reading') && s[sec] && <div className="text-xs" style={{ color: MUTED }}>{s[sec]!.raw} / {s[sec]!.of} дұрыс</div>}
          </div>
        ))}
        <div className="rounded-2xl p-4 text-white" style={{ background: INK }}>
          <div className="text-xs font-semibold uppercase opacity-70">Overall</div>
          <div className="mt-1 text-3xl font-bold">{a.published ? band(s.overall) : '…'}</div>
          {!a.published && <div className="text-xs opacity-70">мұғалім тексеруде</div>}
          {a.published && toefl && typeof s.overall === 'number' && <div className="text-xs opacity-70">1–6 шкала · CEFR {CEFR[s.overall] ?? ''}</div>}
        </div>
      </div>

      {a.published && (a.feedback?.general || a.feedback?.writing || a.feedback?.speaking) && (
        <section className="mt-5 rounded-2xl border bg-white p-5" style={{ borderColor: LINE }}>
          <h2 className="font-bold">Мұғалімнің пікірі</h2>
          {(['general', 'writing', 'speaking'] as const).map((k) => a.feedback?.[k] ? (
            <div key={k} className="mt-3">
              <div className="text-xs font-semibold uppercase" style={{ color: MUTED }}>{k === 'general' ? 'Жалпы' : SECTION_NAME[k]}</div>
              <p className="mt-1 whitespace-pre-wrap">{a.feedback[k]}</p>
            </div>
          ) : null)}
        </section>
      )}

      {a.published && toefl && (s.writing || s.speaking) && (
        <section className="mt-5 rounded-2xl border bg-white p-5" style={{ borderColor: LINE }}>
          <h2 className="font-bold">Тапсырмалар бойынша (1–6)</h2>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {([
                ['Build a Sentence', s.writing?.build ? `${band(s.writing.build.band)} (${s.writing.build.raw}/${s.writing.build.of})` : null],
                ['Write an Email', s.writing?.email],
                ['Academic Discussion', s.writing?.discussion],
                ['Listen and Repeat', s.speaking?.repeat],
                ['Take an Interview', s.speaking?.interview],
              ] as [string, number | string | null | undefined][]).filter(([, x]) => x !== undefined && x !== null).map(([k, x]) => (
                <tr key={k} className="border-t" style={{ borderColor: LINE }}><td className="py-2">{k}</td><td className="py-2 text-right font-bold">{typeof x === 'number' ? band(x) : x}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {a.published && !toefl && s.writing && (
        <section className="mt-5 rounded-2xl border bg-white p-5" style={{ borderColor: LINE }}>
          <h2 className="font-bold">Writing критерийлері</h2>
          <CriteriaTable rows={WRITING_CRITERIA} cols={[['Task 1', s.writing.task1], ['Task 2', s.writing.task2]]} />
        </section>
      )}
      {a.published && !toefl && s.speaking && (
        <section className="mt-5 rounded-2xl border bg-white p-5" style={{ borderColor: LINE }}>
          <h2 className="font-bold">Speaking критерийлері</h2>
          <CriteriaTable rows={SPEAKING_CRITERIA} cols={[['Band', s.speaking.criteria]]} />
        </section>
      )}

      {/* Дұрыс жауаптар тек мұғалім жариялағанда көрінеді */}
      {a.published && (['listening', 'reading'] as const).filter((x) => order.includes(x)).map((sec) => {
        const items = sectionItems(c, sec)
        const ans = a.answers?.[sec] ?? {}
        const map = new Map(items.map((it) => [it.n, it]))
        const parts = sec === 'listening' ? c.listening?.parts ?? [] : c.reading?.passages ?? []
        return (
          <section key={sec} className="mt-5 rounded-2xl border bg-white p-5" style={{ borderColor: LINE }}>
            <h2 className="font-bold">{SECTION_NAME[sec]} — жауаптар</h2>
            {parts.map((p, i) => (
              <div key={i} className="mt-4">
                <div className="mb-2 text-sm font-semibold" style={{ color: MUTED }}>{p.title}</div>
                <Questions
                  groups={p.groups}
                  answers={ans}
                  onChange={() => {}}
                  disabled
                  review={(n) => {
                    const it = map.get(n)
                    return it ? { ok: isCorrect(it.type, ans[String(n)], it.answer), correct: it.answer } : null
                  }}
                />
              </div>
            ))}
          </section>
        )
      })}
      {!a.published && <p className="mt-6 rounded-2xl bg-white p-5 text-sm" style={{ color: MUTED }}>Дұрыс жауаптар мен толық талдау мұғалім нәтижені жариялағанда ашылады.</p>}
    </>
  )
}

function CriteriaTable({ rows, cols }: { rows: [string, string][]; cols: [string, Record<string, number | null> | undefined][] }) {
  return (
    <table className="mt-3 w-full text-sm">
      <thead>
        <tr style={{ color: MUTED }}>
          <th className="py-1 text-left font-medium">Критерий</th>
          {cols.map(([h]) => <th key={h} className="w-24 py-1 text-right font-medium">{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map(([k, label]) => (
          <tr key={k} className="border-t" style={{ borderColor: LINE }}>
            <td className="py-2">{label}</td>
            {cols.map(([h, v]) => <td key={h} className="py-2 text-right font-bold">{band(v?.[k])}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function UbtReview({ v }: { v: AttemptView }) {
  const u = v.test.content.ubt!
  const ans = v.attempt.answers?.ubt ?? {}
  const sc = v.attempt.scores?.ubt
  return (
    <>
      <h1 className="mt-3 text-2xl font-bold">{v.test.title}</h1>
      {sc && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`/ubt/report?a=${v.attempt.id}`} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white" style={{ background: INK }}>PDF есеп</a>
          </div>
          <UbtResult s={sc} />
          <div className="mt-4 rounded-3xl bg-white p-5 ring-1 ring-[#E3E7F0] sm:p-6"><UbtPlanView s={sc} /></div>
        </>
      )}
      {v.attempt.published ? (
        [...u.compulsory, ...u.profile].map((s) => (
          <section key={s.key} className="mt-5 rounded-2xl border bg-white p-5" style={{ borderColor: LINE }}>
            <h2 className="font-bold">{s.name}</h2>
            {s.questions.map((q, i) => (
              <div key={q.id} className="mt-5 border-t pt-4" style={{ borderColor: LINE }}>
                {q.context && i > 0 && s.questions[i - 1].context === q.context ? null : q.context && <div className="mb-3 whitespace-pre-wrap rounded-xl border p-3 text-sm leading-6" style={{ borderColor: LINE, background: '#FAFBFD' }}>{q.context}</div>}
                <p className="whitespace-pre-wrap font-medium"><b>{i + 1}.</b> {q.text}</p>
                <UbtAnswer q={q} value={ans[q.id] ?? []} onChange={() => {}} disabled review />
              </div>
            ))}
          </section>
        ))
      ) : (
        <p className="mt-6 rounded-2xl bg-white p-5 text-sm" style={{ color: MUTED }}>Дұрыс жауаптар мен талдау мұғалім нәтижені жариялағанда ашылады.</p>
      )}
    </>
  )
}
