'use client'

import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { QUOTES, QUOTE_TOPICS, quoteIndexFor } from '@/lib/quotes'

// Оқушы кабинетіндегі «Күннің сөзі»: күн сайын жаңа, батырмамен келесісін көруге болады.
export default function QuoteCard({ seed }: { seed: string }) {
  const start = useMemo(() => {
    const d = new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 10) // Алматы күні
    return quoteIndexFor(d, seed)
  }, [seed])
  const [shift, setShift] = useState(0)
  const q = QUOTES[(start + shift * 7) % QUOTES.length] // 7 – тізімнің ұзындығымен өзара жай, бәрі кезекпен шығады
  const topic = QUOTE_TOPICS[q.topic]

  return (
    <figure className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-amber-50 p-5">
      <span aria-hidden className="pointer-events-none absolute -right-2 -top-6 select-none font-serif text-[120px] leading-none text-blue-100">”</span>
      <div className="relative flex items-center justify-between gap-2">
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm">
          {topic.icon} Күннің сөзі · {topic.label}
        </span>
        <button
          onClick={() => setShift((s) => s + 1)}
          aria-label="Келесі сөз"
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-blue-600 active:bg-blue-100"
        >
          <RefreshCw size={13} /> Келесі
        </button>
      </div>
      <blockquote key={`${start}-${shift}`} className="relative mt-3 animate-[fadeIn_.4s_ease] text-[17px] font-semibold leading-snug text-slate-900">
        {q.text}
      </blockquote>
      <figcaption className="relative mt-2 text-sm text-slate-500">— {q.author}</figcaption>
      <style>{'@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}'}</style>
    </figure>
  )
}
