'use client'

import { useMemo, useState } from 'react'
import { Download, MessageCircle, Plus, Search, UserPlus } from 'lucide-react'
import { nextDeadlineAfter } from '@/lib/payments'
import {
  BRAND,
  Badge,
  Drawer,
  Empty,
  Field,
  Modal,
  STATUS,
  api,
  attendanceRate,
  btnDark,
  btnLine,
  crm,
  dmy,
  inputCls,
  selCls,
  payInfo,
  shiftDays,
  tg,
  waLink,
  type CStudent,
  type CrmData,
} from './core'

type PayFilter = 'all' | 'overdue' | 'soon' | 'ok' | 'none'

export default function Students({
  data,
  reload,
  flash,
  openId,
  setOpenId,
  payId,
  setPayId,
}: {
  data: CrmData
  reload: () => Promise<void>
  flash: (m: string) => void
  openId: string | null
  setOpenId: (id: string | null) => void
  payId: string | null
  setPayId: (id: string | null) => void
}) {
  const { students, groups, today, attendance } = data
  const [q, setQ] = useState('')
  const [group, setGroup] = useState('')
  const [status, setStatus] = useState('active')
  const [pay, setPay] = useState<PayFilter>('all')
  const [edit, setEdit] = useState<Partial<CStudent> | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const rows = useMemo(() => {
    return students
      .map((s) => ({ s, p: payInfo(s, today), a: attendanceRate(attendance, s.id, today) }))
      .filter(({ s, p }) => {
        if (q && !`${s.full_name} ${s.phone ?? ''} ${s.parent_phone ?? ''} ${s.parent_name ?? ''}`.toLowerCase().includes(q.toLowerCase())) return false
        if (group && (group === '-' ? s.group_id : s.group_id !== group)) return false
        if (status && (s.status ?? 'active') !== status) return false
        if (pay === 'overdue' && p.kind !== 'overdue') return false
        if (pay === 'soon' && p.kind !== 'soon' && p.kind !== 'today') return false
        if (pay === 'ok' && p.kind !== 'ok') return false
        if (pay === 'none' && p.kind !== 'none') return false
        return true
      })
  }, [students, today, attendance, q, group, status, pay])

  const count = (k: PayFilter) =>
    students.filter((s) => (s.status ?? 'active') === 'active').filter((s) => {
      const p = payInfo(s, today).kind
      return k === 'all' || p === k || (k === 'soon' && p === 'today')
    }).length

  const gName = (id: string | null) => groups.find((g) => g.id === id)?.name ?? '—'
  const open = students.find((s) => s.id === openId) ?? null
  const payFor = students.find((s) => s.id === payId) ?? null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: BRAND.muted }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Аты, телефоны бойынша іздеу" className={`${inputCls} pl-9`} style={{ borderColor: BRAND.line }} />
        </div>
        <select value={group} onChange={(e) => setGroup(e.target.value)} className={selCls} style={{ borderColor: BRAND.line }} aria-label="Топ">
          <option value="">Барлық топ</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          <option value="-">Топсыз</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selCls} style={{ borderColor: BRAND.line }} aria-label="Күйі">
          <option value="active">Оқып жүр</option>
          <option value="paused">Үзілісте</option>
          <option value="left">Кеткендер</option>
          <option value="">Барлығы</option>
        </select>
        <a href="/api/crm/export?type=students" className={`${btnLine} flex items-center gap-1.5`} style={{ borderColor: BRAND.line }}>
          <Download size={15} /> Excel
        </a>
        {data.btGroups.length > 0 && (
          <button onClick={() => setImportOpen(true)} className={`${btnLine} flex items-center gap-1.5`} style={{ borderColor: BRAND.line }}>
            <UserPlus size={15} /> Білім тексеруден
          </button>
        )}
        <button onClick={() => setEdit({ status: 'active', start_date: today })} className={`${btnDark} flex items-center gap-1.5`} style={{ background: BRAND.ink }}>
          <Plus size={15} /> Оқушы қосу
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {([
          ['all', 'Барлығы'],
          ['overdue', 'Мерзімі өтті'],
          ['soon', 'Жақында'],
          ['ok', 'Төленген'],
          ['none', 'Белгіленбеген'],
        ] as [PayFilter, string][]).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setPay(k)}
            className="rounded-full px-3 py-1 text-sm font-medium"
            style={pay === k ? { background: BRAND.ink, color: '#fff' } : { background: '#fff', border: `1px solid ${BRAND.line}` }}
          >
            {l} <span className="ml-0.5 opacity-60">{count(k)}</span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-white" style={{ borderColor: BRAND.line }}>
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs" style={{ borderColor: BRAND.line, color: BRAND.muted }}>
              <th className="px-4 py-3 font-medium">Оқушы</th>
              <th className="px-4 py-3 font-medium">Топ</th>
              <th className="px-4 py-3 font-medium">Ата-анасы</th>
              <th className="px-4 py-3 font-medium">Төлем</th>
              <th className="px-4 py-3 text-right font-medium">Айына</th>
              <th className="px-4 py-3 text-right font-medium">Қатысу</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, p, a }) => (
              <tr key={s.id} className="cursor-pointer border-b last:border-0 hover:bg-slate-50" style={{ borderColor: BRAND.line }} onClick={() => setOpenId(s.id)}>
                <td className="px-4 py-2.5">
                  <div className="font-semibold">{s.full_name}</div>
                  <div className="text-xs" style={{ color: BRAND.muted }}>{s.grade ? `${s.grade}-сынып` : ''}{s.status && s.status !== 'active' ? ` · ${STATUS[s.status].label}` : ''}</div>
                </td>
                <td className="px-4 py-2.5">{gName(s.group_id)}</td>
                <td className="px-4 py-2.5">
                  <div>{s.parent_name ?? '—'}</div>
                  <div className="text-xs tabular-nums" style={{ color: BRAND.muted }}>{s.parent_phone ?? s.phone ?? ''}</div>
                </td>
                <td className="px-4 py-2.5">
                  <Badge bg={p.bg} fg={p.fg}>{p.label}</Badge>
                  {p.sub && <div className="mt-0.5 text-xs" style={{ color: BRAND.muted }}>{p.sub}</div>}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{tg(s.payment_amount)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {a ? <b style={{ color: a.rate < 0.75 ? BRAND.red : BRAND.text }}>{Math.round(a.rate * 100)} %</b> : <span style={{ color: BRAND.muted }}>—</span>}
                </td>
                <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setPayId(s.id)} className="rounded-lg border px-2.5 py-1 text-xs font-semibold" style={{ borderColor: BRAND.line }}>Төлем</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty>{students.length ? 'Сүзгіге сай оқушы жоқ.' : 'Әзірге оқушы жоқ. «Оқушы қосу» батырмасын басыңыз.'}</Empty>}
      </div>

      {open && (
        <StudentDrawer
          s={open}
          data={data}
          onClose={() => setOpenId(null)}
          onEdit={() => setEdit(open)}
          onPay={() => setPayId(open.id)}
          reload={reload}
          flash={flash}
        />
      )}
      {edit && <StudentForm init={edit} data={data} onClose={() => setEdit(null)} onSaved={async (id) => { setEdit(null); await reload(); flash('Сақталды'); setOpenId(id) }} />}
      {payFor && <PaymentForm s={payFor} today={today} onClose={() => setPayId(null)} onSaved={async () => { setPayId(null); await reload(); flash('Төлем қабылданды') }} />}
      {importOpen && <ImportBt data={data} onClose={() => setImportOpen(false)} onDone={async (m) => { setImportOpen(false); await reload(); flash(m) }} />}
    </div>
  )
}

