// Браузерден қатені /api/log-қа жіберу (сайттың жұмысына кедергі келтірмейді)
let sent = 0
export function reportError(source: string, err: unknown) {
  if (typeof window === 'undefined' || sent >= 10) return
  sent++
  const e = err as { message?: string; stack?: string; digest?: string } | undefined
  const message = (e?.message || String(err) || 'Unknown error') + (e?.digest ? ` [${e.digest}]` : '')
  const body = JSON.stringify({ source, message, stack: e?.stack, url: location.href })
  try {
    if (navigator.sendBeacon?.('/api/log', new Blob([body], { type: 'application/json' }))) return
  } catch {}
  fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
}
