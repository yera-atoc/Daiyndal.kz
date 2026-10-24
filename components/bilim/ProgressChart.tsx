// Айлар бойынша жалпы балл: нақты (тұтас сызық) және болжам (үзік сызық).
// Y осі — балл.
import { monthName } from '@/lib/bilimTest'

export type ChartPoint = { month: string; value: number; max: number; kind: 'actual' | 'forecast' }

const BLUE = '#2563EB'
const GREEN = '#16A34A'

export default function ProgressChart({ points, target }: { points: ChartPoint[]; target?: number }) {
  if (points.length < 1) return null
  const W = 640
  const H = 250
  const L = 40
  const R = 20
  const T = 28
  const B = 34
  const pcts = points.map((p) => p.value)
  const vmax = Math.max(...points.map((p) => p.max))
  const span = Math.max(...pcts, target ?? 0) - Math.min(...pcts)
  const stepV = [10, 20, 25, 50, 100, 200, 250, 500].find((s) => (span + 80) / s <= 6) ?? 500
  const lo = Math.max(0, Math.floor((Math.min(...pcts) - stepV * 0.6) / stepV) * stepV)
  const hi = Math.min(Math.ceil(vmax / stepV) * stepV, Math.ceil((Math.max(...pcts, target ?? 0) + stepV * 0.6) / stepV) * stepV)
  const x = (i: number) => L + (points.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (points.length - 1))
  const y = (p: number) => T + ((hi - p) * (H - T - B)) / (hi - lo || 1)
  const ticks = Array.from({ length: Math.floor((hi - lo) / stepV) + 1 }, (_, i) => lo + i * stepV)
  const lastActual = points.map((p) => p.kind).lastIndexOf('actual')
  const path = (from: number, to: number) =>
    points
      .slice(from, to + 1)
      .map((_, k) => `${k ? 'L' : 'M'}${x(from + k).toFixed(1)},${y(pcts[from + k]).toFixed(1)}`)
      .join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Жалпы балл динамикасы">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#E2E8F0" strokeWidth="1" />
          <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#94A3B8">{t}</text>
        </g>
      ))}
      {target !== undefined && target >= lo && target <= hi && (
        <g>
          <line x1={L} x2={W - R} y1={y(target)} y2={y(target)} stroke={GREEN} strokeDasharray="3 4" strokeWidth="1.2" />
          <text x={L + 4} y={y(target) - 5} fontSize="10.5" fontWeight="700" fill={GREEN}>МАҚСАТ {Math.round(target)}</text>
        </g>
      )}
      {lastActual > 0 && <path d={path(0, lastActual)} fill="none" stroke={BLUE} strokeWidth="3" strokeLinejoin="round" />}
      {lastActual < points.length - 1 && lastActual >= 0 && (
        <path d={path(lastActual, points.length - 1)} fill="none" stroke={BLUE} strokeWidth="3" strokeDasharray="7 6" strokeLinejoin="round" />
      )}
      {points.map((p, i) => (
        <g key={p.month}>
          <circle cx={x(i)} cy={y(pcts[i])} r="6.5" fill={p.kind === 'actual' ? BLUE : '#fff'} stroke={BLUE} strokeWidth="2.5" />
          <text x={x(i)} y={y(pcts[i]) + (i <= lastActual ? 22 : -13)} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#111">
            {p.value}
          </text>
          <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="#64748B">{monthName(p.month)}</text>
        </g>
      ))}
    </svg>
  )
}
