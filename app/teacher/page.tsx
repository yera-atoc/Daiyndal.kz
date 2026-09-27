'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { subjects } from '@/lib/subjects'
import { supabase } from '@/lib/supabaseClient'
import { WEEKDAYS, hhmm, slotGroupName, type ScheduleSlot } from '@/lib/schedule'

const MATERIALS_BUCKET = 'materials'
const MAX_FILE_MB = 30

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
type StudentRow = {
  id: string
  full_name: string
  grade: number | null
  group_id: string | null
  student_groups?: { id: string; name: string } | null
}
type AttendanceRecord = { id: string; student_id: string; date: string; present: boolean }

type Tab = 'schedule' | 'students' | 'materials' | 'tests' | 'profile'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export default function TeacherDashboard() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('schedule')
  const [me, setMe] = useState<Teacher | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [tests, setTests] = useState<Test[]>([])
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)

  async function loadAll() {
    const [meRes, materialsRes, testsRes, scheduleRes, studentsRes] = await Promise.all([
      fetch('/api/teacher/me'),
      fetch('/api/materials'),
      fetch('/api/tests'),
      fetch('/api/schedule?mine=1'),
      fetch('/api/teacher/students'),
    ])
    if (meRes.ok) setMe(await meRes.json())
    if (materialsRes.ok) setMaterials(await materialsRes.json())
    if (testsRes.ok) setTests(await testsRes.json())
    if (scheduleRes.ok) setSlots(await scheduleRes.json())
    if (studentsRes.ok) setStudents(await studentsRes.json())
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
      <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
        <p className="text-sm text-zinc-500">Жүктелуде...</p>
      </main>
    )
  }

  const tabs: [Tab, string][] = [
    ['schedule', 'Менің кестем'],
    ['students', 'Оқушылар'],
    ['materials', 'Материалдар'],
    ['tests', 'Тесттер'],
    ['profile', 'Профиль'],
  ]

  return (
    <main className="min-h-screen bg-[#F8F9FA] font-sans text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex flex-col group">
            <span className="text-xl font-black tracking-tight text-black leading-none group-hover:opacity-80 transition-opacity">
              BELES
            </span>
            <span className="text-[10px] font-bold tracking-widest text-sky-500 uppercase leading-tight">
              education
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
                {me ? initials(me.name) : '·'}
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-zinc-900">{me?.name}</p>
                <p className="text-xs text-zinc-500">{me?.subject ?? 'Оқытушы'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:border-black"
            >
              Шығу
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex flex-wrap gap-2">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === key
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'schedule' && <ScheduleTab slots={slots} />}
        {tab === 'students' && <StudentsTab students={students} />}
        {tab === 'materials' && <MaterialsTab materials={materials} reload={loadAll} />}
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
      <form onSubmit={save} className="max-w-md space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <label className="block text-sm text-zinc-600">
          Аты-жөні
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
          />
        </label>
        <div className="rounded-lg bg-zinc-50 border border-zinc-100 p-3 text-sm text-zinc-600">
          <p>Логин: <span className="font-medium text-zinc-900">{me.username ?? '—'}</span></p>
          {me.subject && <p>Пәні: <span className="font-medium text-zinc-900">{me.subject}</span></p>}
          <p className="mt-1 text-xs text-zinc-400">Логин мен пәнді әкімші өзгертеді.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-black px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
          >
            {saving ? 'Сақталуда...' : 'Сақтау'}
          </button>
          {message && (
            <p className={`text-sm ${message.ok ? 'text-zinc-500' : 'text-red-600'}`}>{message.text}</p>
          )}
        </div>
      </form>
    </section>
  )
}

