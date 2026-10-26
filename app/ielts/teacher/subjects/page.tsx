'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BLUE, INK, LINE, MUTED } from '@/components/ielts/Questions'
import { avgPct, parseScore, type Sheet, type SheetRow, type SheetTest } from '@/lib/subjectTests'

type Student = { id: string; full_name: string; grade: string | null; ielts_pin: string | null }
type Data = { sheets: { sheet: Sheet; rows: SheetRow[] }[]; students: Student[] }
type Draft = { sheet: Omit<Sheet, 'id'> & { id?: string }; rows: (Omit<SheetRow, 'scores'> & { scores: string[] })[] }

const key = (s: string) => s.trim().toLowerCase().replace(/[)\s]+$/, '').replace(/\s+/g, ' ')

// Пән тесттері: мұғалім баллдарды енгізеді, оқушы ҰБТ кабинетінде өз нәтижесі мен PDF есебін көреді
export default function SubjectsPage() {
  const [data, setData] = useState<Data | null>(null)
  const [err, setErr] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)

  const load = useCallback(async () => {
    const r = await fetch('/api/ielts/teacher/subjects', { cache: 'no-store' })
    if (r.status === 401) return void (location.href = '/teacher/login?next=/ielts/teacher/subjects')
    const j = await r.json().catch(() => ({}))
    if (!r.ok) return setErr(j.error || 'Қате')
    setData(j)
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const open = (x?: { sheet: Sheet; rows: SheetRow[] }) =>
    setDraft(
      x
        ? { sheet: { ...x.sheet }, rows: x.rows.map((r) => ({ ...r, scores: x.sheet.tests.map((_, i) => (r.scores[i] ?? '') + '') })) }
        : { sheet: { subject: 'Физика', name: '', grade: 11, position: data?.sheets.length ?? 0, tests: [1, 2, 3, 4, 5].map((n) => ({ title: `${n}-тест`, max: 40 })) }, rows: [] }
    )

  return (
    <main className="min-h-screen" style={{ background: '#F5F7FB', color: INK }}>
      <header className="border-b bg-white" style={{ borderColor: LINE }}>
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <img src="/beles-logo.png" alt="Beles" className="h-8 w-auto" />
          <div className="border-l pl-3 text-sm font-bold" style={{ borderColor: LINE }}>Пән тесттері</div>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <a href="/ielts/teacher" className="rounded-lg border px-3 py-1.5" style={{ borderColor: LINE }}>← Mock тесттер</a>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">
        {err && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{err}</div>}
        {!data && !err && <p className="py-16 text-center" style={{ color: MUTED }}>Жүктелуде…</p>}
        {data && !draft && <List data={data} onOpen={open} />}
        {data && draft && (
          <Editor
            data={data}
            draft={draft}
            setDraft={setDraft}
            onDone={async () => {
              setDraft(null)
              await load()
            }}
          />
        )}
      </div>
    </main>
  )
}

function List({ data, onOpen }: { data: Data; onOpen: (x?: { sheet: Sheet; rows: SheetRow[] }) => void }) {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Пән тесттері</h1>
          <p className="mt-1 max-w-2xl text-sm" style={{ color: MUTED }}>
            Өз тесттеріңіздің баллын енгізіңіз. Тізімдегі оқушыға байланған жол оның ҰБТ кабинетінде (/ubt) шығады: нәтиже, топпен салыстыру және PDF есеп.
          </p>
        </div>
        <button onClick={() => onOpen()} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white" style={{ background: BLUE }}>+ Жаңа парақ</button>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.sheets.map((x) => {
          const linked = x.rows.filter((r) => r.student_id).length
          const done = x.sheet.tests.filter((_, i) => x.rows.some((r) => r.scores[i] !== null && r.scores[i] !== undefined)).length
          return (
            <button key={x.sheet.id} onClick={() => onOpen(x)} className="rounded-2xl border bg-white p-4 text-left transition hover:shadow-sm" style={{ borderColor: LINE }}>
              <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: BLUE }}>{x.sheet.subject}</div>
              <div className="mt-0.5 text-lg font-semibold">{x.sheet.name}</div>
              <div className="mt-2 text-sm" style={{ color: MUTED }}>
                {x.rows.length} оқушы · {done}/{x.sheet.tests.length} тест
                {linked < x.rows.length && <span className="text-amber-600"> · {x.rows.length - linked} кабинетке байланбаған</span>}
              </div>
            </button>
          )
        })}
        {!data.sheets.length && <p className="text-sm" style={{ color: MUTED }}>Әзірге парақ жоқ.</p>}
      </div>
    </>
  )
}

