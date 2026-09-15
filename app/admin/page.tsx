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
  payment_date?: string | null     // Төленген күні
  payment_deadline?: string | null // Келесі төлем уақыты
  comment?: string | null          // Жеке комментарий
}

type AttendanceRecord = { id: string; student_id: string; date: string; present: boolean }

type Tab = 'attendance' | 'students' | 'teachers' | 'stats' | 'sheets'

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
      <main className="flex min-h-screen items-center justify-center bg-[#F9F9FB] text-zinc-800">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
          <p className="text-xs font-medium tracking-wide text-zinc-500">Жүктелуде...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-zinc-900 selection:bg-zinc-900 selection:text-white">
      {/* Light Apple-style minimalist header */}
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-sm font-semibold tracking-tight text-zinc-900">
              Администратор Ақниет
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-1.5 text-xs font-medium text-zinc-600 transition-all hover:bg-zinc-100 hover:text-zinc-900"
          >
            Шығу
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-sm">
          {(
            [
              ['attendance', 'Қатысу'],
              ['students', 'Оқушылар & CRM'],
              ['teachers', 'Мұғалімдер'],
              ['stats', 'Айлық статистика'],
              ['sheets', 'Таблица'],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                tab === key
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
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

        {tab === 'stats' && <StatsTab students={students} attendance={attendance} />}

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
        setError('Google Таблицаны жүктеу кезінде қате шықты.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <div className="mt-10 text-center text-xs text-zinc-400">Google Кесте жүктелуде...</div>
  if (error) return <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-xs text-red-600">{error}</div>

  return (
    <section className="mt-8">
      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={
                  rowIndex === 0
                    ? 'border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-900'
                    : 'border-b border-zinc-100 hover:bg-zinc-50/50'
                }
              >
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="p-4 border-r border-zinc-100 last:border-0 whitespace-nowrap text-zinc-700">
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
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-zinc-500">Күні:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
        </div>
        <div className="text-xs text-zinc-500">
          Келді: <span className="font-semibold text-zinc-900">{presentCount}</span> / {students.length}
        </div>
      </div>

      {students.length === 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-xs text-zinc-400 shadow-sm">
          Әзірге оқушы қосылмаған. «Оқушылар & CRM» бөлімінен қосыңыз.
        </div>
      )}

      <div className="space-y-6">
        {grouped.map(([groupName, data]) => (
          <div key={groupName} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                {groupName}
              </h3>
              {data.schedule && (
                <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-[10px] font-medium text-zinc-600">
                  Сабақ уақыты: {data.schedule}
                </span>
              )}
            </div>
            
            <div className="mt-4 divide-y divide-zinc-100">
              {data.students.map((student) => {
                const record = attendance.find((a) => a.student_id === student.id)
                const present = record?.present ?? false
                return (
                  <div key={student.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-xs font-semibold text-zinc-800">{student.full_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {student.grade && <span className="text-[10px] text-zinc-400">{student.grade}-сынып</span>}
                        {student.payment_deadline && (
                          <span className="text-[10px] text-amber-600 font-medium">Төлем уақыты: {student.payment_deadline}</span>
                        )}
                      </div>
                      {student.comment && (
                        <p className="text-[10px] text-zinc-500 italic mt-0.5">💬 {student.comment}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onToggle(student.id, true)}
                        className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                          present
                            ? 'bg-zinc-900 text-white shadow'
                            : 'border border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900'
                        }`}
                      >
                        Бар
                      </button>
                      <button
                        onClick={() => onToggle(student.id, false)}
                        className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                          record && !present
                            ? 'bg-zinc-200 text-zinc-900 shadow'
                            : 'border border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900'
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
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentDeadline, setPaymentDeadline] = useState('')
  const [comment, setComment] = useState('')
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
        paymentDate: paymentDate || null,
        paymentDeadline: paymentDeadline || null,
        comment: comment || null,
      }),
    })
    setFullName('')
    setGrade('')
    setTeacherId('')
    setPaymentDate('')
    setPaymentDeadline('')
    setComment('')
    await reload()
    setSaving(false)
  }

  async function removeStudent(id: string) {
    await fetch(`/api/students/${id}`, { method: 'DELETE' })
    await reload()
  }

  return (
    <section className="mt-8 space-y-6">
      <form onSubmit={addStudent} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wide">Жаңа оқушы қосу & CRM</h3>
        <div className="flex flex-wrap gap-3">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Оқушының аты-жөні"
            className="flex-1 min-w-[180px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
          <input
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="Сынып"
            className="w-28 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none"
          />
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 focus:outline-none"
          >
            <option value="">Мұғалімсіз (Топсыз)</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500">Төленген күні:</span>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500">Төлеу уақыты (Дедлайн):</span>
            <input
              type="date"
              value={paymentDeadline}
              onChange={(e) => setPaymentDeadline(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900"
            />
          </div>
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Жеке комментарий (мысалы: кешіктіреді)"
            className="flex-1 min-w-[200px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-zinc-900 px-5 py-2 text-xs font-medium text-white transition-all hover:bg-zinc-800 disabled:opacity-50"
          >
            Қосу
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-zinc-200 bg-white divide-y divide-zinc-100 shadow-sm">
        {students.map((s) => (
          <div key={s.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-900">{s.full_name}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {s.grade ? `${s.grade}-сынып · ` : ''}
                  {teachers.find((t) => t.id === s.teacher_id)?.name ?? 'Мұғалімсіз'} 
                  {s.payment_deadline ? ` · 💳 Төлем дедлайны: ${s.payment_deadline}` : ''}
                </p>
                {s.comment && <p className="text-[10px] text-zinc-600 mt-1 italic">💬 {s.comment}</p>}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditingId(editingId === s.id ? null : s.id)}
                  className="text-xs text-zinc-500 hover:text-zinc-900"
                >
                  {editingId === s.id ? 'Жабу' : 'Өзгерту'}
                </button>
                <button
                  onClick={() => removeStudent(s.id)}
                  className="text-xs text-red-500 hover:text-red-700"
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
        {students.length === 0 && <p className="p-6 text-center text-xs text-zinc-400">Тізім бос</p>}
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
  const [paymentDeadline, setPaymentDeadline] = useState(student.payment_deadline ?? '')
  const [comment, setComment] = useState(student.comment ?? '')
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
        paymentDeadline: paymentDeadline || null,
        comment: comment || null,
      }),
    })
    setSaving(false)
    await onDone()
  }

  return (
    <form onSubmit={save} className="mt-3 flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
      <input
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Аты-жөні"
        className="flex-1 min-w-[140px] rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900"
      />
      <input
        value={grade}
        onChange={(e) => setGrade(e.target.value)}
        placeholder="Сынып"
        className="w-20 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900"
      />
      <select
        value={teacherId}
        onChange={(e) => setTeacherId(e.target.value)}
        className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900"
      >
        <option value="">Мұғалімсіз</option>
        {teachers.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <input
        type="date"
        value={paymentDeadline}
        onChange={(e) => setPaymentDeadline(e.target.value)}
        className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900"
      />
      <input
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Комментарий"
        className="flex-1 min-w-[140px] rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900"
      />
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white"
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

  async function addTeacher(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await fetch('/api/teachers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, subject, schedule, username, password }),
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
      <form onSubmit={addTeacher} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wide">Жаңа мұғалім қосу</h3>
        <div className="flex flex-wrap gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Мұғалімнің аты-жөні"
            className="flex-1 min-w-[180px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400"
          />
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Пәні (мысалы: IELTS)"
            className="w-44 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400"
          />
          <input
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            placeholder="Сабақ уақыты (мысалы: 15:00)"
            className="w-48 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Логин"
            className="w-40 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Құпия сөз"
            className="w-40 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-zinc-900 px-5 py-2 text-xs font-medium text-white transition-all hover:bg-zinc-800"
          >
            Қосу
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-zinc-200 bg-white divide-y divide-zinc-100 shadow-sm">
        {teachers.map((t) => (
          <div key={t.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-900">{t.name}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {t.subject ? `${t.subject} · ` : ''}
                {t.schedule ? `Уақыты: ${t.schedule} · ` : ''}
                {t.username ? `Логин: ${t.username}` : 'Кіру жоқ'}
              </p>
            </div>
            <button
              onClick={() => removeTeacher(t.id)}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Жою
            </button>
          </div>
        ))}
        {teachers.length === 0 && <p className="p-6 text-center text-xs text-zinc-400">Тізім бос</p>}
      </div>
    </section>
  )
}

function StatsTab({ students, attendance }: { students: Student[]; attendance: AttendanceRecord[] }) {
  const totalStudents = students.length
  const totalRecords = attendance.length
  const totalPresent = attendance.filter((a) => a.present).length
  const attendanceRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0

  return (
    <section className="mt-8 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-zinc-500 font-medium">Жалпы оқушы саны</p>
          <p className="text-2xl font-bold text-zinc-900 mt-2">{totalStudents}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-zinc-500 font-medium">Жалпы келгендер (Жазбалар)</p>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{totalPresent}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-zinc-500 font-medium">Айлық қатысу көрсеткіші</p>
          <p className="text-2xl font-bold text-zinc-900 mt-2">{attendanceRate}%</p>
        </div>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center text-xs text-zinc-500 shadow-sm">
        💡 Бұл бөлім арқылы айлық немесе жалпы центрдің статистикасын бір қарағаннан көріп отыруға болады.
      </div>
    </section>
  )
}
