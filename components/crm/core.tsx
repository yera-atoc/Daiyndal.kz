'use client'

import { useEffect } from 'react'
import { paymentStatus, type PaymentKind } from '@/lib/payments'
import { BRAND } from '@/components/bilim/admin/shared'

export { BRAND }

export type CStudent = {
  id: string
  full_name: string
  grade: number | null
  teacher_id: string | null
  group_id: string | null
  phone: string | null
  parent_name: string | null
  parent_phone: string | null
  status: 'active' | 'paused' | 'left' | null
  start_date: string | null
  payment_date: string | null
  payment_deadline: string | null
  payment_amount: number | null
  comment: string | null
  username: string | null
  created_at: string
  school?: string | null
  address?: string | null
  bt_student_id?: string | null
}
export type CGroup = { id: string; name: string; bt_group_id?: string | null; monthly_fee?: number | null }
export type CTeacher = { id: string; name: string; subject: string | null; username: string | null; is_admin?: boolean }
export type CPayment = { id: string; student_id: string | null; student_name: string; amount: number | null; paid_on: string; period_end: string | null; note: string | null }
export type CAttendance = { student_id: string; date: string; present: boolean; excused: boolean | null }
export type CSlot = { id: string; teacher_id: string; group_id: string | null; day_of_week: number; start_time: string; end_time: string; title: string | null; note: string | null; room: string | null }

export type CrmData = {
  today: string
  students: CStudent[]
  groups: CGroup[]
  teachers: CTeacher[]
  payments: CPayment[]
  attendance: CAttendance[]
  schedule: CSlot[]
  btGroups: { id: string; name: string }[]
  missing: string[]
  me?: { kind: 'owner' | 'teacher'; name: string }
  error?: string
}

export async function crm<T = any>(body: unknown): Promise<T> {
  const r = await fetch('/api/crm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Қате')
  return j
}

export async function api<T = any>(url: string, method: string, body?: unknown): Promise<T> {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Қате')
  return j
}

export const DAYS = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс']
export const DAYS_FULL = ['Дүйсенбі', 'Сейсенбі', 'Сәрсенбі', 'Бейсенбі', 'Жұма', 'Сенбі', 'Жексенбі']
const MONTHS_GEN = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан']
const MONTHS = ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым', 'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан']

export const tg = (n: number | null | undefined) => (n == null ? '—' : `${n.toLocaleString('ru-RU')} ₸`)
export const dmy = (iso: string | null | undefined) => (iso ? `${Number(iso.slice(8, 10))} ${MONTHS_GEN[Number(iso.slice(5, 7)) - 1]}` : '—')
export const monthTitle = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`
export const hhmm = (t: string) => t.slice(0, 5)
/** ISO күн → аптаның күні 1..7 (дүйсенбі = 1) */
export const weekday = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`).getUTCDay()
  return d === 0 ? 7 : d
}
export function shiftDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const PAY: Record<PaymentKind, { label: string; bg: string; fg: string }> = {
  overdue: { label: 'Мерзімі өтті', bg: '#FEE2E2', fg: '#B91C1C' },
  today: { label: 'Бүгін', bg: '#FEF3C7', fg: '#B45309' },
  soon: { label: 'Жақында', bg: '#FEF3C7', fg: '#B45309' },
  ok: { label: 'Төленген', bg: '#DCFCE7', fg: '#15803D' },
  none: { label: 'Белгіленбеген', bg: '#EEF1F6', fg: '#6B7385' },
}

export function payInfo(s: CStudent, today: string) {
  const st = paymentStatus(s.payment_deadline, today)
  const days = st.days
  const sub =
    st.kind === 'overdue' ? `${Math.abs(days!)} күн кешікті` : st.kind === 'today' ? 'бүгін төлейді' : st.kind === 'soon' ? `${days} күннен кейін` : st.kind === 'ok' ? `${dmy(s.payment_deadline)} дейін` : ''
  return { ...st, ...PAY[st.kind], sub }
}

export const STATUS: Record<string, { label: string; color: string }> = {
  active: { label: 'Оқып жүр', color: '#15803D' },
  paused: { label: 'Үзілісте', color: '#B45309' },
  left: { label: 'Кетті', color: '#6B7385' },
}

/** WhatsApp сілтемесі: +7 7xx … нөмірін wa.me форматына */
export function waLink(phone: string | null | undefined, text: string) {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (digits.length < 10) return null
  const n = digits.length === 10 ? `7${digits}` : digits.startsWith('8') && digits.length === 11 ? `7${digits.slice(1)}` : digits
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`
}

export function Badge({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  return <span className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: bg, color: fg }}>{children}</span>
}

export function Panel({ title, note, action, children, className = '' }: { title: string; note?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border bg-white p-5 ${className}`} style={{ borderColor: BRAND.line }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-[15px] font-semibold tracking-tight">{title}</h2>
          {note && <p className="mt-0.5 text-xs" style={{ color: BRAND.muted }}>{note}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-2xl border bg-white px-5 py-4" style={{ borderColor: BRAND.line }}>
      <div className="text-[13px]" style={{ color: BRAND.muted }}>{label}</div>
      <div className="font-display mt-1.5 text-[26px] font-semibold leading-none tracking-tight" style={{ color: tone ?? BRAND.text }}>{value}</div>
      {sub && <div className="mt-2 text-[13px]" style={{ color: BRAND.muted }}>{sub}</div>}
    </div>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-8 text-center text-sm" style={{ color: BRAND.muted }}>{children}</div>
}

export const inputCls = 'w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[#2B6BF3] focus:ring-2 focus:ring-[#2B6BF3]/15'
export const selCls = 'rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[#2B6BF3] focus:ring-2 focus:ring-[#2B6BF3]/15'
export const btnDark = 'rounded-lg px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-40'
export const btnLine = 'rounded-lg border bg-white px-3.5 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40'

export function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium" style={{ color: BRAND.muted }}>{label}</span>
      {children}
    </label>
  )
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-label={title} className={`mt-12 w-full rounded-2xl bg-white p-6 shadow-2xl ${wide ? 'max-w-2xl' : 'max-w-lg'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
          <button onClick={onClose} aria-label="Жабу" className="text-2xl leading-none" style={{ color: BRAND.muted }}>×</button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  )
}

export function Drawer({ title, sub, onClose, children }: { title: string; sub?: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()} aria-label={title}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-white px-6 py-5" style={{ borderColor: BRAND.line }}>
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
            {sub && <div className="mt-1 text-sm" style={{ color: BRAND.muted }}>{sub}</div>}
          </div>
          <button onClick={onClose} aria-label="Жабу" className="text-2xl leading-none" style={{ color: BRAND.muted }}>×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </aside>
    </div>
  )
}

/** Соңғы 30 күндегі қатысу пайызы (себепті сабақтар есептелмейді) */
export function attendanceRate(att: CAttendance[], studentId: string, today: string) {
  const from = shiftDays(today, -30)
  const rows = att.filter((a) => a.student_id === studentId && a.date >= from && a.date <= today && !a.excused)
  if (!rows.length) return null
  return { rate: rows.filter((a) => a.present).length / rows.length, n: rows.length }
}
