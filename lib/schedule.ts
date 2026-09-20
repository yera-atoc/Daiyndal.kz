// Shared (client + server) helpers for the teacher weekly schedule.
// Keep this file free of server-only imports — it is used by client components.

export const WEEKDAYS = [
  { id: 1, name: 'Дүйсенбі', short: 'Дс' },
  { id: 2, name: 'Сейсенбі', short: 'Сс' },
  { id: 3, name: 'Сәрсенбі', short: 'Ср' },
  { id: 4, name: 'Бейсенбі', short: 'Бс' },
  { id: 5, name: 'Жұма', short: 'Жм' },
  { id: 6, name: 'Сенбі', short: 'Сб' },
  { id: 7, name: 'Жексенбі', short: 'Жс' },
] as const

export type ScheduleSlot = {
  id: string
  teacher_id: string
  day_of_week: number
  start_time: string // "HH:MM:SS" from Postgres `time`
  end_time: string
  title: string | null
  note: string | null
}

/** "15:00:00" -> "15:00" */
export function hhmm(t: string): string {
  return t.slice(0, 5)
}

export function dayName(id: number): string {
  return WEEKDAYS.find((d) => d.id === id)?.name ?? String(id)
}

/**
 * Compact one-line summary, e.g. "Дс, Ср, Жм 15:00–16:00 · Сс 17:00–18:00".
 * Days that share the same time range are merged.
 */
export function summarizeSlots(slots: ScheduleSlot[]): string {
  const byRange = new Map<string, number[]>()
  for (const s of [...slots].sort(
    (a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)
  )) {
    const key = `${hhmm(s.start_time)}–${hhmm(s.end_time)}`
    const days = byRange.get(key) ?? []
    if (!days.includes(s.day_of_week)) days.push(s.day_of_week)
    byRange.set(key, days)
  }
  return Array.from(byRange.entries())
    .map(([range, days]) => {
      const names = days.map((d) => WEEKDAYS.find((w) => w.id === d)?.short ?? d).join(', ')
      return `${names} ${range}`
    })
    .join(' · ')
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export type SlotInput = {
  teacherId: string
  days: number[]
  startTime: string // "HH:MM"
  endTime: string
  title: string | null
  note: string | null
}

export function parseSlotInput(
  body: any
): { ok: true; value: SlotInput } | { ok: false; error: string } {
  const fail = (error: string) => ({ ok: false as const, error })

  if (!body || typeof body.teacherId !== 'string' || !body.teacherId) {
    return fail('Мұғалімді таңдаңыз')
  }

  const rawDays: unknown[] = Array.isArray(body.days) ? body.days : []
  const days = Array.from(new Set(rawDays.map(Number)))
  if (days.length === 0 || days.some((d) => !Number.isInteger(d) || d < 1 || d > 7)) {
    return fail('Кемінде бір күнді таңдаңыз')
  }
  days.sort((a, b) => a - b)

  const startTime = String(body.startTime ?? '')
  const endTime = String(body.endTime ?? '')
  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
    return fail('Уақытты дұрыс енгізіңіз (мысалы: 15:00)')
  }
  if (endTime <= startTime) {
    return fail('Аяқталу уақыты басталу уақытынан кейін болуы керек')
  }

  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 100) : ''
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 300) : ''

  return {
    ok: true,
    value: {
      teacherId: body.teacherId,
      days,
      startTime,
      endTime,
      title: title || null,
      note: note || null,
    },
  }
}