function Editor({ data, draft, setDraft, onDone }: { data: Data; draft: Draft; setDraft: (d: Draft) => void; onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [paste, setPaste] = useState<string | null>(null)
  const byKey = useMemo(() => {
    const m = new Map<string, Student[]>()
    for (const s of data.students) m.set(key(s.full_name), [...(m.get(key(s.full_name)) ?? []), s])
    return m
  }, [data.students])
  const byId = useMemo(() => new Map(data.students.map((s) => [s.id, s])), [data.students])
  const { sheet, rows } = draft
  const T = sheet.tests

  const set = (patch: Partial<Draft['sheet']>) => setDraft({ ...draft, sheet: { ...sheet, ...patch } })
  const setRows = (r: Draft['rows']) => setDraft({ ...draft, rows: r })
  const setTests = (tests: SheetTest[]) =>
    setDraft({ sheet: { ...sheet, tests }, rows: rows.map((r) => ({ ...r, scores: tests.map((_, i) => r.scores[i] ?? '') })) })
  // Аты тізімдегі бір оқушыға дәл сәйкес келсе — автоматты байланады
  const link = (name: string, prev: string | null) => {
    const hit = byKey.get(key(name))
    if (hit?.length === 1) return hit[0].id
    if (prev && byId.get(prev) && key(byId.get(prev)!.full_name) === key(name)) return prev
    return null
  }

  const applyPaste = () => {
    const out = [...rows]
    const tests = [...T]
    for (const line of (paste ?? '').split('\n')) {
      const cells = line.split('\t').map((c) => c.trim())
      if (!cells[0] || /^\d+-?топ$/i.test(cells[0]) || /тест/i.test(cells[1] ?? '')) continue
      const vals = cells.slice(1)
      vals.forEach((v, i) => {
        const m = v.match(/\/(\d+)/)
        if (!tests[i]) tests[i] = { title: `${i + 1}-тест`, max: m ? Number(m[1]) : 40 }
        else if (m) tests[i] = { ...tests[i], max: Number(m[1]) }
      })
      const scores = tests.map((t, i) => {
        const n = parseScore(vals[i] ?? '', t.max)
        return n === null ? '' : String(n)
      })
      const idx = out.findIndex((r) => key(r.student_name) === key(cells[0]))
      if (idx >= 0) out[idx] = { ...out[idx], scores: scores.map((s, i) => s || out[idx].scores[i] || '') }
      else out.push({ student_name: cells[0], student_id: link(cells[0], null), scores, position: out.length })
    }
    setDraft({ sheet: { ...sheet, tests }, rows: out.map((r) => ({ ...r, scores: tests.map((_, i) => r.scores[i] ?? '') })) })
    setPaste(null)
  }

  const save = async () => {
    setBusy(true)
    setMsg('')
    const body = {
      action: 'save',
      sheet,
      rows: rows.filter((r) => r.student_name.trim()).map((r) => ({ ...r, scores: r.scores.map((v, i) => parseScore(v, T[i].max)) })),
    }
    const r = await fetch('/api/ielts/teacher/subjects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) return setMsg(j.error || 'Сақталмады')
    await onDone()
  }

  const remove = async () => {
    if (!sheet.id || !confirm(`«${sheet.name}» парағын өшіресіз бе? Оқушылар кабинетінен де жоғалады.`)) return
    await fetch('/api/ielts/teacher/subjects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id: sheet.id }) })
    await onDone()
  }

  const pins = rows.filter((r) => r.student_id).map((r) => `${byId.get(r.student_id!)?.full_name ?? r.student_name} — PIN ${byId.get(r.student_id!)?.ielts_pin ?? '(сақтағаннан кейін)'}`)
  const inp = 'rounded-lg border px-2.5 py-1.5 text-sm outline-none focus:border-[#2B6BF3]'

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => onDone()} className="text-sm font-semibold" style={{ color: BLUE }}>← Барлық парақтар</button>
        <div className="flex gap-2">
          {sheet.id && <button onClick={remove} className="rounded-xl border px-3 py-2 text-sm text-red-600" style={{ borderColor: LINE }}>Өшіру</button>}
          <button onClick={() => setPaste('')} className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold" style={{ borderColor: LINE }}>Excel-ден қою</button>
          <button disabled={busy} onClick={save} className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ background: BLUE }}>{busy ? 'Сақталуда…' : 'Сақтау'}</button>
        </div>
      </div>
      {msg && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{msg}</p>}

      <div className="mt-4 grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-[1fr_2fr_auto]" style={{ borderColor: LINE }}>
        <label className="text-xs" style={{ color: MUTED }}>Пән<input value={sheet.subject} onChange={(e) => set({ subject: e.target.value })} className={`${inp} mt-1 w-full`} style={{ borderColor: LINE, color: INK }} /></label>
        <label className="text-xs" style={{ color: MUTED }}>Парақ атауы<input value={sheet.name} placeholder="11 сынып · 2-топ" onChange={(e) => set({ name: e.target.value })} className={`${inp} mt-1 w-full`} style={{ borderColor: LINE, color: INK }} /></label>
        <label className="text-xs" style={{ color: MUTED }}>Сынып<input value={sheet.grade ?? ''} inputMode="numeric" onChange={(e) => set({ grade: e.target.value ? Number(e.target.value.replace(/\D/g, '')) || null : null })} className={`${inp} mt-1 w-20`} style={{ borderColor: LINE, color: INK }} /></label>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border bg-white" style={{ borderColor: LINE }}>
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b text-left" style={{ borderColor: LINE }}>
              <th className="px-3 py-2 text-xs font-semibold" style={{ color: MUTED }}>Оқушы</th>
              {T.map((t, i) => (
                <th key={i} className="px-1.5 py-2">
                  <input value={t.title} onChange={(e) => setTests(T.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)))} className={`${inp} w-20 text-xs font-semibold`} style={{ borderColor: LINE }} />
                  <div className="mt-1 flex items-center gap-1 text-[11px] font-normal" style={{ color: MUTED }}>
                    макс <input value={t.max} inputMode="numeric" onChange={(e) => setTests(T.map((x, k) => (k === i ? { ...x, max: Number(e.target.value.replace(/\D/g, '')) || 1 } : x)))} className={`${inp} w-12 px-1.5 py-0.5 text-[11px]`} style={{ borderColor: LINE }} />
                  </div>
                </th>
              ))}
              <th className="px-2 py-2">
                <div className="flex gap-1">
                  <button onClick={() => setTests([...T, { title: `${T.length + 1}-тест`, max: T.at(-1)?.max ?? 40 }])} className="rounded-lg border px-2 py-1 text-xs" style={{ borderColor: LINE }}>+ тест</button>
                  {T.length > 1 && <button onClick={() => setTests(T.slice(0, -1))} className="rounded-lg border px-2 py-1 text-xs" style={{ borderColor: LINE }}>−</button>}
                </div>
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: MUTED }}>Орташа</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => {
              const st = r.student_id ? byId.get(r.student_id) : null
              const many = (byKey.get(key(r.student_name))?.length ?? 0) > 1
              const av = avgPct(r.scores.map((v, i) => parseScore(v, T[i]?.max ?? 1)), T)
              return (
                <tr key={ri} className="border-b last:border-0" style={{ borderColor: '#EDF0F5' }}>
                  <td className="px-3 py-1.5">
                    <input
                      list="bt-students"
                      value={r.student_name}
                      onChange={(e) => setRows(rows.map((x, k) => (k === ri ? { ...x, student_name: e.target.value, student_id: link(e.target.value, x.student_id) } : x)))}
                      className={`${inp} w-56`}
                      style={{ borderColor: LINE }}
                    />
                    <div className="mt-0.5 text-[11px]" style={{ color: st ? '#0F9D6B' : '#D98A00' }}>
                      {st ? `✓ кабинет · PIN ${st.ielts_pin ?? 'сақтағанда беріледі'}` : many ? 'аттас бірнеше оқушы — тізімнен толық атын таңдаңыз' : 'тізімде жоқ — толық аты-жөнін тізімнен таңдаңыз'}
                    </div>
                  </td>
                  {T.map((t, i) => (
                    <td key={i} className="px-1.5 py-1.5">
                      <input
                        value={r.scores[i] ?? ''}
                        inputMode="numeric"
                        placeholder="—"
                        onChange={(e) => setRows(rows.map((x, k) => (k === ri ? { ...x, scores: x.scores.map((v, j) => (j === i ? e.target.value.replace(/[^\d]/g, '') : v)) } : x)))}
                        className={`${inp} w-16 text-center tabular-nums ${r.scores[i] && parseScore(r.scores[i], t.max) === null ? 'border-red-400 bg-red-50' : ''}`}
                        style={{ borderColor: r.scores[i] && parseScore(r.scores[i], t.max) === null ? undefined : LINE }}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    <button onClick={() => setRows(rows.filter((_, k) => k !== ri))} className="rounded-lg px-2 py-1 text-xs text-red-600" aria-label="Жолды өшіру">✕</button>
                  </td>
                  <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{av !== null ? `${av}%` : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <button onClick={() => setRows([...rows, { student_name: '', student_id: null, scores: T.map(() => ''), position: rows.length }])} className="m-3 rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: LINE }}>+ Оқушы</button>
        <datalist id="bt-students">{data.students.map((s) => <option key={s.id} value={s.full_name}>{s.grade ? `${s.grade} сынып` : ''}</option>)}</datalist>
      </div>

      {pins.length > 0 && (
        <div className="mt-4 rounded-2xl border bg-white p-4 text-sm" style={{ borderColor: LINE }}>
          <div className="flex items-center justify-between gap-3">
            <b>Оқушыларға жіберу</b>
            <button onClick={() => navigator.clipboard?.writeText(`Физика нәтижесі · ${location.origin}/ubt\n\n${pins.join('\n')}`)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: LINE }}>Көшіру</button>
          </div>
          <p className="mt-1 text-xs" style={{ color: MUTED }}>Оқушы {typeof location !== 'undefined' ? location.host : ''}/ubt бетіне кіріп, атын таңдап, PIN-ін жазады.</p>
        </div>
      )}

      {paste !== null && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4" onClick={() => setPaste(null)}>
          <div className="w-full max-w-xl rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Excel-ден қою</h2>
            <p className="mt-1 text-sm" style={{ color: MUTED }}>Excel-де аты мен баллдар бағандарын белгілеп, көшіріп, осында қойыңыз. «14/30» түрі де болады — макс балл өзі алынады.</p>
            <textarea autoFocus value={paste} onChange={(e) => setPaste(e.target.value)} rows={10} className="mt-3 w-full rounded-xl border p-3 font-mono text-sm" style={{ borderColor: LINE }} placeholder={'Айтбек Азиз\t14/30\t24/40'} />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setPaste(null)} className="rounded-xl border px-4 py-2 text-sm" style={{ borderColor: LINE }}>Бас тарту</button>
              <button onClick={applyPaste} className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: BLUE }}>Қосу</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
