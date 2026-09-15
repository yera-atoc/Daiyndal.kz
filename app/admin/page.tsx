'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Teacher = { 
  id: string; 
  name: string; 
  subject: string | null; 
  username: string | null;
  schedule?: string | null; 
}
type Student = {
  id: string
  full_name: string
  grade: number | null
  teacher_id: string | null
}
type AttendanceRecord = { id: string; student_id: string; date: string; present: boolean }

type Tab = 'attendance' | 'students' | 'teachers' | 'sheets'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function AdminDashboard() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('attendance')

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [date, setDate] = useState(todayISO())
  const [loading, setLoading] = useState(true)

  async function loadCore() {
    const [teachersRes, studentsRes] = await Promise.all([
      fetch('/api/teachers'),
      fetch('/api/students'),
    ])
    setTeachers(await teachersRes.json())
    setStudents(await studentsRes.json())
  }

  async function loadAttendance(forDate: string) {
    const res = await fetch(`/api/attendance?date=${forDate}`)
    if (res.ok) setAttendance(await res.json())
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadCore(), loadAttendance(date)]).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadAttendance(date)
  }, [date])

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  async function toggleAttendance(studentId: string, present: boolean) {
    setAttendance((prev) => {
      const existing = prev.find((a) => a.student_id === studentId)
      if (existing) {
        return prev.map((a) =>
          a.student_id === studentId ? { ...a, present } : a
        )
      }
      return [...prev, { id: 'temp', student_id: studentId, date, present }]
    })

    await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, date, present }),
    })
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-white">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <p className="text-sm font-light tracking-wide text-zinc-400">Жүктелуде...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#050505] text-zinc-100 selection:bg-white selection:text-black">
      {/* Apple-style minimalist header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#050505]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
            <h1 className="text-sm font-medium tracking-tight text-white">
              Администратор Ақниет
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
          >
            Шығу
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-1.5 backdrop-blur-md">
          {(
            [
              ['attendance', 'Қатысу'],
              ['students', 'Оқушылар'],
              ['teachers', 'Оқытушылар & Сабақ уақыты'],
              ['sheets', 'Таблица'],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-medium transition-all ${
                tab === key
                  ? 'bg-white text-black shadow-sm'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'attendance' && (
          <AttendanceTab
            date={date}
            setDate={setDate}
            students={students}
            teachers={teachers}
            attendance={attendance}
            onToggle={toggleAttendance}
          />
        )}

        {tab === 'students' && (
          <StudentsTab
            students={students}
            teachers={teachers}
            reload={loadCore}
          />
        )}

        {tab === 'teachers' && (
          <TeachersTab teachers={teachers} reload={loadCore} />
        )}

        {tab === 'sheets' && <GoogleSheetTab />}
      </div>
    </main>
  )
}

function GoogleSheetTab() {
  const [rows, setRows] = useState<string[][]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const SHEET_ID = '1QzGRgsX0AA8-vuacc_B9Gcbn0PK79Xju'
  const GID = '1094055913'

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Деректерді алу мүмкін болмады')
        
        const text = await res.text()
        const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/)
        
        if (!jsonMatch || !jsonMatch[1]) {
          throw new Error('Таблица деректерін өңдеу қатесі')
        }

        const jsonData = JSON.parse(jsonMatch[1])
        const formattedData: string[][] = jsonData.table.rows.map((row: { c: Array<{ v?: any } | null> }) =>
          row.c ? row.c.map((cell) => (cell && cell.v !== undefined && cell.v !== null ? String(cell.v) : '')) : []
        )

        setRows(formattedData)
      } catch (err: any) {
        console.error('Кесте жүктеу қатесі:', err)
        setError('Google Таблицаны жүктеу кезінде қате шықты. Таблица ашық (public) екенін тексеріңіз.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return <div className="mt-10 text-center text-xs text-zinc-500">Google Кесте жүктелуде...</div>
  }

  if (error) {
    return <div className="mt-10 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-center text-xs text-red-400">{error}</div>
  }

  return (
    <section className="mt-8">
      <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-xl">
        <table className="w-full text-left text-xs">
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={
                  rowIndex === 0
                    ? 'border-b border-zinc-800 bg-zinc-900 font-medium text-white'
                    : 'border-b border-zinc-800/50 hover:bg-zinc-800/20'
                }
              >
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="p-4 border-r border-zinc-800/50 last:border-0 whitespace-nowrap text-zinc-300">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function AttendanceTab({
  date,
  setDate,
  students,
  teachers,
  attendance,
  onToggle,
}: {
  date: string
  setDate: (d: string) => void
  students: Student[]
  teachers: Teacher[]
  attendance: AttendanceRecord[]
  onToggle: (studentId: string, present: boolean) => void
}) {
  const grouped = useMemo(() => {
    const teacherMap = new Map(teachers.map((t) => [t.id, { name: t.name, schedule: t.schedule }]))
    const map = new Map<string, { students: Student[]; schedule?: string | null }>()
    
    for (const s of students) {
      const teacherInfo = s.teacher_id ? teacherMap.get(s.teacher_id) : null
      const key = teacherInfo ? teacherInfo.name : 'Топсыз оқушылар'
      const schedule = teacherInfo?.schedule ?? null

      if (!map.has(key)) {
        map.set(key, { students: [], schedule })
      }
      map.get(key)!.students.push(s)
    }
    return Array.from(map.entries())
  }, [students, teachers])

  const presentCount = attendance.filter((a) => a.present).length

  return (
    <section className="mt-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <label className="text-xs text-zinc-400">Күні:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
          />
        </div>
        <div className="text-xs text-zinc-400">
          Келді: <span className="font-semibold text-white">{presentCount}</span> / {students.length}
        </div>
      </div>

      {students.length === 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-8 text-center text-xs text-zinc-500">
          Әзірге оқушы қосылмаған. «Оқушылар» бөлімінен қосыңыз.
        </div>
      )}

      <div className="space-y-6">
        {grouped.map(([groupName, data]) => (
          <div key={groupName} className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                {groupName}
              </h3>
              {data.schedule && (
                <span className="rounded-md bg-zinc-800 px-2.5 py-1 text-[10px] text-zinc-300">
                  Сабақ уақыты: {data.schedule}
                </span>
              )}
            </div>
            
            <div className="mt-4 divide-y divide-zinc-800/60">
              {data.students.map((student) => {
                const record = attendance.find((a) => a.student_id === student.id)
                const present = record?.present ?? false
                return (
                  <div key={student.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-xs font-medium text-white">{student.full_name}</p>
                      {student.grade && (
                        <p className="text-[10px] text-zinc-500">{student.grade}-сынып</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onToggle(student.id, true)}
                        className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                          present
                            ? 'bg-white text-black shadow'
                            : 'border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'
                        }`}
                      >
                        Бар
                      </button>
                      <button
                        onClick={() => onToggle(student.id, false)}
                        className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                          record && !present
                            ? 'bg-zinc-700 text-white shadow'
                            : 'border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'
                        }`}
                      >
                        Жоқ
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function StudentsTab({
  students,
  teachers,
  reload,
}: {
  students: Student[]
  teachers: Teacher[]
  reload: () => Promise<void>
}) {
  const [fullName, setFullName] = useState('')
  const [grade, setGrade] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  async function addStudent(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) return
    setSaving(true)
    await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        grade: grade ? Number(grade) : null,
        teacherId: teacherId || null,
      }),
    })
    setFullName('')
    setGrade('')
    setTeacherId('')
    await reload()
    setSaving(false)
  }

  async function removeStudent(id: string) {
    await fetch(`/api/students/${id}`, { method: 'DELETE' })
    await reload()
  }

  return (
    <section className="mt-8 space-y-6">
      <form onSubmit={addStudent} className="flex flex-wrap gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 backdrop-blur-xl">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Оқушының аты-жөні"
          className="flex-1 min-w-[180px] rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
        />
        <input
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          placeholder="Сынып (мысалы: 7)"
          className="w-36 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
        />
        <select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-zinc-600 focus:outline-none"
        >
          <option value="">Оқытушысыз (Топсыз)</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-white px-5 py-2 text-xs font-medium text-black transition-all hover:bg-zinc-200 disabled:opacity-50"
        >
          Қосу
        </button>
      </form>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 divide-y divide-zinc-800 backdrop-blur-xl">
        {students.map((s) => (
          <div key={s.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white">{s.full_name}</p>
                <p className="text-[10px] text-zinc-500">
                  {s.grade ? `${s.grade}-сынып · ` : ''}
                  {teachers.find((t) => t.id === s.teacher_id)?.name ?? 'Топсыз'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditingId(editingId === s.id ? null : s.id)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  {editingId === s.id ? 'Жабу' : 'Өзгерту'}
                </button>
                <button
                  onClick={() => removeStudent(s.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Жою
                </button>
              </div>
            </div>
            {editingId === s.id && (
              <StudentEditForm
                student={s}
                teachers={teachers}
                onDone={async () => {
                  setEditingId(null)
                  await reload()
                }}
              />
            )}
          </div>
        ))}
        {students.length === 0 && (
          <p className="p-6 text-center text-xs text-zinc-500">Тізім бос</p>
        )}
      </div>
    </section>
  )
}

function StudentEditForm({
  student,
  teachers,
  onDone,
}: {
  student: Student
  teachers: Teacher[]
  onDone: () => Promise<void>
}) {
  const [fullName, setFullName] = useState(student.full_name)
  const [grade, setGrade] = useState(student.grade ? String(student.grade) : '')
  const [teacherId, setTeacherId] = useState(student.teacher_id ?? '')
  const [saving, setSaving] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) return
    setSaving(true)
    await fetch(`/api/students/${student.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        grade: grade ? Number(grade) : null,
        teacherId: teacherId || null,
      }),
    })
    setSaving(false)
    await onDone()
  }

  return (
    <form onSubmit={save} className="mt-3 flex flex-wrap gap-2 border-t border-zinc-800 pt-3">
      <input
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Аты-жөні"
        className="flex-1 min-w-[160px] rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white"
      />
      <input
        value={grade}
        onChange={(e) => setGrade(e.target.value)}
        placeholder="Сынып"
        className="w-24 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white"
      />
      <select
        value={teacherId}
        onChange={(e) => setTeacherId(e.target.value)}
        className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white"
      >
        <option value="">Оқытушысыз</option>
        {teachers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-zinc-800 px-4 py-1.5 text-xs font-medium text-white transition-all hover:bg-zinc-700"
      >
        Сақтау
      </button>
    </form>
  )
}

function TeachersTab({
  teachers,
  reload,
}: {
  teachers: Teacher[]
  reload: () => Promise<void>
}) {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [schedule, setSchedule] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null)
  const [credentialsEditingId, setCredentialsEditingId] = useState<string | null>(null)

  async function addTeacher(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await fetch('/api/teachers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        subject: subject || null,
        schedule: schedule || null,
        username: username || undefined,
        password: password || undefined,
      }),
    })
    setName('')
    setSubject('')
    setSchedule('')
    setUsername('')
    setPassword('')
    await reload()
    setSaving(false)
  }

  async function removeTeacher(id: string) {
    await fetch(`/api/teachers/${id}`, { method: 'DELETE' })
    await reload()
  }

  return (
    <section className="mt-8 space-y-6">
      <form onSubmit={addTeacher} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 backdrop-blur-xl">
        <div className="flex flex-wrap gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Оқытушының аты-жөні"
            className="flex-1 min-w-[180px] rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none"
          />
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Пәні (мысалы: IELTS / Math)"
            className="w-48 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none"
          />
          <input
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            placeholder="Сабақ уақыты (мысалы: Дүйсенбі 15:00)"
            className="w-56 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Логин (міндетті емес)"
            className="w-44 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Құпия сөз (міндетті емес)"
            className="w-44 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-white px-5 py-2 text-xs font-medium text-black transition-all hover:bg-zinc-200 disabled:opacity-50"
          >
            Қосу
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 divide-y divide-zinc-800 backdrop-blur-xl">
        {teachers.map((t) => (
          <div key={t.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white">{t.name}</p>
                <p className="text-[10px] text-zinc-500">
                  {t.subject ? `${t.subject} · ` : ''}
                  {t.schedule ? `Уақыты: ${t.schedule} · ` : ''}
                  {t.username ? `Логин: ${t.username}` : 'Кіру орнатылмаған'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setEditingTeacherId(editingTeacherId === t.id ? null : t.id)
                    setCredentialsEditingId(null)
                  }}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  {editingTeacherId === t.id ? 'Жабу' : 'Өзгерту'}
                </button>
                <button
                  onClick={() => {
                    setCredentialsEditingId(credentialsEditingId === t.id ? null : t.id)
                    setEditingTeacherId(null)
                  }}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  {t.username ? 'Құпия сөз' : 'Кіру орнату'}
                </button>
                <button
                  onClick={() => removeTeacher(t.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Жою
                </button>
              </div>
            </div>

            {editingTeacherId === t.id && (
              <TeacherEditForm
                teacher={t}
                onDone={async () => {
                  setEditingTeacherId(null)
                  await reload()
                }}
              />
            )}

            {credentialsEditingId === t.id && (
              <TeacherCredentialsForm
                teacherId={t.id}
                initialUsername={t.username ?? ''}
                onDone={async () => {
                  setCredentialsEditingId(null)
                  await reload()
                }}
              />
            )}
          </div>
        ))}
        {teachers.length === 0 && (
          <p className="p-6 text-center text-xs text-zinc-500">Тізім бос</p>
        )}
      </div>
    </section>
  )
}

function TeacherEditForm({
  teacher,
  onDone,
}: {
  teacher: Teacher
  onDone: () => Promise<void>
}) {
  const [name, setName] = useState(teacher.name)
  const [subject, setSubject] = useState(teacher.subject ?? '')
  const [schedule, setSchedule] = useState(teacher.schedule ?? '')
  const [saving, setSaving] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await fetch(`/api/teachers/${teacher.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        subject: subject || null,
        schedule: schedule || null,
      }),
    })
    setSaving(false)
    await onDone()
  }

  return (
    <form onSubmit={save} className="mt-3 flex flex-wrap gap-2 border-t border-zinc-800 pt-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Аты-жөні"
        className="flex-1 min-w-[160px] rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white"
      />
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Пәні"
        className="w-36 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py.5 text-xs text-white"
      />
      <input
        value={schedule}
        onChange={(e) => setSchedule(e.target.value)}
        placeholder="Сабақ уақыты"
        className="w-48 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white"
      />
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-zinc-800 px-4 py-1.5 text-xs font-medium text-white transition-all hover:bg-zinc-700"
      >
        Сақтау
      </button>
    </form>
  )
}

function TeacherCredentialsForm({
  teacherId,
  initialUsername,
  onDone,
}: {
  teacherId: string
  initialUsername: string
  onDone: () => Promise<void>
}) {
  const [username, setUsername] = useState(initialUsername)
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return
    setSaving(true)
    await fetch(`/api/teachers/${teacherId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    setSaving(false)
    await onDone()
  }

  return (
    <form onSubmit={save} className="mt-3 flex flex-wrap gap-2 border-t border-zinc-800 pt-3">
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Логин"
        className="w-36 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white"
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Жаңа құпия сөз"
        className="w-36 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white"
      />
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-zinc-800 px-4 py-1.5 text-xs font-medium text-white transition-all hover:bg-zinc-700"
      >
        Сақтау
      </button>
    </form>
  )
}
