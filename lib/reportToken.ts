// Ата-ана есебінің жабық сілтемесі: оқушы id-і + HMAC қолтаңба (тек серверде).
import { createHmac, timingSafeEqual } from 'crypto'

const secret = () => process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ADMIN_PASSWORD || 'beles-dev-secret'
const sign = (id: string) => createHmac('sha256', secret()).update(`parent-report:${id.toLowerCase()}`).digest('base64url').slice(0, 22)

/** Сілтемедегі кілт: оқушы id-і + қолтаңба. Болжап табу мүмкін емес, базада сақталмайды. */
export function reportToken(studentId: string) {
  return studentId.replace(/-/g, '').toLowerCase() + sign(studentId)
}
export function studentOfToken(token: string): string | null {
  const m = /^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})([A-Za-z0-9_-]{22})$/.exec(token)
  if (!m) return null
  const id = `${m[1]}-${m[2]}-${m[3]}-${m[4]}-${m[5]}`
  const a = Buffer.from(m[6])
  const b = Buffer.from(sign(id))
  return a.length === b.length && timingSafeEqual(a, b) ? id : null
}

