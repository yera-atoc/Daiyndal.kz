'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { subjects } from '@/lib/subjects'
import { WEEKDAYS, hhmm, slotGroupName, type ScheduleSlot } from '@/lib/schedule'

type Teacher = { id: string; name: string; subject: string | null; username?: string | null }
type Material = {
  id: string
  subject: string
  title: string
  description: string | null
  url: string | null
  created_at: string
}
type Test = {
  id: string
  subject: string
  title: string
  created_at: string
  test_questions: { count: number }[]
}

type Tab = 'schedule' | 'materials' | 'tests' | 'profile'

export default function TeacherDashboard() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('schedule')
  const [me, setMe] = useState<Teacher | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [tests, setTests] = useState<Test[]>([])
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [loading, setLoading] = useState(true)

  async function loadAll() {
    const [meRes, materialsRes, testsRes, scheduleRes] = await Promise.all([
      fetch('/api/teacher/me'),
      fetch('/api/materials'),
      fetch('/api/tests'),
      fetch('/api/schedule?mine=1'),
    ])
    if (meRes.ok) setMe(await meRes.json())
    if (materialsRes.ok) setMaterials(await materialsRes.json())
    if (testsRes.ok) setTests(await testsRes.json())
    if (scheduleRes.ok) setSlots(await scheduleRes.json())
  }

  useEffect(() => {
    setLoading(true)
    loadAll().finally(() => setLoading(false))
  }, [])

  async function handleLogout() {
    await fetch('/api/teacher/logout', { method: 'POST' })
    router.push('/teacher/login')
    router.refresh()
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper">
        <p className="text-ink/60">Жүктелуде...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <p className="font-serif text-xl font-bold text-ink">
              Beles · Оқытушы кабинеті
            </p>
            {me && <p className="text-sm text-ink/50">{me.name}</p>}
          </div>
          <button
            onClick={handleLogout}
            className="border border-ink/20 px-4 py-2 text-sm text-ink transition hover:border-ink"
          >
            Шығу
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex gap-2">
          {(
            [
              ['schedule', 'Менің кестем'],
              ['materials', 'Материалдар'],
              ['tests', 'Тесттер'],
              ['profile', 'Профиль'],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`border px-4 py-2 text-sm font-medium transition ${
                tab === key
                  ? 'border-ink bg-ink text-paper'
                  : 'border-ink/20 text-ink/70 hover:border-ink/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'schedule' && <ScheduleTab slots={slots} />}
        {tab === 'materials' && (
          <MaterialsTab
            materials={materials}
            reload={loadAll}
          />
        )}
        {tab === 'tests' && <TestsTab tests={tests} reload={loadAll} />}
        {tab === 'profile' && <ProfileTab me={me} onSaved={loadAll} />}
      </div>
    </main>
  )
}

function ProfileTab({ me, onSaved }: { me: Teacher | null; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(me?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  if (!me) return null

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (!name.trim()) return
    setSaving(true)
    const res = await fetch('/api/teacher/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setSaving(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setMessage({ ok: false, text: data.error ?? 'Қате шықты' })
      return
    }
    setMessage({ ok: true, text: 'Сақталды' })
    await onSaved()
  }

  return (
    <section className="mt-8">
      <form onSubmit={save} className="max-w-md space-y-4 border border-ink/10 bg-card p-4">
        <label className="block text-sm text-ink/70">
          Аты-жөні
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full border border-ink/20 bg-white px-3 py-2 text-sm text-ink"
          />
        </label>
        <div className="text-sm text-ink/60">
          <p>Логин: <span className="font-medium text-ink">{me.username ?? '—'}</span></p>
          {me.subject && <p>Пәні: <span className="font-medium text-ink">{me.subject}</span></p>}
          <p className="mt-1 text-xs text-ink/40">Логин мен пәнді әкімші өзгертеді.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-ink px-5 py-2 text-sm font-medium text-paper transition hover:bg-ink/80 disabled:opacity-60"
          >
            {saving ? 'Сақталуда...' : 'Сақтау'}
          </button>
          {message && (
            <p className={`text-sm ${message.ok ? 'text-ink/60' : 'text-coral'}`}>{message.text}</p>
          )}
        </div>
      </form>
    </section>
  )
}

function ScheduleTab({ slots }: { slots: ScheduleSlot[] }) {
  // Read-only: the schedule is set by the admin.
  return (
    <section className="mt-8">
      {slots.length === 0 ? (
        <div className="border border-ink/10 bg-card px-4 py-6 text-sm text-ink/50">
          Әзірге кесте қойылмаған. Сабақ кестесін әкімші қосады.
        </div>
      ) : (
        <div className="divide-y divide-ink/10 border border-ink/10 bg-card">
          {WEEKDAYS.map((d) => {
            const daySlots = slots.filter((s) => s.day_of_week === d.id)
            if (daySlots.length === 0) return null
            return (
              <div key={d.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:gap-6">
                <p className="w-32 shrink-0 font-medium">{d.name}</p>
                <div className="flex-1 space-y-2">
                  {daySlots.map((s) => (
                    <div key={s.id}>
                      <p className="font-medium">
                        {hhmm(s.start_time)}–{hhmm(s.end_time)}
                        {slotGroupName(s) && (
                          <span className="ml-2 border border-ink/20 px-2 py-0.5 text-xs font-medium">
                            {slotGroupName(s)}
                          </span>
                        )}
                        {s.title && <span className="ml-2 font-normal text-ink/70">{s.title}</span>}
                      </p>
                      {s.note && <p className="text-sm text-ink/50">{s.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function MaterialsTab({
  materials,
  reload,
}: {
  materials: Material[]
  reload: () => Promise<void>
}) {
  const [subject, setSubject] = useState(subjects[0].id)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)

  async function addMaterial(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    await fetch('/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject,
        title,
        description: description || null,
        url: url || null,
      }),
    })
    setTitle('')
    setDescription('')
    setUrl('')
    await reload()
    setSaving(false)
  }

  async function removeMaterial(id: string) {
    await fetch(`/api/materials/${id}`, { method: 'DELETE' })
    await reload()
  }

  return (
    <section className="mt-8">
      <form onSubmit={addMaterial} className="flex flex-wrap gap-3 border border-ink/10 bg-card p-4">
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="border border-ink/20 bg-white px-3 py-2 text-sm"
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Материал атауы"
          className="flex-1 min-w-[180px] border border-ink/20 bg-white px-3 py-2 text-sm"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Сілтеме (Google Drive, PDF және т.б.) — міндетті емес"
          className="flex-1 min-w-[220px] border border-ink/20 bg-white px-3 py-2 text-sm"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Қысқаша сипаттама — міндетті емес"
          rows={2}
          className="w-full border border-ink/20 bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={saving}
          className="bg-ink px-5 py-2 text-sm font-medium text-paper transition hover:bg-ink/80 disabled:opacity-60"
        >
          Қосу
        </button>
      </form>

      <div className="mt-6 divide-y divide-ink/10 border border-ink/10 bg-card">
        {materials.map((m) => (
          <div key={m.id} className="flex items-start justify-between gap-4 px-4 py-3">
            <div>
              <p className="font-medium">{m.title}</p>
              <p className="text-xs text-ink/50">
                {subjects.find((s) => s.id === m.subject)?.name ?? m.subject}
              </p>
              {m.description && <p className="mt-1 text-sm text-ink/70">{m.description}</p>}
              {m.url && (
                <a
                  href={m.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-sm text-sky underline"
                >
                  Сілтеме
                </a>
              )}
            </div>
            <button
              onClick={() => removeMaterial(m.id)}
              className="shrink-0 text-sm text-coral hover:underline"
            >
              Жою
            </button>
          </div>
        ))}
        {materials.length === 0 && (
          <p className="px-4 py-6 text-sm text-ink/50">Әзірге материал қосылмаған</p>
        )}
      </div>
    </section>
  )
}

type DraftQuestion = { questionText: string; options: string[]; correctIndex: number }

function emptyQuestion(): DraftQuestion {
  return { questionText: '', options: ['', '', '', ''], correctIndex: 0 }
}

function TestsTab({ tests, reload }: { tests: Test[]; reload: () => Promise<void> }) {
  const [subject, setSubject] = useState(subjects[0].id)
  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)))
  }

  function updateOption(qIndex: number, oIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) } : q
      )
    )
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion()])
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  async function createTest(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim()) return

    setSaving(true)
    const res = await fetch('/api/tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, title, questions }),
    })
    setSaving(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Қате шықты')
      return
    }

    setTitle('')
    setQuestions([emptyQuestion()])
    await reload()
  }

  async function removeTest(id: string) {
    await fetch(`/api/tests/${id}`, { method: 'DELETE' })
    await reload()
  }

  return (
    <section className="mt-8">
      <form onSubmit={createTest} className="border border-ink/10 bg-card p-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="border border-ink/20 bg-white px-3 py-2 text-sm"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Тест атауы"
            className="flex-1 min-w-[220px] border border-ink/20 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-4 space-y-4">
          {questions.map((q, qIndex) => (
            <div key={qIndex} className="border border-ink/10 bg-white p-3">
              <div className="flex items-start gap-2">
                <input
                  value={q.questionText}
                  onChange={(e) => updateQuestion(qIndex, { questionText: e.target.value })}
                  placeholder={`${qIndex + 1}-сұрақ мәтіні`}
                  className="flex-1 border border-ink/20 bg-paper px-3 py-2 text-sm"
                />
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(qIndex)}
                    className="shrink-0 px-2 py-2 text-sm text-coral hover:underline"
                  >
                    Жою
                  </button>
                )}
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {q.options.map((opt, oIndex) => (
                  <label key={oIndex} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`correct-${qIndex}`}
                      checked={q.correctIndex === oIndex}
                      onChange={() => updateQuestion(qIndex, { correctIndex: oIndex })}
                    />
                    <input
                      value={opt}
                      onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                      placeholder={`Жауап нұсқасы ${oIndex + 1}`}
                      className="flex-1 border border-ink/20 bg-paper px-3 py-1.5 text-sm"
                    />
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-ink/40">
                Дұрыс жауапты сол жақтағы дөңгелек арқылы белгілеңіз
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={addQuestion}
            className="border border-ink/20 px-4 py-2 text-sm text-ink transition hover:border-ink"
          >
            + Сұрақ қосу
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-ink px-5 py-2 text-sm font-medium text-paper transition hover:bg-ink/80 disabled:opacity-60"
          >
            {saving ? 'Сақталуда...' : 'Тестті сақтау'}
          </button>
          {error && <p className="text-sm text-coral">{error}</p>}
        </div>
      </form>

      <div className="mt-6 divide-y divide-ink/10 border border-ink/10 bg-card">
        {tests.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium">{t.title}</p>
              <p className="text-xs text-ink/50">
                {subjects.find((s) => s.id === t.subject)?.name ?? t.subject} ·{' '}
                {t.test_questions?.[0]?.count ?? 0} сұрақ
              </p>
            </div>
            <button
              onClick={() => removeTest(t.id)}
              className="text-sm text-coral hover:underline"
            >
              Жою
            </button>
          </div>
        ))}
        {tests.length === 0 && (
          <p className="px-4 py-6 text-sm text-ink/50">Әзірге тест қосылмаған</p>
        )}
      </div>
    </section>
  )
}
