'use client'
// НЗМ (6 сынып) оқушысының жеке көмекшісі: өз нәтижелері туралы сұрақ-жауап.
import { useEffect, useRef, useState } from 'react'

type Msg = { role: 'user' | 'assistant'; content: string }

const SUGGEST = [
  'Менің ең әлсіз тақырыбым қандай?',
  'Бүгін не оқуым керек?',
  'Грантқа қанша балл жетпейді?',
  'Математикадан қалай көтерілемін?',
  'Апта чемпионы болу үшін не істеймін?',
  'Емтиханға дейін жоспар құрып берші',
]

export default function Coach({ name }: { name: string }) {
  const key = `beles-coach-${name}`
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ready, setReady] = useState<boolean | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const first = name.trim().split(/\s+/).slice(-1)[0]

  useEffect(() => {
    try {
      setMsgs(JSON.parse(localStorage.getItem(key) ?? '[]').slice(-30))
    } catch {}
    fetch('/api/bilim-test/coach', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setReady(!!j.ready))
      .catch(() => setReady(false))
  }, [key])

  useEffect(() => {
    if (msgs.length) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [msgs])

  // Тарих тек жаңа хабарламада не тазалағанда сақталады (оқылған тарихтың үстінен бос жазылмайды)
  const keep = (list: Msg[]) => {
    setMsgs(list)
    try {
      localStorage.setItem(key, JSON.stringify(list.slice(-30)))
    } catch {}
  }

  async function send(q: string) {
    const content = q.trim()
    if (!content || busy) return
    const next = [...msgs, { role: 'user' as const, content }]
    keep(next)
    setText('')
    setErr('')
    setBusy(true)
    try {
      const r = await fetch('/api/bilim-test/coach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next.slice(-10) }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Қате')
      keep([...next, { role: 'assistant', content: j.answer }])
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-cyan-300">B</div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">Beles көмекшісі</div>
          <div className="text-xs text-slate-500">Сенің нәтижелеріңді біледі · ИИ</div>
        </div>
        {msgs.length > 0 && (
          <button onClick={() => keep([])} className="text-xs text-slate-400 underline">Тазалау</button>
        )}
      </div>

      <div className="space-y-3 px-4 py-4">
        <Bubble role="assistant">
          Сәлем, {first}! Мен сенің Білім тексеру нәтижелеріңді, әлсіз тақырыптарыңды және деңгейіңді білемін. Не сұрағың келеді?
        </Bubble>
        {msgs.map((m, i) => <Bubble key={i} role={m.role}>{m.content}</Bubble>)}
        {busy && <Bubble role="assistant"><span className="animate-pulse text-slate-400">Ойланып жатыр…</span></Bubble>}
        {err && <p className="text-center text-xs text-rose-600">{err}</p>}
        {ready === false && <p className="text-center text-xs text-amber-700">Көмекші әлі қосылмаған. Мұғаліміңе айт.</p>}
        <div ref={endRef} />
      </div>

      {msgs.length === 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-3">
          {SUGGEST.map((s) => (
            <button key={s} disabled={busy || ready === false} onClick={() => send(s)} className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-left text-xs font-medium text-cyan-800 active:bg-cyan-100">
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(text)
        }}
        className="flex gap-2 border-t border-slate-100 p-3"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="Сұрағыңды жаз…"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-cyan-500"
        />
        <button disabled={busy || !text.trim() || ready === false} className="rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-40">
          Жіберу
        </button>
      </form>
      <p className="px-4 pb-3 text-[11px] text-slate-400">Көмекші қателесуі мүмкін. Маңызды сұрақты мұғаліміңнен де сұра.</p>
    </div>
  )
}

function Bubble({ role, children }: { role: 'user' | 'assistant'; children: React.ReactNode }) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${role === 'user' ? 'rounded-br-md bg-cyan-600 text-white' : 'rounded-bl-md bg-slate-100 text-slate-900'}`}>{children}</div>
    </div>
  )
}
