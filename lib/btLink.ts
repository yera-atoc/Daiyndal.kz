// Білім тексеру оқушыларын (bt_students) CRM-ге (students) қосу жоспары. Таза функция — тесттелген.
// Аттас CRM оқушысы болса — байланыстырады (қайталамайды), болмаса — жаңа оқушы құрады.

export type BtS = { id: string; full_name: string; group_id: string }
export type BtG = { id: string; name: string }
export type CrmS = { id: string; full_name: string; group_id: string | null; bt_student_id: string | null }
export type CrmG = { id: string; name: string; bt_group_id: string | null }

export const normFull = (s: string) =>
  s.toLowerCase().replace(/ё/g, 'е').replace(/[()«»".,]/g, ' ').replace(/\s+/g, ' ').trim()
/** «Азизов Айтбек» мен «Айтбек Азизов» — бір адам */
const key = (s: string) => normFull(s).split(' ').sort().join(' ')

export type BtLinkPlan = {
  link: { crmId: string; btId: string; name: string }[]
  create: { btId: string; full_name: string; btGroupId: string }[]
  /** CRM-де жоқ топтар (Білім тексеру тобының атымен құрылады) */
  newGroups: { btGroupId: string; name: string }[]
  /** Аттас бірнеше CRM оқушысы — қайсысы екені белгісіз, қолмен тексеру керек */
  ambiguous: string[]
}

export function planBtLink(bts: BtS[], btGroups: BtG[], crm: CrmS[], crmGroups: CrmG[]): BtLinkPlan {
  const linkedBt = new Set(crm.map((c) => c.bt_student_id).filter(Boolean))
  const free = crm.filter((c) => !c.bt_student_id)
  const used = new Set<string>()
  const made = new Set<string>()
  const crmKeys = new Set(crm.filter((c) => c.bt_student_id).map((c) => key(c.full_name)))
  const plan: BtLinkPlan = { link: [], create: [], newGroups: [], ambiguous: [] }
  const groupFor = (btGroupId: string) => {
    const bg = btGroups.find((g) => g.id === btGroupId)
    return crmGroups.find((g) => g.bt_group_id === btGroupId) ?? (bg ? crmGroups.find((g) => normFull(g.name) === normFull(bg.name)) : undefined) ?? null
  }
  for (const b of bts) {
    if (linkedBt.has(b.id)) continue
    const same = free.filter((c) => !used.has(c.id) && key(c.full_name) === key(b.full_name))
    let pick: CrmS | null = null
    if (same.length === 1) pick = same[0]
    else if (same.length > 1) {
      const g = groupFor(b.group_id)
      const inGroup = g ? same.filter((c) => c.group_id === g.id) : []
      if (inGroup.length === 1) pick = inGroup[0]
      else {
        plan.ambiguous.push(b.full_name)
        continue
      }
    }
    if (pick) {
      used.add(pick.id)
      plan.link.push({ crmId: pick.id, btId: b.id, name: b.full_name })
      continue
    }
    // Бала CRM-де бар (Білім тексерудің басқа тобы арқылы байланған) — қайта қоспаймыз
    if (crmKeys.has(key(b.full_name))) continue
    // Бір бала Білім тексерудің екі тобында болса — бір рет қосамыз, екіншісін қолмен тексеруге қалдырамыз
    if (made.has(key(b.full_name))) {
      plan.ambiguous.push(`${b.full_name} (екі топта)`)
      continue
    }
    made.add(key(b.full_name))
    plan.create.push({ btId: b.id, full_name: b.full_name.replace(/[)\s]+$/, ''), btGroupId: b.group_id })
    if (!groupFor(b.group_id) && !plan.newGroups.some((g) => g.btGroupId === b.group_id)) {
      const bg = btGroups.find((g) => g.id === b.group_id)
      if (bg) plan.newGroups.push({ btGroupId: bg.id, name: bg.name })
    }
  }
  return plan
}
