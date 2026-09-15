'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Teacher = { id: string; name: string; subject: string | null; username: string | null }
type Student = {
  id: string
  full_name: string
  grade: number | null
  teacher_id: string | null
}
type AttendanceRecord = { id: string; student_id: string; date: string; present: boolean }

// Добавили новую вкладку 'sheets'
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <main className="flex min-h-screen items-center justify-center bg-paper">
        <p className="text-ink/60">Жүктелуде...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <p className="font-serif text-xl font-bold text-ink">
            Beles · Әкімші панелі
          </p>
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
              ['attendance', 'Қатысу'],
              ['students', 'Оқушылар'],
              ['teachers', 'Оқытушылар'],
              ['sheets', 'Таблица'], // <--- Новая вкладка!
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

        {/* Отображение Google Таблицы */}
        {tab === 'sheets' && <GoogleSheetTab />}
      </div>
    </main>
  )
}

// Компонент для отображения Google Таблицы
function GoogleSheetTab() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const SHEET_ID = '1QzGRgsX0AA8-vuacc_B9Gcbn0PK79Xju'
  const GID = '1094055913'

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`
        const res = await fetch(url)
        const text = await res.text()

        const jsonData = JSON.parse(text.substring(47, text.length - 2))

        const formattedData = jsonData.table.rows.map((row: any) =>
          row.c ? row.c.map((cell: any) => cell?.v || '') : []
        )

        setRows(formattedData)
      } catch (error) {
        console.error('Кате чыкты:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return <p className="mt-8 text-sm text-ink/60">Кесте жүктелуде...</p>
  }

  return (
    <section className="mt-8">
      <div className="overflow-x-auto border border-ink/10 bg-card">
        <table className="w-full text-left text-sm">
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={
                  rowIndex === 0
                    ? 'border-b border-ink/20 bg-paper font-semibold text-ink'
                    : 'border-b border-ink/10 hover:bg-paper/50'
                }
              >
                {row.map((cell: any, colIndex: number) => (
                  <td key={colIndex} className="p-3 border-r border-ink/10 last:border-0 whitespace-nowrap">
                    {String(cell)}
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
  const teacherName = (id: string | null) =>
    teachers.find((t) => t.id === id)?.name ?? 'Топсыз'

  const grouped = useMemo(() => {
    const map = new Map<string, Student[]>()
    for (const s of students) {
      const key = teacherName(s.teacher_id)
      map.set(key, [...(map.get(key) ?? []), s])
    }
    return Array.from(map.entries())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, teachers])

  const presentCount = attendance.filter((a) => a.present).length

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm text-ink/70">Күні:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-ink/20 bg-card px-3 py-1.5 text-sm"
          />
        </div>
        <p className="text-sm text-ink/60">
          Келді: <span className="font-semibold text-ink">{presentCount}</span> /{' '}
          {students.length}
        </p>
      </div>

      {students.length === 0 && (
        <p className="mt-10 text-ink/50">
          Әзірге оқушы қосылмаған. «Оқушылар» бөлімінен қосыңыз.
        </p>
      )}

      <div className="mt-6 space-y-8">
        {grouped.map(([teacher, group]) => (
          <div key={teacher}>
            <p className="text-sm font-semibold uppercase tracking-normal text-ink/50">
              {teacher}
            </p>
            <div className="mt-3 divide-y divide-ink/10 border border-ink/10 bg-card">
              {group.map((student) => {
                const record = attendance.find((a) => a.student_id === student.id)
                const present = record?.present ?? false
                return (
                  <div
                    key={student.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{student.full_name}</p>
                      {student.grade && (
                        <p className="text-xs text-ink/50">
                          {student.grade}-сынып
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onToggle(student.id, true)}
                        className={`px-3 py-1.5 text-sm font-medium transition ${
                          present
                            ? 'bg-sky text-board'
                            : 'border border-ink/20 text-ink/60 hover:border-sky'
                        }`}
                      >
                        Келді
                      </button>
                      <button
                        onClick={() => onToggle(student.id, false)}
                        className={`px-3 py-1.5 text-sm font-medium transition ${
                          record && !present
                            ? 'bg-coral text-paper'
                            : 'border border-ink/20 text-ink/60 hover:border-coral'
                        }`}
                      >
                        Келмеді
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
    <section className="mt-8">
      <form onSubmit={addStudent} className="flex flex-wrap gap-3 border border-ink/10 bg-card p-4">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Аты-жөні"
          className="flex-1 min-w-[180px] border border-ink/20 bg-paper px-3 py-2 text-sm"
        />
        <input
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          placeholder="Сынып (5 немесе 6)"
          className="w-40 border border-ink/20 bg-paper px-3 py-2 text-sm"
        />
        <select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          className="border border-ink/20 bg-paper px-3 py-2 text-sm"
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
          className="bg-ink px-5 py-2 text-sm font-medium text-paper transition hover:bg-ink/80 disabled:opacity-60"
        >
          Қосу
        </button>
      </form>

      <div className="mt-6 divide-y divide-ink/10 border border-ink/10 bg-card">
        {students.map((s) => (
          <div key={s.id} className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{s.full_name}</p>
                <p className="text-xs text-ink/50">
                  {s.grade ? `${s.grade}-сынып · ` : ''}
                  {teachers.find((t) => t.id === s.teacher_id)?.name ?? 'Топсыз'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setEditingId(editingId === s.id ? null : s.id)}
                  className="text-sm text-sky hover:underline"
                >
                  {editingId === s.id ? 'Жабу' : 'Өзгерту'}
                </button>
                <button
                  onClick={() => removeStudent(s.id)}
                  className="text-sm text-coral hover:underline"
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
          <p className="px-4 py-6 text-sm text-ink/50">Тізім бос</p>
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
    <form onSubmit={save} className="mt-3 flex flex-wrap gap-2 border-t border-ink/10 pt-3">
      <input
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Аты-жөні"
        className="flex-1 min-w-[180px] border border-ink/20 bg-white px-3 py-1.5 text-sm"
      />
      <input
        value={grade}
        onChange={(e) => setGrade(e.target.value)}
        placeholder="Сынып"
        className="w-28 border border-ink/20 bg-white px-3 py-1.5 text-sm"
      />
      <select
        value={teacherId}
        onChange={(e) => setTeacherId(e.target.value)}
        className="border border-ink/20 bg-white px-3 py-1.5 text-sm"
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
        className="bg-mustard px-4 py-1.5 text-sm font-medium text-board transition hover:bg-card disabled:opacity-60"
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
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
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
        username: username || undefined,
        password: password || undefined,
      }),
    })
    setName('')
    setSubject('')
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
    <section className="mt-8">
      <form onSubmit={addTeacher} className="border border-ink/10 bg-card p-4">
        <div className="flex flex-wrap gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Оқытушының аты-жөні"
            className="flex-1 min-w-[180px] border border-ink/20 bg-paper px-3 py-2 text-sm"
          />
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Пәні"
            className="w-52 border border-ink/20 bg-paper px-3 py-2 text-sm"
          />
        </div>
        <p className="mt-3 text-xs text-ink/50">
          Логин мен құпия сөз — егер оқытушыға материалдар мен тесттер қосу
          мүмкіндігін бірден бергіңіз келсе (кейінірек те қоюға болады)
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Логин (міндетті емес)"
            className="w-48 border border-ink/20 bg-paper px-3 py-2 text-sm"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Құпия сөз (міндетті емес)"
            className="w-48 border border-ink/20 bg-paper px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={saving}
            className="bg-ink px-5 py-2 text-sm font-medium text-paper transition hover:bg-ink/80 disabled:opacity-60"
          >
            Қосу
          </button>
        </div>
      </form>

      <div className="mt-6 divide-y divide-ink/10 border border-ink/10 bg-card">
        {teachers.map((t) => (
          <div key={t.id} className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-ink/50">
                  {t.subject ? `${t.subject} · ` : ''}
                  {t.username ? (
                    <>
                      Логин: <span className="font-medium text-ink/70">{t.username}</span>
                    </>
                  ) : (
                    'Кіру орнатылмаған'
                  )}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() =>
                    setCredentialsEditingId(credentialsEditingId === t.id ? null : t.id)
                  }
                  className="text-sm text-sky hover:underline"
                >
                  {t.username ? 'Құпия сөзді ауыстыру' : 'Кіру орнату'}
                </button>
                <button
                  onClick={() => removeTeacher(t.id)}
                  className="text-sm text-coral hover:underline"
                >
                  Жою
                </button>
              </div>
            </div>
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
          <p className="px-4 py-6 text-sm text-ink/50">Тізім бос</p>
        )}
      </div>
    </section>
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
    <form onSubmit={save} className="mt-3 flex flex-wrap gap-2 border-t border-ink/10 pt-3">
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Логин"
        className="w-40 border border-ink/20 bg-white px-3 py-1.5 text-sm"
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Жаңа құпия сөз"
        className="w-40 border border-ink/20 bg-white px-3 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={saving}
        className="bg-mustard px-4 py-1.5 text-sm font-medium text-board transition hover:bg-card disabled:opacity-60"
      >
        Сақтау
      </button>
    </form>
  )
}
