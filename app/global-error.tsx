'use client'

import { useEffect } from 'react'
import { reportError } from '@/lib/reportError'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError('global', error)
  }, [error])
  return (
    <html lang="kk">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0, background: '#F5F7FB', color: '#0B0F19' }}>
        <div style={{ textAlign: 'center', padding: 16 }}>
          <h1 style={{ fontSize: 20 }}>Бірдеңе дұрыс болмады</h1>
          <p style={{ color: '#6B7385', fontSize: 14 }}>Қате туралы хабар жіберілді.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: '12px 20px', borderRadius: 12, border: 0, background: '#2B6BF3', color: '#fff', fontWeight: 600 }}>Қайта көру</button>
        </div>
      </body>
    </html>
  )
}
