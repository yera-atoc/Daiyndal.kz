'use client'

import { useEffect } from 'react'
import { reportError } from '@/lib/reportError'

// Кез келген бетте күтпеген қате болса – ақ экранның орнына түсінікті хабар және журналға жазба
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError('page', error)
  }, [error])
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-50 text-2xl">!</div>
        <h1 className="mt-4 text-xl font-semibold">Бірдеңе дұрыс болмады</h1>
        <p className="mt-2 text-sm text-slate-500">Қате туралы хабар бізге автоматты түрде жіберілді. Жауаптарыңыз сақталған.</p>
        <div className="mt-6 flex flex-col gap-2">
          <button onClick={reset} className="rounded-xl bg-[#2B6BF3] py-3 text-sm font-semibold text-white">Қайта көру</button>
          <a href="/" className="py-2 text-sm text-slate-500">Басты бет</a>
        </div>
      </div>
    </div>
  )
}
