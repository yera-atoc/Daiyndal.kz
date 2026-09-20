// Helpers for teacher logins/passwords. Server-side only.
//
// Only an admin can set or change a teacher's login and password (see
// app/api/teachers/route.ts and app/api/teachers/[id]/route.ts) — nothing
// in this app generates a login or password automatically or at random.
// The admin always types both in by hand.

export const USERNAME_HINT =
  'Логин 3-30 таңба, тек латын әріптері, сандар, "." "_" "-" болуы мүмкін'

export const PASSWORD_MIN_LENGTH = 8

export const PASSWORD_HINT = `Құпия сөз кемінде ${PASSWORD_MIN_LENGTH} таңба болуы керек`

const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/

/**
 * Cleans up a login typed in by the admin (lowercase, trimmed) and checks
 * it against USERNAME_PATTERN. Returns null when the login is invalid so
 * callers can show USERNAME_HINT.
 */
export function normalizeUsername(raw: string): string | null {
  const username = raw.trim().toLowerCase()
  if (!USERNAME_PATTERN.test(username)) return null
  return username
}
