'use client'

import { useEffect } from 'react'
import { reportError } from '@/lib/reportError'

// Ұсталмаған қателерді журналға жібереді
export default function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      // Кеңейтулер мен сыртқы скрипттердің шуын елемейміз
      if (!e.filename || e.filename.includes(location.host)) reportError('client', e.error ?? e.message)
    }
    const onRejection = (e: PromiseRejectionEvent) => reportError('promise', e.reason)
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])
  return null
}
