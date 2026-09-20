'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { USERNAME_HINT, PASSWORD_HINT } from '@/lib/credentials'
import { WEEKDAYS, hhmm, slotGroupName, summarizeSlots, type ScheduleSlot } from '@/lib/schedule'

type Teacher = {
  id: string
  name: string
  subject: string | null
  username: string | null
}

type Group = { id: string; name: string }

type Student = {
  id: string
  full_name: string
  grade: number | null
  teacher_id: string | null
  group_id?: string | null
  payment_date?: string | null     // Төленген күні
  payment_deadline?: string | null // Келесі төлем уақыты
  comment?: string | null          // Жеке комментарий
}

type AttendanceRecord = { id: string; student_id: string; date: string; present: boolean }

type Tab = 'attendance' | 'students' | 'groups' | 'teachers' | 'schedule' | 'stats' | 'sheets'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function AdminDashboard() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('attendance')

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [date, setDate] = useState(todayISO())
  const [loading, setLoading] = useState(true)

  async function loadCore() {
    const [teachersRes, studentsRes, scheduleRes, groupsRes] = await Promise.all([
      fetch('/api/teachers'),
      fetch('/api/students'),
      fetch('/api/schedule'),
      fetch('/api/groups'),
    ])
    setTeachers(await teachersRes.json())
    setStudents(await studentsRes.json())
    // If the schedule table isn't created yet, keep the rest of the panel working.
    setSlots(scheduleRes.ok ? await scheduleRes.json() : [])
    setGroups(groupsRes.ok ? await groupsRes.json() : [])
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
              ['groups', 'Топтар'],
              ['teachers', 'Мұғалімдер'],
              ['schedule', 'Мұғалімдер кестесі'],
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
            groups={groups}
            slots={slots}
            attendance={attendance}
            onToggle={toggleAttendance}
          />
        )}

        {tab === 'students' && (
          <StudentsTab
            students={students}
            teachers={teachers}
            groups={groups}
            reload={loadCore}
          />
        )}

        {tab === 'groups' && (
          <GroupsTab
            groups={groups}
            students={students}
            teachers={teachers}
            slots={slots}
            reload={loadCore}
          />
        )}

        {tab === 'teachers' && (
          <TeachersTab teachers={teachers} slots={slots} reload={loadCore} />
        )}

        {tab === 'schedule' && (
          <ScheduleTab teachers={teachers} groups={groups} slots={slots} reload={loadCore} />
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
  groups,
  slots,
  attendance,
  onToggle,
}: {
  date: string
  setDate: (d: string) => void
  students: Student[]
  teachers: Teacher[]
  groups: Group[]
  slots: ScheduleSlot[]
  attendance: AttendanceRecord[]
  onToggle: (studentId: string, present: boolean) => void
}) {
  const grouped = useMemo(() => {
    const teacherMap = new Map(
      teachers.map((t) => [
        t.id,
        { name: t.name, schedule: summarizeSlots(slots.filter((sl) => sl.teacher_id === t.id)) },
      ])
    )
    const groupMap = new Map(groups.map((g) => [g.id, g]))
    const map = new Map<
      string,
      { label: string; students: Student[]; schedule: string | null; teachers: string | null }
    >()

    for (const s of students) {
      const group = s.group_id ? groupMap.get(s.group_id) : null
      const teacherInfo = s.teacher_id ? teacherMap.get(s.teacher_id) : null

      let key: string
      let label: string
      let schedule: string | null = null
      let teacherNames: string | null = null

      if (group) {
        // Students in a group are shown under that group, with the teacher(s)
        // and lesson times taken from the group's schedule slots.
        const groupSlots = slots.filter((sl) => sl.group_id === group.id)
        key = `group:${group.id}`
        label = group.name
        schedule = summarizeSlots(groupSlots) || null
        const names = Array.from(new Set(groupSlots.map((sl) => teachers.find((t) => t.id === sl.teacher_id)?.name)))
          .filter(Boolean)
        teacherNames = names.length ? `Мұғалім: ${names.join(', ')}` : null
      } else if (teacherInfo) {
        // Students not in a group yet keep the old per-teacher grouping.
        key = `teacher:${s.teacher_id}`
        label = teacherInfo.name
        schedule = teacherInfo.schedule || null
      } else {
        key = 'none'
        label = 'Топсыз оқушылар'
      }

      if (!map.has(key)) {
        map.set(key, { label, students: [], schedule, teachers: teacherNames })
      }
      map.get(key)!.students.push(s)
    }
    return Array.from(map.entries())
  }, [students, teachers, groups, slots])

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
        {grouped.map(([groupKey, data]) => (
          <div key={groupKey} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                {data.label}
              </h3>
              {(data.teachers || data.schedule) && (
                <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-[10px] font-medium text-zinc-600">
                  {data.teachers}
                  {data.teachers && data.schedule ? ' · ' : ''}
                  {data.schedule ? `Сабақ уақыты: ${data.schedule}` : ''}
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
  groups,
  reload,
}: {
  students: Student[]
  teachers: Teacher[]
  groups: Group[]
  reload: () => Promise<void>
}) {
  const [fullName, setFullName] = useState('')
  const [grade, setGrade] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [groupId, setGroupId] = useState('')
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
        groupId: groupId || null,
        paymentDate: paymentDate || null,
        paymentDeadline: paymentDeadline || null,
        comment: comment || null,
      }),
    })
    setFullName('')
    setGrade('')
    setTeacherId('')
    setGroupId('')
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
            <option value="">Мұғалімсіз</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 focus:outline-none"
          >
            <option value="">Топсыз</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
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
                  {groups.find((g) => g.id === s.group_id) ? `Топ: ${groups.find((g) => g.id === s.group_id)!.name} · ` : ''}
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
                groups={groups}
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
  groups,
  onDone,
}: {
  student: Student
  teachers: Teacher[]
  groups: Group[]
  onDone: () => Promise<void>
}) {
  const [fullName, setFullName] = useState(student.full_name)
  const [grade, setGrade] = useState(student.grade ? String(student.grade) : '')
  const [teacherId, setTeacherId] = useState(student.teacher_id ?? '')
  const [groupId, setGroupId] = useState(student.group_id ?? '')
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
        groupId: groupId || null,
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
      <select
        value={groupId}
        onChange={(e) => setGroupId(e.target.value)}
        className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900"
      >
        <option value="">Топсыз</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>{g.name}</option>
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
  slots,
  reload,
}: {
  teachers: Teacher[]
  slots: ScheduleSlot[]
  reload: () => Promise<void>
}) {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [loginEditId, setLoginEditId] = useState<string | null>(null)

  async function addTeacher(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setAddError(null)
    const res = await fetch('/api/teachers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, subject, username, password }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setAddError(data.error ?? `Қате шықты (код ${res.status})`)
      return
    }
    setName('')
    setSubject('')
    setUsername('')
    setPassword('')
    await reload()
  }

  async function removeTeacher(id: string) {
    await fetch(`/api/teachers/${id}`, { method: 'DELETE' })
    await reload()
  }

  return (
    <section className="mt-8 space-y-6">
      <form onSubmit={addTeacher} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wide">Жаңа мұғалім қосу</h3>
        <p className="text-[11px] leading-relaxed text-zinc-500">
          Логин мен құпия сөзді мұғалімге өзіңіз ойлап қойыңыз (кездейсоқ жасалмайды). Кіру мәліметтерін
          кейінірек те қоюға болады — төмендегі тізімнен «Логин/пароль қою» түймесін басыңыз.
        </p>
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
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Логин (мысалы: ielts1)"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-48 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Құпия сөз (кемінде 8 таңба)"
            autoComplete="new-password"
            className="w-56 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-zinc-900 px-5 py-2 text-xs font-medium text-white transition-all hover:bg-zinc-800 disabled:opacity-50"
          >
            Қосу
          </button>
        </div>
        {addError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {addError}
          </p>
        )}
      </form>

      <div className="rounded-2xl border border-zinc-200 bg-white divide-y divide-zinc-100 shadow-sm">
        {teachers.map((t) => (
          <div key={t.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-900">{t.name}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {t.subject ? `${t.subject} · ` : ''}
                  {summarizeSlots(slots.filter((sl) => sl.teacher_id === t.id))
                    ? `Кесте: ${summarizeSlots(slots.filter((sl) => sl.teacher_id === t.id))} · `
                    : ''}
                  {t.username ? `Логин: ${t.username}` : 'Кіру жоқ'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setLoginEditId(loginEditId === t.id ? null : t.id)}
                  className="text-xs text-zinc-500 hover:text-zinc-900"
                >
                  {loginEditId === t.id ? 'Жабу' : 'Логин/пароль қою'}
                </button>
                <button
                  onClick={() => removeTeacher(t.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Жою
                </button>
              </div>
            </div>
            {loginEditId === t.id && (
              <TeacherLoginForm
                teacher={t}
                onDone={async () => {
                  setLoginEditId(null)
                  await reload()
                }}
              />
            )}
          </div>
        ))}
        {teachers.length === 0 && <p className="p-6 text-center text-xs text-zinc-400">Тізім бос</p>}
      </div>
    </section>
  )
}

// Admin-only: types the login and password in by hand. Nothing here is
// generated automatically or at random.
function TeacherLoginForm({
  teacher,
  onDone,
}: {
  teacher: Teacher
  onDone: () => Promise<void>
}) {
  const [username, setUsername] = useState(teacher.username ?? '')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    setSaving(true)
    const res = await fetch(`/api/teachers/${teacher.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)

    if (!res.ok) {
      setError(data.error ?? `Қате шықты (код ${res.status})`)
      return
    }
    setSaved(true)
    setPassword('')
    await onDone()
  }

  return (
    <form onSubmit={save} className="mt-3 space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Логин"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="w-44 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={teacher.username ? 'Жаңа құпия сөз (бос қалдырсаңыз өзгермейді)' : 'Құпия сөз'}
          autoComplete="new-password"
          className="min-w-[240px] flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Сақталуда...' : 'Сақтау'}
        </button>
      </div>
      <p className="text-[10px] text-zinc-400">
        {USERNAME_HINT}. {PASSWORD_HINT}.
      </p>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">
          Сақталды
        </p>
      )}
    </form>
  )
}

function GroupsTab({
  groups,
  students,
  teachers,
  slots,
  reload,
}: {
  groups: Group[]
  students: Student[]
  teachers: Teacher[]
  slots: ScheduleSlot[]
  reload: () => Promise<void>
}) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  async function readError(res: Response) {
    const data = await res.json().catch(() => ({}))
    return data.error ?? 'Қате шықты'
  }

  async function addGroup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return
    setSaving(true)
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setSaving(false)
    if (!res.ok) return setError(await readError(res))
    setName('')
    await reload()
  }

  async function renameGroup(id: string) {
    setError(null)
    const res = await fetch(`/api/groups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: renameValue }),
    })
    if (!res.ok) return setError(await readError(res))
    setRenamingId(null)
    await reload()
  }

  async function removeGroup(g: Group) {
    if (!window.confirm(`«${g.name}» тобын жою керек пе? Оқушылар мен сабақтар өшпейді, топсыз қалады.`)) return
    setError(null)
    const res = await fetch(`/api/groups/${g.id}`, { method: 'DELETE' })
    if (!res.ok) return setError(await readError(res))
    await reload()
  }

  async function setStudentGroup(studentId: string, groupId: string | null) {
    setError(null)
    const res = await fetch(`/api/students/${studentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId }),
    })
    if (!res.ok) return setError(await readError(res))
    await reload()
  }

  return (
    <section className="mt-8 space-y-6">
      <form
        onSubmit={addGroup}
        className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-800">Жаңа топ қосу</h3>
        <div className="flex flex-wrap gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Топ атауы (мысалы: IELTS 6.0, Дс/Ср)"
            className="min-w-[220px] flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-zinc-900 px-5 py-2 text-xs font-medium text-white transition-all hover:bg-zinc-800 disabled:opacity-50"
          >
            {saving ? 'Сақталуда...' : 'Қосу'}
          </button>
        </div>
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </p>
        )}
      </form>

      <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {groups.map((g) => {
          const members = students.filter((s) => s.group_id === g.id)
          const groupSlots = slots.filter((sl) => sl.group_id === g.id)
          const teacherNames = Array.from(
            new Set(groupSlots.map((sl) => teachers.find((t) => t.id === sl.teacher_id)?.name))
          ).filter(Boolean)
          const addable = students.filter((s) => s.group_id !== g.id)
          const open = openId === g.id

          return (
            <div key={g.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {renamingId === g.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900"
                      />
                      <button
                        onClick={() => renameGroup(g.id)}
                        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        Сақтау
                      </button>
                      <button
                        onClick={() => setRenamingId(null)}
                        className="text-xs text-zinc-500 hover:text-zinc-900"
                      >
                        Болдырмау
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-zinc-900">{g.name}</p>
                  )}
                  <p className="mt-0.5 text-[10px] text-zinc-500">
                    {members.length} оқушы
                    {teacherNames.length > 0 ? ` · Мұғалім: ${teacherNames.join(', ')}` : ' · Мұғалім тағайындалмаған'}
                    {groupSlots.length > 0 ? ` · ${summarizeSlots(groupSlots)}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    onClick={() => setOpenId(open ? null : g.id)}
                    className="text-xs text-zinc-500 hover:text-zinc-900"
                  >
                    {open ? 'Жабу' : 'Оқушылар'}
                  </button>
                  <button
                    onClick={() => {
                      setRenamingId(g.id)
                      setRenameValue(g.name)
                    }}
                    className="text-xs text-zinc-500 hover:text-zinc-900"
                  >
                    Өзгерту
                  </button>
                  <button
                    onClick={() => removeGroup(g)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Жою
                  </button>
                </div>
              </div>

              {open && (
                <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
                  {members.length === 0 && (
                    <p className="text-[11px] text-zinc-400">Топта әзірге оқушы жоқ</p>
                  )}
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2"
                    >
                      <p className="text-xs font-medium text-zinc-800">
                        {m.full_name}
                        {m.grade ? <span className="ml-2 text-[10px] text-zinc-400">{m.grade}-сынып</span> : null}
                      </p>
                      <button
                        onClick={() => setStudentGroup(m.id, null)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Шығару
                      </button>
                    </div>
                  ))}
                  <select
                    value=""
                    onChange={(e) => e.target.value && setStudentGroup(e.target.value, g.id)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 sm:w-auto"
                  >
                    <option value="">+ Оқушы қосу</option>
                    {addable.map((st) => {
                      const other = groups.find((x) => x.id === st.group_id)
                      return (
                        <option key={st.id} value={st.id}>
                          {st.full_name}
                          {other ? ` (қазір: ${other.name})` : ''}
                        </option>
                      )
                    })}
                  </select>
                </div>
              )}
            </div>
          )
        })}
        {groups.length === 0 && (
          <p className="p-6 text-center text-xs text-zinc-400">Әзірге топ жоқ. Жоғарыдан қосыңыз.</p>
        )}
      </div>
    </section>
  )
}

