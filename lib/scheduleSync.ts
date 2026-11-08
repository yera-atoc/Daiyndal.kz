// Кестеден (schedule_slots) сабақ журналының топтарын (teacher_classes) құру. Таза функция — тесттелген.

export type SSlot = { teacher_id: string | null; group_id: string | null; day_of_week: number; title: string | null }
export type SClass = { id: string; teacher_id: string; name: string; group_id: string | null; days: number[]; active: boolean }
export type SGroup = { id: string; name: string }

const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[«»"'.,·\-–—()]/g, ' ').replace(/\s+/g, ' ').trim()

export type SyncPlan = {
  create: { teacher_id: string; name: string; group_id: string | null; days: number[] }[]
  addDays: { id: string; days: number[] }[]
  /** Бүгін (dow) кестеде бар, бірақ журналда жоқ сабақтар саны */
  missingToday: number
}

/** Кестедегі әр сабаққа журнал тобы: бар болса — жетіспейтін күнін қосу, жоқ болса — жаңасын құру */
export function planScheduleSync(slots: SSlot[], classes: SClass[], groups: SGroup[], dow?: number): SyncPlan {
  const gById = new Map(groups.map((g) => [g.id, g]))
  const gByName = new Map(groups.map((g) => [norm(g.name), g]))
  const create = new Map<string, SyncPlan['create'][number]>()
  const add = new Map<string, Set<number>>()
  let missingToday = 0

  const findClass = (t: string, groupId: string | null, name: string) =>
    classes.find((c) => c.teacher_id === t && groupId && c.group_id === groupId) ??
    classes.find((c) => c.teacher_id === t && norm(c.name) === norm(name)) ??
    null

  for (const s of slots) {
    if (!s.teacher_id || s.day_of_week < 1 || s.day_of_week > 7) continue
    const g = (s.group_id && gById.get(s.group_id)) || gByName.get(norm(s.title)) || null
    const name = (g?.name ?? s.title ?? '').trim()
    if (!name) continue
    const c = findClass(s.teacher_id, g?.id ?? null, name) ?? (g ? findClass(s.teacher_id, null, s.title ?? '') : null)
    if (c) {
      const have = new Set([...c.days, ...Array.from(add.get(c.id) ?? [])])
      if (!have.has(s.day_of_week)) {
        if (!add.has(c.id)) add.set(c.id, new Set())
        add.get(c.id)!.add(s.day_of_week)
        if (s.day_of_week === dow) missingToday++
      }
      continue
    }
    const key = `${s.teacher_id}|${g?.id ?? norm(name)}`
    const cur = create.get(key)
    if (cur) {
      if (!cur.days.includes(s.day_of_week)) cur.days.push(s.day_of_week)
    } else create.set(key, { teacher_id: s.teacher_id, name, group_id: g?.id ?? null, days: [s.day_of_week] })
    if (s.day_of_week === dow) missingToday++
  }
  return {
    create: Array.from(create.values()).map((c) => ({ ...c, days: c.days.sort() })),
    addDays: Array.from(add.entries()).map(([id, d]) => {
      const c = classes.find((x) => x.id === id)!
      return { id, days: Array.from(new Set([...c.days, ...Array.from(d)])).sort() }
    }),
    missingToday,
  }
}
