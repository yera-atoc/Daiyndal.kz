'use client'
// Кабинеттер: 5 кабинеттің күндік кестесі — қай уақытта қай сабақ, қай кабинет бос, қиылыс бар ма.
import { useEffect, useMemo, useState } from 'react'
import { BRAND, DAYS, DAYS_FULL, Modal, api, btnDark, btnLine, selCls, weekday, type CSlot, type CrmData } from './core'
import { DAY_END, ROOMS, busyMinutes, dayStart, isNow, roomDay, roomOf, toMin, type PlanItem, type SlotLike } from '@/lib/rooms'

function almatyNow() {
  const d = new Date(Date.now() + 5 * 3600e3)
  return { dow: ((d.getUTCDay() + 6) % 7) + 1, min: d.getUTCHours() * 60 + d.getUTCMinutes() }
}

export default function Rooms({ data, reload, flash }: { data: CrmData; reload: () => Promise<void>; flash: (m: string) => void }) {
  const todayDow = weekday(data.today)
  const [dow, setDow] = useState(todayDow >= 1 && todayDow <= 6 ? todayDow : 1)
  const [now, setNow] = useState(almatyNow)
  const [edit, setEdit] = useState<CSlot | null>(null)

  useEffect(() => {
    const t = setInterval(() => setNow(almatyNow()), 60_000)
    return () => clearInterval(t)
  }, [])

  const tName = (id: string) => data.teachers.find((t) => t.id === id)?.name ?? null
  const gName = (id: string | null) => data.groups.find((g) => g.id === id)?.name
  const plans = useMemo(() => ROOMS.map((r) => ({ room: r, items: roomDay(data.schedule, dow, tName, r.id) })), [data.schedule, data.teachers, dow]) // eslint-disable-line react-hooks/exhaustive-deps
  const span = toMin(DAY_END) - toMin(dayStart(dow))
  const clashes = plans.reduce((a, p) => a + p.items.filter((x) => x.kind === 'lesson' && x.clash).length, 0)
  const autoCount = data.schedule.filter((s) => !s.room).length

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto">
        {DAYS.slice(0, 6).map((d, i) => (
          <button
            key={d}
            onClick={() => setDow(i + 1)}
            className="min-w-[3.25rem] flex-1 rounded-lg border px-2 py-2 text-sm font-semibold"
            style={dow === i + 1 ? { background: BRAND.ink, color: '#fff', borderColor: BRAND.ink } : { borderColor: BRAND.line }}
          >
            {d}
            {i + 1 === todayDow && <span className="ml-1 text-[10px] font-medium opacity-70">бүгін</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-display text-lg font-semibold">{DAYS_FULL[dow - 1]}</span>
        <span style={{ color: BRAND.muted }}>Сабақтар {dayStart(dow)}-ден басталады</span>
      </div>

      {clashes > 0 && (
        <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: '#FCA5A5', background: '#FEF2F2', color: '#B91C1C' }}>
          Бір кабинетте бір уақытта {clashes} сабақ қиылысып тұр. Қызыл сабақты басып, басқа кабинетке ауыстырыңыз.
        </div>
      )}
      {autoCount > 0 && (
        <p className="text-xs" style={{ color: BRAND.muted }}>
          «авто» белгісі — кабинеті жазылмаған сабақ: мұғалімнің өз кабинетіне, басқа мұғалімдер 5-кабинетке қойылды. Басып, нақтылауға болады.
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-5">
        {plans.map(({ room, items }) => {
          const busy = busyMinutes(items)
          const current = items.find((x) => isNow(x, dow, now.dow, now.min))
          return (
            <div key={room.id} className="rounded-2xl border bg-white p-3" style={{ borderColor: BRAND.line }}>
              <div className="mb-2 flex items-start justify-between gap-2 px-1">
                <div className="min-w-0">
                  <div className="font-display font-semibold">{room.name}</div>
                  <div className="truncate text-xs" style={{ color: BRAND.muted }}>{room.owner ?? 'Қосымша сабақтар'}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs font-semibold tabular-nums">{Math.round((busy / span) * 100)}%</div>
                  <div className="text-[10px]" style={{ color: BRAND.muted }}>толуы</div>
                </div>
              </div>
              {dow === now.dow && (
                <div className="mb-2 rounded-lg px-2 py-1 text-xs font-semibold" style={current ? { background: '#DCFCE7', color: '#15803D' } : { background: '#F1F5F9', color: BRAND.muted }}>
                  {current && current.kind === 'lesson' ? `Қазір: ${current.slot.title || gName(current.slot.group_id) || 'сабақ'} · ${current.end}-ге дейін` : 'Қазір бос'}
                </div>
              )}
              <div className="space-y-1.5">
                {items.map((x, i) => <Item key={i} x={x} live={isNow(x, dow, now.dow, now.min)} tName={tName} gName={gName} onEdit={(s) => setEdit(s as CSlot)} />)}
              </div>
            </div>
          )
        })}
      </div>

      {edit && (
        <MoveRoom
          slot={edit}
          title={edit.title || gName(edit.group_id) || 'Сабақ'}
          teacher={tName(edit.teacher_id)}
          onClose={() => setEdit(null)}
          onSaved={async () => { setEdit(null); await reload(); flash('Кабинет сақталды') }}
        />
      )}
    </div>
  )
}

function Item({ x, live, tName, gName, onEdit }: { x: PlanItem; live: boolean; tName: (id: string) => string | null; gName: (id: string | null) => string | undefined; onEdit: (s: SlotLike) => void }) {
  if (x.kind === 'free')
    return (
      <div className="rounded-lg border border-dashed px-2 py-1.5 text-xs" style={{ borderColor: BRAND.line, color: BRAND.muted }}>
        Бос · <span className="tabular-nums">{x.start}–{x.end}</span>
      </div>
    )
  const border = x.clash ? '#EF4444' : live ? '#16A34A' : BRAND.blue
  const bg = x.clash ? '#FEF2F2' : live ? '#F0FDF4' : '#F3F6FE'
  return (
    <button onClick={() => onEdit(x.slot)} className="w-full rounded-lg border-l-[3px] px-2 py-1.5 text-left hover:opacity-90" style={{ borderColor: border, background: bg, borderRadius: 0 }}>
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-semibold tabular-nums">{x.start}–{x.end}</span>
        {x.auto && <span className="rounded px-1 text-[10px]" style={{ background: '#E2E8F0', color: '#475569' }}>авто</span>}
      </div>
      <div className="truncate text-xs font-medium">{x.slot.title || gName(x.slot.group_id) || 'Сабақ'}</div>
      <div className="truncate text-[11px]" style={{ color: BRAND.muted }}>{tName(x.slot.teacher_id) ?? '—'}{x.clash ? ' · қиылыс' : ''}</div>
    </button>
  )
}

function MoveRoom({ slot, title, teacher, onClose, onSaved }: { slot: CSlot; title: string; teacher: string | null; onClose: () => void; onSaved: () => void }) {
  const [room, setRoom] = useState(roomOf(slot, teacher).room)
  const [all, setAll] = useState(true)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Modal title="Кабинетті таңдау" onClose={onClose}>
      <div className="space-y-4 text-sm">
        <div>
          <div className="font-semibold">{title}</div>
          <div style={{ color: BRAND.muted }}>{DAYS_FULL[slot.day_of_week - 1]} · {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)} · {teacher ?? '—'}</div>
        </div>
        <select value={room} onChange={(e) => setRoom(e.target.value)} className={`${selCls} w-full`} style={{ borderColor: BRAND.line }}>
          {ROOMS.map((r) => <option key={r.id} value={r.id}>{r.name}{r.owner ? ` — ${r.owner}` : ' — қосымша'}</option>)}
        </select>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />
          Осы топтың/мұғалімнің осы уақыттағы барлық күндеріне
        </label>
        {err && <p style={{ color: BRAND.red }}>{err}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className={btnLine} style={{ borderColor: BRAND.line }}>Болдырмау</button>
          <button
            disabled={busy}
            className={btnDark}
            style={{ background: BRAND.ink }}
            onClick={async () => {
              setBusy(true)
              setErr('')
              try {
                await api(`/api/admin/rooms`, 'PATCH', { id: slot.id, room, all })
                onSaved()
              } catch (e: any) {
                setErr(e.message)
                setBusy(false)
              }
            }}
          >
            Сақтау
          </button>
        </div>
      </div>
    </Modal>
  )
}
