'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Builder, { inp, tcall } from '@/components/ielts/Builder'
import { BLUE, INK, LINE, MUTED } from '@/components/ielts/Questions'
import { SECTION_NAME, SPEAKING_CRITERIA, WRITING_CRITERIA, speakingBand, writingBand, overallBand, wordCount, type Attempt, type IeltsTest, type Scores } from '@/lib/ielts'

type Data = {
  me: { admin: boolean; teacher: { id: string; name: string } | null }
  tests: (Pick<IeltsTest, 'id' | 'title' | 'variant' | 'mode' | 'published' | 'teacher_id'> & { created_at: string })[]
  students: { id: string; full_name: string; group_id: string | null; grade: string | null; status: string; ielts_pin: string | null }[]
  groups: { id: string; name: string }[]
  access: { test_id: string; student_id: string; attempts_allowed: number }[]
  attempts: { id: string; test_id: string; student_id: string; status: string; scores: Scores; published: boolean; started_at: string; submitted_at: string | null }[]
}

const band = (b: number | null | undefined) => (typeof b === 'number' ? b.toFixed(1) : '—')
const STATUS: Record<string, [string, string]> = {
  in_progress: ['Тапсырып жатыр', '#F59E0B'],
  submitted: ['Тексеру керек', '#E5383B'],
  graded: ['Бағаланды', '#15803D'],
}

