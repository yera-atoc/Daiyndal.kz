// ҰБТ нәтижесінен «келесі сынаққа жоспар»: әр пәнге нақты мақсат және басымдық.
import type { UbtScores } from './ubt'

export type PlanRow = {
  key: string
  name: string
  points: number
  max: number
  threshold: number
  target: number // келесі сынаққа мақсат
  gain: number // target - points
  pct: number
  status: 'below' | 'weak' | 'ok' | 'strong'
  note: string
}

export function ubtPlan(s: UbtScores): { rows: PlanRow[]; focus: PlanRow[]; target: number } {
  const rows = s.subjects.map((x) => {
    const pct = x.max ? x.points / x.max : 0
    const gap = x.max - x.points
    // Шекті балдан төмен болса – алдымен соған жету; әйтпесе қалған айырманың ~25%-ы (кемінде 1 балл)
    let target = x.points < x.threshold ? Math.max(x.threshold + 1, x.points + Math.ceil(gap * 0.2)) : x.points + Math.max(gap > 0 ? 1 : 0, Math.round(gap * 0.25))
    target = Math.min(x.max, target)
    const status: PlanRow['status'] = x.points < x.threshold ? 'below' : pct < 0.5 ? 'weak' : pct < 0.8 ? 'ok' : 'strong'
    const note =
      status === 'below'
        ? `Шекті балға ${x.threshold - x.points} балл жетпейді – бірінші кезекте осы пән`
        : status === 'weak'
          ? 'Негізгі тақырыптарды қайталап, күн сайын 10–15 тапсырма шығару'
          : status === 'ok'
            ? 'Қате кеткен тақырыптарды талдап, 2 балдық тапсырмаларға көңіл бөлу'
            : 'Жақсы деңгей – уақытқа жаттығып, нәтижені ұстап тұру'
    return { key: x.key, name: x.name, points: x.points, max: x.max, threshold: x.threshold, target, gain: target - x.points, pct, status, note }
  })
  // Басымдық: шекті балдан төмендер, сосын ең көп балл қосуға болатын пәндер
  const focus = [...rows].filter((r) => r.gain > 0).sort((a, b) => Number(b.status === 'below') - Number(a.status === 'below') || b.gain - a.gain).slice(0, 3)
  return { rows, focus, target: rows.reduce((n, r) => n + r.target, 0) }
}
