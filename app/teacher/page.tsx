'use client'

import NotesTab from '@/components/teacher/NotesTab'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { subjects } from '@/lib/subjects'
import { isEnglishSubject } from '@/lib/teacherSubject'
import { supabase } from '@/lib/supabaseClient'
import { type ScheduleSlot } from '@/lib/schedule'
import WeeklyTimetable from '@/components/WeeklyTimetable'
import TeacherJournal from '@/components/journal/TeacherJournal'
import EnglishResults from '@/components/teacher/EnglishResults'
import OverviewTab from '@/components/teacher/OverviewTab'
import Today from '@/components/lesson/Today'
import PlanEditor from '@/components/lesson/PlanEditor'
import GroupGrid from '@/components/lesson/GroupGrid'
import { fileSrc } from '@/lib/fileUrl'

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
  rating_points: number
}
type AttendanceRecord = { id: string; student_id: string; date: string; present: boolean }

type Tab = 'today' | 'grid' | 'plan' | 'overview' | 'journal' | 'schedule' | 'students' | 'notes' | 'results' | 'materials' | 'tests' | 'profile'

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
  const [tab, setTab] = useState<Tab>('today')
  const [more, setMore] = useState(false)
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

  // Күнделікті жұмыс — алғашқы үшеуі; қалғаны «Тағы» ішінде
  const main: [Tab, string][] = [
    ['today', 'Бүгін'],
    ['grid', 'Журнал'],
    ['plan', 'КТП'],
    ['overview', 'Прогресс'],
  ]
  const tabs: [Tab, string][] = [
    ['journal', 'Апталық журнал'],
    ['schedule', 'Менің кестем'],
    ['students', 'Оқушылар'],
    ['notes', 'Оқушыға пікір'],
    ...(isEnglishSubject(me?.subject) ? ([['results', 'Нәтижелер']] as [Tab, string][]) : []),
    ['materials', 'Материалдар'],
    ['tests', 'Тесттер'],
    ['profile', 'Профиль'],
  ]

  return (
    <main className="min-h-screen bg-[#F8F9FA] font-sans text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="flex flex-col group">
            <span className="text-xl font-black tracking-tight text-black leading-none group-hover:opacity-80 transition-opacity">
              BELES
            </span>
            <span className="text-[10px] font-bold tracking-widest text-sky-500 uppercase leading-tight">
              education
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/ielts/teacher" className="rounded-lg bg-black px-3 py-2 text-xs font-bold text-white hover:opacity-80">IELTS · TOEFL · ҰБТ</Link>
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

      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="flex flex-wrap gap-2">
          {main.map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setTab(key); setMore(false) }}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab === key ? 'bg-black text-white shadow-sm' : 'bg-white text-zinc-700 ring-1 ring-zinc-200 hover:ring-zinc-400'}`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setMore(!more)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tabs.some(([k]) => k === tab) ? 'bg-black text-white' : 'bg-white text-zinc-700 ring-1 ring-zinc-200 hover:ring-zinc-400'}`}
            aria-expanded={more}
          >
            {tabs.find(([k]) => k === tab)?.[1] ?? 'Тағы'} ▾
          </button>
        </div>
        {more && (
          <div className="mt-2 flex flex-wrap gap-2 rounded-2xl bg-white p-2 ring-1 ring-zinc-200">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                onClick={() => { setTab(key); setMore(false) }}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${tab === key ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {tab === 'today' && <Today />}
        {tab === 'grid' && <GroupGrid classId={null} />}
        {tab === 'plan' && <PlanEditor classId={null} onBack={() => setTab('today')} />}

        {tab === 'overview' && <OverviewTab />}
        {tab === 'journal' && <TeacherJournal />}
        {tab === 'schedule' && <ScheduleTab slots={slots} students={students} />}
        {tab === 'students' && <StudentsTab students={students} onRatingChanged={loadAll} />}
        {tab === 'notes' && <NotesTab />}
        {tab === 'results' && <EnglishResults />}
        {(tab === 'materials' || tab === 'tests') && isEnglishSubject(me?.subject) && <EnglishHub tab={tab} />}
        {tab === 'materials' && <MaterialsTab materials={materials} reload={loadAll} />}
        {tab === 'materials' && <SharedMaterials mineIds={materials.map((m) => m.id)} />}
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

function ScheduleTab({ slots, students }: { slots: ScheduleSlot[]; students: StudentRow[] }) {
  // Read-only: the schedule is set by the admin. Weekly grid like BilimClass.
  const groupSizes = useMemo(() => {
    const m: Record<string, number> = {}
    for (const st of students) if (st.group_id) m[st.group_id] = (m[st.group_id] ?? 0) + 1
    return m
  }, [students])

  return <WeeklyTimetable slots={slots} groupSizes={groupSizes} />
}

function StudentsTab({
  students,
  onRatingChanged,
}: {
  students: StudentRow[]
  onRatingChanged: () => Promise<void>
}) {
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
              <div className="flex flex-wrap items-center gap-3">
                <RatingControl student={s} onSaved={onRatingChanged} />
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

function RatingControl({
  student,
  onSaved,
}: {
  student: StudentRow
  onSaved: () => Promise<void>
}) {
  const [value, setValue] = useState(String(student.rating_points))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValue(String(student.rating_points))
  }, [student.rating_points])

  async function save(next: number) {
    const clamped = Math.max(0, next)
    setSaving(true)
    setValue(String(clamped))
    await fetch(`/api/teacher/students/${student.id}/rating`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: clamped }),
    })
    setSaving(false)
    await onSaved()
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-zinc-300 bg-zinc-50 px-1.5 py-1">
      <button
        type="button"
        disabled={saving}
        onClick={() => save(student.rating_points - 5)}
        className="h-6 w-6 rounded text-sm font-bold text-zinc-600 hover:bg-zinc-200 disabled:opacity-40"
      >
        −
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          const n = Number(value)
          if (Number.isFinite(n)) save(n)
        }}
        disabled={saving}
        className="w-14 bg-transparent text-center text-sm font-semibold text-zinc-900 outline-none"
      />
      <button
        type="button"
        disabled={saving}
        onClick={() => save(student.rating_points + 5)}
        className="h-6 w-6 rounded text-sm font-bold text-zinc-600 hover:bg-zinc-200 disabled:opacity-40"
      >
        +
      </button>
      <span className="pr-1 text-xs text-zinc-400">ұпай</span>
    </div>
  )
}

