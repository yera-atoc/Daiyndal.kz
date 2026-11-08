'use client'

// «Бір экран — бір сабақ» ортақ түстері мен кішкене бөлшектері
export const INK = '#0E1424'
export const BLUE = '#2B6BF3'
export const MUTED = '#687085'
export const LINE = '#E3E7F0'
export const SOFT = '#F5F7FB'

export async function lessonPost<T = any>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Сақталмады')
  return j
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-3xl" onClick={(e) => e.stopPropagation()} style={{ color: INK }}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Жабу" className="grid h-9 w-9 place-items-center rounded-full text-lg" style={{ background: SOFT }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Toast({ text, tone = 'ok' }: { text: string; tone?: 'ok' | 'err' }) {
  if (!text) return null
  return (
    <div className="fixed inset-x-0 bottom-24 z-50 mx-auto w-fit max-w-[90vw] rounded-2xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg" style={{ background: tone === 'err' ? '#B91C1C' : INK }}>
      {text}
    </div>
  )
}

export function Pct({ label, v }: { label: string; v: number | null }) {
  if (v == null) return null
  const c = v >= 80 ? '#15803D' : v >= 60 ? '#B45309' : '#B91C1C'
  return (
    <span className="whitespace-nowrap">
      {label} <b style={{ color: c }}>{v}%</b>
    </span>
  )
}
