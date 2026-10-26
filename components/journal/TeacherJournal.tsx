'use client'

import { useCallback, useEffect, useState } from 'react'
import WeekJournal, { WeekNav } from './WeekJournal'
import { DAY_SHORT, fillState, todayAlmaty, weekStartOf, type JClass, type JStats, type JWeek } from '@/lib/journal'

const INK = '#0E1424'
const MUTED = '#687085'
const LINE = '#E3E7F0'

export type ClassRow = { class: JClass; teacher: string; students: number; stats: JStats; week: JWeek | null }

export function useClassList(week: string, teacher?: string | null) {
  const [rows, setRows] = useState<ClassRow[] | null>(null)
  const [err, setErr] = useState('')
  const load = useCallback(async () => {
    setErr('')
    const r = await fetch(`/api/journal?week=${week}${teacher ? `&teacher=${teacher}` : ''}`, { cache: 'no-store' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) return setErr(j.error || 'Жүктелмеді')
    setRows(j.classes)
  }, [week, teacher])
  useEffect(() => {
    load()
  }, [load])
  return { rows, err, reload: load }
}

export function FillPill({ s }: { s: JStats }) {
  const f = fillState(s)
  return <span className="inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: f.bg, color: f.fg }}>{f.label}</span>
}

/** Мұғалім кабинетіндегі «Сабақ журналы»: өз топтары → апталық журнал */
export default function TeacherJournal() {
  const [week, setWeek] = useState(weekStartOf(todayAlmaty()))
  const [open, setOpen] = useState<string | null>(null)
  const { rows, err, reload } = useClassList(week)

  if (open)
    return (
      <div className="mt-6">
        <WeekJournal classId={open} week={week} onWeek={setWeek} onBack={() => { setOpen(null); reload() }} backLabel="Менің топтарым" />
      </div>
    )

  return (
    <div className="mt-6" style={{ color: INK }}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Сабақ журналы</h2>
          <p className="mt-0.5 text-sm" style={{ color: MUTED }}>Қатысу, өтілген тақырып және үй тапсырмасы — апта бойынша.</p>
        </div>
        <WeekNav week={week} onWeek={setWeek} />
      </div>
      {err && <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{err}</p>}
      {!rows && !err && <p className="py-12 text-center text-sm" style={{ color: MUTED }}>Жүктелуде…</p>}
      {rows && !rows.length && (
        <div className="mt-5 rounded-2xl border border-dashed bg-white p-8 text-center text-sm" style={{ borderColor: LINE, color: MUTED }}>
          Сізге әлі топ бекітілмеген. Топтар мен оқушыларды әкімші қосады.
        </div>
      )}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {rows?.map((r) => {
          const s = r.stats
          return (
            <button key={r.class.id} onClick={() => setOpen(r.class.id)} className="rounded-2xl border bg-white p-4 text-left transition hover:shadow-sm active:scale-[.99]" style={{ borderColor: LINE }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[16px] font-semibold">{r.class.name}</div>
                  <div className="mt-0.5 text-[13px]" style={{ color: MUTED }}>
                    {[r.class.subject, `${r.students} оқушы`, r.class.days.map((d) => DAY_SHORT[d - 1]).join(', ')].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <FillPill s={s} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs" style={{ color: MUTED }}>
                <Mini label="Қатысу" value={s.expected ? `${s.marked}/${s.expected}` : '—'} />
                <Mini label="Тақырып" value={s.weekTopic ? '✓' : s.lessons ? `${s.topics}/${s.lessons}` : '—'} />
                <Mini label="Үй тапсырмасы" value={s.weekHomework ? '✓' : s.lessons ? `${s.homework}/${s.lessons}` : '—'} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl py-2" style={{ background: '#F5F7FB' }}>
      <div className="text-[15px] font-semibold tabular-nums" style={{ color: INK }}>{value}</div>
      <div className="mt-0.5 truncate px-1">{label}</div>
    </div>
  )
}
