'use client'

import { useEffect, useMemo } from 'react'

/**
 * Су белгісі: экранның бәріне оқушының аты, күні және «Beles education» жазуы қиғаш, бозғылт қайталанады.
 * Скриншот кімнен тарағаны бірден көрінеді. protect = true болса — мәтінді белгілеу, көшіру, оң жақ мәзір
 * және басып шығару бұғатталады (енгізу өрістеріне тимейді).
 */
export default function Watermark({ name, protect = true }: { name: string | null | undefined; protect?: boolean }) {
  const label = useMemo(() => {
    const d = new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10).split('-').reverse().join('.')
    return `${(name || 'Beles').trim()} · ${d} · Beles education`
  }, [name])

  const bg = useMemo(() => {
    const esc = label.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="220"><text x="0" y="120" transform="rotate(-24 210 110)" font-family="Arial, sans-serif" font-size="15" font-weight="600" fill="#0E1424" fill-opacity="0.07">${esc}</text></svg>`
    return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`
  }, [label])

  useEffect(() => {
    if (!protect) return
    const editable = (t: EventTarget | null) => t instanceof HTMLElement && (t.closest('input, textarea, [contenteditable="true"]') !== null)
    const block = (e: Event) => {
      if (!editable(e.target)) e.preventDefault()
    }
    const keys = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if ((e.ctrlKey || e.metaKey) && (k === 'p' || k === 's' || ((k === 'c' || k === 'x' || k === 'a') && !editable(e.target)))) e.preventDefault()
    }
    document.addEventListener('copy', block)
    document.addEventListener('cut', block)
    document.addEventListener('contextmenu', block)
    document.addEventListener('selectstart', block)
    document.addEventListener('dragstart', block)
    document.addEventListener('keydown', keys)
    document.documentElement.classList.add('bl-protect')
    return () => {
      document.removeEventListener('copy', block)
      document.removeEventListener('cut', block)
      document.removeEventListener('contextmenu', block)
      document.removeEventListener('selectstart', block)
      document.removeEventListener('dragstart', block)
      document.removeEventListener('keydown', keys)
      document.documentElement.classList.remove('bl-protect')
    }
  }, [protect])

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[60]" style={{ backgroundImage: bg, backgroundRepeat: 'repeat' }} />
      {protect && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
          .bl-protect body { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
          .bl-protect input, .bl-protect textarea { -webkit-user-select: text; user-select: text; }
          .bl-protect img { -webkit-user-drag: none; }
          @media print { .bl-protect body > * { display: none !important; } .bl-protect body::after { content: 'Beles education материалдарын басып шығаруға болмайды'; display: block; padding: 40px; font: 600 18px Arial, sans-serif; } }
        `,
          }}
        />
      )}
    </>
  )
}
