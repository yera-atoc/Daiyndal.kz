'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { subjects } from '@/lib/subjects'

type Teacher = { id: string; name: string; subject: string | null }
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

type Tab = 'materials' | 'tests'

export default function TeacherDashboard() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('materials')
  const [me, setMe] = useState<Teacher | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [tests, setTests] = useState<Test[]>([])
  const [loading, setLoading] = useState(true)

  async function loadAll() {
    const [meRes, materialsRes, testsRes] = await Promise.all([
      fetch('/api/teacher/me'),
      fetch('/api/materials'),
      fetch('/api/tests'),
    ])
    if (meRes.ok) setMe(await meRes.json())
    if (materialsRes.ok) setMaterials(await materialsRes.json())
    if (testsRes.ok) setTests(await testsRes.json())
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
              ['materials', 'Материалдар'],
              ['tests', 'Тесттер'],
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

        {tab === 'materials' && (
          <MaterialsTab
            materials={materials}
            reload={loadAll}
          />
        )}
        {tab === 'tests' && <TestsTab tests={tests} reload={loadAll} />}
      </div>
    </main>
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
