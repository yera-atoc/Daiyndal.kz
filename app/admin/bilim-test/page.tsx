'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  GROUP_NAME,
  LETTERS,
  examMax,
  pct,
  ranking,
  commonDelta,
  rowTotal,
  sign,
  type Exam,
  type Student,
  type ScoreRow,
  type SubjectId,
  type Submission,
} from '@/lib/bilimTest'

type Resp = {
  students: Student[]
  exams: { id: string; title: string }[]
  exam: Exam | null
  submissions: Submission[]
  previous: { id: string; title: string; scores: Record<string, ScoreRow> } | null
  error?: string
}
type Tab = 'results' | 'key' | 'settings' | 'students'

function thisMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

async function post(body: unknown) {
  const r = await fetch('/api/bilim-test/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const j = await r.json()
  if (!r.ok) throw new Error(j.error || 'Қате')
}

function Admin() {
  const sp = useSearchParams()
  const router = useRouter()
  const examId = sp.get('exam') ?? ''
  const [data, setData] = useState<Resp | null>(null)
  const [draft, setDraft] = useState<Exam | null>(null)
  const [tab, setTab] = useState<Tab>('results')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [newId, setNewId] = useState(thisMonth())
  const [open, setOpen] = useState<string | null>(null)

  const load = useCallback(async () => {
    const r = await fetch(`/api/bilim-test/admin${examId ? `?exam=${examId}` : ''}`, { cache: 'no-store' })
    const j: Resp = await r.json()
    setData(j)
    setDraft(j.exam ? structuredClone(j.exam) : null)
  }, [examId])

  useEffect(() => {
    load()
  }, [load])

  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(''), 2500)
  }

  const save = async (e: Exam, note = 'Сақталды') => {
    setBusy(true)
    try {
      await post({ action: 'save', exam: e })
      await load()
      flash(note)
    } catch (err: any) {
      flash(err.message)
    } finally {
      setBusy(false)
    }
  }

  const create = async () => {
    setBusy(true)
    try {
      await post({ action: 'create', id: newId })
      router.push(`/admin/bilim-test?exam=${newId}`)
      if (newId === examId) await load()
    } catch (err: any) {
      flash(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!data) return <p className="p-10 text-center text-slate-400">Жүктелуде…</p>
  if (data.error) return <p className="p-10 text-center text-rose-600">{data.error}</p>

  const exam = data.exam
  const dirty = !!exam && !!draft && JSON.stringify(exam) !== JSON.stringify(draft)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <a href="/admin" className="text-sm text-blue-600">← Админ панель</a>
          <h1 className="mt-1 text-2xl font-bold">Білім тексеру сынағы</h1>
          <p className="text-slate-500">{GROUP_NAME} · {data.students.length} оқушы</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data.exams.length > 0 && (
            <select
              value={exam?.id ?? ''}
              onChange={(e) => router.push(`/admin/bilim-test?exam=${e.target.value}`)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2"
            >
              {data.exams.map((e) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
          )}
          <input type="month" value={newId} onChange={(e) => setNewId(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2" />
          <button disabled={busy} onClick={create} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium hover:bg-slate-50">
            + Жаңа ай
          </button>
        </div>
      </div>

      {!exam && (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Әзірге сынақ жоқ. Айды таңдап, «+ Жаңа ай» басыңыз.
        </div>
      )}
      {!exam && <StudentsTab students={data.students} reload={load} flash={flash} />}

      {exam && draft && (
        <>
          <div className="mt-6 flex gap-1 border-b border-slate-200">
            {([
              ['results', 'Нәтижелер'],
              ['key', 'Жауап кілті'],
              ['settings', 'Сынақты басқару'],
              ['students', `Оқушылар (${data.students.length})`],
            ] as [Tab, string][]).map(([t, l]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                {l}
              </button>
            ))}
          </div>

          {tab === 'results' && <Results data={data} exam={exam} onOpen={setOpen} />}
          {tab === 'students' && <StudentsTab students={data.students} reload={load} flash={flash} />}
          {tab === 'key' && <KeyEditor draft={draft} setDraft={setDraft} />}
          {tab === 'settings' && (
            <Settings exam={exam} draft={draft} setDraft={setDraft} hasSubs={data.submissions.length > 0} onToggle={(e) => save(e, 'Жауап қабылдау жаңартылды')} busy={busy} />
          )}

          {dirty && (tab === 'key' || tab === 'settings') && (
            <div className="sticky bottom-4 mt-6 flex items-center justify-end gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
              <span className="text-sm text-slate-500">Сақталмаған өзгерістер бар</span>
              <button onClick={() => setDraft(structuredClone(exam))} className="rounded-lg px-3 py-2 text-sm">Болдырмау</button>
              <button disabled={busy} onClick={() => save(draft)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                Сақтау
              </button>
            </div>
          )}

          {open && (
            <StudentDrawer
              name={open}
              exam={exam}
              subs={data.submissions.filter((s) => s.student_name === open)}
              onClose={() => setOpen(null)}
              onDelete={async (id) => {
                if (!confirm('Бұл жауап парағын өшіресіз бе? Оқушы қайта тапсыра алады.')) return
                await post({ action: 'delete-submission', id })
                await load()
              }}
            />
          )}
        </>
      )}

      {msg && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">{msg}</div>}
    </div>
  )
}

function Results({ data, exam, onOpen }: { data: Resp; exam: Exam; onOpen: (n: string) => void }) {
  const rk = useMemo(() => ranking(exam, data.submissions), [exam, data.submissions])
  const submittedBy = useMemo(() => {
    const m: Record<string, Set<string>> = {}
    for (const s of data.submissions) (m[s.student_name] ??= new Set()).add(s.subject)
    return m
  }, [data.submissions])
  const keyed = exam.subjects.filter((s) => (exam.answer_key[s.id] ?? []).some(Boolean))
  const prev = data.previous

  const names = data.students.map((s) => s.full_name)
  const rows = names.map((name) => {
    const total = rowTotal(rk.scores[name])
    const prevTotal = rowTotal(prev?.scores[name])
    const delta = commonDelta(rk.scores[name], prev?.scores[name])
    return { name, total, prevTotal, delta, count: submittedBy[name]?.size ?? 0 }
  }).sort((a, b) => (b.total ?? -1) - (a.total ?? -1) || b.count - a.count || a.name.localeCompare(b.name))

  const nSubmitted = names.filter((n) => submittedBy[n]).length

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1">Тапсырғандар: <b>{nSubmitted}</b> / {names.length}</span>
          <span className={`rounded-full px-3 py-1 ${keyed.length === exam.subjects.length ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            Кілт: <b>{keyed.length}</b> / {exam.subjects.length} пән
          </span>
          {prev && <span className="rounded-full bg-slate-100 px-3 py-1">Салыстыру: {prev.title}</span>}
        </div>
        <a
          href={`/admin/bilim-test/report?exam=${exam.id}`}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Барлығының PDF-і
        </a>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-3 py-2.5">№</th>
              <th className="px-3 py-2.5">Аты-жөні</th>
              {exam.subjects.map((s) => (
                <th key={s.id} className="px-3 py-2.5 text-right">{s.short} <span className="font-normal normal-case">({s.max})</span></th>
              ))}
              <th className="px-3 py-2.5 text-right">Жалпы ({examMax(exam)})</th>
              <th className="px-3 py-2.5 text-right">Өзгеріс</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const d = r.delta
              return (
                <tr key={r.name} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2 tabular-nums text-slate-400">{rk.place[r.name] ?? ''}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => onOpen(r.name)} className="whitespace-nowrap text-left font-semibold hover:text-blue-600">{r.name}</button>
                  </td>
                  {exam.subjects.map((s) => {
                    const v = rk.scores[r.name]?.[s.id]
                    const has = submittedBy[r.name]?.has(s.id)
                    const low = typeof v === 'number' && pct(v, s.max) < 35
                    return (
                      <td key={s.id} className={`px-3 py-2 text-right tabular-nums ${low ? 'bg-red-100 font-semibold text-red-700' : ''}`}>
                        {typeof v === 'number' ? v : has ? <span className="text-xs text-slate-400" title="Кілт енгізілмеген">тапсырды</span> : <span className="text-slate-300">—</span>}
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-right">
                    {r.total !== null ? (
                      <span className="inline-block min-w-[3.5rem] rounded-md px-2 py-0.5 text-right font-bold tabular-nums" style={{ background: totalBg(r.total, examMax(exam)) }}>
                        {r.total}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className={`px-3 py-2 text-right font-semibold tabular-nums ${d === null ? 'text-slate-300' : d >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {d === null ? (r.total !== null && r.prevTotal === null ? <span className="text-xs font-normal text-slate-400">жаңа</span> : '—') : sign(d)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.count > 0 && (
                      <a href={`/admin/bilim-test/report?exam=${exam.id}&student=${encodeURIComponent(r.name)}`} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50">
                        PDF
                      </a>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-400">Қызыл — пән максимумының 35 %-ынан төмен. Аты-жөнін басып, жауап парақтарын көруге не өшіруге болады.</p>
    </div>
  )
}

// Жалпы балл түсі: жоғары — қою жасыл
function totalBg(t: number, max: number) {
  const p = Math.min(1, t / max)
  const a = 0.12 + p * 0.6
  return `rgba(22,163,74,${a.toFixed(2)})`
}

function KeyEditor({ draft, setDraft }: { draft: Exam; setDraft: (e: Exam) => void }) {
  const setKey = (id: SubjectId, arr: string[]) => setDraft({ ...draft, answer_key: { ...draft.answer_key, [id]: arr } })
  return (
    <div className="mt-5 space-y-5">
      <p className="text-sm text-slate-500">
        Әр пәннің дұрыс жауаптарын енгізіңіз: жолға «ABDC…» деп тізіп жазыңыз немесе төмендегі ұяшықтарды басыңыз. Кілтті сынақтан кейін енгізуге болады — нәтиже автоматты түрде қайта есептеледі.
      </p>
      {draft.subjects.map((s) => {
        const letters = LETTERS.slice(0, s.options)
        const key = Array.from({ length: s.questions }, (_, i) => draft.answer_key[s.id]?.[i] ?? '')
        const filled = key.filter(Boolean).length
        return (
          <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{s.name}</h3>
              <span className={`text-sm ${filled === s.questions ? 'text-emerald-600' : 'text-slate-500'}`}>{filled} / {s.questions}</span>
            </div>
            <input
              value={key.map((k) => k || '·').join('')}
              onChange={(e) => {
                const chars = e.target.value.toUpperCase().replace(/[^A-E·.\-_ ]/g, '').replace(/ /g, '').split('')
                setKey(s.id, Array.from({ length: s.questions }, (_, i) => (letters.includes(chars[i]) ? chars[i] : '')))
              }}
              spellCheck={false}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono tracking-[.25em] outline-none focus:border-blue-500"
              placeholder="ABCD…"
            />
            <div className="mt-3 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
              {key.map((k, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const next = letters[(letters.indexOf(k) + 1) % (letters.length + 1)] ?? ''
                    setKey(s.id, key.map((x, j) => (j === i ? next : x)))
                  }}
                  className={`rounded-md border py-1.5 text-center text-sm ${k ? 'border-blue-200 bg-blue-50 font-bold text-blue-700' : 'border-slate-200 text-slate-300'}`}
                >
                  <span className="mr-1 text-[10px] font-normal text-slate-400">{i + 1}</span>
                  {k || '·'}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Settings({
  exam,
  draft,
  setDraft,
  hasSubs,
  onToggle,
  busy,
}: {
  exam: Exam
  draft: Exam
  setDraft: (e: Exam) => void
  hasSubs: boolean
  onToggle: (e: Exam) => void
  busy: boolean
}) {
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])
  const link = `${origin}/bilim-test`
  const upd = (id: SubjectId, patch: Record<string, number>) =>
    setDraft({ ...draft, subjects: draft.subjects.map((s) => (s.id === id ? { ...s, ...patch } : s)) })

  return (
    <div className="mt-5 space-y-5">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="text-sm font-semibold text-blue-800">Оқушыларға жіберетін сілтеме</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="rounded bg-white px-3 py-1.5 text-sm">{link}</code>
          <button onClick={() => navigator.clipboard?.writeText(link)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white">Көшіру</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-3 py-2.5">Пән</th>
              <th className="px-3 py-2.5">Жауап қабылдау</th>
              <th className="px-3 py-2.5">Сұрақ саны</th>
              <th className="px-3 py-2.5">Нұсқа</th>
              <th className="px-3 py-2.5">Макс. балл</th>
              <th className="px-3 py-2.5">1 сұрақ</th>
            </tr>
          </thead>
          <tbody>
            {draft.subjects.map((s) => {
              const isOpen = exam.open_subjects.includes(s.id)
              return (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2 font-semibold">{s.name}</td>
                  <td className="px-3 py-2">
                    <button
                      disabled={busy}
                      onClick={() =>
                        onToggle({
                          ...exam,
                          open_subjects: isOpen ? exam.open_subjects.filter((x) => x !== s.id) : [...exam.open_subjects, s.id],
                        })
                      }
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${isOpen ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}
                    >
                      {isOpen ? 'Ашық' : 'Жабық'}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min={1} max={100} value={s.questions} onChange={(e) => upd(s.id, { questions: Number(e.target.value) })} className="w-20 rounded border border-slate-300 px-2 py-1" />
                  </td>
                  <td className="px-3 py-2">
                    <select value={s.options} onChange={(e) => upd(s.id, { options: Number(e.target.value) })} className="rounded border border-slate-300 px-2 py-1">
                      <option value={3}>A–C</option>
                      <option value={4}>A–D</option>
                      <option value={5}>A–E</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min={1} value={s.max} onChange={(e) => upd(s.id, { max: Number(e.target.value) })} className="w-24 rounded border border-slate-300 px-2 py-1" />
                  </td>
                  <td className="px-3 py-2 text-slate-500">{s.questions ? +(s.max / s.questions).toFixed(2) : '—'} балл</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {hasSubs && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Жауап парақтары түсіп қойған. Сұрақ санын өзгертсеңіз, бұрын тапсырылған парақтар жаңа санмен тексеріледі.
        </p>
      )}
      <p className="text-sm text-slate-500">
        «Жауап қабылдау» бірден сақталады. Мысалы, 30 қазанда тек математика мен жаратылыстануды, 31 қазанда тілдерді ашыңыз.
      </p>
    </div>
  )
}

function StudentsTab({
  students,
  reload,
  flash,
}: {
  students: Student[]
  reload: () => Promise<void>
  flash: (m: string) => void
}) {
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (body: unknown, note: string) => {
    setBusy(true)
    try {
      await post(body)
      await reload()
      flash(note)
      return true
    } catch (e: any) {
      flash(e.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-5 space-y-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (await run({ action: 'add-student', name }, 'Оқушы қосылды')) setName('')
        }}
        className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Тегі мен аты, мысалы: Серік Іңкәр"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
        />
        <button disabled={busy || name.trim().length < 3} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
          + Оқушы қосу
        </button>
      </form>

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {students.map((s, i) => (
          <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-6 text-right text-sm tabular-nums text-slate-400">{i + 1}</span>
            {editing === s.id ? (
              <form
                className="flex flex-1 flex-wrap gap-2"
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (await run({ action: 'rename-student', id: s.id, name: editName }, 'Аты өзгертілді')) setEditing(null)
                }}
              >
                <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-blue-400 px-3 py-1.5 outline-none" />
                <button disabled={busy} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white">Сақтау</button>
                <button type="button" onClick={() => setEditing(null)} className="rounded-lg px-3 py-1.5 text-sm">Болдырмау</button>
              </form>
            ) : (
              <>
                <span className="flex-1 font-medium">{s.full_name}</span>
                {Object.keys(s.legacy_scores ?? {}).length === 0 && (
                  <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 sm:inline">қыркүйекте жоқ</span>
                )}
                <button
                  onClick={() => {
                    setEditing(s.id)
                    setEditName(s.full_name)
                  }}
                  className="rounded-md px-2 py-1 text-sm text-blue-600 hover:bg-blue-50"
                >
                  Өзгерту
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (confirm(`${s.full_name} тізімнен шығарылады. Оның барлық жауап парақтары да өшеді. Жалғастырасыз ба?`))
                      run({ action: 'delete-student', id: s.id }, 'Тізімнен шығарылды')
                  }}
                  className="rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                >
                  Өшіру
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="text-sm text-slate-500">
        Атын өзгертсеңіз, оқушының бұрынғы нәтижелері мен жауап парақтары жаңа атымен сақталады.
      </p>
    </div>
  )
}

function StudentDrawer({
  name,
  exam,
  subs,
  onClose,
  onDelete,
}: {
  name: string
  exam: Exam
  subs: Submission[]
  onClose: () => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{name}</h2>
          <button onClick={onClose} className="text-2xl text-slate-400">×</button>
        </div>
        <p className="text-sm text-slate-500">{exam.title} · жауап парақтары</p>
        <div className="mt-4 space-y-3">
          {exam.subjects.map((s) => {
            const sub = subs.find((x) => x.subject === s.id)
            const key = exam.answer_key[s.id]
            return (
              <div key={s.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <b>{s.name}</b>
                  {sub ? (
                    <button onClick={() => onDelete(sub.id)} className="text-xs text-red-600 hover:underline">Өшіру</button>
                  ) : (
                    <span className="text-xs text-slate-400">тапсырмаған</span>
                  )}
                </div>
                {sub && (
                  <>
                    <div className="mt-1 text-xs text-slate-400">{new Date(sub.submitted_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="mt-2 flex flex-wrap gap-1 font-mono text-xs">
                      {sub.answers.map((a, i) => {
                        const k = key?.[i]
                        const cls = !k ? 'bg-slate-100 text-slate-600' : !a ? 'bg-amber-50 text-amber-600' : a === k ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                        return (
                          <span key={i} className={`rounded px-1 py-0.5 ${cls}`} title={k ? `Дұрысы: ${k}` : ''}>
                            {i + 1}{a || '·'}
                          </span>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <style>{`a[aria-label="WhatsApp арқылы хабарласу"]{display:none}`}</style>
      <Suspense fallback={null}>
        <Admin />
      </Suspense>
    </div>
  )
}
