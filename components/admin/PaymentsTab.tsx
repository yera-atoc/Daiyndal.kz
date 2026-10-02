'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  money,
  nextDeadlineAfter,
  paymentStatus,
  statusLabel,
  todayLocalISO,
  waPhone,
  type PaymentKind,
} from '@/lib/payments'

export type CrmStudent = {
  id: string
  full_name: string
  grade: number | null
  teacher_id: string | null
  group_id?: string | null
  phone?: string | null
  payment_date?: string | null
  payment_deadline?: string | null
  payment_amount?: number | null
  comment?: string | null
}

type Group = { id: string; name: string }
type PaymentRow = { id: string; amount: number | null; paid_on: string; period_end: string | null; note: string | null }

const BADGE: Record<PaymentKind, string> = {
  overdue: 'bg-red-50 text-red-700 border-red-200',
  today: 'bg-orange-50 text-orange-700 border-orange-200',
  soon: 'bg-amber-50 text-amber-700 border-amber-200',
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  none: 'bg-zinc-50 text-zinc-500 border-zinc-200',
}

/** How many students need attention (overdue, due today, or due within 3 days). */
export function countDue(students: CrmStudent[]) {
  const today = todayLocalISO()
  let overdue = 0
  let soon = 0
  for (const s of students) {
    const k = paymentStatus(s.payment_deadline, today).kind
    if (k === 'overdue') overdue++
    else if (k === 'today' || k === 'soon') soon++
  }
  return { overdue, soon, total: overdue + soon }
}

/** Banner shown on every admin tab. */
export function PaymentAlertBanner({
  students,
  onOpen,
}: {
  students: CrmStudent[]
  onOpen: () => void
}) {
  const { overdue, soon, total } = countDue(students)
  if (total === 0) return null
  return (
    <button
      onClick={onOpen}
      className={`mb-4 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-xs shadow-sm transition hover:shadow ${
        overdue > 0 ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800'
      }`}
    >
      <span className="font-medium">
        💳 Төлем еске салу:
        {overdue > 0 && ` ${overdue} оқушының төлемі кешікті`}
        {overdue > 0 && soon > 0 && ' ·'}
        {soon > 0 && ` ${soon} оқушы бүгін / 3 күн ішінде төлейді`}
      </span>
      <span className="underline">Ашу →</span>
    </button>
  )
}

type Filter = 'all' | 'due' | 'overdue' | 'none'

