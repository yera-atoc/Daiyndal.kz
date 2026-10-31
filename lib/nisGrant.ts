// НЗМ (NIS) конкурстық іріктеуі: 2026 жылғы грант иегерлерінің балдары (ресми nis.admission жарияланымы).
// Грант жалпы балл бойынша беріледі, бірақ Математикадан ≥ 35 % және Сандық сипаттамадан ≥ 40 % шекті мән міндетті.
// Біздің НЗМ-6 сынағының шкаласы (1500 балл: Мат. 400, Сандық 300, қалған төрт пән 200-ден) нағыз емтиханмен бірдей.
import type { SeasonView } from './bilimSeason'

export type NisSchool = { name: string; max: number; min: number }

export const NIS_GRANT_YEAR = 2026
export const NIS_TOTAL = 1500

export const NIS_GRANT_2026: NisSchool[] = [
  { name: 'Астана', max: 1479, min: 1297 },
  { name: 'Астана-Нұра', max: 1456, min: 1281 },
  { name: 'Алматы-Наурызбай', max: 1431, min: 1271 },
  { name: 'Алматы-Медеу', max: 1450, min: 1255 },
  { name: 'Шымкент-Қаратау', max: 1439, min: 1144 },
  { name: 'Түркістан', max: 1407, min: 1120 },
  { name: 'Ақтау', max: 1431, min: 1110 },
  { name: 'Ақтөбе', max: 1425, min: 1104 },
  { name: 'Тараз', max: 1387, min: 1103 },
  { name: 'Талдықорған', max: 1396, min: 1091 },
  { name: 'Атырау', max: 1437, min: 1087 },
  { name: 'Қарағанды', max: 1424, min: 1077 },
  { name: 'Шымкент-Абай', max: 1406, min: 1070 },
  { name: 'Көкшетау', max: 1353, min: 1049 },
  { name: 'Орал', max: 1373, min: 1036 },
  { name: 'Өскемен', max: 1340, min: 999 },
  { name: 'Семей', max: 1443, min: 942 },
  { name: 'Қостанай', max: 1391, min: 897 },
  { name: 'Петропавл', max: 1307, min: 889 },
]

// Пәндік шекті мән: балл үлесі (оқушының пән баллы / пән максимумы)
export const NIS_SUBJECT_MIN: { id: string; name: string; share: number }[] = [
  { id: 'math', name: 'Математика', share: 0.35 },
  { id: 'quant', name: 'Сандық сипаттама', share: 0.4 },
]

export type GrantCheck = {
  month: string
  monthName: string
  total: number
  subjects: { id: string; name: string; score: number | null; max: number; need: number; ok: boolean }[]
  thresholdsOk: boolean
  schools: (NisSchool & { gap: number; ok: boolean })[] // gap: min-ге дейін жетпейтіні (≤ 0 — жеткен)
  reached: number
}

/** Оқушының ең соңғы толық айы (1500 балдық) бойынша грант шегімен салыстыру */
export function grantCheck(season: SeasonView, rowId?: string): GrantCheck | null {
  const row = rowId ? season.rows.find((r) => r.id === rowId) : season.rows.find((r) => r.me)
  if (!row) return null
  const m = [...season.months].reverse().find((x) => {
    const c = row.cells[x.month]
    return c && c.max >= NIS_TOTAL
  })
  if (!m) return null
  const cell = row.cells[m.month]!
  const subjects = NIS_SUBJECT_MIN.map((s) => {
    const max = m.subjects.find((x) => x.id === s.id)?.max ?? 0
    const score = typeof cell.scores[s.id] === 'number' ? (cell.scores[s.id] as number) : null
    const need = Math.ceil(max * s.share)
    return { id: s.id, name: s.name, score, max, need, ok: score !== null && max > 0 && score >= need }
  })
  const thresholdsOk = subjects.every((s) => s.ok)
  const schools = NIS_GRANT_2026.map((s) => ({ ...s, gap: s.min - cell.total, ok: thresholdsOk && cell.total >= s.min }))
  return { month: m.month, monthName: m.name, total: cell.total, subjects, thresholdsOk, schools, reached: schools.filter((s) => s.ok).length }
}

export const grantGroup = (groupId: string | null | undefined) => groupId === 'nzm'