function StudentDrawer({
  s,
  data,
  onClose,
  onEdit,
  onPay,
  reload,
  flash,
}: {
  s: CStudent
  data: CrmData
  onClose: () => void
  onEdit: () => void
  onPay: () => void
  reload: () => Promise<void>
  flash: (m: string) => void
}) {
  const p = payInfo(s, data.today)
  const pays = data.payments.filter((x) => x.student_id === s.id)
  const from = shiftDays(data.today, -41)
  const days: string[] = []
  for (let d = from; d <= data.today; d = shiftDays(d, 1)) days.push(d)
  const att = new Map(data.attendance.filter((a) => a.student_id === s.id).map((a) => [a.date, a]))
  const a = attendanceRate(data.attendance, s.id, data.today)
  const wa = waLink(s.parent_phone || s.phone, `Сәлеметсіз бе! Beles education оқу орталығынан жазып отырмыз (${s.full_name}).`)
  const group = data.groups.find((g) => g.id === s.group_id)?.name
  const teacher = data.teachers.find((t) => t.id === s.teacher_id)?.name

  return (
    <Drawer title={s.full_name} sub={<>{group ?? 'Топсыз'}{s.grade ? ` · ${s.grade}-сынып` : ''} · <span style={{ color: STATUS[s.status ?? 'active'].color }}>{STATUS[s.status ?? 'active'].label}</span></>} onClose={onClose}>
      <div className="flex flex-wrap gap-2">
        <button onClick={onPay} className={btnDark} style={{ background: BRAND.ink }}>Төлем қабылдау</button>
        <button onClick={onEdit} className={btnLine} style={{ borderColor: BRAND.line }}>Өзгерту</button>
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={`${btnLine} flex items-center gap-1.5`} style={{ borderColor: BRAND.line, color: '#15803D' }}><MessageCircle size={15} />WhatsApp</a>}
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <Info k="Ата-анасы" v={s.parent_name} />
        <Info k="Ата-анасының телефоны" v={s.parent_phone} />
        <Info k="Оқушының телефоны" v={s.phone} />
        <Info k="Мұғалімі" v={teacher} />
        <Info k="Оқи бастады" v={s.start_date ? dmy(s.start_date) + ' ' + s.start_date.slice(0, 4) : null} />
        <Info k="Кабинет логині" v={s.username} />
        {s.comment && <div className="col-span-2"><dt className="text-xs" style={{ color: BRAND.muted }}>Ескерту</dt><dd className="mt-0.5 whitespace-pre-wrap">{s.comment}</dd></div>}
      </dl>

      <section className="mt-7">
        <h3 className="font-display text-sm font-semibold">Төлем</h3>
        <div className="mt-3 flex items-center justify-between rounded-xl p-4" style={{ background: p.bg }}>
          <div>
            <div className="text-sm font-semibold" style={{ color: p.fg }}>{p.label}</div>
            <div className="text-xs" style={{ color: p.fg }}>{p.sub || 'Мерзім белгіленбеген'}</div>
          </div>
          <div className="font-display text-xl font-semibold">{tg(s.payment_amount)}<span className="text-xs font-normal"> / ай</span></div>
        </div>
        <ul className="mt-3 divide-y text-sm" style={{ borderColor: BRAND.line }}>
          {pays.map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-3 py-2">
              <span>{dmy(x.paid_on)} {x.paid_on.slice(0, 4)}{x.note ? <span style={{ color: BRAND.muted }}> · {x.note}</span> : ''}</span>
              <span className="flex items-center gap-3">
                <b className="tabular-nums">{tg(x.amount)}</b>
                <button
                  onClick={async () => {
                    if (!confirm('Бұл төлем жазбасы өшсін бе? Оқушының келесі төлем күні өзгермейді.')) return
                    await crm({ action: 'delete-payment', id: x.id })
                    await reload()
                    flash('Төлем жазбасы өшірілді')
                  }}
                  className="text-xs"
                  style={{ color: BRAND.red }}
                >
                  өшіру
                </button>
              </span>
            </li>
          ))}
          {pays.length === 0 && <li className="py-2" style={{ color: BRAND.muted }}>Соңғы 12 айда төлем жоқ.</li>}
        </ul>
      </section>

      <section className="mt-7">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-sm font-semibold">Қатысу, 6 апта</h3>
          <span className="text-sm" style={{ color: BRAND.muted }}>{a ? `30 күнде ${Math.round(a.rate * 100)} %` : 'белгі жоқ'}</span>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс'].map((d) => <span key={d} className="text-center text-[10px]" style={{ color: BRAND.muted }}>{d}</span>)}
          {Array.from({ length: (new Date(`${days[0]}T00:00:00Z`).getUTCDay() + 6) % 7 }, (_, i) => <span key={`x${i}`} />)}
          {days.map((d) => {
            const r = att.get(d)
            const bg = !r ? '#EEF1F6' : r.excused ? '#FDE68A' : r.present ? '#22C55E' : BRAND.red
            return <span key={d} title={`${dmy(d)}: ${!r ? 'белгі жоқ' : r.excused ? 'себепті' : r.present ? 'келді' : 'келмеді'}`} className="h-6 rounded-md" style={{ background: bg }} />
          })}
        </div>
        <div className="mt-2 flex gap-4 text-xs" style={{ color: BRAND.muted }}>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-green-500 align-middle" />келді</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: BRAND.red }} />келмеді</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: '#FDE68A' }} />себепті</span>
        </div>
      </section>

      <button
        onClick={async () => {
          if (!confirm(`${s.full_name} CRM-нен толық өшірілсін бе? Төлем тарихы сақталады. Оқушы кетсе, «Өзгерту» арқылы «Кетті» күйін қойған дұрыс.`)) return
          await crm({ action: 'delete-student', id: s.id })
          onClose()
          await reload()
          flash('Оқушы өшірілді')
        }}
        className="mt-10 text-sm"
        style={{ color: BRAND.red }}
      >
        Оқушыны өшіру
      </button>
    </Drawer>
  )
}