// Ағылшын тілі мұғаліміне: IELTS/TOEFL кабинеті, оқушылардың нәтижелері және материалдар бір жерде
function EnglishHub({ tab }: { tab: 'materials' | 'tests' }) {
  const links: [string, string, string][] =
    tab === 'tests'
      ? [
          ['/ielts/teacher', 'IELTS · TOEFL mock тесттер', 'Барлық тесттер, оқушыларға рұқсат беру, нәтижелер мен Writing/Speaking тексеру'],
          ['/ielts/teacher/subjects', 'Пән тесттері', 'Ағылшын тілі бойынша ұпай кестелері'],
        ]
      : [
          ['/ielts/materials', 'IELTS · TOEFL материалдары', 'Ресми тегін ресурстар мен дайындық материалдары'],
          ['/ielts/teacher', 'Mock тесттер мен нәтижелер', 'Оқушылардың тапсырулары және бағалары'],
        ]
  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2">
      {links.map(([href, title, desc]) => (
        <Link key={href} href={href} className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-black">
          <div>
            <p className="font-semibold text-zinc-900">{title}</p>
            <p className="mt-1 text-xs text-zinc-500">{desc}</p>
          </div>
          <span className="text-zinc-400">→</span>
        </Link>
      ))}
    </div>
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex min-w-0 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-3 text-sm text-zinc-600 hover:border-black">
            <span className="shrink-0 rounded-md bg-black px-3 py-1 text-xs font-semibold text-white">
              Файл таңдау
            </span>
            <span className="min-w-0 truncate">
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
            className="w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm disabled:opacity-40"
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
                  href={fileSrc(m.url) ?? undefined}
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

/** Ортақ қор: басқа мұғалімдердің материалдары (тек көру) — бір рет жүктелген материалды бәрі қолданады */
function SharedMaterials({ mineIds }: { mineIds: string[] }) {
  const [list, setList] = useState<(Material & { teachers?: { name: string } | null })[] | null>(null)
  const [q, setQ] = useState('')
  useEffect(() => {
    fetch('/api/materials/public')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setList(Array.isArray(d) ? d : []))
      .catch(() => setList([]))
  }, [])
  const mine = new Set(mineIds)
  const shown = (list ?? []).filter((m) => !mine.has(m.id) && `${m.title} ${m.description ?? ''} ${m.teachers?.name ?? ''}`.toLowerCase().includes(q.toLowerCase()))
  if (!list || (!shown.length && !q)) return null
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold">Ортақ қор · басқа мұғалімдердің материалдары</h3>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Іздеу…" className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm" />
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {shown.slice(0, 60).map((m) => (
          <li key={m.id} className="rounded-xl border border-zinc-200 bg-white p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">{subjects.find((s) => s.id === m.subject)?.name ?? m.subject}</div>
            <div className="mt-0.5 font-medium">{m.title}</div>
            {m.teachers?.name && <div className="text-xs text-zinc-500">{m.teachers.name}</div>}
            {m.url && <a href={fileSrc(m.url) ?? undefined} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-blue-600">Ашу →</a>}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** ИИ-мен тест құрастыру: мұғалім тақырыпты жазады, сұрақтар төмендегі формаға түседі — тексеріп, сақтайды */
function AiTestBuilder({ subjectName, onReady }: { subjectName: string; onReady: (qs: DraftQuestion[], topic: string) => void }) {
  const [open, setOpen] = useState(false)
  const [topic, setTopic] = useState('')
  const [grade, setGrade] = useState('')
  const [count, setCount] = useState(10)
  const [level, setLevel] = useState('орташа')
  const [format, setFormat] = useState('')
  const [lang, setLang] = useState('kk')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const go = async () => {
    setBusy(true)
    setErr('')
    try {
      const r = await fetch('/api/teacher/ai-test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: subjectName, topic, grade, count, level, format, lang }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Қате')
      onReady(j.questions, topic)
      setOpen(false)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }
  const field = 'rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm'
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-dashed border-blue-300 bg-blue-50/60 p-4 text-left">
        <span className="text-2xl">✨</span>
        <span>
          <span className="block font-semibold">ИИ-мен тест құрастыру</span>
          <span className="block text-sm text-zinc-500">Тақырыпты жазыңыз — сұрақтар 10–20 секундта дайын, сіз тек тексересіз</span>
        </span>
      </button>
    )
  return (
    <div className="mb-4 rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">✨ ИИ-мен тест · {subjectName}</h3>
        <button onClick={() => setOpen(false)} className="text-sm text-zinc-500">Жабу</button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Тақырыбы: мысалы, Жай бөлшектерді қосу" className={`${field} sm:col-span-2`} />
        <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Сынып (мысалы, 5)" className={field} />
        <select value={count} onChange={(e) => setCount(Number(e.target.value))} className={field}>
          {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n} сұрақ</option>)}
        </select>
        <select value={level} onChange={(e) => setLevel(e.target.value)} className={field}>
          <option>жеңіл</option>
          <option>орташа</option>
          <option>қиын</option>
        </select>
        <select value={format} onChange={(e) => setFormat(e.target.value)} className={field}>
          <option value="">Кәдімгі тест</option>
          <option value="НИШ (НЗМ)">НИШ (НЗМ) форматы</option>
          <option value="БИЛ">БИЛ форматы</option>
          <option value="ҰБТ">ҰБТ форматы</option>
        </select>
        <select value={lang} onChange={(e) => setLang(e.target.value)} className={field}>
          <option value="kk">Қазақша</option>
          <option value="ru">Орысша</option>
          <option value="en">Ағылшынша</option>
        </select>
      </div>
      {err && <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</p>}
      <button onClick={go} disabled={busy || !topic.trim()} className="mt-3 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? 'Құрастырып жатыр… (10–20 сек)' : 'Сұрақтарды құрастыру'}
      </button>
      <p className="mt-2 text-xs text-zinc-500">ИИ қателесуі мүмкін — сақтамас бұрын әр сұрақ пен дұрыс жауапты тексеріңіз.</p>
    </div>
  )
}

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
      <AiTestBuilder
        subjectName={subjects.find((s) => s.id === subject)?.name ?? subject}
        onReady={(qs, topic) => {
          setQuestions(qs)
          if (!title.trim()) setTitle(topic)
        }}
      />
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
