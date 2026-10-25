'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Runner, { UbtAnswer, UbtResult, type AttemptView } from '@/components/ielts/Runner'
import { UBT_COMBOS, comboName } from '@/lib/ubt'
import Questions, { BLUE, INK, LINE, MUTED } from '@/components/ielts/Questions'
import { CEFR, EXAM_NAME, SECTION_NAME, SPEAKING_CRITERIA, WRITING_CRITERIA, isCorrect, sectionItems, type Exam, type Scores, type Section } from '@/lib/ielts'

type Row = { id: string; name: string; group: string }
type MyTest = {
  id: string
  title: string
  exam: Exam
  variant: 'academic' | 'general'
  mode: 'exam' | 'practice'
  sections: Section[]
  canStart: boolean
  attempts: { id: string; status: string; started_at: string; submitted_at: string | null; published: boolean; scores: Scores; combo?: [string, string] | null }[]
}

const band = (b: number | null | undefined) => (typeof b === 'number' ? b.toFixed(1) : '—')

export default function IeltsStudentPage() {
  const [me, setMe] = useState<{ student: { id: string; full_name: string }; tests: MyTest[] } | null | undefined>(undefined)
  const [run, setRun] = useState<AttemptView | null>(null)
  const [review, setReview] = useState<AttemptView | null>(null)
  const [err, setErr] = useState('')
  const [pick, setPick] = useState<string | null>(null) // ҰБТ: комбинация таңдау терезесі

  const load = useCallback(async () => {
    const r = await fetch('/api/ielts/me', { cache: 'no-store' })
    setMe(r.ok ? await r.json() : null)
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const open = async (id: string, mode: 'run' | 'review') => {
    setErr('')
    const r = await fetch(`/api/ielts/attempt?id=${id}`, { cache: 'no-store' })
    const j = await r.json()
    if (!r.ok) return setErr(j.error || 'Қате')
    if (mode === 'run' && j.attempt.status === 'in_progress') setRun(j)
    else setReview(j)
  }
  const start = async (testId: string, combo?: [string, string]) => {
    setErr('')
    setPick(null)
    const r = await fetch('/api/ielts/attempt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start', testId, combo }) })
    const j = await r.json()
    if (!r.ok) return setErr(j.error || 'Қате')
    open(j.id, 'run')
  }

  if (me === undefined) return <div className="p-10 text-center" style={{ color: MUTED }}>Жүктелуде…</div>
  if (me === null) return <Login onDone={load} />
  if (run) return <Runner initial={run} student={me.student.full_name} onExit={() => { setRun(null); load() }} />
  if (review) return <Review v={review} onBack={() => setReview(null)} />

  return (
    <main className="min-h-screen" style={{ background: '#F5F7FB', color: INK }}>
      <header className="border-b bg-white" style={{ borderColor: LINE }}>
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <img src="/beles-logo.png" alt="Beles" className="h-8 w-auto" />
          <div className="ml-1 border-l pl-3 text-sm font-bold" style={{ borderColor: LINE }}>IELTS · TOEFL · ҰБТ</div>
          <a href="/ielts/materials" className="ml-auto text-sm font-semibold" style={{ color: BLUE }}>Дайындық материалдары</a>
          <div className="ml-4 text-right text-sm">
            <div className="font-semibold">{me.student.full_name}</div>
            <button
              onClick={async () => {
                await fetch('/api/ielts/logout', { method: 'POST' })
                setMe(null)
              }}
              className="text-xs underline"
              style={{ color: MUTED }}
            >
              Шығу
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6">
        {err && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}
        {!me.tests.length && <div className="rounded-xl bg-white p-8 text-center" style={{ color: MUTED }}>Сізге әлі тест ашылмаған. Мұғаліміңізге хабарласыңыз.</div>}
        <div className="space-y-4">
          {me.tests.map((t) => {
            const open_ = t.attempts.find((a) => a.status === 'in_progress')
            return (
              <section key={t.id} className="rounded-2xl border bg-white p-5" style={{ borderColor: LINE }}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold">{t.title}</h2>
                    <div className="mt-1 text-sm" style={{ color: MUTED }}>
                      {t.exam === 'ubt' ? 'ҰБТ · 120 тапсырма · 140 балл · 240 минут' : t.exam === 'toefl' ? 'TOEFL iBT' : t.variant === 'academic' ? 'IELTS Academic' : 'IELTS General Training'} {t.exam !== 'ubt' && <> · {t.sections.map((s) => SECTION_NAME[s]).join(', ')} · {t.mode === 'exam' ? 'емтихан режимі (уақытпен)' : 'жаттығу'}</>}
                    </div>
                  </div>
                  {open_ ? (
                    <button onClick={() => open(open_.id, 'run')} className="rounded-lg px-4 py-2.5 font-semibold text-white" style={{ background: BLUE }}>Жалғастыру</button>
                  ) : t.canStart ? (
                    <button onClick={() => (t.exam === 'ubt' ? setPick(t.id) : start(t.id))} className="rounded-lg px-4 py-2.5 font-semibold text-white" style={{ background: INK }}>Тестті бастау</button>
                  ) : null}
                </div>
                {!open_ && t.canStart && t.mode === 'exam' && (
                  <p className="mt-3 rounded-lg px-3 py-2 text-sm" style={{ background: '#FFF7ED', color: '#9A3412' }}>
                    {t.exam === 'ubt' ? 'Бастағаннан кейін 240 минуттық таймер тоқтамайды. Калькулятор, Менделеев кестесі және ерігіштік кестесі рұқсат етіледі.' : 'Бастағаннан кейін таймер тоқтамайды. Listening аудиосы бір-ақ рет ойнайды. Құлаққап пен микрофонды алдын ала дайындаңыз.'}
                  </p>
                )}
                {t.attempts.filter((a) => a.status !== 'in_progress').map((a) => (
                  <div key={a.id} className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4" style={{ borderColor: LINE }}>
                    <span className="mr-2 text-sm" style={{ color: MUTED }}>{new Date(a.submitted_at ?? a.started_at).toLocaleDateString('kk-KZ')}</span>
                    {t.exam === 'ubt' && a.scores?.ubt ? (
                      <>
                        <span className="text-sm">{comboName(a.scores.ubt.combo)}</span>
                        <span className="rounded-lg px-2.5 py-1 text-sm font-bold text-white" style={{ background: BLUE }}>{a.scores.ubt.total} / {a.scores.ubt.max}</span>
                      </>
                    ) : (
                      <>
                        {t.sections.map((s) => (
                          <span key={s} className="rounded-lg border px-2.5 py-1 text-sm" style={{ borderColor: LINE }}>
                            {SECTION_NAME[s]} <b>{band(a.scores?.[s]?.band)}</b>
                          </span>
                        ))}
                        <span className="rounded-lg px-2.5 py-1 text-sm font-bold text-white" style={{ background: a.published ? BLUE : '#9CA3AF' }}>
                          Overall {a.published ? band(a.scores?.overall) : '· тексерілуде'}
                        </span>
                      </>
                    )}
                    <button onClick={() => open(a.id, 'review')} className="ml-auto text-sm font-semibold underline" style={{ color: BLUE }}>Толық нәтиже</button>
                  </div>
                ))}
              </section>
            )
          })}
        </div>
      </div>
      {pick && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPick(null)}>
          <div role="dialog" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Бейіндік пәндер комбинациясын таңдаңыз</h2>
            <p className="mt-1 text-sm" style={{ color: MUTED }}>Міндетті пәндер: Қазақстан тарихы, Математикалық сауаттылық, Оқу сауаттылығы.</p>
            <div className="mt-4 grid gap-2">
              {UBT_COMBOS.map((c) => (
                <button key={c.join()} onClick={() => start(pick, c)} className="rounded-lg border px-4 py-3 text-left font-semibold hover:border-[#2B6BF3] hover:bg-[#EEF3FE]" style={{ borderColor: LINE }}>
                  {comboName(c)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function Login({ onDone }: { onDone: () => void }) {
  const [list, setList] = useState<Row[]>([])
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Row | null>(null)
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    fetch('/api/ielts', { cache: 'no-store' }).then((r) => r.json()).then((j) => setList(j.students ?? []))
  }, [])
  const shown = useMemo(() => list.filter((s) => s.name.toLowerCase().includes(q.toLowerCase())), [list, q])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sel) return
    setBusy(true)
    setErr('')
    const r = await fetch('/api/ielts/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId: sel.id, pin }) })
    setBusy(false)
    if (!r.ok) return setErr((await r.json().catch(() => ({}))).error || 'Қате')
    onDone()
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4" style={{ background: '#F5F7FB', color: INK }}>
      <div className="w-full max-w-md rounded-2xl border bg-white p-6" style={{ borderColor: LINE }}>
        <img src="/beles-logo.png" alt="Beles" className="h-9 w-auto" />
        <div className="mt-4 flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-bold">Beles mock тесттер</h1>
          <a href="/ielts/materials" className="text-sm font-semibold" style={{ color: BLUE }}>Дайындық материалдары →</a>
        </div>
        {!sel ? (
          <>
            <p className="mt-1 text-sm" style={{ color: MUTED }}>Атыңызды таңдаңыз</p>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Іздеу…" className="mt-4 w-full rounded-lg border px-3 py-2.5 outline-none focus:border-[#2B6BF3]" style={{ borderColor: LINE }} />
            <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
              {shown.map((s) => (
                <button key={s.id} onClick={() => setSel(s)} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-slate-50">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs" style={{ color: MUTED }}>{s.group}</span>
                </button>
              ))}
              {!list.length && <p className="py-6 text-center text-sm" style={{ color: MUTED }}>Әзірге ашық тест жоқ. Мұғалім тест ашып, сізге рұқсат бергенде атыңыз осында шығады.</p>}
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="mt-1 text-sm" style={{ color: MUTED }}>{sel.name} · мұғалім берген 4 таңбалы PIN</p>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              autoFocus
              aria-label="PIN"
              className="mt-4 w-full rounded-lg border px-3 py-3 text-center font-mono text-3xl tracking-[0.6em] outline-none focus:border-[#2B6BF3]"
              style={{ borderColor: LINE }}
            />
            {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
            <button disabled={pin.length !== 4 || busy} className="mt-4 w-full rounded-lg py-3 font-semibold text-white disabled:opacity-50" style={{ background: INK }}>{busy ? '…' : 'Кіру'}</button>
            <button type="button" onClick={() => { setSel(null); setPin(''); setErr('') }} className="mt-2 w-full py-2 text-sm" style={{ color: MUTED }}>← Басқа оқушы</button>
          </form>
        )}
      </div>
    </main>
  )
}

function Review({ v, onBack }: { v: AttemptView; onBack: () => void }) {
  const a = v.attempt
  const c = v.test.content
  const s: Scores = a.scores ?? {}
  const order = a.state.order
  const toefl = v.test.exam === 'toefl'
  if (v.test.content.ubt) return <UbtReview v={v} onBack={onBack} />
  return (
    <main className="min-h-screen" style={{ background: '#F5F7FB', color: INK }}>
      <div className="mx-auto max-w-4xl px-4 py-6">
        <button onClick={onBack} className="text-sm font-semibold" style={{ color: BLUE }}>← Кабинет</button>
        <h1 className="mt-3 text-2xl font-bold">{v.test.title}</h1>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {order.map((sec) => (
            <div key={sec} className="rounded-xl border bg-white p-4" style={{ borderColor: LINE }}>
              <div className="text-xs font-semibold uppercase" style={{ color: MUTED }}>{SECTION_NAME[sec]}</div>
              <div className="mt-1 text-3xl font-bold">{band(s[sec]?.band)}</div>
              {(sec === 'listening' || sec === 'reading') && s[sec] && <div className="text-xs" style={{ color: MUTED }}>{s[sec]!.raw} / {s[sec]!.of} дұрыс</div>}
            </div>
          ))}
          <div className="rounded-xl p-4 text-white" style={{ background: INK }}>
            <div className="text-xs font-semibold uppercase opacity-70">Overall</div>
            <div className="mt-1 text-3xl font-bold">{a.published ? band(s.overall) : '…'}</div>
            {!a.published && <div className="text-xs opacity-70">мұғалім тексеруде</div>}
            {a.published && toefl && typeof s.overall === 'number' && <div className="text-xs opacity-70">1–6 шкала · CEFR {CEFR[s.overall] ?? ''}</div>}
          </div>
        </div>

        {a.published && (a.feedback?.general || a.feedback?.writing || a.feedback?.speaking) && (
          <section className="mt-5 rounded-xl border bg-white p-5" style={{ borderColor: LINE }}>
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
          <section className="mt-5 rounded-xl border bg-white p-5" style={{ borderColor: LINE }}>
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
          <section className="mt-5 rounded-xl border bg-white p-5" style={{ borderColor: LINE }}>
            <h2 className="font-bold">Writing критерийлері</h2>
            <CriteriaTable rows={WRITING_CRITERIA} cols={[['Task 1', s.writing.task1], ['Task 2', s.writing.task2]]} />
          </section>
        )}
        {a.published && !toefl && s.speaking && (
          <section className="mt-5 rounded-xl border bg-white p-5" style={{ borderColor: LINE }}>
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
            <section key={sec} className="mt-5 rounded-xl border bg-white p-5" style={{ borderColor: LINE }}>
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
        {!a.published && <p className="mt-6 text-sm" style={{ color: MUTED }}>Дұрыс жауаптар мен толық талдау мұғалім нәтижені жариялағанда ашылады.</p>}
      </div>
    </main>
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

function UbtReview({ v, onBack }: { v: AttemptView; onBack: () => void }) {
  const u = v.test.content.ubt!
  const ans = v.attempt.answers?.ubt ?? {}
  const sc = v.attempt.scores?.ubt
  return (
    <main className="min-h-screen" style={{ background: '#F5F7FB', color: INK }}>
      <div className="mx-auto max-w-4xl px-4 py-6">
        <button onClick={onBack} className="text-sm font-semibold" style={{ color: BLUE }}>← Кабинет</button>
        <h1 className="mt-3 text-2xl font-bold">{v.test.title}</h1>
        {sc && <UbtResult s={sc} />}
        {v.attempt.published ? (
          [...u.compulsory, ...u.profile].map((s) => (
            <section key={s.key} className="mt-5 rounded-xl border bg-white p-5" style={{ borderColor: LINE }}>
              <h2 className="font-bold">{s.name}</h2>
              {s.questions.map((q, i) => (
                <div key={q.id} className="mt-5 border-t pt-4" style={{ borderColor: LINE }}>
                  {q.context && i > 0 && s.questions[i - 1].context === q.context ? null : q.context && <div className="mb-3 whitespace-pre-wrap rounded-lg border p-3 text-sm leading-6" style={{ borderColor: LINE, background: '#FAFBFD' }}>{q.context}</div>}
                  <p className="whitespace-pre-wrap font-medium"><b>{i + 1}.</b> {q.text}</p>
                  <UbtAnswer q={q} value={ans[q.id] ?? []} onChange={() => {}} disabled review />
                </div>
              ))}
            </section>
          ))
        ) : (
          <p className="mt-6 text-sm" style={{ color: MUTED }}>Дұрыс жауаптар мен талдау мұғалім нәтижені жариялағанда ашылады.</p>
        )}
      </div>
    </main>
  )
}