function Info({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs" style={{ color: BRAND.muted }}>{k}</dt>
      <dd className="mt-0.5 font-medium">{v || '—'}</dd>
    </div>
  )
}

function StudentForm({ init, data, onClose, onSaved }: { init: Partial<CStudent>; data: CrmData; onClose: () => void; onSaved: (id: string) => void }) {
  const [f, setF] = useState<Partial<CStudent>>(init)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k: keyof CStudent) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })
  const style = { borderColor: BRAND.line }

  return (
    <Modal title={init.id ? 'Оқушыны өзгерту' : 'Жаңа оқушы'} onClose={onClose} wide>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setErr('')
          try {
            const j = await crm({ action: 'save-student', student: f })
            onSaved(j.id)
          } catch (er: any) {
            setErr(er.message)
            setBusy(false)
          }
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Field label="Аты-жөні *" className="sm:col-span-2"><input required value={f.full_name ?? ''} onChange={set('full_name')} className={inputCls} style={style} /></Field>
        <Field label="Топ">
          <select value={f.group_id ?? ''} onChange={set('group_id')} className={inputCls} style={style}>
            <option value="">Топсыз</option>
            {data.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </Field>
        <Field label="Сынып"><input type="number" min={0} max={12} value={f.grade ?? ''} onChange={set('grade')} className={inputCls} style={style} /></Field>
        <Field label="Ата-анасының аты"><input value={f.parent_name ?? ''} onChange={set('parent_name')} className={inputCls} style={style} /></Field>
        <Field label="Ата-анасының телефоны"><input type="tel" value={f.parent_phone ?? ''} onChange={set('parent_phone')} placeholder="+7 7__ ___ __ __" className={inputCls} style={style} /></Field>
        <Field label="Оқушының телефоны"><input type="tel" value={f.phone ?? ''} onChange={set('phone')} className={inputCls} style={style} /></Field>
        <Field label="Мұғалімі">
          <select value={f.teacher_id ?? ''} onChange={set('teacher_id')} className={inputCls} style={style}>
            <option value="">—</option>
            {data.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Айлық төлем, ₸"><input type="number" min={0} step={500} value={f.payment_amount ?? ''} onChange={set('payment_amount')} className={inputCls} style={style} /></Field>
        <Field label="Келесі төлем күні"><input type="date" value={f.payment_deadline ?? ''} onChange={set('payment_deadline')} className={inputCls} style={style} /></Field>
        <Field label="Күйі">
          <select value={f.status ?? 'active'} onChange={set('status')} className={inputCls} style={style}>
            <option value="active">Оқып жүр</option>
            <option value="paused">Үзілісте</option>
            <option value="left">Кетті</option>
          </select>
        </Field>
        <Field label="Оқи бастаған күн"><input type="date" value={f.start_date ?? ''} onChange={set('start_date')} className={inputCls} style={style} /></Field>
        <Field label="Ескерту" className="sm:col-span-2"><textarea rows={3} value={f.comment ?? ''} onChange={set('comment')} className={inputCls} style={style} /></Field>
        {err && <p className="rounded-lg p-2 text-sm sm:col-span-2" style={{ background: '#FEE2E2', color: '#B91C1C' }}>{err}</p>}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className={btnLine} style={style}>Болдырмау</button>
          <button disabled={busy} className={btnDark} style={{ background: BRAND.blue }}>Сақтау</button>
        </div>
      </form>
    </Modal>
  )
}

function PaymentForm({ s, today, onClose, onSaved }: { s: CStudent; today: string; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(String(s.payment_amount ?? ''))
  const [paidOn, setPaidOn] = useState(today)
  const [next, setNext] = useState(nextDeadlineAfter(s.payment_deadline, today))
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const style = { borderColor: BRAND.line }
  return (
    <Modal title={`Төлем қабылдау: ${s.full_name}`} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          try {
            await api(`/api/students/${s.id}/payments`, 'POST', { amount, paidOn, nextDeadline: next, note })
            onSaved()
          } catch (er: any) {
            setErr(er.message)
            setBusy(false)
          }
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Field label="Сома, ₸"><input type="number" min={0} step={500} required value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} style={style} autoFocus /></Field>
        <Field label="Төленген күн">
          <input type="date" value={paidOn} onChange={(e) => { setPaidOn(e.target.value); setNext(nextDeadlineAfter(s.payment_deadline, e.target.value)) }} className={inputCls} style={style} />
        </Field>
        <Field label="Келесі төлем күні" className="sm:col-span-2"><input type="date" value={next} onChange={(e) => setNext(e.target.value)} className={inputCls} style={style} /></Field>
        <Field label="Ескерту (міндетті емес)" className="sm:col-span-2"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Мысалы: Kaspi, қолма-қол" className={inputCls} style={style} /></Field>
        {err && <p className="rounded-lg p-2 text-sm sm:col-span-2" style={{ background: '#FEE2E2', color: '#B91C1C' }}>{err}</p>}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className={btnLine} style={style}>Болдырмау</button>
          <button disabled={busy} className={btnDark} style={{ background: BRAND.blue }}>Төлемді сақтау</button>
        </div>
      </form>
    </Modal>
  )
}

function ImportBt({ data, onClose, onDone }: { data: CrmData; onClose: () => void; onDone: (m: string) => void }) {
  const [g, setG] = useState(data.btGroups[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  return (
    <Modal title="Білім тексеру тобынан көшіру" onClose={onClose}>
      <p className="text-sm" style={{ color: BRAND.muted }}>
        Таңдалған топтың оқушылары CRM-ге қосылады және аттас оқу тобына жазылады. CRM-де аты бар оқушылар қайталанбайды.
      </p>
      <select value={g} onChange={(e) => setG(e.target.value)} className={`${inputCls} mt-4`} style={{ borderColor: BRAND.line }}>
        {data.btGroups.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
      </select>
      {err && <p className="mt-3 rounded-lg p-2 text-sm" style={{ background: '#FEE2E2', color: '#B91C1C' }}>{err}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className={btnLine} style={{ borderColor: BRAND.line }}>Болдырмау</button>
        <button
          disabled={busy || !g}
          onClick={async () => {
            setBusy(true)
            try {
              const j = await crm({ action: 'import-bt', btGroup: g })
              onDone(`${j.added} оқушы қосылды${j.skipped ? `, ${j.skipped} бұрыннан бар` : ''}`)
            } catch (e: any) {
              setErr(e.message)
              setBusy(false)
            }
          }}
          className={btnDark}
          style={{ background: BRAND.ink }}
        >
          Көшіру
        </button>
      </div>
    </Modal>
  )
}
