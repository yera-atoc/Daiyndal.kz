'use client'

import type { UbtScores } from '@/lib/ubt'
import { ubtPlan } from '@/lib/ubtPlan'

const INK = '#0E1424'
const BLUE = '#2B6BF3'
const RED = '#E5383B'
const MUTED = '#687085'
const LINE = '#E3E7F0'

/** Сынақтан сынаққа жалпы балдың өсуі (бағаналар) */
export function UbtTrend({ points, compact = false }: { points: { label: string; total: number; max: number }[]; compact?: boolean }) {
  if (!points.length) return null
  const max = Math.max(...points.map((p) => p.max), 1)
  const last = points[points.length - 1]
  const prev = points.length > 1 ? points[points.length - 2] : null
  const delta = prev ? last.total - prev.total : null
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-sm" style={{ color: MUTED }}>Соңғы нәтиже</div>
          <div className="font-display text-4xl font-semibold tabular-nums">
            {last.total}
            <span className="text-lg font-medium" style={{ color: MUTED }}> / {last.max}</span>
          </div>
        </div>
        {delta !== null && (
          <span className="rounded-full px-3 py-1 text-sm font-semibold" style={delta >= 0 ? { background: '#E8F7EF', color: '#0B7A4B' } : { background: '#FDECEC', color: RED }}>
            {delta >= 0 ? '+' : ''}
            {delta} балл
          </span>
        )}
      </div>
      <div className={`mt-5 flex items-end gap-2 ${compact ? 'h-24' : 'h-32'}`} role="img" aria-label="Сынақтар бойынша балл">
        {points.map((p, i) => {
          const h = Math.max(6, (p.total / max) * 100)
          const isLast = i === points.length - 1
          return (
            <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-[11px] font-semibold tabular-nums" style={{ color: isLast ? INK : MUTED }}>{p.total}</span>
              <div className="stripe w-full max-w-[44px] rounded-t-lg" style={{ height: `${h}%`, background: isLast ? BLUE : '#C9D6F5', animationDelay: `${i * 60}ms` }} />
              <span className="w-full truncate text-center text-[11px]" style={{ color: MUTED }}>{p.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Келесі сынаққа жоспар: әр пән бойынша қазіргі балл → мақсат */
export function UbtPlanView({ s }: { s: UbtScores }) {
  const plan = ubtPlan(s)
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-semibold">Келесі сынаққа жоспар</h3>
        <span className="text-sm" style={{ color: MUTED }}>
          Мақсат: <b style={{ color: INK }}>{plan.target}</b> балл ({plan.target - s.total >= 0 ? '+' : ''}
          {plan.target - s.total})
        </span>
      </div>

      {plan.focus.length > 0 && (
        <div className="mt-3 rounded-2xl p-4" style={{ background: '#EEF3FE' }}>
          <div className="text-sm font-semibold" style={{ color: '#1E3A8A' }}>Ең көп балл қосатын пәндер</div>
          <ol className="mt-2 space-y-1.5 text-sm">
            {plan.focus.map((r, i) => (
              <li key={r.key} className="flex gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: BLUE }}>{i + 1}</span>
                <span>
                  <b>{r.name}</b>: {r.points} → {r.target} балл. <span style={{ color: MUTED }}>{r.note}.</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-4 space-y-3.5">
        {plan.rows.map((r) => (
          <div key={r.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium">{r.name}</span>
              <span className="shrink-0 tabular-nums">
                <b style={{ color: r.status === 'below' ? RED : INK }}>{r.points}</b>
                {r.gain > 0 && <span style={{ color: BLUE }}> → {r.target}</span>}
                <span style={{ color: MUTED }}> / {r.max}</span>
              </span>
            </div>
            <div className="relative mt-1.5 h-2.5 overflow-hidden rounded-full" style={{ background: LINE }}>
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(r.target / r.max) * 100}%`, background: '#C9D6F5' }} />
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(r.points / r.max) * 100}%`, background: r.status === 'below' ? RED : r.status === 'strong' ? '#0F9D6B' : BLUE }} />
              <div className="absolute inset-y-[-2px] w-[2px]" style={{ left: `${(r.threshold / r.max) * 100}%`, background: INK, opacity: 0.35 }} title={`Шекті балл: ${r.threshold}`} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs" style={{ color: MUTED }}>Көк жолақ – қазіргі балл, ашық көк – келесі сынаққа мақсат, жіңішке сызық – шекті балл.</p>
    </div>
  )
}
