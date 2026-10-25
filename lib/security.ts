// Қауіпсіздік көмекшілері: кіру әрекеттерін шектеу, аттарды жасыру, журнал.
// Server-only (service role клиентін қолданады).
import { supabaseAdmin } from './supabaseAdmin'

// ── IP ────────────────────────────────────────────────────────────────

export function clientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  return (xff?.split(',')[0] || headers.get('x-real-ip') || 'unknown').trim().slice(0, 64)
}

// ── Кіру әрекеттерін шектеу ───────────────────────────────────────────
// ip:<ip>          – барлық кіру беттері бойынша ортақ: 15 минутта 40 қате → 15 минут бұғат
//                    (орталықтың Wi-Fi-ында бір IP-ден көп оқушы кіреді, сондықтан шек кеңірек;
//                     сонда да кездейсоқ PIN табу ~60 сағатқа созылады, әр оқушыға жеке 5 қате шегі бар)
// басқа кілттер    – нақты аккаунт (мұғалім логині, әкімші): 15 минутта 5 қате → 15 минут бұғат

export type ThrottleRow = { key: string; fails: number; first_at: string; locked_until: string | null }

export const RULES = {
  ip: { max: 40, windowMs: 15 * 60_000, lockMs: 15 * 60_000 },
  account: { max: 5, windowMs: 15 * 60_000, lockMs: 15 * 60_000 },
}
const ruleFor = (key: string) => (key.startsWith('ip:') ? RULES.ip : RULES.account)

/** Таза функция: бір сәтсіз әрекеттен кейінгі жаңа күй (тесттерде тексеріледі). */
export function nextFail(prev: ThrottleRow | undefined, key: string, now = Date.now()): ThrottleRow {
  const r = ruleFor(key)
  const fresh = !prev || now - new Date(prev.first_at).getTime() > r.windowMs
  const fails = (fresh ? 0 : prev!.fails) + 1
  const first_at = fresh ? new Date(now).toISOString() : prev!.first_at
  if (fails >= r.max) return { key, fails: 0, first_at: new Date(now).toISOString(), locked_until: new Date(now + r.lockMs).toISOString() }
  return { key, fails, first_at, locked_until: null }
}

export function lockedFor(rows: ThrottleRow[], now = Date.now()): number {
  const until = Math.max(0, ...rows.map((r) => (r.locked_until ? new Date(r.locked_until).getTime() : 0)))
  return until > now ? until - now : 0
}

async function readRows(keys: string[]): Promise<ThrottleRow[] | null> {
  const { data, error } = await supabaseAdmin.from('auth_throttle').select('key, fails, first_at, locked_until').in('key', keys)
  return error ? null : (data as ThrottleRow[]) // кесте әлі жоқ болса – шектемейміз, сайт жұмыс істей береді
}

/** Бұғатталған болса – қанша минут күту керегін қайтарады, әйтпесе 0. */
export async function throttleCheck(keys: string[]): Promise<number> {
  const rows = await readRows(keys)
  return rows ? Math.ceil(lockedFor(rows) / 60_000) : 0
}

export async function throttleFail(keys: string[]) {
  const rows = await readRows(keys)
  if (!rows) return
  const next = keys.map((k) => nextFail(rows.find((r) => r.key === k), k))
  await supabaseAdmin.from('auth_throttle').upsert(next, { onConflict: 'key' })
}

export async function throttleClear(keys: string[]) {
  if (keys.length) await supabaseAdmin.from('auth_throttle').delete().in('key', keys)
}

export const lockedMessage = (min: number) => `Тым көп қате әрекет. ${min} минуттан кейін қайталаңыз.`

// ── Аттарды жасыру (ашық кіру тізімдері үшін) ─────────────────────────
// «Айтбек Азизов» → «Айтбек А.». Бір топта бірдей шықса, әріп қосылады: «Айтбек Аз.»

export function maskName(full: string, letters = 1): string {
  const [first, ...rest] = full.trim().split(/\s+/)
  if (!first) return ''
  if (!rest.length) return first
  return [first, ...rest.map((w) => `${w.slice(0, letters)}.`)].join(' ')
}

export function maskNames<T extends { name: string; group?: string }>(list: T[]): T[] {
  const out = list.map((x) => ({ ...x, name: maskName(x.name) }))
  for (let letters = 2; letters <= 4; letters++) {
    const seen = new Map<string, number[]>()
    out.forEach((x, i) => {
      const k = `${x.group ?? ''}|${x.name}`
      seen.set(k, [...(seen.get(k) ?? []), i])
    })
    let dup = false
    for (const idx of Array.from(seen.values())) {
      if (idx.length < 2) continue
      dup = true
      for (const i of idx) out[i].name = maskName(list[i].name, letters)
    }
    if (!dup) break
  }
  return out
}

// ── Журнал ────────────────────────────────────────────────────────────

export async function audit(actor: string, action: string, headers: Headers, detail?: Record<string, unknown>) {
  await supabaseAdmin
    .from('audit_log')
    .insert({ actor, action, ip: clientIp(headers), detail: detail ?? null })
    .then(() => {}, () => {})
}