function ScheduleTab({ slots }: { slots: ScheduleSlot[] }) {
  // Read-only: the schedule is set by the admin. Shown as a weekly board,
  // one column per weekday, with lesson cards stacked in time order.
  const activeDays = WEEKDAYS.filter((d) => slots.some((s) => s.day_of_week === d.id))

  return (
    <section className="mt-8">
      {slots.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-500 shadow-sm">
          Әзірге кесте қойылмаған. Сабақ кестесін әкімші қосады.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div
            className="grid min-w-[720px] divide-x divide-zinc-200"
            style={{ gridTemplateColumns: `repeat(${activeDays.length}, minmax(0, 1fr))` }}
          >
            {activeDays.map((d) => {
              const daySlots = slots
                .filter((s) => s.day_of_week === d.id)
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
              return (
                <div key={d.id} className="flex flex-col">
                  <div className="border-b border-zinc-200 bg-black px-3 py-2.5 text-center">
                    <p className="text-sm font-semibold text-white">{d.name}</p>
                  </div>
                  <div className="flex-1 space-y-2 bg-zinc-50/50 p-2">
                    {daySlots.map((s) => (
                      <div key={s.id} className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
                        <p className="text-sm font-bold text-zinc-900">
                          {hhmm(s.start_time)}–{hhmm(s.end_time)}
                        </p>
                        {slotGroupName(s) && (
                          <span className="mt-1 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                            {slotGroupName(s)}
                          </span>
                        )}
                        {s.title && <p className="mt-1 text-sm text-zinc-700">{s.title}</p>}
                        {s.note && <p className="mt-1 text-xs text-zinc-400">{s.note}</p>}
                      </div>
                    ))}
                    {daySlots.length === 0 && <div className="px-2 py-6" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

function StudentsTab({ students }: { students: StudentRow[] }) {
  const [date, setDate] = useState(todayISO())
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  async function loadAttendance(forDate: string) {
    setLoading(true)
    const res = await fetch(`/api/teacher/attendance?date=${forDate}`)
    if (res.ok) setRecords(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    loadAttendance(date)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const byStudent = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const r of records) map.set(r.student_id, r.present)
    return map
  }, [records])

  async function mark(studentId: string, present: boolean) {
    setSavingId(studentId)
    const res = await fetch('/api/teacher/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, date, present }),
    })
    setSavingId(null)
    if (res.ok) {
      setRecords((prev) => {
        const rest = prev.filter((r) => r.student_id !== studentId)
        return [...rest, { id: studentId, student_id: studentId, date, present }]
      })
    }
  }

  const presentCount = students.filter((s) => byStudent.get(s.id) === true).length

  return (
    <section className="mt-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <label className="text-sm text-zinc-600">
          Күні:{' '}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="ml-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900"
          />
        </label>
        {students.length > 0 && (
          <p className="text-sm text-zinc-600">
            Келді: <span className="font-semibold text-black">{presentCount}</span> / {students.length}
          </p>
        )}
      </div>

      <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {students.map((s) => {
          const present = byStudent.get(s.id)
          return (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium text-zinc-900">{s.full_name}</p>
                <p className="text-xs text-zinc-500">
                  {s.grade ? `${s.grade}-сынып` : ''}
                  {s.student_groups?.name ? ` · ${s.student_groups.name}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => mark(s.id, true)}
                  disabled={savingId === s.id}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                    present === true
                      ? 'bg-black text-white'
                      : 'border border-zinc-300 text-zinc-600 hover:border-black'
                  }`}
                >
                  <span>✓</span> Келді
                </button>
                <button
                  onClick={() => mark(s.id, false)}
                  disabled={savingId === s.id}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                    present === false
                      ? 'bg-zinc-900 text-white'
                      : 'border border-zinc-300 text-zinc-600 hover:border-black'
                  }`}
                >
                  <span>✕</span> Келмеді
                </button>
              </div>
            </div>
          )
        })}
        {!loading && students.length === 0 && (
          <p className="px-4 py-6 text-sm text-zinc-500">Сізге бекітілген оқушы жоқ.</p>
        )}
      </div>
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
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadPct, setUploadPct] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function uploadSelectedFile(): Promise<string> {
    if (!file) return ''
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      throw new Error(`Файл тым үлкен (макс. ${MAX_FILE_MB}MB)`)
    }
    const res = await fetch('/api/materials/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name }),
    })
    const info = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(info.error ?? 'Жүктеу сілтемесін алу мүмкін болмады')

    setUploadPct(10)
    const { error: uploadError } = await supabase.storage
      .from(MATERIALS_BUCKET)
      .uploadToSignedUrl(info.path, info.token, file)
    setUploadPct(90)

    if (uploadError) throw new Error(`Файл жүктелмеді: ${uploadError.message}`)
    setUploadPct(100)
    return info.publicUrl as string
  }

  async function addMaterial(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setError(null)
    setSaving(true)
    try {
      const fileUrl = file ? await uploadSelectedFile() : ''
      await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          title,
          description: description || null,
          url: fileUrl || url || null,
        }),
      })
      setTitle('')
      setDescription('')
      setUrl('')
      setFile(null)
      await reload()
    } catch (err: any) {
      setError(err?.message ?? 'Қате шықты')
    } finally {
      setSaving(false)
      setUploadPct(null)
    }
  }

  async function removeMaterial(id: string) {
    await fetch(`/api/materials/${id}`, { method: 'DELETE' })
    await reload()
  }

  return (
    <section className="mt-8">
      <form onSubmit={addMaterial} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
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
            className="flex-1 min-w-[180px] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-3 text-sm text-zinc-600 hover:border-black">
            <span className="shrink-0 rounded-md bg-black px-3 py-1 text-xs font-semibold text-white">
              Файл таңдау
            </span>
            <span className="truncate">
              {file ? file.name : 'Ноутбук немесе телефоннан (PDF, сурет, Word...)'}
            </span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={!!file}
            placeholder="Немесе сілтеме (Google Drive, PDF)"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm disabled:opacity-40"
          />
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Қысқаша сипаттама — міндетті емес"
          rows={2}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-black px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
          >
            {saving ? (uploadPct !== null ? `Жүктелуде... ${uploadPct}%` : 'Сақталуда...') : 'Қосу'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </form>

      <div className="mt-6 divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {materials.map((m) => (
          <div key={m.id} className="flex items-start justify-between gap-4 px-4 py-3">
            <div>
              <p className="font-medium text-zinc-900">{m.title}</p>
              <p className="text-xs text-zinc-500">
                {subjects.find((s) => s.id === m.subject)?.name ?? m.subject}
              </p>
              {m.description && <p className="mt-1 text-sm text-zinc-700">{m.description}</p>}
              {m.url && (
                <a
                  href={m.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-sm text-sky-600 underline"
                >
                  Ашу
                </a>
              )}
            </div>
            <button
              onClick={() => removeMaterial(m.id)}
              className="shrink-0 text-sm text-red-600 hover:underline"
            >
              Жою
            </button>
          </div>
        ))}
        {materials.length === 0 && (
          <p className="px-4 py-6 text-sm text-zinc-500">Әзірге материал қосылмаған</p>
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
      <form onSubmit={createTest} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
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
            className="flex-1 min-w-[220px] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-4 space-y-4">
          {questions.map((q, qIndex) => (
            <div key={qIndex} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex items-start gap-2">
                <input
                  value={q.questionText}
                  onChange={(e) => updateQuestion(qIndex, { questionText: e.target.value })}
                  placeholder={`${qIndex + 1}-сұрақ мәтіні`}
                  className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                />
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(qIndex)}
                    className="shrink-0 px-2 py-2 text-sm text-red-600 hover:underline"
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
                      className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm"
                    />
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                Дұрыс жауапты сол жақтағы дөңгелек арқылы белгілеңіз
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={addQuestion}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-900 transition hover:border-black"
          >
            + Сұрақ қосу
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-black px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
          >
            {saving ? 'Сақталуда...' : 'Тестті сақтау'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </form>

      <div className="mt-6 divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {tests.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-zinc-900">{t.title}</p>
              <p className="text-xs text-zinc-500">
                {subjects.find((s) => s.id === t.subject)?.name ?? t.subject} ·{' '}
                {t.test_questions?.[0]?.count ?? 0} сұрақ
              </p>
            </div>
            <button
              onClick={() => removeTest(t.id)}
              className="text-sm text-red-600 hover:underline"
            >
              Жою
            </button>
          </div>
        ))}
        {tests.length === 0 && (
          <p className="px-4 py-6 text-sm text-zinc-500">Әзірге тест қосылмаған</p>
        )}
      </div>
    </section>
  )
}