function ScheduleTab({
  teachers,
  groups,
  slots,
  reload,
}: {
  teachers: Teacher[]
  groups: Group[]
  slots: ScheduleSlot[]
  reload: () => Promise<void>
}) {
  const [teacherId, setTeacherId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [days, setDays] = useState<number[]>([])
  const [startTime, setStartTime] = useState('15:00')
  const [endTime, setEndTime] = useState('16:00')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // '' = show every teacher's slots
  const [filterTeacherId, setFilterTeacherId] = useState('')
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null)

  const teacherName = useMemo(
    () => new Map(teachers.map((t) => [t.id, t.name])),
    [teachers]
  )

  const visibleSlots = filterTeacherId
    ? slots.filter((s) => s.teacher_id === filterTeacherId)
    : slots

  function toggleDay(id: number) {
    setDays((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]))
  }

  async function addSlots(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!teacherId) return setError('Мұғалімді таңдаңыз')
    if (days.length === 0) return setError('Кемінде бір күнді таңдаңыз')

    setSaving(true)
    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId, groupId: groupId || null, days, startTime, endTime, title, note }),
    })
    setSaving(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Қате шықты')
      return
    }

    setDays([])
    setTitle('')
    setNote('')
    await reload()
  }

  async function removeSlot(id: string) {
    await fetch(`/api/schedule/${id}`, { method: 'DELETE' })
    await reload()
  }

  return (
    <section className="mt-8 space-y-6">
      <form
        onSubmit={addSlots}
        className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-800">
          Мұғалімге сабақ уақытын қою
        </h3>

        <div className="flex flex-wrap gap-3">
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className="min-w-[200px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 focus:outline-none"
          >
            <option value="">Мұғалімді таңдаңыз</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.subject ? ` (${t.subject})` : ''}
              </option>
            ))}
          </select>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="min-w-[180px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 focus:outline-none"
          >
            <option value="">Топ (міндетті емес)</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Қосымша атауы, пән (міндетті емес)"
            className="min-w-[180px] flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[10px] text-zinc-500">Күндер:</span>
          {WEEKDAYS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => toggleDay(d.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                days.includes(d.id)
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'border border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900'
              }`}
              title={d.name}
            >
              {d.short}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500">Басталуы:</span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500">Аяқталуы:</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900"
            />
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ескертпе, кабинет (міндетті емес)"
            className="min-w-[200px] flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-zinc-900 px-5 py-2 text-xs font-medium text-white transition-all hover:bg-zinc-800 disabled:opacity-50"
          >
            {saving ? 'Сақталуда...' : 'Қосу'}
          </button>
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </p>
        )}
      </form>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        <span className="px-2 text-[10px] text-zinc-500">Көрсету:</span>
        <button
          onClick={() => setFilterTeacherId('')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            filterTeacherId === ''
              ? 'bg-zinc-900 text-white shadow-sm'
              : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
          }`}
        >
          Барлығы
        </button>
        {teachers.map((t) => (
          <button
            key={t.id}
            onClick={() => setFilterTeacherId(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filterTeacherId === t.id
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {WEEKDAYS.map((d) => {
          const daySlots = visibleSlots.filter((s) => s.day_of_week === d.id)
          return (
            <div key={d.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-6">
              <p className="w-28 shrink-0 text-xs font-semibold text-zinc-800">{d.name}</p>
              <div className="flex-1 space-y-2">
                {daySlots.length === 0 && <p className="text-[11px] text-zinc-300">—</p>}
                {daySlots.map((s) => (
                  <div key={s.id}>
                  <div className="flex items-start justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
                    <div>
                      <p className="text-xs font-semibold text-zinc-900">
                        {hhmm(s.start_time)}–{hhmm(s.end_time)}
                        <span className="ml-2 font-medium text-zinc-600">
                          {teacherName.get(s.teacher_id) ?? 'Белгісіз мұғалім'}
                        </span>
                        {slotGroupName(s) && (
                          <span className="ml-2 rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-white">
                            {slotGroupName(s)}
                          </span>
                        )}
                      </p>
                      {(s.title || s.note) && (
                        <p className="mt-0.5 text-[10px] text-zinc-500">
                          {[s.title, s.note].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        onClick={() => setEditingSlotId(editingSlotId === s.id ? null : s.id)}
                        className="text-xs text-zinc-500 hover:text-zinc-900"
                      >
                        {editingSlotId === s.id ? 'Жабу' : 'Өзгерту'}
                      </button>
                      <button
                        onClick={() => removeSlot(s.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Жою
                      </button>
                    </div>
                  </div>
                  {editingSlotId === s.id && (
                    <SlotEditForm
                      slot={s}
                      teachers={teachers}
                      groups={groups}
                      onDone={async () => {
                        setEditingSlotId(null)
                        await reload()
                      }}
                    />
                  )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function SlotEditForm({
  slot,
  teachers,
  groups,
  onDone,
}: {
  slot: ScheduleSlot
  teachers: Teacher[]
  groups: Group[]
  onDone: () => Promise<void>
}) {
  const [teacherId, setTeacherId] = useState(slot.teacher_id)
  const [groupId, setGroupId] = useState(slot.group_id ?? '')
  const [day, setDay] = useState(slot.day_of_week)
  const [startTime, setStartTime] = useState(hhmm(slot.start_time))
  const [endTime, setEndTime] = useState(hhmm(slot.end_time))
  const [title, setTitle] = useState(slot.title ?? '')
  const [note, setNote] = useState(slot.note ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const res = await fetch(`/api/schedule/${slot.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId, groupId: groupId || null, days: [day], startTime, endTime, title, note }),
    })
    setSaving(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Қате шықты')
      return
    }
    await onDone()
  }

  return (
    <form onSubmit={save} className="mt-2 space-y-2 rounded-xl border border-zinc-200 bg-white p-3">
      <div className="flex flex-wrap gap-2">
        <select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900"
        >
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900"
        >
          {WEEKDAYS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900"
        />
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900"
        >
          <option value="">Топсыз</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Қосымша атауы"
          className="min-w-[140px] flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ескертпе, кабинет"
          className="min-w-[140px] flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Сақталуда...' : 'Сақтау'}
        </button>
      </div>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </form>
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
