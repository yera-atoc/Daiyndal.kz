'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Download, Plus, X } from 'lucide-react'
import {
  BRAND,
  DAYS,
  DAYS_FULL,
  Empty,
  Field,
  Kpi,
  Modal,
  Panel,
  api,
  btnDark,
  btnLine,
  crm,
  dmy,
  hhmm,
  inputCls,
  selCls,
  monthTitle,
  shiftDays,
  tg,
  weekday,
  type CSlot,
  type CrmData,
} from './core'

// ── Төлемдер ─────────────────────────────────────────────

export function Payments({ data, reload, flash, onStudent }: { data: CrmData; reload: () => Promise<void>; flash: (m: string) => void; onStudent: (id: string) => void }) {
  const [month, setMonth] = useState(data.today.slice(0, 7))
  const list = data.payments.filter((p) => p.paid_on.startsWith(month))
  const total = list.reduce((a, p) => a + (p.amount ?? 0), 0)
  const active = data.students.filter((s) => (s.status ?? 'active') === 'active')
  const expected = active.reduce((a, s) => a + (s.payment_amount ?? 0), 0)
  const paidIds = new Set(list.map((p) => p.student_id))
  const unpaid = active.filter((s) => s.payment_amount && !paidIds.has(s.id))
  const step = (n: number) => {
    const d = new Date(`${month}-01T00:00:00Z`)
    d.setUTCMonth(d.getUTCMonth() + n)
    setMonth(d.toISOString().slice(0, 7))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => step(-1)} aria-label="Алдыңғы ай" className={btnLine} style={{ borderColor: BRAND.line }}><ChevronLeft size={16} /></button>
        <div className="font-display min-w-[10rem] text-center text-lg font-semibold">{monthTitle(month)}</div>
        <button onClick={() => step(1)} aria-label="Келесі ай" className={btnLine} style={{ borderColor: BRAND.line }}><ChevronRight size={16} /></button>
        <a href="/api/crm/export?type=payments" className={`${btnLine} ml-auto flex items-center gap-1.5`} style={{ borderColor: BRAND.line }}><Download size={15} /> Барлық төлем (Excel)</a>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Түскен сома" value={tg(total)} tone={BRAND.blue} />
        <Kpi label="Төлем саны" value={`${list.length}`} />
        <Kpi label="Айлық жоспар" value={tg(expected)} sub={`${active.length} оқушының айлық төлемі`} />
        <Kpi label="Осы айда төлемегендер" value={`${unpaid.length}`} sub={tg(unpaid.reduce((a, s) => a + (s.payment_amount ?? 0), 0))} tone={unpaid.length ? BRAND.red : BRAND.text} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Төлемдер тізімі">
          {list.length === 0 ? (
            <Empty>Бұл айда төлем жоқ.</Empty>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-b last:border-0" style={{ borderColor: BRAND.line }}>
                    <td className="py-2 tabular-nums" style={{ color: BRAND.muted }}>{dmy(p.paid_on)}</td>
                    <td className="py-2">
                      <button onClick={() => p.student_id && onStudent(p.student_id)} className="text-left font-medium">{p.student_name}</button>
                      {p.note && <div className="text-xs" style={{ color: BRAND.muted }}>{p.note}</div>}
                    </td>
                    <td className="py-2 text-right font-semibold tabular-nums">{tg(p.amount)}</td>
                    <td className="py-2 pl-3 text-right">
                      <button
                        onClick={async () => {
                          if (!confirm(`${p.student_name}: ${tg(p.amount)} төлем жазбасы өшсін бе?`)) return
                          await crm({ action: 'delete-payment', id: p.id })
                          await reload()
                          flash('Төлем жазбасы өшірілді')
                        }}
                        aria-label="Өшіру"
                        style={{ color: BRAND.muted }}
                      >
                        <X size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title="Осы айда әлі төлемегендер">
          {unpaid.length === 0 ? (
            <Empty>Барлығы төледі.</Empty>
          ) : (
            <ul className="space-y-1.5">
              {unpaid.map((s) => (
                <li key={s.id}>
                  <button onClick={() => onStudent(s.id)} className="flex w-full justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50">
                    <span className="font-medium">{s.full_name}</span>
                    <span className="tabular-nums" style={{ color: BRAND.muted }}>{tg(s.payment_amount)} · {dmy(s.payment_deadline)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

// ── Қатысу ───────────────────────────────────────────────

type Mark = 'present' | 'absent' | 'excused' | null

export function Attendance({ data, reload, flash, initialGroup }: { data: CrmData; reload: () => Promise<void>; flash: (m: string) => void; initialGroup: string | null }) {
  const [date, setDate] = useState(data.today)
  const [group, setGroup] = useState(initialGroup ?? data.groups[0]?.id ?? '')
  const roster = data.students.filter((s) => (s.status ?? 'active') === 'active' && (group === '-' ? !s.group_id : s.group_id === group))
  const saved = useMemo(() => {
    const m = new Map<string, Mark>()
    for (const a of data.attendance) if (a.date === date) m.set(a.student_id, a.excused ? 'excused' : a.present ? 'present' : 'absent')
    return m
  }, [data.attendance, date])
  const [marks, setMarks] = useState<Map<string, Mark>>(saved)
  const [busy, setBusy] = useState(false)
  useEffect(() => setMarks(new Map(saved)), [saved])
  const dirty = roster.some((s) => (marks.get(s.id) ?? null) !== (saved.get(s.id) ?? null))
  const lessons = data.schedule.filter((sl) => sl.group_id === group && sl.day_of_week === weekday(date))
  const set = (id: string, m: Mark) => setMarks(new Map(marks).set(id, marks.get(id) === m ? null : m))
  const present = roster.filter((s) => marks.get(s.id) === 'present').length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setDate(shiftDays(date, -1))} aria-label="Алдыңғы күн" className={btnLine} style={{ borderColor: BRAND.line }}><ChevronLeft size={16} /></button>
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={selCls} style={{ borderColor: BRAND.line }} />
        <button onClick={() => setDate(shiftDays(date, 1))} aria-label="Келесі күн" className={btnLine} style={{ borderColor: BRAND.line }}><ChevronRight size={16} /></button>
        <span className="text-sm" style={{ color: BRAND.muted }}>{DAYS_FULL[weekday(date) - 1]}</span>
        <select value={group} onChange={(e) => setGroup(e.target.value)} className={`${selCls} ml-auto`} style={{ borderColor: BRAND.line }} aria-label="Топ">
          {data.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          <option value="-">Топсыз оқушылар</option>
        </select>
      </div>

      <Panel
        title={`${data.groups.find((g) => g.id === group)?.name ?? 'Топсыз'} · ${dmy(date)}`}
        note={lessons.length ? `Сабақ: ${lessons.map((l) => `${hhmm(l.start_time)}–${hhmm(l.end_time)}`).join(', ')}` : 'Кесте бойынша бұл күні сабақ жоқ'}
        action={
          roster.length > 0 && (
            <button onClick={() => setMarks(new Map(roster.map((s) => [s.id, 'present' as Mark])))} className={btnLine} style={{ borderColor: BRAND.line }}>
              Барлығы келді
            </button>
          )
        }
      >
        {roster.length === 0 ? (
          <Empty>Бұл топта оқушы жоқ.</Empty>
        ) : (
          <ul className="divide-y" style={{ borderColor: BRAND.line }}>
            {roster.map((s) => {
              const m = marks.get(s.id) ?? null
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-2">
                  <span className="min-w-0 flex-1 text-sm font-medium">{s.full_name}</span>
                  <div className="flex gap-1" role="group" aria-label={s.full_name}>
                    {([
                      ['present', 'Келді', '#15803D', '#DCFCE7'],
                      ['absent', 'Келмеді', '#B91C1C', '#FEE2E2'],
                      ['excused', 'Себепті', '#B45309', '#FEF3C7'],
                    ] as [Mark, string, string, string][]).map(([k, l, fg, bg]) => (
                      <button
                        key={k}
                        onClick={() => set(s.id, k)}
                        aria-pressed={m === k}
                        className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                        style={m === k ? { background: bg, color: fg, borderColor: fg } : { borderColor: BRAND.line, color: BRAND.muted }}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      {roster.length > 0 && (
        <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-xl border bg-white p-3 shadow-lg" style={{ borderColor: BRAND.line }}>
          <span className="text-sm" style={{ color: BRAND.muted }}>
            Келді: <b style={{ color: BRAND.text }}>{present}</b> / {roster.length}
            {dirty && <span className="ml-2" style={{ color: BRAND.red }}>· сақталмаған</span>}
          </span>
          <button
            disabled={!dirty || busy}
            onClick={async () => {
              setBusy(true)
              try {
                await crm({ action: 'set-attendance', date, marks: roster.map((s) => ({ studentId: s.id, mark: marks.get(s.id) ?? null })) })
                await reload()
                flash('Қатысу сақталды')
              } catch (e: any) {
                flash(e.message)
              } finally {
                setBusy(false)
              }
            }}
            className={`${btnDark} flex items-center gap-1.5`}
            style={{ background: BRAND.blue }}
          >
            <Check size={15} /> Сақтау
          </button>
        </div>
      )}
    </div>
  )
}

// ── Кесте ────────────────────────────────────────────────

export function Schedule({ data, reload, flash }: { data: CrmData; reload: () => Promise<void>; flash: (m: string) => void }) {
  const [edit, setEdit] = useState<Partial<CSlot> & { days?: number[] } | null>(null)
  const today = weekday(data.today)
  const gName = (id: string | null) => data.groups.find((g) => g.id === id)?.name
  const tName = (id: string) => data.teachers.find((t) => t.id === id)?.name ?? '—'
  const rooms = Array.from(new Set(data.schedule.map((s) => s.room).filter(Boolean))) as string[]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button disabled={!data.teachers.length} onClick={() => setEdit({ days: [], start_time: '15:00', end_time: '16:00' })} className={`${btnDark} flex items-center gap-1.5`} style={{ background: BRAND.ink }}>
          <Plus size={15} /> Сабақ қосу
        </button>
      </div>
      {!data.teachers.length && <p className="text-sm" style={{ color: BRAND.muted }}>Алдымен «Мұғалімдер» бөлімінде мұғалім қосыңыз.</p>}
      <div className="grid gap-3 md:grid-cols-7">
        {DAYS.map((d, i) => {
          const slots = data.schedule.filter((s) => s.day_of_week === i + 1).sort((a, b) => a.start_time.localeCompare(b.start_time))
          return (
            <div key={d} className="min-h-[8rem] rounded-2xl border bg-white p-2.5" style={{ borderColor: i + 1 === today ? BRAND.blue : BRAND.line }}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <span className="font-display text-sm font-semibold">{DAYS_FULL[i]}</span>
                {i + 1 === today && <span className="text-[11px] font-semibold" style={{ color: BRAND.blue }}>бүгін</span>}
              </div>
              <div className="space-y-1.5">
                {slots.map((s) => (
                  <button key={s.id} onClick={() => setEdit({ ...s, days: [s.day_of_week] })} className="w-full rounded-lg border-l-[3px] px-2 py-1.5 text-left hover:bg-slate-50" style={{ borderColor: BRAND.blue, background: '#F3F6FE' }}>
                    <div className="text-xs font-semibold tabular-nums">{hhmm(s.start_time)}–{hhmm(s.end_time)}</div>
                    <div className="truncate text-xs font-medium">{s.title || gName(s.group_id) || 'Сабақ'}</div>
                    <div className="truncate text-[11px]" style={{ color: BRAND.muted }}>{tName(s.teacher_id)}{s.room ? ` · ${s.room}` : ''}</div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      {edit && <SlotForm init={edit} data={data} rooms={rooms} onClose={() => setEdit(null)} onSaved={async (m) => { setEdit(null); await reload(); flash(m) }} />}
    </div>
  )
}

function SlotForm({ init, data, rooms, onClose, onSaved }: { init: Partial<CSlot> & { days?: number[] }; data: CrmData; rooms: string[]; onClose: () => void; onSaved: (m: string) => void }) {
  const [f, setF] = useState({
    teacherId: init.teacher_id ?? data.teachers[0]?.id ?? '',
    groupId: init.group_id ?? '',
    days: init.days ?? [],
    startTime: hhmm(init.start_time ?? '15:00'),
    endTime: hhmm(init.end_time ?? '16:00'),
    title: init.title ?? '',
    room: init.room ?? '',
  })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const style = { borderColor: BRAND.line }
  const editing = !!init.id
  return (
    <Modal title={editing ? 'Сабақты өзгерту' : 'Жаңа сабақ'} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setErr('')
          try {
            if (editing) await api(`/api/schedule/${init.id}`, 'PUT', f)
            else await api('/api/schedule', 'POST', f)
            onSaved(editing ? 'Сабақ сақталды' : 'Сабақ қосылды')
          } catch (er: any) {
            setErr(er.message)
            setBusy(false)
          }
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Field label="Мұғалім">
          <select value={f.teacherId} onChange={(e) => setF({ ...f, teacherId: e.target.value })} className={inputCls} style={style}>
            {data.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Топ">
          <select value={f.groupId} onChange={(e) => setF({ ...f, groupId: e.target.value })} className={inputCls} style={style}>
            <option value="">—</option>
            {data.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <span className="mb-1 block text-xs font-medium" style={{ color: BRAND.muted }}>{editing ? 'Күні' : 'Күндері'}</span>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d, i) => {
              const on = f.days.includes(i + 1)
              return (
                <button
                  type="button"
                  key={d}
                  aria-pressed={on}
                  onClick={() => setF({ ...f, days: editing ? [i + 1] : on ? f.days.filter((x) => x !== i + 1) : [...f.days, i + 1] })}
                  className="h-9 w-11 rounded-lg border text-sm font-semibold"
                  style={on ? { background: BRAND.ink, color: '#fff', borderColor: BRAND.ink } : style}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </div>
        <Field label="Басталуы"><input type="time" value={f.startTime} onChange={(e) => setF({ ...f, startTime: e.target.value })} className={inputCls} style={style} /></Field>
        <Field label="Аяқталуы"><input type="time" value={f.endTime} onChange={(e) => setF({ ...f, endTime: e.target.value })} className={inputCls} style={style} /></Field>
        <Field label="Кабинет">
          <input list="crm-rooms" value={f.room} onChange={(e) => setF({ ...f, room: e.target.value })} placeholder="Мысалы: 101" className={inputCls} style={style} />
          <datalist id="crm-rooms">{rooms.map((r) => <option key={r} value={r} />)}</datalist>
        </Field>
        <Field label="Атауы (міндетті емес)"><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Мысалы: Математика" className={inputCls} style={style} /></Field>
        {err && <p className="rounded-lg p-2 text-sm sm:col-span-2" style={{ background: '#FEE2E2', color: '#B91C1C' }}>{err}</p>}
        <div className="flex items-center justify-between gap-2 sm:col-span-2">
          {editing ? (
            <button
              type="button"
              onClick={async () => {
                if (!confirm('Бұл сабақ кестеден өшсін бе?')) return
                await api(`/api/schedule/${init.id}`, 'DELETE')
                onSaved('Сабақ өшірілді')
              }}
              className="text-sm"
              style={{ color: BRAND.red }}
            >
              Өшіру
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={btnLine} style={style}>Болдырмау</button>
            <button disabled={busy} className={btnDark} style={{ background: BRAND.blue }}>Сақтау</button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

// ── Топтар ───────────────────────────────────────────────

export function Groups({ data, reload, flash, onOpenGroup }: { data: CrmData; reload: () => Promise<void>; flash: (m: string) => void; onOpenGroup: (id: string) => void }) {
  const [name, setName] = useState('')
  const run = async (body: unknown, note: string) => {
    try {
      await crm(body)
      await reload()
      flash(note)
      return true
    } catch (e: any) {
      flash(e.message)
      return false
    }
  }
  return (
    <div className="space-y-4">
      <form onSubmit={async (e) => { e.preventDefault(); if (await run({ action: 'save-group', name }, 'Топ қосылды')) setName('') }} className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Жаңа топтың аты, мысалы: 5-сынып БІЛ" className={inputCls} style={{ borderColor: BRAND.line }} />
        <button disabled={!name.trim()} className={`${btnDark} flex shrink-0 items-center gap-1.5`} style={{ background: BRAND.ink }}><Plus size={15} /> Топ қосу</button>
      </form>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.groups.map((g) => {
          const st = data.students.filter((s) => s.group_id === g.id && (s.status ?? 'active') === 'active')
          const slots = data.schedule.filter((s) => s.group_id === g.id)
          const teachers = Array.from(new Set(slots.map((s) => data.teachers.find((t) => t.id === s.teacher_id)?.name).filter(Boolean)))
          const monthly = st.reduce((a, s) => a + (s.payment_amount ?? 0), 0)
          return (
            <div key={g.id} className="rounded-2xl border bg-white p-5" style={{ borderColor: BRAND.line }}>
              <div className="font-display text-lg font-semibold tracking-tight">{g.name}</div>
              <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                <dt style={{ color: BRAND.muted }}>Оқушылар</dt><dd className="text-right font-semibold">{st.length}</dd>
                <dt style={{ color: BRAND.muted }}>Айлық түсім</dt><dd className="text-right font-semibold">{tg(monthly)}</dd>
                <dt style={{ color: BRAND.muted }}>Сабақтар</dt>
                <dd className="text-right">{slots.length ? slots.map((s) => `${DAYS[s.day_of_week - 1]} ${hhmm(s.start_time)}`).join(', ') : '—'}</dd>
                <dt style={{ color: BRAND.muted }}>Мұғалім</dt><dd className="text-right">{teachers.join(', ') || '—'}</dd>
              </dl>
              <div className="mt-4 flex gap-2">
                <button onClick={() => onOpenGroup(g.id)} className={btnDark} style={{ background: BRAND.ink }}>Қатысу белгілеу</button>
                <button onClick={() => { const n = prompt('Топтың жаңа аты', g.name); if (n && n.trim() !== g.name) run({ action: 'save-group', id: g.id, name: n }, 'Топ өзгертілді') }} className={btnLine} style={{ borderColor: BRAND.line }}>Атын өзгерту</button>
                <button onClick={() => confirm(`«${g.name}» тобы өшсін бе? Оқушылар топсыз қалады.`) && run({ action: 'delete-group', id: g.id }, 'Топ өшірілді')} className="ml-auto text-sm" style={{ color: BRAND.red }}>Өшіру</button>
              </div>
            </div>
          )
        })}
      </div>
      {data.groups.length === 0 && <Empty>Әзірге топ жоқ.</Empty>}
    </div>
  )
}

// ── Мұғалімдер ───────────────────────────────────────────

export function Teachers({ data, reload, flash }: { data: CrmData; reload: () => Promise<void>; flash: (m: string) => void }) {
  const [form, setForm] = useState<{ id?: string; name: string; subject: string; username: string; password: string } | null>(null)
  const [err, setErr] = useState('')
  const style = { borderColor: BRAND.line }
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setErr(''); setForm({ name: '', subject: '', username: '', password: '' }) }} className={`${btnDark} flex items-center gap-1.5`} style={{ background: BRAND.ink }}><Plus size={15} /> Мұғалім қосу</button>
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-white" style={style}>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs" style={{ borderColor: BRAND.line, color: BRAND.muted }}>
              <th className="px-4 py-3 font-medium">Мұғалім</th>
              <th className="px-4 py-3 font-medium">Пәні</th>
              <th className="px-4 py-3 font-medium">Кабинетке кіру</th>
              <th className="px-4 py-3 text-right font-medium">Аптасына сабақ</th>
              <th className="px-4 py-3 text-right font-medium">Оқушылар</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {data.teachers.map((t) => {
              const slots = data.schedule.filter((s) => s.teacher_id === t.id)
              const hours = slots.reduce((a, s) => a + (Number(s.end_time.slice(0, 2)) * 60 + Number(s.end_time.slice(3, 5)) - Number(s.start_time.slice(0, 2)) * 60 - Number(s.start_time.slice(3, 5))) / 60, 0)
              const students = new Set(data.students.filter((s) => s.teacher_id === t.id || slots.some((sl) => sl.group_id && sl.group_id === s.group_id)).map((s) => s.id)).size
              return (
                <tr key={t.id} className="border-b last:border-0" style={{ borderColor: BRAND.line }}>
                  <td className="px-4 py-2.5 font-semibold">{t.name}</td>
                  <td className="px-4 py-2.5">{t.subject ?? '—'}</td>
                  <td className="px-4 py-2.5">{t.username ? <span className="font-medium">{t.username}</span> : <span style={{ color: BRAND.muted }}>логин жоқ</span>}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{slots.length} · {Math.round(hours * 10) / 10} сағ</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{students}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => { setErr(''); setForm({ id: t.id, name: t.name, subject: t.subject ?? '', username: t.username ?? '', password: '' }) }} className="mr-3 text-sm font-medium" style={{ color: BRAND.blue }}>Өзгерту</button>
                    <button
                      onClick={async () => {
                        if (!confirm(`${t.name} өшірілсін бе? Оның кестедегі сабақтары да өшеді.`)) return
                        try { await api(`/api/teachers/${t.id}`, 'DELETE'); await reload(); flash('Мұғалім өшірілді') } catch (e: any) { flash(e.message) }
                      }}
                      className="text-sm"
                      style={{ color: BRAND.red }}
                    >
                      Өшіру
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {data.teachers.length === 0 && <Empty>Әзірге мұғалім жоқ.</Empty>}
      </div>
      {form && (
        <Modal title={form.id ? 'Мұғалімді өзгерту' : 'Жаңа мұғалім'} onClose={() => setForm(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              setErr('')
              try {
                if (form.id) {
                  await api(`/api/teachers/${form.id}`, 'PUT', { name: form.name, subject: form.subject })
                  if (form.password || (form.username && form.username !== data.teachers.find((t) => t.id === form.id)?.username))
                    await api(`/api/teachers/${form.id}`, 'PATCH', { username: form.username, password: form.password })
                } else {
                  await api('/api/teachers', 'POST', form)
                }
                setForm(null)
                await reload()
                flash('Сақталды')
              } catch (er: any) {
                setErr(er.message)
              }
            }}
            className="grid gap-4"
          >
            <Field label="Аты-жөні *"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} style={style} /></Field>
            <Field label="Пәні"><input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputCls} style={style} /></Field>
            <p className="text-xs" style={{ color: BRAND.muted }}>Мұғалім кабинетіне (/teacher) кіру үшін логин мен құпиясөз (міндетті емес).</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Логин"><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="off" className={inputCls} style={style} /></Field>
              <Field label={form.id ? 'Жаңа құпиясөз' : 'Құпиясөз'}><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" className={inputCls} style={style} /></Field>
            </div>
            {err && <p className="rounded-lg p-2 text-sm" style={{ background: '#FEE2E2', color: '#B91C1C' }}>{err}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setForm(null)} className={btnLine} style={style}>Болдырмау</button>
              <button className={btnDark} style={{ background: BRAND.blue }}>Сақтау</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
