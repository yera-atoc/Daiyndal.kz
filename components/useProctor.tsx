'use client'

// Тест кезіндегі бақылау (камерасыз): басқа бетке өту, көшіру/қою, экранды бөлу, жауап уақыттары.
// Оқушыға ескерту көрсетеді, тапсырғанда (не бетті жапқанда) серверге қысқа есеп жібереді.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProctorRaw } from '@/lib/proctor'

type Ctx = { kind: string; ref: string; title: string; questions?: number }

export function useProctor(ctx: Ctx, active = true) {
  const raw = useRef<ProctorRaw>(fresh(ctx.questions))
  const hiddenAt = useRef<number | null>(null)
  const sent = useRef(false)
  const baseWidth = useRef(0)
  const [warn, setWarn] = useState<string | null>(null)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx

  const send = useCallback((beacon = false) => {
    if (sent.current) return
    const r = raw.current
    r.endedAt = Date.now()
    r.questions = ctxRef.current.questions ?? r.questions
    // Ештеңе болмаса және жауап та жоқ болса — жібермейміз
    if (beacon && !r.leaves.length && !r.copy && !r.paste && !r.marks.length) return
    sent.current = true
    const body = JSON.stringify({ kind: ctxRef.current.kind, ref: ctxRef.current.ref, title: ctxRef.current.title, raw: r, partial: beacon })
    try {
      if (beacon && navigator.sendBeacon) navigator.sendBeacon('/api/proctor', new Blob([body], { type: 'application/json' }))
      else fetch('/api/proctor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
    } catch {}
  }, [])

  useEffect(() => {
    if (!active) return
    raw.current = fresh(ctxRef.current.questions)
    sent.current = false
    baseWidth.current = window.innerWidth

    const leave = () => {
      if (hiddenAt.current === null) hiddenAt.current = Date.now()
    }
    const back = () => {
      if (hiddenAt.current === null) return
      const ms = Date.now() - hiddenAt.current
      const at = hiddenAt.current
      hiddenAt.current = null
      if (ms < 800) return // жыпылықтау (хабарлама, жүйе терезесі) — есептемейміз
      raw.current.leaves.push({ at, ms })
      const n = raw.current.leaves.length
      setWarn(`Сіз тест бетінен шықтыңыз (${n}-рет, ${Math.round(ms / 1000)} сек). Әр шығу мұғалімге көрінеді.`)
    }
    const vis = () => (document.hidden ? leave() : back())
    const onCopy = (e: ClipboardEvent) => {
      raw.current.copy++
      e.preventDefault()
      setWarn('Тест кезінде көшіруге болмайды. Әрекет тіркелді.')
    }
    const onPaste = (e: ClipboardEvent) => {
      raw.current.paste++
      e.preventDefault()
      setWarn('Тест кезінде мәтін қоюға болмайды. Жауапты өзің жаз. Әрекет тіркелді.')
    }
    const onMenu = () => {
      raw.current.menu++
    }
    const onFs = () => {
      if (!document.fullscreenElement) raw.current.fsExit++
    }
    const onResize = () => {
      if (baseWidth.current >= 700 && window.innerWidth < baseWidth.current * 0.7) {
        raw.current.split++
        baseWidth.current = window.innerWidth
      }
    }
    const onHide = () => {
      leave()
      send(true)
    }

    document.addEventListener('visibilitychange', vis)
    window.addEventListener('blur', leave)
    window.addEventListener('focus', back)
    document.addEventListener('copy', onCopy, true)
    document.addEventListener('cut', onCopy, true)
    document.addEventListener('paste', onPaste, true)
    document.addEventListener('contextmenu', onMenu, true)
    document.addEventListener('fullscreenchange', onFs)
    window.addEventListener('resize', onResize)
    window.addEventListener('pagehide', onHide)
    return () => {
      document.removeEventListener('visibilitychange', vis)
      window.removeEventListener('blur', leave)
      window.removeEventListener('focus', back)
      document.removeEventListener('copy', onCopy, true)
      document.removeEventListener('cut', onCopy, true)
      document.removeEventListener('paste', onPaste, true)
      document.removeEventListener('contextmenu', onMenu, true)
      document.removeEventListener('fullscreenchange', onFs)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pagehide', onHide)
    }
  }, [active, send])

  useEffect(() => {
    if (!warn) return
    const t = setTimeout(() => setWarn(null), 6000)
    return () => clearTimeout(t)
  }, [warn])

  /** Жауап берілген сәтті белгілеу (сұрақ нөмірі не id) */
  const mark = useCallback((i: string | number) => {
    raw.current.marks.push({ i: String(i), t: Date.now() - raw.current.startedAt })
  }, [])

  const ui = (
    <>
      {active && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
          🛡 Бұл тест бақыланады: басқа бетке өту, көшіру және мәтін қою тіркеледі.
        </div>
      )}
      {warn && (
        <div role="alert" className="fixed inset-x-3 top-3 z-[70] mx-auto max-w-md rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg">
          ⚠ {warn}
        </div>
      )}
    </>
  )

  const report = useCallback(() => send(false), [send])
  return { mark, report, ui }
}

function fresh(questions = 0): ProctorRaw {
  return { startedAt: Date.now(), endedAt: Date.now(), questions, leaves: [], copy: 0, paste: 0, menu: 0, fsExit: 0, split: 0, marks: [] }
}
