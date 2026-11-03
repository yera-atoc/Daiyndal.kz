'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, CheckCircle2, CreditCard, Pencil, Send } from 'lucide-react'
import { BRAND, inputCls, selCls, btnDark, btnLine } from './core'
import { paymentMessage, resultMessage, waUrl } from '@/lib/parentMessages'
import type { ParentRow } from '@/app/api/admin/parents/route'

type Kind = 'pay' | 'result'
const SENT_KEY = 'beles-parents-sent-v1'

const PAY_BADGE: Record<string, { label: (d: number | null) => string; bg: string; fg: string }> = {
  overdue: { label: (d) => `${Math.abs(d ?? 0)} күн кешікті`, bg: '#FEE2E2', fg: '#B91C1C' },
  today: { label: () => 'Бүгін төлейді', bg: '#FEF3C7', fg: '#B45309' },
  soon: { label: (d) => `${d} күннен кейін`, bg: '#FEF3C7', fg: '#B45309' },
  ok: { label: (d) => `${d} күн қалды`, bg: '#DCFCE7', fg: '#15803D' },
  none: { label: () => 'Мерзімі жоқ', bg: '#F1F3F7', fg: '#687085' },
}

export default function Parents({ flash }: { flash: (m: string) => void }) {
  const [rows, setRows] = useState<ParentRow[] | null>(null)
  const [error, setError] = useState('')
  const [group, setGroup] = useState('')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'nophone' | 'due' | 'result'>('all')
  const [edit, setEdit] = useState<string | null>(null)
  const [sent, setSent] = useState<Record<string, string>>({})
  const [queue, setQueue] = useState<{ kind: Kind; ids: string[]; pos: number } | null>(null)
  const site = typeof window !== 'undefined' ? window.location.origin : ''
  const month = new Date().toISOString().slice(0, 7)

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/parents', { cache: 'no-store' })
    const j = await r.json()
    if (!r.ok) return setError(j.error ?? 'Қате')
    setRows(j.rows)
  }, [])
  useEffect(() => {
    load()
    try {
      setSent(JSON.parse(localStorage.getItem(SENT_KEY) ?? '{}'))
    } catch {}
  }, [load])

  const markSent = (id: string, kind: Kind) => {
    const next = { ...sent, [`${id}:${kind}`]: month }
    setSent(next)
    try {
      localStorage.setItem(SENT_KEY, JSON.stringify(next))
    } catch {}
  }
  const wasSent = (id: string, kind: Kind) => sent[`${id}:${kind}`] === month

  const groups = useMemo(() => Array.from(new Set((rows ?? []).map((r) => r.group).filter(Boolean))) as string[], [rows])
  const list = useMemo(
    () =>
      (rows ?? []).filter((r) => {
        if (group && r.group !== group) return false
        if (q && !`${r.name} ${r.parentName ?? ''} ${r.phone ?? ''}`.toLowerCase().includes(q.toLowerCase())) return false
        if (filter === 'nophone') return !waUrl(r.phone, '')
        if (filter === 'due') return ['overdue', 'today', 'soon'].includes(r.payment.kind)
        if (filter === 'result') return !!r.result
        return true
      }),
    [rows, group, q, filter],
  )

  const message = (r: ParentRow, kind: Kind) => (kind === 'pay' ? paymentMessage(r.name, r.parentName, r.payment) : r.result ? resultMessage(r.name, r.parentName, r.result, site) : '')
  const open = (r: ParentRow, kind: Kind) => {
    const url = waUrl(r.phone, message(r, kind))
    if (!url) return flash('WhatsApp нөмірі жоқ')
    window.open(url, '_blank', 'noopener')
    markSent(r.id, kind)
  }

  const startQueue = (kind: Kind) => {
    const ids = list.filter((r) => waUrl(r.phone, '') && (kind === 'pay' ? ['overdue', 'today', 'soon'].includes(r.payment.kind) : !!r.result)).map((r) => r.id)
    if (!ids.length) return flash(kind === 'pay' ? 'Төлем мерзімі жақындаған, нөмірі бар оқушы жоқ' : 'Нәтижесі бар, нөмірі бар оқушы жоқ')
    setQueue({ kind, ids, pos: 0 })
  }

  if (error) return <p className="text-sm" style={{ color: BRAND.red }}>{error}</p>
  if (!rows) return <p className="text-sm" style={{ color: BRAND.muted }}>Жүктелуде…</p>

  const noPhone = rows.filter((r) => !waUrl(r.phone, '')).length
  const current = queue ? rows.find((r) => r.id === queue.ids[queue.pos]) : null

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4 text-sm" style={{ borderColor: BRAND.line }}>
        <p>
          Батырманы басқанда WhatsApp дайын хабарламамен ашылады — тек «Жіберу» басасыз. {noPhone > 0 && <b style={{ color: BRAND.red }}>{noPhone} оқушының ата-анасының нөмірі жоқ.</b>}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => startQueue('pay')} className={btnDark} style={{ background: BRAND.ink }}>
            <CreditCard size={15} className="mr-1.5 inline" /> Төлем туралы — кезекпен
          </button>
          <button onClick={() => startQueue('result')} className={btnDark} style={{ background: BRAND.blue }}>
            <BarChart3 size={15} className="mr-1.5 inline" /> Тест нәтижесі — кезекпен
          </button>
        </div>
      </div>

      {queue && current && (
        <div className="rounded-2xl border-2 bg-white p-4" style={{ borderColor: BRAND.blue }}>
          <div className="flex items-center justify-between text-xs" style={{ color: BRAND.muted }}>
            <span>{queue.kind === 'pay' ? 'Төлем туралы' : 'Тест нәтижесі'} · {queue.pos + 1} / {queue.ids.length}</span>
            <button onClick={() => setQueue(null)}>Тоқтату</button>
          </div>
          <div className="mt-2 font-semibold">{current.name} <span className="font-normal" style={{ color: BRAND.muted }}>· {current.parentName ?? 'ата-анасы'} · +{current.phone}</span></div>
          <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-sans text-sm">{message(current, queue.kind)}</pre>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                open(current, queue.kind)
                setQueue(queue.pos + 1 < queue.ids.length ? { ...queue, pos: queue.pos + 1 } : null)
              }}
              className={btnDark}
              style={{ background: '#16A34A' }}
            >
              <Send size={15} className="mr-1.5 inline" /> WhatsApp-та ашу → келесі
            </button>
            <button onClick={() => setQueue(queue.pos + 1 < queue.ids.length ? { ...queue, pos: queue.pos + 1 } : null)} className={btnLine} style={{ borderColor: BRAND.line }}>
              Өткізіп жіберу
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Іздеу: аты, ата-анасы, нөмір" className={`${inputCls} max-w-xs`} style={{ borderColor: BRAND.line }} />
        <select value={group} onChange={(e) => setGroup(e.target.value)} className={selCls} style={{ borderColor: BRAND.line }}>
          <option value="">Барлық топтар</option>
          {groups.map((g) => <option key={g}>{g}</option>)}
        </select>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className={selCls} style={{ borderColor: BRAND.line }}>
          <option value="all">Барлығы</option>
          <option value="nophone">Нөмірі жоқтар</option>
          <option value="due">Төлемі жақын / кешіккен</option>
          <option value="result">Нәтижесі барлар</option>
        </select>
      </div>

      <ul className="divide-y rounded-2xl border bg-white" style={{ borderColor: BRAND.line }}>
        {list.length === 0 && <li className="p-4 text-sm" style={{ color: BRAND.muted }}>Оқушы табылмады.</li>}
        {list.map((r) => {
          const pb = PAY_BADGE[r.payment.kind] ?? PAY_BADGE.none
          const hasPhone = !!waUrl(r.phone, '')
          return (
            <li key={r.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                  <div className="truncate text-sm font-semibold">{r.name}</div>
                  <div className="truncate text-xs" style={{ color: BRAND.muted }}>
                    {r.group ?? 'топсыз'} · {r.parentName ?? 'ата-анасы'} · {hasPhone ? `+${r.phone!.replace(/\D/g, '')}` : <span style={{ color: BRAND.red }}>нөмір жоқ</span>}
                    <button onClick={() => setEdit(edit === r.id ? null : r.id)} aria-label="Нөмірді өзгерту" className="ml-1.5 align-middle"><Pencil size={12} /></button>
                  </div>
                </div>
                <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={{ background: pb.bg, color: pb.fg }}>{pb.label(r.payment.days)}</span>
                {r.result && <span className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">{r.result.score}/{r.result.max}{r.result.place ? ` · ${r.result.place}-орын` : ''}</span>}
                <button disabled={!hasPhone} onClick={() => open(r, 'pay')} className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40" style={{ borderColor: BRAND.line }}>
                  {wasSent(r.id, 'pay') ? <CheckCircle2 size={14} className="text-emerald-600" /> : <CreditCard size={14} />} Төлем
                </button>
                <button disabled={!hasPhone || !r.result} onClick={() => open(r, 'result')} className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40" style={{ borderColor: BRAND.line }}>
                  {wasSent(r.id, 'result') ? <CheckCircle2 size={14} className="text-emerald-600" /> : <BarChart3 size={14} />} Нәтиже
                </button>
              </div>
              {edit === r.id && <PhoneEdit row={r} onSaved={async () => { setEdit(null); flash('Сақталды'); await load() }} />}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function PhoneEdit({ row, onSaved }: { row: ParentRow; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(row.parentName ?? '')
  const [phone, setPhone] = useState(row.phone ?? '')
  const [err, setErr] = useState('')
  const save = async () => {
    const r = await fetch('/api/admin/parents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, parentName: name, phone }) })
    const j = await r.json()
    if (!r.ok) return setErr(j.error ?? 'Қате')
    await onSaved()
  }
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ата-анасының аты" className={`${inputCls} max-w-[200px]`} style={{ borderColor: BRAND.line }} />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="8 7XX XXX XX XX" className={`${inputCls} max-w-[180px]`} style={{ borderColor: BRAND.line }} />
      <button onClick={save} className={btnDark} style={{ background: BRAND.ink }}>Сақтау</button>
      {err && <span className="text-xs" style={{ color: BRAND.red }}>{err}</span>}
    </div>
  )
}
