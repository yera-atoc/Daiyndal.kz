'use client'

import { useMemo, useState } from 'react'
import { WEEKDAYS, hhmm, slotGroupName, type ScheduleSlot } from '@/lib/schedule'

// Weekly timetable in the style of BilimClass "Сабақ кестесі":
// rows = lesson times, columns = weekdays, today's column and the lesson
// that is running right now are highlighted, with ‹ › week switching.

const MONTHS = [
  'қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым',
  'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан',
]

const PALETTE = [
  'border-sky-200 bg-sky-50 text-sky-900',
  'border-emerald-200 bg-emerald-50 text-emerald-900',
  'border-violet-200 bg-violet-50 text-violet-900',
  'border-amber-200 bg-amber-50 text-amber-900',
  'border-rose-200 bg-rose-50 text-rose-900',
  'border-teal-200 bg-teal-50 text-teal-900',
]

function colorFor(key: string) {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

function mondayOf(d: Date) {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const wd = r.getDay() === 0 ? 7 : r.getDay()
  r.setDate(r.getDate() - (wd - 1))
  return r
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function WeeklyTimetable({
  slots,
  groupSizes,
}: {
  slots: ScheduleSlot[]
  /** group_id -> number of students (optional, shown on the card) */
  groupSizes?: Record<string, number>
}) {
  const [weekOffset, setWeekOffset] = useState(0)

  const now = new Date()
  const monday = useMemo(() => {
    const m = mondayOf(new Date())
    m.setDate(m.getDate() + weekOffset * 7)
    return m
  }, [weekOffset])

  // Mon–Sat always; Sunday only if something is scheduled on it.
  const hasSunday = slots.some((s) => s.day_of_week === 7)
  const days = WEEKDAYS.filter((d) => d.id <= 6 || hasSunday).map((d) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + d.id - 1)
    return { ...d, date }
  })

  // One row per distinct time range, earliest first.
  const rows = useMemo(() => {
    const set = new Map<string, { start: string; end: string }>()
    for (const s of slots) {
      const start = hhmm(s.start_time)
      const end = hhmm(s.end_time)
      set.set(`${start}-${end}`, { start, end })
    }
    return Array.from(set.values()).sort(
      (a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end)
    )
  }, [slots])

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const rangeLabel =
    monday.getMonth() === sunday.getMonth()
      ? `${monday.getDate()} – ${sunday.getDate()} ${MONTHS[sunday.getMonth()]} ${sunday.getFullYear()}`
      : `${monday.getDate()} ${MONTHS[monday.getMonth()]} – ${sunday.getDate()} ${MONTHS[sunday.getMonth()]} ${sunday.getFullYear()}`

  const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const isCurrent = (dayDate: Date, start: string, end: string) =>
    sameDay(dayDate, now) && start <= nowHHMM && nowHHMM < end

  const totalThisWeek = slots.length

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="h-9 w-9 rounded-full border border-zinc-200 bg-white text-lg leading-none text-zinc-600 shadow-sm hover:bg-zinc-50"
            aria-label="Алдыңғы апта"
          >
            ‹
          </button>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="h-9 w-9 rounded-full border border-zinc-200 bg-white text-lg leading-none text-zinc-600 shadow-sm hover:bg-zinc-50"
            aria-label="Келесі апта"
          >
            ›
          </button>
          <p className="ml-1 text-sm font-semibold text-zinc-900">{rangeLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-zinc-400">Аптасына {totalThisWeek} сабақ</p>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
            >
              Осы апта
            </button>
          )}
        </div>
      </div>

      {slots.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-500 shadow-sm">
          Әзірге кесте қойылмаған. Сабақ кестесін әкімші қосады.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div
            className="grid min-w-[760px]"
            style={{ gridTemplateColumns: `96px repeat(${days.length}, minmax(0, 1fr))` }}
          >
            {/* header row */}
            <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Уақыт
            </div>
            {days.map((d) => {
              const today = sameDay(d.date, now)
              return (
                <div
                  key={d.id}
                  className={`border-b border-l border-zinc-200 px-3 py-3 text-center ${
                    today ? 'bg-zinc-900 text-white' : 'bg-zinc-50 text-zinc-600'
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide">{d.short}</p>
                  <p className={`text-[11px] ${today ? 'text-zinc-300' : 'text-zinc-400'}`}>
                    {d.date.getDate()} {MONTHS[d.date.getMonth()].slice(0, 3)}
                  </p>
                </div>
              )
            })}

            {/* body rows */}
            {rows.map((r) => (
              <RowCells
                key={`${r.start}-${r.end}`}
                row={r}
                days={days}
                slots={slots}
                now={now}
                isCurrent={isCurrent}
                groupSizes={groupSizes}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function RowCells({
  row,
  days,
  slots,
  now,
  isCurrent,
  groupSizes,
}: {
  row: { start: string; end: string }
  days: { id: number; date: Date }[]
  slots: ScheduleSlot[]
  now: Date
  isCurrent: (d: Date, s: string, e: string) => boolean
  groupSizes?: Record<string, number>
}) {
  return (
    <>
      <div className="flex flex-col justify-center border-b border-zinc-100 bg-zinc-50/60 px-3 py-3">
        <p className="text-sm font-bold text-zinc-900">{row.start}</p>
        <p className="text-[11px] text-zinc-400">{row.end}</p>
      </div>
      {days.map((d) => {
        const slot = slots.find(
          (s) =>
            s.day_of_week === d.id && hhmm(s.start_time) === row.start && hhmm(s.end_time) === row.end
        )
        const today = sameDay(d.date, now)
        const live = slot ? isCurrent(d.date, row.start, row.end) : false
        const group = slot ? slotGroupName(slot) : null
        const size = slot?.group_id ? groupSizes?.[slot.group_id] : undefined
        return (
          <div
            key={d.id}
            className={`border-b border-l border-zinc-100 p-1.5 ${today ? 'bg-zinc-50/70' : ''}`}
          >
            {slot && (
              <div
                className={`h-full rounded-xl border px-2.5 py-2 text-xs ${colorFor(
                  slot.group_id ?? group ?? slot.title ?? slot.id
                )} ${live ? 'ring-2 ring-zinc-900' : ''}`}
              >
                {live && (
                  <span className="mb-1 inline-block rounded-full bg-zinc-900 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                    Қазір
                  </span>
                )}
                <p className="font-semibold leading-tight">{group ?? slot.title ?? 'Сабақ'}</p>
                {group && slot.title && <p className="mt-0.5 leading-tight opacity-80">{slot.title}</p>}
                {size !== undefined && <p className="mt-1 text-[10px] opacity-70">👥 {size} оқушы</p>}
                {slot.note && <p className="mt-1 text-[10px] leading-tight opacity-70">{slot.note}</p>}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
