'use client'
// Мұғалім: Білім тексеру сынағы бойынша әр оқушыға пікір. Ата-анаға кететін PDF есептің 4-бетіне шығады.
import { useCallback, useEffect, useState } from 'react'

type Note = { student_id: string; teacher_id: string; teacher_name: string; subject: string | null; text: string }
type Resp = {
  me: { id: string; name: string }
  ready: boolean
  groups: { id: string; name: string }[]
  group: string
  exams: { id: string; title: string }[]
  exam: string | null
  students: { id: string; name: string }[]
  notes: Note[]
  error?: string
}

const MAX = 800

export default function NotesTab() {
  const [d, setD] = useState<Resp | null>(null)
  const [err, setErr] = useState('')
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [state, setState] = useState<Record<string, 'saving' | 'saved' | string>>({})
  const [q, setQ] = useState('')

  const load = useCallback(async (group?: string, exam?: string) => {
    setErr('')
    const p = new URLSearchParams()
    if (group) p.set('group', group)
    if (exam) p.set('exam', exam)
    const r = await fetch(`/api/teacher/notes?${p}`, { cache: 'no-store' })
    const j = await r.json()
    if (!r.ok) return setErr(j.error || 'Қате')
    setD(j)
    setDraft(Object.fromEntries((j.notes as Note[]).filter((n) => n.teacher_id === j.me?.id).map((n) => [n.student_id, n.text])))
    setState({})
  }, [])

  useEffect(() => { load() }, [load])

  async function save(sid: string) {
    if (!d?.exam) return
    setState((s) => ({ ...s, [sid]: 'saving' }))
    const r = await fetch('/api/teacher/notes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exam: d.exam, student: sid, text: draft[sid] ?? '' }),
    })
    const j = await r.json().catch(() => ({}))
    setState((s) => ({ ...s, [sid]: r.ok ? 'saved' : j.error || 'Сақталмады' }))
  }

  if (err) return <p className="mt-6 text-sm text-rose-600">{err}</p>
  if (!d) return <p className="mt-6 text-sm text-zinc-500">Жүктелуде…</p>

  const others = (sid: string) => d.notes.filter((n) => n.student_id === sid && n.teacher_id !== d.me.id)
  const list = d.students.filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase()))
  const written = d.students.filter((s) => (draft[s.id] ?? '').trim()).length

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
        Әр оқушыға қысқа пікір жазыңыз: жетістігі, неге көңіл бөлу керек, ата-анаға кеңес. Пікір сынақ нәтижесінің PDF есебіне «Мұғалімдердің пікірі» деген бетпен шығып, ата-анаға жіберіледі.
      </div>
      {!d.ready && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Пікірлерді сақтау үшін әкімші Supabase-те <code>20261104_02_teacher_notes.sql</code> файлын бір рет іске қосуы керек.
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <select value={d.group} onChange={(e) => load(e.target.value)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
          {d.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select value={d.exam ?? ''} onChange={(e) => load(d.group, e.target.value)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
          {d.exams.length === 0 && <option value="">Сынақ жоқ</option>}
          {d.exams.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Оқушыны іздеу" className="min-w-[160px] flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
      </div>
      {d.exam && <p className="text-sm text-zinc-500">Жазылғаны: {written} / {d.students.length}</p>}
      {d.exam && list.map((s) => {
        const st = state[s.id]
        const text = draft[s.id] ?? ''
        return (
          <div key={s.id} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{s.name}</span>
              <span className={`text-xs ${st === 'saved' ? 'text-emerald-600' : st && st !== 'saving' ? 'text-rose-600' : 'text-zinc-400'}`}>
                {st === 'saving' ? 'Сақталуда…' : st === 'saved' ? 'Сақталды' : st || `${text.length}/${MAX}`}
              </span>
            </div>
            {others(s.id).map((n) => (
              <p key={n.teacher_id} className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600"><b>{n.teacher_name}{n.subject ? ` (${n.subject})` : ''}:</b> {n.text}</p>
            ))}
            <textarea
              value={text}
              maxLength={MAX}
              rows={3}
              onChange={(e) => { setDraft((x) => ({ ...x, [s.id]: e.target.value })); setState((x) => ({ ...x, [s.id]: '' })) }}
              onBlur={() => st === '' && save(s.id)}
              placeholder="Мысалы: Математикадан айтарлықтай өсті. Мәтінді есептерді үйде күніне 5-тен шығаруы керек."
              className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <div className="mt-2 flex justify-end">
              <button onClick={() => save(s.id)} className="rounded-lg bg-black px-4 py-1.5 text-sm font-medium text-white">Сақтау</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
