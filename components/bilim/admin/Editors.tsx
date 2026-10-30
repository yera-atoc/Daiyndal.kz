'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  LETTERS,
  commonDelta,
  examMax,
  pct,
  ranking,
  rowTotal,
  sign,
  type Exam,
  type Group,
  type Question,
  type Student,
  type SubjectConfig,
  type SubjectId,
  type Submission,
} from '@/lib/bilimTest'
import { post, type Resp } from './shared'
import { exportResultsXlsx } from './exportExcel'

export function newSubjectId() {
  return `s${Math.random().toString(36).slice(2, 8)}`
}

export function SubjectsEditor({ subjects, onChange }: { subjects: SubjectConfig[]; onChange: (s: SubjectConfig[]) => void }) {
  const upd = (i: number, patch: Partial<SubjectConfig>) => onChange(subjects.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  const move = (i: number, d: number) => {
    const next = [...subjects]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    onChange(next)
  }
  return (
    <div className="space-y-2">
      <div className="hidden grid-cols-[3.5rem_1fr_5rem_5rem_6rem_2rem] gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:grid">
        <span>Реті</span><span>Пән</span><span>Сұрақ</span><span>Нұсқа</span><span>Макс. балл</span><span />
      </div>
      {subjects.map((s, i) => (
        <div key={s.id} className="grid grid-cols-[3.5rem_1fr_auto] gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-[3.5rem_1fr_5rem_5rem_6rem_2rem] sm:border-0 sm:p-0">
          <div className="flex items-center gap-0.5">
            <button disabled={i === 0} onClick={() => move(i, -1)} title="Жоғары" className="h-8 w-6 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-25">↑</button>
            <button disabled={i === subjects.length - 1} onClick={() => move(i, 1)} title="Төмен" className="h-8 w-6 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-25">↓</button>
          </div>
          <input value={s.name} onChange={(e) => upd(i, { name: e.target.value, short: e.target.value.slice(0, 14) })} placeholder="Пәннің аты" className="rounded border border-slate-300 px-2 py-1.5" />
          <button onClick={() => onChange(subjects.filter((_, j) => j !== i))} title="Пәнді алып тастау" className="text-lg text-red-500 sm:order-last">×</button>
          <input type="number" min={1} value={s.questions} onChange={(e) => upd(i, { questions: Number(e.target.value) })} className="rounded border border-slate-300 px-2 py-1.5" />
          <select value={s.options} onChange={(e) => upd(i, { options: Number(e.target.value) })} className="rounded border border-slate-300 px-2 py-1.5">
            <option value={3}>A–C</option>
            <option value={4}>A–D</option>
            <option value={5}>A–E</option>
          </select>
          <input type="number" min={1} value={s.max} onChange={(e) => upd(i, { max: Number(e.target.value) })} className="rounded border border-slate-300 px-2 py-1.5" />
        </div>
      ))}
      <button
        onClick={() => onChange([...subjects, { id: newSubjectId(), name: '', short: '', questions: 20, options: 4, max: 100 }])}
        className="rounded-lg border border-dashed border-slate-400 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
      >
        + Пән қосу
      </button>
    </div>
  )
}

export function GroupModal({ group, onClose, onSaved }: { group: Group | null; onClose: () => void; onSaved: (id: string | null, note: string) => void }) {
  const [name, setName] = useState(group?.name ?? '')
  const [subjects, setSubjects] = useState<SubjectConfig[]>(
    group?.subjects ?? [{ id: newSubjectId(), name: 'Математика', short: 'Математика', questions: 20, options: 4, max: 100 }]
  )
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setErr('')
    try {
      const j = await post({ action: group ? 'update-group' : 'create-group', group: { id: group?.id, name, subjects } })
      onSaved(j.id, group ? 'Топ сақталды' : 'Топ қосылды')
    } catch (e: any) {
      setErr(e.message)
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4" onClick={onClose}>
      <div className="mt-10 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold">{group ? 'Топты баптау' : 'Жаңа топ'}</h2>
        <label className="mt-4 block text-sm font-semibold">Топтың аты</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Мысалы: 5-сынып БІЛ" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        <div className="mt-5 text-sm font-semibold">Пәндер</div>
        <p className="mb-2 text-xs text-slate-500">Жаңа ай ашқанда сынақ осы пәндермен құрылады. Бұрынғы айлардың сынақтары өзгермейді.</p>
        <SubjectsEditor subjects={subjects} onChange={setSubjects} />
        {err && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{err}</p>}
        <div className="mt-6 flex justify-between gap-2">
          {group && group.id !== 'nzm' ? (
            <button
              onClick={async () => {
                if (!confirm(`«${group.name}» тобын өшіресіз бе?`)) return
                try {
                  await post({ action: 'delete-group', id: group.id })
                  onSaved('', 'Топ өшірілді')
                  location.href = '/admin/bilim-test'
                } catch (e: any) {
                  setErr(e.message)
                }
              }}
              className="text-sm text-red-600"
            >
              Топты өшіру
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg px-4 py-2">Болдырмау</button>
            <button disabled={busy} onClick={submit} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white">Сақтау</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Сынақты басқару: жауап қабылдау, жариялау, пәндер ─────

export function Settings({
  exam,
  draft,
  setDraft,
  hasSubs,
  onInstant,
  busy,
}: {
  exam: Exam
  draft: Exam
  setDraft: (e: Exam) => void
  hasSubs: boolean
  onInstant: (e: Exam, note: string) => void
  busy: boolean
}) {
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])
  const link = `${origin}/bilim-test`
  const keyed = exam.subjects.filter((s) => (exam.answer_key[s.id] ?? []).some(Boolean)).length

  return (
    <div className="mt-5 space-y-5">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="text-sm font-semibold text-blue-800">Оқушыларға жіберетін сілтеме</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="rounded bg-white px-3 py-1.5 text-sm">{link}</code>
          <button onClick={() => navigator.clipboard?.writeText(link)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white">Көшіру</button>
        </div>
        <p className="mt-2 text-xs text-blue-800/80">Оқушы атын таңдап, PIN-мен кіреді (PIN — «Оқушылар» қойындысында).</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold">Нәтижені жариялау</div>
            <p className="text-sm text-slate-500">
              Жарияланса, оқушылар кабинетте балын, орнын, дұрыс/қате сұрақтарын, рейтингті көреді. Барлығы тапсырып болғанша жарияламаңыз.
            </p>
          </div>
          <button
            disabled={busy || (!exam.published && keyed === 0)}
            onClick={() => {
              if (!exam.published && keyed < exam.subjects.length && !confirm(`Кілт ${keyed}/${exam.subjects.length} пәнге ғана енгізілген. Сонда да жариялайсыз ба?`)) return
              onInstant({ ...exam, published: !exam.published }, exam.published ? 'Жариялау тоқтатылды' : 'Нәтиже жарияланды')
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${exam.published ? 'border border-slate-300 bg-white text-slate-700' : 'bg-emerald-600 text-white'}`}
          >
            {exam.published ? 'Жариялауды тоқтату' : 'Жариялау'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-xl">
            <div className="font-semibold">Әр оқушыға жеке нұсқа</div>
            <p className="text-sm text-slate-500">
              Қосулы болса, әр оқушыда сұрақтардың реті мен A–D жауаптарының реті әртүрлі — бір-бірінен көшіре алмайды.
              Жеке парақтарды төмендегі батырмамен басып шығарасыз; оқушы сайтта өз парағының ретімен белгілейді, жүйе өзі негізгі кілтпен тексереді.
            </p>
          </div>
          <button
            disabled={busy}
            onClick={() => {
              if (hasSubs && !confirm('Кейбір оқушылар жауабын енгізіп қойған. Олардың парақтары бұрынғы ретпен тексерілген. Сонда да өзгертесіз бе?')) return
              onInstant({ ...exam, shuffle: !exam.shuffle }, exam.shuffle ? 'Жеке нұсқа өшірілді' : 'Жеке нұсқа қосылды')
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${exam.shuffle ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}
          >
            {exam.shuffle ? 'Қосулы ✓' : 'Қосу'}
          </button>
        </div>
        {exam.shuffle && (
          <a href={`/admin/bilim-test/variants?group=${encodeURIComponent(exam.group_id)}&exam=${encodeURIComponent(exam.id)}`} className="mt-3 inline-block rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white">
            Жеке нұсқаларды басып шығару (PDF)
          </a>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="font-semibold">Жауап қабылдау</div>
        <p className="text-sm text-slate-500">Бірден сақталады. Мысалы, 30 қазанда бір пәндерді, 31 қазанда қалғанын ашыңыз.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {exam.subjects.map((s) => {
            const isOpen = exam.open_subjects.includes(s.id)
            return (
              <button
                key={s.id}
                disabled={busy}
                onClick={() =>
                  onInstant(
                    { ...exam, open_subjects: isOpen ? exam.open_subjects.filter((x) => x !== s.id) : [...exam.open_subjects, s.id] },
                    'Жауап қабылдау жаңартылды'
                  )
                }
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${isOpen ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}
              >
                {s.name}: {isOpen ? 'ашық' : 'жабық'}
              </button>
            )
          })}
          <button disabled={busy} onClick={() => onInstant({ ...exam, open_subjects: exam.subjects.map((s) => s.id) }, 'Барлығы ашылды')} className="rounded-full border border-slate-300 px-3 py-1.5 text-sm">Бәрін ашу</button>
          <button disabled={busy} onClick={() => onInstant({ ...exam, open_subjects: [] }, 'Барлығы жабылды')} className="rounded-full border border-slate-300 px-3 py-1.5 text-sm">Бәрін жабу</button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 font-semibold">Осы айдың пәндері</div>
        <SubjectsEditor subjects={draft.subjects} onChange={(subjects) => setDraft({ ...draft, subjects })} />
        {hasSubs && (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Жауап парақтары түсіп қойған. Сұрақ санын өзгертсеңіз, бұрын тапсырылған парақтар жаңа санмен тексеріледі.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Сұрақтар: мәтін, сурет, тақырып ──────────────────────

export function QuestionsEditor({ draft, setDraft, flash }: { draft: Exam; setDraft: (e: Exam) => void; flash: (m: string) => void }) {
  const [sid, setSid] = useState(draft.subjects[0]?.id ?? '')
  const [openQ, setOpenQ] = useState<number | null>(null)
  const [bulk, setBulk] = useState('')
  const [uploading, setUploading] = useState<number | null>(null)
  const s = draft.subjects.find((x) => x.id === sid) ?? draft.subjects[0]
  if (!s) return null
  const letters = LETTERS.slice(0, s.options)
  const qs: Question[] = Array.from({ length: s.questions }, (_, i) => draft.questions?.[s.id]?.[i] ?? {})
  const key = Array.from({ length: s.questions }, (_, i) => draft.answer_key[s.id]?.[i] ?? '')
  const topics = Array.from(new Set(qs.map((q) => q.topic).filter(Boolean))) as string[]

  const setQ = (i: number, patch: Partial<Question>) =>
    setDraft({ ...draft, questions: { ...draft.questions, [s.id]: qs.map((q, j) => (j === i ? { ...q, ...patch } : q)) } })
  const setKey = (i: number, l: string) =>
    setDraft({ ...draft, answer_key: { ...draft.answer_key, [s.id]: key.map((k, j) => (j === i ? (k === l ? '' : l) : k)) } })

  // «1-5: Бөлшектер» жолдарын бірден қою
  const applyBulk = () => {
    const next = [...qs]
    let n = 0
    for (const line of bulk.split('\n')) {
      const m = line.match(/^\s*(\d+)\s*(?:[-–—]\s*(\d+))?\s*[:.)]\s*(.+)$/)
      if (!m) continue
      const a = Number(m[1])
      const b = Number(m[2] ?? m[1])
      for (let i = Math.max(1, a); i <= Math.min(s.questions, b); i++) {
        next[i - 1] = { ...next[i - 1], topic: m[3].trim() }
        n++
      }
    }
    setDraft({ ...draft, questions: { ...draft.questions, [s.id]: next } })
    flash(`${n} сұраққа тақырып қойылды. «Сақтау» басыңыз.`)
    setBulk('')
  }

  const upload = async (i: number, file: File) => {
    setUploading(i)
    try {
      const info = await post<{ path: string; token: string; publicUrl: string }>({ action: 'upload-url', fileName: file.name })
      const { error } = await supabase.storage.from('materials').uploadToSignedUrl(info.path, info.token, file)
      if (error) throw new Error(error.message)
      setQ(i, { image: info.publicUrl })
    } catch (e: any) {
      flash(`Сурет жүктелмеді: ${e.message}`)
    } finally {
      setUploading(null)
    }
  }

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-2">
        {draft.subjects.map((x) => (
          <button key={x.id} onClick={() => { setSid(x.id); setOpenQ(null) }} className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${x.id === s.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'}`}>
            {x.name}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-slate-500">
        Сұрақтың мәтіні, суреті және тақырыбы нәтиже жарияланған соң оқушыға көрінеді. Тақырыптар бойынша «қайталау керек тақырыптар» шығады.
      </p>

      <details className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold">Тақырыптарды тізіммен қою</summary>
        <p className="mt-2 text-xs text-slate-500">Әр жолға: <code>1-5: Бөлшектер</code> немесе <code>6: Пайыз</code></p>
        <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={5} className="mt-2 w-full rounded-lg border border-slate-300 p-2 font-mono text-sm" placeholder={'1-5: Бөлшектер\n6-10: Пайыз'} />
        <button onClick={applyBulk} disabled={!bulk.trim()} className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40">Қою</button>
      </details>

      <datalist id="bt-topics">{topics.map((t) => <option key={t} value={t} />)}</datalist>
      <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {qs.map((q, i) => (
          <div key={i} className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-8 text-right font-bold tabular-nums text-slate-400">{i + 1}</span>
              <div className="flex gap-1">
                {letters.map((l) => (
                  <button key={l} onClick={() => setKey(i, l)} className={`h-8 w-8 rounded-full border text-sm font-bold ${key[i] === l ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-400'}`}>
                    {l}
                  </button>
                ))}
              </div>
              <input list="bt-topics" value={q.topic ?? ''} onChange={(e) => setQ(i, { topic: e.target.value })} placeholder="Тақырып" className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm" />
              <button onClick={() => setOpenQ(openQ === i ? null : i)} className={`rounded-lg border px-2.5 py-1.5 text-sm ${q.text || q.image ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-600'}`}>
                {q.text || q.image ? 'Мәтін/сурет ✓' : 'Мәтін/сурет'}
              </button>
            </div>
            {openQ === i && (
              <div className="mt-3 grid gap-3 pl-10 md:grid-cols-2">
                <textarea value={q.text ?? ''} onChange={(e) => setQ(i, { text: e.target.value })} rows={5} placeholder="Сұрақтың мәтіні (міндетті емес)" className="w-full rounded-lg border border-slate-300 p-2 text-sm" />
                <div>
                  {q.image ? (
                    <div>
                      <img src={q.image} alt="" className="max-h-48 rounded-lg border border-slate-200 object-contain" />
                      <button onClick={() => setQ(i, { image: '' })} className="mt-1 text-sm text-red-600">Суретті алып тастау</button>
                    </div>
                  ) : (
                    <label className="flex h-28 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-sm text-slate-500 hover:bg-slate-50">
                      {uploading === i ? 'Жүктелуде…' : 'Сурет жүктеу (скриншот)'}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(i, e.target.files[0])} />
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Оқушылар: қосу, атын өзгерту, өшіру, PIN ─────────────

export function StudentsTab({
  group,
  students,
  reload,
  flash,
}: {
  group: Group
  students: Student[]
  reload: () => Promise<void>
  flash: (m: string) => void
}) {
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPins, setShowPins] = useState(false)

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

  const pinList = students.map((s) => `${s.full_name} — ${s.pin}`).join('\n')

  return (
    <div className="mt-5 space-y-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (await run({ action: 'add-student', group: group.id, name }, 'Оқушы қосылды')) setName('')
        }}
        className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4"
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Тегі мен аты" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" />
        <button disabled={busy || name.trim().length < 3} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">+ Оқушы қосу</button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setShowPins(!showPins)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">
          {showPins ? 'PIN-дерді жасыру' : 'PIN-дерді көрсету'}
        </button>
        <button onClick={() => { navigator.clipboard?.writeText(pinList); flash('Тізім көшірілді') }} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">
          «Аты — PIN» тізімін көшіру
        </button>
      </div>

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {students.map((s, i) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
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
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-sm tracking-widest">{showPins ? s.pin : '••••'}</span>
                <button disabled={busy} onClick={() => confirm(`${s.full_name}: жаңа PIN жасалсын ба? Ескі PIN жұмыс істемей қалады.`) && run({ action: 'reset-pin', id: s.id }, 'Жаңа PIN жасалды')} className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100">
                  Жаңа PIN
                </button>
                <button onClick={() => { setEditing(s.id); setEditName(s.full_name) }} className="rounded-md px-2 py-1 text-sm text-blue-600 hover:bg-blue-50">Өзгерту</button>
                <button
                  disabled={busy}
                  onClick={() => confirm(`${s.full_name} тізімнен шығарылады. Оның жауап парақтары да өшеді. Жалғастырасыз ба?`) && run({ action: 'delete-student', id: s.id }, 'Тізімнен шығарылды')}
                  className="rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                >
                  Өшіру
                </button>
              </>
            )}
          </li>
        ))}
        {students.length === 0 && <li className="px-4 py-6 text-center text-slate-400">Әзірге оқушы жоқ</li>}
      </ul>
      <p className="text-sm text-slate-500">Атын өзгертсеңіз, оқушының нәтижелері мен жауап парақтары жаңа атымен сақталады. 5 рет қате PIN енгізсе, 10 минутқа бұғатталады — «Жаңа PIN» бұғатты алады.</p>
    </div>
  )
}

export function Results({ data, exam, onOpen, onRefresh, at }: { data: Resp; exam: Exam; onOpen: (n: string) => void; onRefresh?: () => Promise<void>; at?: Date | null }) {
  const [busyR, setBusyR] = useState(false)
  const subs = useMemo(() => { const n = new Set(data.students.map((s) => s.full_name)); return data.submissions.filter((s) => n.has(s.student_name)) }, [data.students, data.submissions])
  const rk = useMemo(() => ranking(exam, subs), [exam, subs])
  const submittedBy = useMemo(() => {
    const m: Record<string, Set<string>> = {}
    for (const s of subs) (m[s.student_name] ??= new Set()).add(s.subject)
    return m
  }, [subs])
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportResultsXlsx(data, exam).catch((e) => alert(e.message))}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white"
          >
            ⬇ Excel жүктеу
          </button>
        </div>
        {onRefresh && (
          <div className="flex items-center gap-2">
            {at && <span className="text-xs text-slate-400">{at.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · 20 сек сайын өзі жаңарады</span>}
            <button
              disabled={busyR}
              onClick={async () => {
                setBusyR(true)
                await onRefresh()
                setBusyR(false)
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
            >
              {busyR ? 'Жаңартылуда…' : '↻ Жаңарту'}
            </button>
          </div>
        )}

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
                      <a href={`/admin/bilim-test/report?group=${exam.group_id}&exam=${exam.id}&student=${encodeURIComponent(r.name)}`} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50">
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
      <p className="mt-2 text-xs text-slate-400">Қызыл — пән максимумының 35 %-ынан төмен. Аты-жөнін басып, жауап парақтарын көруге, түзетуге, қағаздан қолмен енгізуге не өшіруге болады.</p>
    </div>
  )
}
export function totalBg(t: number, max: number) {
  const p = Math.min(1, t / max)
  const a = 0.12 + p * 0.6
  return `rgba(22,163,74,${a.toFixed(2)})`
}
export function KeyEditor({ draft, setDraft }: { draft: Exam; setDraft: (e: Exam) => void }) {
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
export function StudentDrawer({
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