export default function IeltsTeacherPage() {
  const [data, setData] = useState<Data | null>(null)
  const [view, setView] = useState<{ k: 'list' } | { k: 'edit'; test: any } | { k: 'access'; id: string } | { k: 'grade'; id: string }>({ k: 'list' })
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const r = await fetch('/api/ielts/teacher', { cache: 'no-store' })
    if (r.status === 401) {
      location.href = '/teacher/login?next=/ielts/teacher'
      return
    }
    const j = await r.json()
    if (!r.ok) return setErr(j.error || 'Қате')
    setData(j)
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const edit = async (id?: string) => {
    if (!id) return setView({ k: 'edit', test: null })
    const r = await fetch(`/api/ielts/teacher?test=${id}`, { cache: 'no-store' })
    if (r.ok) setView({ k: 'edit', test: await r.json() })
  }

  if (err) return <Shell><div className="m-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{err}. Supabase-та <code>migration_ielts.sql</code> іске қосылғанын тексеріңіз.</div></Shell>
  if (!data) return <Shell><div className="p-10 text-center" style={{ color: MUTED }}>Жүктелуде…</div></Shell>

  if (view.k === 'edit') return <Shell data={data}><Builder initial={view.test} onClose={(s) => { setView({ k: 'list' }); if (s) load() }} /></Shell>
  if (view.k === 'access') return <Shell data={data}><Access data={data} testId={view.id} onBack={() => { setView({ k: 'list' }); load() }} reload={load} /></Shell>
  if (view.k === 'grade') return <Shell data={data}><Grade id={view.id} onBack={() => { setView({ k: 'list' }); load() }} /></Shell>

  const name = (id: string) => data.students.find((s) => s.id === id)?.full_name ?? '—'
  const toGrade = data.attempts.filter((a) => a.status === 'submitted')

  return (
    <Shell data={data}>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Тесттер" value={data.tests.length} />
          <Stat label="Рұқсаты бар оқушылар" value={new Set(data.access.map((a) => a.student_id)).size} />
          <Stat label="Тапсырулар" value={data.attempts.length} />
          <Stat label="Тексеру керек" value={toGrade.length} accent={toGrade.length > 0} />
        </div>

        {toGrade.length > 0 && (
          <section className="mt-5 rounded-2xl border bg-white p-5" style={{ borderColor: LINE }}>
            <h2 className="font-bold">Writing / Speaking тексеру керек</h2>
            <div className="mt-2 divide-y" style={{ borderColor: LINE }}>
              {toGrade.map((a) => (
                <button key={a.id} onClick={() => setView({ k: 'grade', id: a.id })} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-slate-50">
                  <span className="font-medium">{name(a.student_id)}</span>
                  <span className="text-sm" style={{ color: MUTED }}>{data.tests.find((t) => t.id === a.test_id)?.title}</span>
                  <span className="ml-auto text-sm font-semibold" style={{ color: BLUE }}>Тексеру →</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="mt-6 flex items-center">
          <h2 className="text-lg font-bold">Тесттер</h2>
          <button onClick={() => edit()} className="ml-auto rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{ background: INK }}>+ Жаңа тест</button>
        </div>
        {!data.tests.length && <div className="mt-3 rounded-2xl border bg-white p-8 text-center text-sm" style={{ borderColor: LINE, color: MUTED }}>Әлі тест жоқ. «Жаңа тест» батырмасын басып, Listening аудиосы мен сұрақтарды енгізіңіз.</div>}
        <div className="mt-3 space-y-3">
          {data.tests.map((t) => {
            const acc = data.access.filter((a) => a.test_id === t.id)
            const att = data.attempts.filter((a) => a.test_id === t.id)
            return (
              <section key={t.id} className="rounded-2xl border bg-white p-5" style={{ borderColor: LINE }}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold">{t.title}</h3>
                  <span className="rounded px-2 py-0.5 text-xs font-semibold" style={t.published ? { background: '#DCFCE7', color: '#15803D' } : { background: '#F3F4F6', color: MUTED }}>{t.published ? 'Ашық' : 'Жабық'}</span>
                  <span className="text-xs" style={{ color: MUTED }}>{t.variant === 'academic' ? 'Academic' : 'General'} · {t.mode === 'exam' ? 'емтихан' : 'жаттығу'}</span>
                  <div className="ml-auto flex gap-2">
                    <button onClick={() => edit(t.id)} className="rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: LINE }}>Өңдеу</button>
                    <button onClick={() => setView({ k: 'access', id: t.id })} className="rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: LINE }}>Оқушылар · {acc.length}</button>
                    <button
                      onClick={async () => {
                        if (!confirm(`«${t.title}» тестін және оның барлық нәтижелерін өшіру керек пе?`)) return
                        await tcall({ action: 'delete-test', id: t.id })
                        load()
                      }}
                      className="rounded-lg px-2 py-1.5 text-sm text-red-600"
                    >
                      Өшіру
                    </button>
                  </div>
                </div>
                {att.length > 0 && (
                  <table className="mt-3 w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs" style={{ color: MUTED }}>
                        <th className="py-1 font-medium">Оқушы</th><th className="font-medium">L</th><th className="font-medium">R</th><th className="font-medium">W</th><th className="font-medium">S</th><th className="font-medium">Overall</th><th className="font-medium">Күйі</th><th />
                      </tr>
                    </thead>
                    <tbody>
                      {att.map((a) => (
                        <tr key={a.id} className="border-t" style={{ borderColor: LINE }}>
                          <td className="py-2 font-medium">{name(a.student_id)}</td>
                          <td>{band(a.scores?.listening?.band)}</td>
                          <td>{band(a.scores?.reading?.band)}</td>
                          <td>{band(a.scores?.writing?.band)}</td>
                          <td>{band(a.scores?.speaking?.band)}</td>
                          <td className="font-bold">{band(a.scores?.overall)}</td>
                          <td><span className="text-xs font-semibold" style={{ color: STATUS[a.status]?.[1] }}>{STATUS[a.status]?.[0]}{a.published ? ' · жарияланды' : ''}</span></td>
                          <td className="text-right"><button onClick={() => setView({ k: 'grade', id: a.id })} className="text-sm font-semibold" style={{ color: BLUE }}>Ашу</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </Shell>
  )
}

function Shell({ children, data }: { children: React.ReactNode; data?: Data }) {
  return (
    <main className="min-h-screen" style={{ background: '#F5F7FB', color: INK }}>
      <header className="border-b bg-white" style={{ borderColor: LINE }}>
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <img src="/beles-logo.png" alt="Beles" className="h-8 w-auto" />
          <div className="border-l pl-3 text-sm font-bold" style={{ borderColor: LINE }}>IELTS · мұғалім кабинеті</div>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {data && <span style={{ color: MUTED }}>{data.me.teacher?.name ?? (data.me.admin ? 'Әкімші' : '')}</span>}
            <a href="/ielts" target="_blank" className="font-semibold" style={{ color: BLUE }}>Оқушы беті ↗</a>
            <a href={data?.me.teacher ? '/teacher' : '/admin'} className="rounded-lg border px-3 py-1.5" style={{ borderColor: LINE }}>← Кабинет</a>
          </div>
        </div>
      </header>
      {children}
    </main>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-2xl border bg-white p-4" style={{ borderColor: LINE }}>
      <div className="text-xs" style={{ color: MUTED }}>{label}</div>
      <div className="mt-1 text-3xl font-bold" style={{ color: accent ? '#E5383B' : INK }}>{value}</div>
    </div>
  )
}

// ── Рұқсат беру ──────────────────────────────────────────

function Access({ data, testId, onBack, reload }: { data: Data; testId: string; onBack: () => void; reload: () => Promise<void> }) {
  const test = data.tests.find((t) => t.id === testId)!
  const current = data.access.filter((a) => a.test_id === testId)
  const [sel, setSel] = useState<Set<string>>(() => new Set(current.map((a) => a.student_id)))
  const [tries, setTries] = useState(current[0]?.attempts_allowed ?? 1)
  const [group, setGroup] = useState('')
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const shown = useMemo(
    () => data.students.filter((s) => (!group || s.group_id === group) && s.full_name.toLowerCase().includes(q.toLowerCase())),
    [data.students, group, q]
  )
  const gname = (id: string | null) => data.groups.find((g) => g.id === id)?.name ?? ''
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const chosen = data.students.filter((s) => sel.has(s.id))

  const save = async () => {
    setBusy(true)
    setMsg('')
    try {
      await tcall({ action: 'set-access', testId, studentIds: Array.from(sel), attemptsAllowed: tries })
      await reload()
      setMsg('Сақталды ✓ PIN-кодтар төмендегі тізімде')
    } catch (e: any) {
      setMsg(e.message)
    } finally {
      setBusy(false)
    }
  }
  const copy = () => {
    const txt = `IELTS mock · ${test.title}\n${location.origin}/ielts\n\n` + chosen.map((s) => `${s.full_name} — PIN ${s.ielts_pin ?? '(сақтағаннан кейін)'}`).join('\n')
    navigator.clipboard.writeText(txt).then(() => setMsg('Тізім көшірілді ✓ WhatsApp-қа қоюға болады'))
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <button onClick={onBack} className="text-sm font-semibold" style={{ color: BLUE }}>← Тесттер</button>
      <h1 className="mt-2 text-xl font-bold">{test.title} · оқушыларға рұқсат</h1>
      {!test.published && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Тест әлі жабық. Оқушылар көруі үшін «Өңдеу» → «Оқушыларға ашық» белгісін қойыңыз.</p>}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border bg-white p-4" style={{ borderColor: LINE }}>
          <div className="flex gap-2">
            <select value={group} onChange={(e) => setGroup(e.target.value)} className={inp}>
              <option value="">Барлық топтар</option>
              {data.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Іздеу" className={inp} />
          </div>
          <div className="mt-2 flex gap-3 text-xs">
            <button onClick={() => setSel((s) => new Set([...Array.from(s), ...shown.map((x) => x.id)]))} style={{ color: BLUE }}>Көрінгендердің бәрін таңдау</button>
            <button onClick={() => setSel((s) => { const n = new Set(s); shown.forEach((x) => n.delete(x.id)); return n })} style={{ color: MUTED }}>Алып тастау</button>
          </div>
          <div className="mt-2 max-h-[55vh] overflow-y-auto">
            {shown.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50">
                <input type="checkbox" checked={sel.has(s.id)} onChange={() => toggle(s.id)} className="accent-[#2B6BF3]" />
                <span className="text-sm">{s.full_name}</span>
                <span className="ml-auto text-xs" style={{ color: MUTED }}>{gname(s.group_id)}</span>
              </label>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border bg-white p-4" style={{ borderColor: LINE }}>
          <div className="flex items-end gap-3">
            <label className="text-xs font-semibold" style={{ color: MUTED }}>
              Әр оқушыға тапсыру саны
              <input type="number" min={1} max={20} value={tries} onChange={(e) => setTries(Number(e.target.value))} className={inp + ' mt-1 w-24'} />
            </label>
            <button disabled={busy} onClick={save} className="ml-auto rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: INK }}>{busy ? '…' : `Сақтау · ${sel.size}`}</button>
          </div>
          {msg && <p className="mt-2 text-sm" style={{ color: msg.includes('✓') ? '#15803D' : '#B91C1C' }}>{msg}</p>}
          <div className="mt-4 flex items-center">
            <h3 className="text-sm font-bold">Таңдалғандар және PIN</h3>
            <button onClick={copy} className="ml-auto text-xs font-semibold" style={{ color: BLUE }}>Тізімді көшіру</button>
          </div>
          <div className="mt-2 max-h-[45vh] divide-y overflow-y-auto">
            {chosen.map((s) => (
              <div key={s.id} className="flex items-center gap-2 py-1.5 text-sm">
                <span>{s.full_name}</span>
                <span className="ml-auto font-mono font-bold tracking-widest">{s.ielts_pin ?? '····'}</span>
                <button
                  title="Жаңа PIN"
                  onClick={async () => {
                    if (!confirm(`${s.full_name}: жаңа PIN жасау керек пе? Ескісі жұмыс істемейді.`)) return
                    await tcall({ action: 'reset-pin', studentId: s.id })
                    await reload()
                  }}
                  className="text-xs"
                  style={{ color: MUTED }}
                >
                  ↻
                </button>
              </div>
            ))}
            {!chosen.length && <p className="py-4 text-center text-sm" style={{ color: MUTED }}>Оқушы таңдалмаған</p>}
          </div>
        </section>
      </div>
    </div>
  )
}

// ── Тексеру ──────────────────────────────────────────────

function Grade({ id, onBack }: { id: string; onBack: () => void }) {
  const [d, setD] = useState<{ attempt: Attempt; test: IeltsTest; student: { full_name: string } } | null>(null)
  const [w1, setW1] = useState<Record<string, string>>({})
  const [w2, setW2] = useState<Record<string, string>>({})
  const [sp, setSp] = useState<Record<string, string>>({})
  const [fb, setFb] = useState({ writing: '', speaking: '', general: '' })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch(`/api/ielts/teacher?attempt=${id}`, { cache: 'no-store' }).then(async (r) => {
      const j = await r.json()
      if (!r.ok) return setMsg(j.error)
      setD(j)
      const s = (o: any) => Object.fromEntries(Object.entries(o ?? {}).map(([k, v]) => [k, v === null || v === undefined ? '' : String(v)]))
      setW1(s(j.attempt.scores?.writing?.task1))
      setW2(s(j.attempt.scores?.writing?.task2))
      setSp(s(j.attempt.scores?.speaking?.criteria))
      setFb({ writing: '', speaking: '', general: '', ...j.attempt.feedback })
    })
  }, [id])

  if (!d) return <div className="p-10 text-center" style={{ color: MUTED }}>{msg || 'Жүктелуде…'}</div>
  const a = d.attempt
  const c = d.test.content
  const order = a.state.order
  const toNum = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === '' ? null : Number(v)]))
  const wb = writingBand({ task1: toNum(w1), task2: toNum(w2) })
  const sb = speakingBand({ criteria: toNum(sp) })
  const preview: Scores = { ...a.scores, writing: { band: wb }, speaking: { band: sb } }
  const ov = overallBand(preview, order)

  const save = async (publish: boolean) => {
    setBusy(true)
    setMsg('')
    try {
      await tcall({ action: 'grade', attemptId: a.id, writing: { task1: w1, task2: w2 }, speaking: { criteria: sp }, feedback: fb, publish })
      setMsg(publish ? 'Жарияланды ✓ Оқушы нәтижесін көреді' : 'Сақталды ✓')
      setD({ ...d, attempt: { ...a, published: publish } })
    } catch (e: any) {
      setMsg(e.message)
    } finally {
      setBusy(false)
    }
  }

  const speakingKeys = (c.speaking?.parts ?? []).flatMap((p, pi) =>
    pi === 1 ? [{ key: 'p2q0', q: p.cueCard || p.questions[0] || 'Cue card', part: p.title }] : p.questions.map((q, qi) => ({ key: `p${pi + 1}q${qi}`, q, part: p.title }))
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <button onClick={onBack} className="text-sm font-semibold" style={{ color: BLUE }}>← Тесттер</button>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">{d.student?.full_name}</h1>
        <span className="text-sm" style={{ color: MUTED }}>· {d.test.title} · {a.submitted_at ? new Date(a.submitted_at).toLocaleString('kk-KZ') : 'аяқталмаған'}</span>
        <button
          onClick={async () => {
            if (!confirm('Бұл тапсыруды өшіру керек пе? Оқушы тестті қайта бастай алады.')) return
            await tcall({ action: 'delete-attempt', attemptId: a.id })
            onBack()
          }}
          className="ml-auto text-sm text-red-600"
        >
          Тапсыруды өшіру
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {order.map((s) => (
          <div key={s} className="rounded-xl border bg-white p-3" style={{ borderColor: LINE }}>
            <div className="text-xs font-semibold uppercase" style={{ color: MUTED }}>{SECTION_NAME[s]}</div>
            <div className="text-2xl font-bold">{band(s === 'writing' ? wb : s === 'speaking' ? sb : a.scores?.[s]?.band)}</div>
            {(s === 'listening' || s === 'reading') && a.scores?.[s] && <div className="text-xs" style={{ color: MUTED }}>{a.scores[s]!.raw}/{a.scores[s]!.of}</div>}
          </div>
        ))}
        <div className="rounded-xl p-3 text-white" style={{ background: INK }}>
          <div className="text-xs font-semibold uppercase opacity-70">Overall</div>
          <div className="text-2xl font-bold">{band(ov)}</div>
        </div>
      </div>

      {order.includes('writing') && (
        <section className="mt-5 rounded-2xl border bg-white p-5" style={{ borderColor: LINE }}>
          <h2 className="font-bold">Writing</h2>
          {(['task1', 'task2'] as const).map((k) => {
            const txt = a.writing?.[k] ?? ''
            const vals = k === 'task1' ? w1 : w2
            const setVals = k === 'task1' ? setW1 : setW2
            return (
              <div key={k} className="mt-4 grid gap-4 md:grid-cols-[1fr_260px]">
                <div>
                  <div className="text-sm font-semibold">{k === 'task1' ? 'Task 1' : 'Task 2'} · {wordCount(txt)} сөз {wordCount(txt) < (c.writing?.[k]?.minWords ?? 0) && <span className="text-amber-700">(аз)</span>}</div>
                  <details className="mt-1 text-xs" style={{ color: MUTED }}><summary className="cursor-pointer">Тапсырма</summary><p className="mt-1 whitespace-pre-wrap">{c.writing?.[k]?.prompt}</p></details>
                  <div className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border p-3 text-[15px] leading-7" style={{ borderColor: LINE, background: '#FAFBFD' }}>{txt || <i style={{ color: MUTED }}>Жауап жоқ</i>}</div>
                </div>
                <BandInputs rows={WRITING_CRITERIA} vals={vals} set={setVals} />
              </div>
            )
          })}
          <textarea value={fb.writing} onChange={(e) => setFb({ ...fb, writing: e.target.value })} rows={3} placeholder="Writing бойынша пікір: не жақсы, нені түзету керек" className={inp + ' mt-4'} />
        </section>
      )}

      {order.includes('speaking') && (
        <section className="mt-5 rounded-2xl border bg-white p-5" style={{ borderColor: LINE }}>
          <h2 className="font-bold">Speaking</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-[1fr_260px]">
            <div className="space-y-3">
              {speakingKeys.map((s) => (
                <div key={s.key} className="rounded-lg border p-3" style={{ borderColor: LINE }}>
                  <div className="text-xs" style={{ color: MUTED }}>{s.part}</div>
                  <div className="whitespace-pre-wrap text-sm font-medium">{s.q}</div>
                  {a.speaking?.[s.key] ? <audio src={a.speaking[s.key]} controls preload="none" className="mt-2 w-full" /> : <div className="mt-1 text-xs text-amber-700">Жазба жоқ</div>}
                </div>
              ))}
            </div>
            <BandInputs rows={SPEAKING_CRITERIA} vals={sp} set={setSp} />
          </div>
          <textarea value={fb.speaking} onChange={(e) => setFb({ ...fb, speaking: e.target.value })} rows={3} placeholder="Speaking бойынша пікір" className={inp + ' mt-4'} />
        </section>
      )}

      <section className="mt-5 rounded-2xl border bg-white p-5" style={{ borderColor: LINE }}>
        <h2 className="font-bold">Жалпы пікір</h2>
        <textarea value={fb.general} onChange={(e) => setFb({ ...fb, general: e.target.value })} rows={3} placeholder="Келесі қадамдар, ұсыныстар" className={inp + ' mt-2'} />
      </section>

      <div className="sticky bottom-0 mt-6 flex flex-wrap items-center gap-3 border-t bg-[#F5F7FB] py-3" style={{ borderColor: LINE }}>
        <span className="text-sm" style={{ color: msg.includes('✓') ? '#15803D' : '#B91C1C' }}>{msg || (a.published ? 'Нәтиже оқушыға көрініп тұр' : 'Нәтиже әлі жарияланбаған')}</span>
        <button disabled={busy} onClick={() => save(false)} className="ml-auto rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold" style={{ borderColor: LINE }}>{a.published ? 'Жасыру' : 'Сақтау'}</button>
        <button disabled={busy} onClick={() => save(true)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{ background: BLUE }}>Сақтап, оқушыға жариялау</button>
      </div>
    </div>
  )
}

const BANDS = ['', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5.5', '5', '4.5', '4', '3.5', '3', '2.5', '2', '1', '0']
function BandInputs({ rows, vals, set }: { rows: [string, string][]; vals: Record<string, string>; set: (v: Record<string, string>) => void }) {
  return (
    <div className="space-y-2 self-start rounded-xl border p-3" style={{ borderColor: LINE, background: '#FAFBFD' }}>
      {rows.map(([k, label]) => (
        <label key={k} className="flex items-center gap-2 text-xs">
          <span className="flex-1">{label}</span>
          <select value={vals[k] ?? ''} onChange={(e) => set({ ...vals, [k]: e.target.value })} className="w-20 rounded border bg-white px-2 py-1.5 text-sm font-bold" style={{ borderColor: LINE }}>
            {BANDS.map((b) => <option key={b} value={b}>{b || '—'}</option>)}
          </select>
        </label>
      ))}
    </div>
  )
}
