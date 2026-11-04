// Кабинеттер: 5 кабинет, сабақ кестесінен (schedule_slots) кім, қашан, қай кабинетте. Таза функциялар.

export type Room = { id: string; name: string; owner: string | null; match: string | null }

// 1–4 — негізгі мұғалімдердің өз кабинеті, 5 — қосымша сабақтар (ҰБТ, қазақ/орыс тілі, химия, информатика, тарих…)
export const ROOMS: Room[] = [
  { id: '1-кабинет', name: '1-кабинет', owner: 'Жолтай Қайрат', match: 'жолтай' },
  { id: '2-кабинет', name: '2-кабинет', owner: 'Айдын Әбілқайыр', match: 'айдын' },
  { id: '3-кабинет', name: '3-кабинет', owner: 'Ернар Белгібаев', match: 'ернар' },
  { id: '4-кабинет', name: '4-кабинет', owner: 'Асан Жанұл', match: 'асан' },
  { id: '5-кабинет', name: '5-кабинет', owner: null, match: null },
]
export const EXTRA_ROOM = '5-кабинет'

/** Сабақ басталатын уақыт: дүйсенбі–жұма 08:30, сенбі 09:00 */
export const dayStart = (dow: number) => (dow === 6 ? '09:00' : '08:30')
export const DAY_END = '20:00'

export type SlotLike = { id: string; teacher_id: string; group_id: string | null; day_of_week: number; start_time: string; end_time: string; title: string | null; room: string | null }

const hm = (t: string) => t.slice(0, 5)
export const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
export const fromMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** Сабақтағы «кабинет» жазуын біздің 5 кабинетке келтіру: «1», «1-каб», «Кабинет 3», «қосымша» */
export function normalizeRoom(v: string | null | undefined): string | null {
  const s = (v ?? '').toLowerCase().trim()
  if (!s) return null
  if (/қосымша|доп|extra/.test(s)) return EXTRA_ROOM
  const d = s.match(/[1-5]/)
  return d ? `${d[0]}-кабинет` : null
}

/** Мұғалімнің өз кабинеті (негізгі төртеуі) */
export function homeRoom(teacherName: string | null | undefined): string | null {
  const n = (teacherName ?? '').toLowerCase()
  return ROOMS.find((r) => r.match && n.includes(r.match))?.id ?? null
}

/** Сабақтың кабинеті: жазылғаны → мұғалімнің өз кабинеті → қосымша (5). auto — қолмен жазылмаған */
export function roomOf(slot: SlotLike, teacherName: string | null | undefined): { room: string; auto: boolean } {
  const set = normalizeRoom(slot.room)
  if (set) return { room: set, auto: false }
  return { room: homeRoom(teacherName) ?? EXTRA_ROOM, auto: true }
}

export type PlanItem =
  | { kind: 'lesson'; slot: SlotLike; start: string; end: string; auto: boolean; clash: boolean }
  | { kind: 'free'; start: string; end: string }

/** Бір күннің бір кабинеті: сабақтар уақыт ретімен, арасындағы бос уақыт, қиылысқан сабақтар */
export function roomDay(slots: SlotLike[], dow: number, teacherName: (id: string) => string | null, roomId: string): PlanItem[] {
  const lessons = slots
    .filter((s) => s.day_of_week === dow)
    .map((s) => ({ s, r: roomOf(s, teacherName(s.teacher_id)) }))
    .filter((x) => x.r.room === roomId)
    .sort((a, b) => a.s.start_time.localeCompare(b.s.start_time))
  const out: PlanItem[] = []
  let cursor = toMin(dayStart(dow))
  lessons.forEach(({ s, r }, i) => {
    const a = toMin(hm(s.start_time))
    const b = toMin(hm(s.end_time))
    const clash = lessons.some((o, j) => j !== i && toMin(hm(o.s.start_time)) < b && a < toMin(hm(o.s.end_time)))
    if (a - cursor >= 30) out.push({ kind: 'free', start: fromMin(cursor), end: fromMin(a) })
    out.push({ kind: 'lesson', slot: s, start: hm(s.start_time), end: hm(s.end_time), auto: r.auto, clash })
    cursor = Math.max(cursor, b)
  })
  if (toMin(DAY_END) - cursor >= 30) out.push({ kind: 'free', start: fromMin(cursor), end: DAY_END })
  return out
}

/** Кабинеттің күндік бос емес уақыты (минут) — жүктеме пайызы үшін */
export function busyMinutes(items: PlanItem[]) {
  return items.reduce((a, x) => (x.kind === 'lesson' ? a + toMin(x.end) - toMin(x.start) : a), 0)
}

/** «Қазір» осы сабақ жүріп жатыр ма */
export function isNow(item: PlanItem, dow: number, nowDow: number, nowMin: number) {
  return item.kind === 'lesson' && dow === nowDow && toMin(item.start) <= nowMin && nowMin < toMin(item.end)
}
