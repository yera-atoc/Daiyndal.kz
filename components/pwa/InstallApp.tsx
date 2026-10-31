'use client'

// «Қосымшаны орнату»: Android / ноутбук (Chrome, Edge) — бір батырма; iPhone (Safari) — қысқа нұсқау
import { useEffect, useState } from 'react'

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

function standalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
}

export default function InstallApp({ className = '' }: { className?: string }) {
  const [evt, setEvt] = useState<PromptEvent | null>(null)
  const [ios, setIos] = useState(false)
  const [installed, setInstalled] = useState(true)
  const [help, setHelp] = useState(false)

  useEffect(() => {
    setInstalled(standalone())
    const ua = navigator.userAgent
    setIos(/iphone|ipad|ipod/i.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1))
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setEvt(e as PromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setEvt(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed || (!evt && !ios)) return null

  const install = async () => {
    if (evt) {
      await evt.prompt()
      const r = await evt.userChoice.catch(() => null)
      if (r?.outcome === 'accepted') setInstalled(true)
      setEvt(null)
    } else setHelp((v) => !v)
  }

  return (
    <div className={`rounded-[22px] bg-white p-4 shadow-[0_1px_2px_rgba(14,20,36,.04),0_8px_24px_-12px_rgba(14,20,36,.12)] ring-1 ring-[#E3E7F0]/70 ${className}`}>
      <div className="flex items-center gap-3.5">
        <img src="/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-[13px] ring-1 ring-[#E3E7F0]" />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold leading-tight">Beles қосымшасы</div>
          <div className="mt-0.5 text-[13px] leading-snug text-[#687085]">Телефон немесе ноутбук экранынан бір басып ашылады</div>
        </div>
        <button onClick={install} className="shrink-0 rounded-xl bg-[#0E1424] px-4 py-2.5 text-sm font-semibold text-white active:scale-[.98]">
          Орнату
        </button>
      </div>
      {help && (
        <ol className="mt-3 space-y-1.5 rounded-xl bg-[#F5F7FB] p-3 text-[13.5px] leading-snug text-[#0E1424]">
          <li>1. Safari төменгі жолағындағы <b>«Бөлісу»</b> белгісін бас (шаршы мен жоғары нұсқар).</li>
          <li>2. Тізімнен <b>«Экранға қосу» / «На экран „Домой“»</b> таңда.</li>
          <li>3. <b>«Қосу»</b> бас — Beles белгішесі экранда пайда болады.</li>
        </ol>
      )}
    </div>
  )
}
