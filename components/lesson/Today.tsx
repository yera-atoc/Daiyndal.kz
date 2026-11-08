'use client'

import { useCallback, useEffect, useState } from 'react'
import { DAY_FULL, addDays, dayMonth, todayAlmaty, weekdayOf } from '@/lib/journal'
import type { TodayItem } from '@/lib/lesson'
import LessonScreen from './LessonScreen'
import PlanEditor from './PlanEditor'
import { BLUE, INK, LINE, MUTED, SOFT } from './ui'

/** Мұғалімнің басты беті: бүгінгі сабақтар → бір басу → сабақ экраны */
export default function Today({ admin = false, onExit }: { admin?: boolean; onExit?: () => void }) {
  const [date, setDate] = useState(todayAlmaty())
  const [items, setItems] = useState<TodayItem[] | null>(null)
  const [err, setErr] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [plan, setPlan] = useState<string | null | false>(false)
  const [teacher, setTeacher] = useState('')

  const load = useCallback(async () => {
    setErr('')
    const r = await fetch(`/api/lesson?date=${date}`, { cache: 'no-store' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) return setErr(j.error || 'Жүктелмеді')
    setItems(j.items)
  }, [date])
  useEffect(() => {
    setItems(null)
    load()
  }, [load])

  if (open) return <LessonScreen classId={open} date={date} onBack={() => { setOpen(null); load() }} onPlan={(id) => { setOpen(null); setPlan(id) }} />
  if (plan !== false) return <PlanEditor classId={plan} onBack={() => { setPlan(false); load() }} />

  const today = todayAlmaty()
  const teachers = Array.from(new Set((items ?? []).map((i) => i.teacher))).sort()
  const shown = (items ?? []).filter((i) => !teacher || i.teacher === teacher)
  const done = shown.filter((i) => i.done).length

  return (
    <div className="mt-6" style={{ color: INK }}>
      {onExit && <button onClick={onExit} className="mb-1 text-sm font-semibold" style={{ color: BLUE }}>← Бүгін</button>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">{date === today ? 'Бүгінгі сабақтар' : `${DAY_FULL[weekdayOf(date) - 1]} сабақтары`}</h2>
          <p className="mt-0.5 text-sm" style={{ color: MUTED }}>
            {DAY_FULL[weekdayOf(date) - 1]}, {dayMonth(date)}
            {items && items.length > 0 && ` · толтырылды ${done}/${shown.length}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setDate(addDays(date, -1))} className="h-10 rounded-xl border bg-white px-3 text-sm font-semibold" style={{ borderColor: LINE }} aria-label="Алдыңғы күн">←</button>
          {date !== today && <button onClick={() => setDate(today)} className="h-10 rounded-xl border bg-white px-3 text-sm font-semibold" style={{ borderColor: LINE }}>Бүгін</button>}
          <button onClick={() => setDate(addDays(date, 1))} className="h-10 rounded-xl border bg-white px-3 text-sm font-semibold" style={{ borderColor: LINE }} aria-label="Келесі күн">→</button>
        </div>
      </div>

      {admin && teachers.length > 1 && (
        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
          {['', ...teachers].map((t) => (
            <button key={t || 'all'} onClick={() => setTeacher(t)} className="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium" style={{ background: teacher === t ? INK : '#fff', color: teacher === t ? '#fff' : INK, border: `1px solid ${teacher === t ? INK : LINE}` }}>
              {t || 'Барлығы'}
            </button>
          ))}
        </div>
      )}

      {err && <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{err}</p>}
      {!items && !err && <p className="py-12 text-center text-sm" style={{ color: MUTED }}>Жүктелуде…</p>}
      {items && !shown.length && (
        <div className="mt-5 rounded-2xl border border-dashed bg-white p-8 text-center text-sm" style={{ borderColor: LINE, color: MUTED }}>
          Бұл күні сабақ жоқ. Топтарыңыз «Сабақ журналында» — сабақ күндері сол жерде белгіленеді.
        </div>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {shown.map((i) => (
          <button key={i.classId} onClick={() => setOpen(i.classId)} className="flex items-stretch gap-3 rounded-2xl border bg-white p-4 text-left transition hover:shadow-sm active:scale-[.99]" style={{ borderColor: i.done ? '#BBF7D0' : LINE }}>
            <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl text-center" style={{ background: i.done ? '#DCFCE7' : SOFT }}>
              <div className="text-[13px] font-bold tabular-nums leading-tight">{i.time?.split('–')[0] ?? '—'}</div>
              <div className="mt-0.5 text-lg leading-none">{i.done ? '✓' : '○'}</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[16px] font-semibold">{i.name}</div>
              <div className="mt-0.5 truncate text-[13px]" style={{ color: MUTED }}>
                {[admin ? i.teacher : null, i.subject, `${i.students} оқушы`].filter(Boolean).join(' · ')}
              </div>
              <div className="mt-2 line-clamp-2 text-[13px]">
                {i.topic ? (
                  <span><span style={{ color: MUTED }}>Тақырып:</span> {i.topic}</span>
                ) : i.next ? (
                  <span><span style={{ color: BLUE }}>КТП бойынша:</span> {i.next}</span>
                ) : (
                  <span style={{ color: MUTED }}>Тақырып жазылмаған</span>
                )}
              </div>
              {!i.done && i.marked > 0 && <div className="mt-1 text-xs" style={{ color: '#B45309' }}>Қатысу {i.marked}/{i.students}</div>}
            </div>
            <span className="self-center text-xl" style={{ color: MUTED }}>›</span>
          </button>
        ))}
      </div>

      <button onClick={() => setPlan(null)} className="mt-5 w-full rounded-2xl border bg-white p-4 text-left text-sm" style={{ borderColor: LINE }}>
        <span className="font-semibold">КТП — тақырыптық жоспар</span>
        <span className="block" style={{ color: MUTED }}>Бір рет енгізіңіз: тақырып пен үй тапсырмасы әр сабаққа өзі қойылады.</span>
      </button>
    </div>
  )
}
