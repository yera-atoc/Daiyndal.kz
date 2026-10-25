// Әкімші сессиясы. Edge (middleware) және Node-та жұмыс істейді – тек Web Crypto.
//
// Cookie: `<who>.<exp>.<sig>`
//   who = 'owner'        – ADMIN_PASSWORD арқылы кірген иесі
//   who = 't-<teacherId>' – әкімші құқығы берілген мұғалім (жеке логинімен)
//   exp = unix ms, sig = HMAC-SHA256(who|exp)
// Кілтке ADMIN_PASSWORD да кіреді: иесі құпия сөзді ауыстырса, барлық ескі сессиялар жабылады.

export const ADMIN_SESSION_DAYS = 7

function key() {
  return `admin|${process.env.SESSION_SECRET ?? ''}|${process.env.ADMIN_PASSWORD ?? ''}`
}

async function hmac(message: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Тұрақты уақытта салыстыру (уақыт бойынша болжауға жол бермейді). */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

export async function signAdmin(who: string, now = Date.now()) {
  const exp = now + ADMIN_SESSION_DAYS * 86_400_000
  return `${who}.${exp}.${await hmac(`${who}|${exp}`)}`
}

export type AdminWho = { kind: 'owner' } | { kind: 'teacher'; id: string }

export async function verifyAdmin(token: string | undefined | null, now = Date.now()): Promise<AdminWho | null> {
  if (!token || !process.env.ADMIN_PASSWORD) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [who, exp, sig] = parts
  if (!/^\d+$/.test(exp) || Number(exp) < now) return null
  if (!safeEqual(sig, await hmac(`${who}|${exp}`))) return null
  if (who === 'owner') return { kind: 'owner' }
  if (who.startsWith('t-') && who.length > 2) return { kind: 'teacher', id: who.slice(2) }
  return null
}
