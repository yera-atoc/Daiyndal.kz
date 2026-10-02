// Shared (client + server) helpers for the payment CRM. No server-only imports.

export type PaymentKind = 'none' | 'overdue' | 'today' | 'soon' | 'ok'

export type PaymentStatus = { kind: PaymentKind; days: number | null }

/** Local calendar date as YYYY-MM-DD (NOT toISOString, which is UTC and can be off by a day). */
export function todayLocalISO(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Today in Almaty (UTC+5) — for server code (cron), where the server runs in UTC. */
export function todayAlmatyISO(): string {
  return new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 10)
}

function parse(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Whole days from `from` to `to` (positive = `to` is later). */
export function diffDays(from: string, to: string): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / 86400000)
}

/** Adds calendar months, clamping to the end of shorter months (31 Jan + 1 mo = 28/29 Feb). */
export function addMonthsISO(iso: string, months: number): string {
  const d = parse(iso)
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, lastDay))
  return fmt(d)
}

/** Next deadline after a payment: roll forward one month from the old deadline (or from the payment date). */
export function nextDeadlineAfter(oldDeadline: string | null, paidOn: string): string {
  const base = oldDeadline ?? paidOn
  let next = addMonthsISO(base, 1)
  // A very late payment shouldn't leave the student "overdue" right after paying.
  if (next <= paidOn) next = addMonthsISO(paidOn, 1)
  return next
}

export const SOON_DAYS = 3

export function paymentStatus(deadline: string | null | undefined, today: string): PaymentStatus {
  if (!deadline) return { kind: 'none', days: null }
  const days = diffDays(today, deadline)
  if (days < 0) return { kind: 'overdue', days }
  if (days === 0) return { kind: 'today', days }
  if (days <= SOON_DAYS) return { kind: 'soon', days }
  return { kind: 'ok', days }
}

export function statusLabel(s: PaymentStatus): string {
  switch (s.kind) {
    case 'none':
      return 'Күні қойылмаған'
    case 'overdue':
      return `${Math.abs(s.days!)} күн кешікті`
    case 'today':
      return 'Бүгін төлейді'
    case 'soon':
      return `${s.days} күннен кейін`
    default:
      return `${s.days} күн қалды`
  }
}

/** Digits-only phone for wa.me links (KZ numbers: 8707… / 707… / +7707… -> 7707…). */
export function waPhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  let d = raw.replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('8')) d = '7' + d.slice(1)
  if (d.length === 10) d = '7' + d
  return d.length >= 11 ? d : null
}

export function money(n: number | null | undefined): string {
  return n == null ? '—' : `${n.toLocaleString('ru-RU')} ₸`
}

export const ISO_RE = /^\d{4}-\d{2}-\d{2}$/