export default function PaymentsTab({
  students,
  groups,
  reload,
}: {
  students: CrmStudent[]
  groups: Group[]
  reload: () => Promise<void>
}) {
  const today = todayLocalISO()
  const [filter, setFilter] = useState<Filter>('due')
  const [query, setQuery] = useState('')
  const [payingId, setPayingId] = useState<string | null>(null)
  const [historyId, setHistoryId] = useState<string | null>(null)
  const [monthTotal, setMonthTotal] = useState<number | null>(null)

  // Money received this calendar month (from the payments history table).
  useEffect(() => {
    const from = today.slice(0, 8) + '01'
    fetch(`/api/payments?from=${from}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { amount: number | null }[]) =>
        setMonthTotal(rows.reduce((sum, p) => sum + (p.amount ?? 0), 0))
      )
      .catch(() => setMonthTotal(null))
  }, [students, today])

  const rows = useMemo(() => {
    return students
      .map((s) => ({ s, st: paymentStatus(s.payment_deadline, today) }))
      .filter(({ s, st }) => {
        if (query && !s.full_name.toLowerCase().includes(query.toLowerCase())) return false
        if (filter === 'due') return st.kind === 'overdue' || st.kind === 'today' || st.kind === 'soon'
        if (filter === 'overdue') return st.kind === 'overdue'
        if (filter === 'none') return st.kind === 'none'
        return true
      })
      .sort((a, b) => {
        // no-date students last; otherwise earliest deadline first
        if (a.st.days === null && b.st.days === null) return a.s.full_name.localeCompare(b.s.full_name)
        if (a.st.days === null) return 1
        if (b.st.days === null) return -1
        return a.st.days - b.st.days
      })
  }, [students, filter, query, today])

  const counts = useMemo(() => countDue(students), [students])
  const expected = useMemo(
    () =>
      students
        .filter((s) => {
          const k = paymentStatus(s.payment_deadline, today).kind
          return k === 'overdue' || k === 'today' || k === 'soon'
        })
        .reduce((sum, s) => sum + (s.payment_amount ?? 0), 0),
    [students, today]
  )

  return (
    <section className="mt-8 space-y-6">
      {/* summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Кешіккен" value={String(counts.overdue)} tone="text-red-600" />
        <Card label="Бүгін / 3 күнде" value={String(counts.soon)} tone="text-amber-600" />
        <Card label="Күтілетін сома" value={money(expected)} />
        <Card label="Осы айда түскен" value={monthTotal == null ? '—' : money(monthTotal)} tone="text-emerald-600" />
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        {(
          [
            ['due', 'Төлейтіндер'],
            ['overdue', 'Кешіккендер'],
            ['all', 'Барлығы'],
            ['none', 'Күні жоқ'],
          ] as [Filter, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === k ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {label}
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Оқушыны іздеу…"
          className="ml-auto min-w-[160px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs focus:outline-none"
        />
        <a
          href="/api/crm/export?type=students"
          className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          ⬇ Оқушылар CSV
        </a>
        <a
          href="/api/crm/export?type=payments"
          className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          ⬇ Төлемдер CSV
        </a>
      </div>

      {/* list */}
      <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {rows.map(({ s, st }) => {
          const wa = waPhone(s.phone)
          const group = groups.find((g) => g.id === s.group_id)?.name
          const msg = `Сәлем! ${s.full_name} үшін оқу ақысын төлеу мерзімі: ${s.payment_deadline}${
            s.payment_amount != null ? ` (${money(s.payment_amount)})` : ''
          }. Төлем туралы еске салып қоямыз 🙏`
          return (
            <div key={s.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-[180px]">
                  <p className="text-xs font-semibold text-zinc-900">{s.full_name}</p>
                  <p className="mt-0.5 text-[10px] text-zinc-500">
                    {[group, s.grade ? `${s.grade}-сынып` : null, s.phone].filter(Boolean).join(' · ') || '—'}
                  </p>
                  {s.comment && <p className="mt-1 text-[10px] italic text-zinc-600">💬 {s.comment}</p>}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${BADGE[st.kind]}`}>
                    {statusLabel(st)}
                  </span>
                  <div className="text-right text-[10px] text-zinc-500">
                    <p>Келесі төлем: <b className="text-zinc-800">{s.payment_deadline ?? '—'}</b></p>
                    <p>Сома: <b className="text-zinc-800">{money(s.payment_amount)}</b></p>
                  </div>
                  <button
                    onClick={() => setPayingId(payingId === s.id ? null : s.id)}
                    className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                  >
                    {payingId === s.id ? 'Жабу' : '✓ Төледі'}
                  </button>
                  {wa && (
                    <a
                      href={`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                    >
                      WhatsApp
                    </a>
                  )}
                  <button
                    onClick={() => setHistoryId(historyId === s.id ? null : s.id)}
                    className="text-xs text-zinc-500 hover:text-zinc-900"
                  >
                    {historyId === s.id ? 'Тарихты жабу' : 'Тарих'}
                  </button>
                </div>
              </div>

              {payingId === s.id && (
                <PayForm
                  student={s}
                  today={today}
                  onDone={async () => {
                    setPayingId(null)
                    await reload()
                  }}
                />
              )}
              {historyId === s.id && <History studentId={s.id} />}
            </div>
          )
        })}
        {rows.length === 0 && (
          <p className="p-6 text-center text-xs text-zinc-400">
            {filter === 'due' ? 'Қазір төлейтін оқушы жоқ 🎉' : 'Тізім бос'}
          </p>
        )}
      </div>
    </section>
  )
}

function Card({ label, value, tone = 'text-zinc-900' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone}`}>{value}</p>
    </div>
  )
}

function PayForm({
  student,
  today,
  onDone,
}: {
  student: CrmStudent
  today: string
  onDone: () => Promise<void>
}) {
  const [amount, setAmount] = useState(student.payment_amount != null ? String(student.payment_amount) : '')
  const [paidOn, setPaidOn] = useState(today)
  const [nextDeadline, setNextDeadline] = useState(nextDeadlineAfter(student.payment_deadline ?? null, today))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/students/${student.id}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amount === '' ? undefined : Number(amount), paidOn, nextDeadline, note }),
    })
    setSaving(false)
    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? 'Қате орын алды')
      return
    }
    await onDone()
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-3 border-t border-zinc-100 pt-3">
      <Field label="Сома (₸)">
        <input
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-28 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs"
        />
      </Field>
      <Field label="Төленген күні">
        <input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs" />
      </Field>
      <Field label="Келесі төлем күні">
        <input type="date" value={nextDeadline} onChange={(e) => setNextDeadline(e.target.value)} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs" />
      </Field>
      <Field label="Ескерту">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Kaspi, қолма-қол…" className="min-w-[140px] rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs" />
      </Field>
      <button type="submit" disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
        Сақтау
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] text-zinc-500">{label}</span>
      {children}
    </label>
  )
}

function History({ studentId }: { studentId: string }) {
  const [rows, setRows] = useState<PaymentRow[] | null>(null)

  useEffect(() => {
    fetch(`/api/students/${studentId}/payments`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setRows)
      .catch(() => setRows([]))
  }, [studentId])

  if (rows === null) return <p className="mt-3 text-[10px] text-zinc-400">Жүктелуде…</p>
  if (rows.length === 0) return <p className="mt-3 text-[10px] text-zinc-400">Төлем тарихы әзірге бос</p>

  return (
    <table className="mt-3 w-full text-left text-[11px]">
      <thead>
        <tr className="text-[10px] uppercase tracking-wide text-zinc-400">
          <th className="py-1 font-semibold">Күні</th>
          <th className="py-1 font-semibold">Сома</th>
          <th className="py-1 font-semibold">Келесі төлем</th>
          <th className="py-1 font-semibold">Ескерту</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100 text-zinc-700">
        {rows.map((p) => (
          <tr key={p.id}>
            <td className="py-1">{p.paid_on}</td>
            <td className="py-1">{money(p.amount)}</td>
            <td className="py-1">{p.period_end ?? '—'}</td>
            <td className="py-1">{p.note ?? ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
