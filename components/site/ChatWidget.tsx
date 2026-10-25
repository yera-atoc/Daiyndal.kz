'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle, Send, X } from 'lucide-react'
import { waLink } from './brand'

// ИИ-көмекші + WhatsApp. Тек ашық беттерде (кабинеттер мен тест кезінде көрінбейді).
const PUBLIC = ['/', '/materials', '/ielts/materials']
const INK = '#0E1424'
const BLUE = '#2B6BF3'
const MUTED = '#687085'
const STORE = 'beles-chat-v1'

type Msg = { role: 'user' | 'assistant'; content: string }

const SUGGEST = ['Қандай бағдарламалар бар?', 'ҰБТ сынағы қалай өтеді?', 'Кабинетке қалай кіремін?', 'Сабаққа қалай жазыламын?']
const GREETING = 'Сәлеметсіз бе! Мен Beles көмекшісімін. Бағдарламалар, ҰБТ сынағы, кабинетке кіру туралы сұраңыз. Баға мен кестені менеджер WhatsApp-та айтады.'

// Жауаптағы сілтемелерді басылатын ету
const LINK = /(https?:\/\/[^\s)]+|\/(?:bilim-test|ubt|ielts\/materials|ielts|toefl|materials|login)\b)/g
function Rich({ text }: { text: string }) {
  const parts = text.split(LINK)
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <a key={i} href={p} target={p.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="font-semibold underline decoration-[#2B6BF3]/40 underline-offset-2" style={{ color: BLUE }}>
            {p.includes('wa.me') ? 'WhatsApp-қа жазу' : p.replace(/^https?:\/\//, '').slice(0, 40)}
          </a>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  )
}

export default function ChatWidget() {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [off, setOff] = useState(false) // ИИ қосылмаған – тек WhatsApp
  const list = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORE)
      if (saved) setMsgs(JSON.parse(saved))
    } catch {}
  }, [])
  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(msgs.slice(-20)))
    } catch {}
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, busy])
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => input.current?.focus(), 250)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', esc)
    }
  }, [open])

  if (!path || !PUBLIC.includes(path)) return null

  const send = async (q: string) => {
    const content = q.trim()
    if (!content || busy) return
    const next = [...msgs, { role: 'user' as const, content }]
    setMsgs(next)
    setText('')
    setBusy(true)
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next }) })
      const j = await r.json().catch(() => ({}))
      if (j.error === 'no_key') {
        setOff(true)
        setMsgs([...next, { role: 'assistant', content: `Көмекші әзірге қосылмаған. Сұрағыңызды менеджерге жіберіңіз: ${waLink(content)}` }])
      } else {
        setMsgs([...next, { role: 'assistant', content: j.answer || j.error || 'Жауап келмеді. Қайта жазып көріңіз.' }])
      }
    } catch {
      setMsgs([...next, { role: 'assistant', content: 'Интернет байланысын тексеріп, қайта жазыңыз.' }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {/* Ашу батырмасы */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Сұрақ қою"
        className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full py-3 pl-4 pr-5 text-[15px] font-semibold text-white shadow-[0_10px_30px_-8px_rgba(14,20,36,.45)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95 ${open ? 'pointer-events-none translate-y-4 opacity-0' : ''}`}
        style={{ background: INK }}
      >
        <MessageCircle size={20} strokeWidth={2.2} />
        Сұрақ қою
      </button>

      {/* Терезе */}
      <div className={`fixed inset-0 z-50 transition ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
        <div className={`absolute inset-0 bg-[#0E1424]/30 backdrop-blur-[2px] transition-opacity duration-300 sm:bg-transparent sm:backdrop-blur-0 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={() => setOpen(false)} />
        <section
          role="dialog"
          aria-label="Beles көмекшісі"
          className={`absolute inset-x-0 bottom-0 flex h-[86dvh] flex-col overflow-hidden rounded-t-[28px] bg-[#F5F7FB] shadow-2xl transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:h-[600px] sm:max-h-[calc(100dvh-40px)] sm:w-[400px] sm:rounded-[28px] ${open ? 'translate-y-0' : 'translate-y-[110%]'}`}
        >
          <header className="flex items-center gap-3 border-b border-[#E3E7F0] bg-white px-4 py-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white" style={{ background: BLUE }}>
              <MessageCircle size={20} />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="font-semibold">Beles көмекшісі</div>
              <div className="text-xs" style={{ color: MUTED }}>{off ? 'Менеджер WhatsApp-та жауап береді' : 'Жасанды интеллект бірден жауап береді'}</div>
            </div>
            <a href={waLink()} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white">WhatsApp</a>
            <button onClick={() => setOpen(false)} aria-label="Жабу" className="grid h-9 w-9 place-items-center rounded-full bg-[#F1F3F7]">
              <X size={18} />
            </button>
          </header>

          <div ref={list} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            <Bubble role="assistant" text={GREETING} />
            {msgs.map((m, i) => (
              <Bubble key={i} role={m.role} text={m.content} />
            ))}
            {busy && (
              <div className="flex">
                <div className="flex gap-1 rounded-[20px] rounded-bl-md bg-white px-4 py-3.5 shadow-sm" aria-label="Жауап жазылып жатыр">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-[#B8BFCC]" style={{ animationDelay: `${i * 120}ms` }} />
                  ))}
                </div>
              </div>
            )}
            {!msgs.length && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGEST.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full border border-[#D5DCE8] bg-white px-3.5 py-2 text-sm font-medium transition hover:border-[#2B6BF3] hover:text-[#2B6BF3]">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(text)
            }}
            className="flex items-end gap-2 border-t border-[#E3E7F0] bg-white p-3 pb-[max(12px,env(safe-area-inset-bottom))]"
          >
            <textarea
              ref={input}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 800))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send(text)
                }
              }}
              rows={1}
              placeholder="Сұрағыңызды жазыңыз…"
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-[22px] bg-[#F1F3F7] px-4 py-2.5 text-base outline-none placeholder:text-[#9AA2B1] focus:bg-[#EDF0F5]"
            />
            <button type="submit" disabled={!text.trim() || busy} aria-label="Жіберу" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white transition disabled:opacity-30" style={{ background: BLUE }}>
              <Send size={18} />
            </button>
          </form>
        </section>
      </div>
    </>
  )
}

function Bubble({ role, text }: { role: 'user' | 'assistant'; text: string }) {
  const me = role === 'user'
  return (
    <div className={`flex ${me ? 'justify-end' : ''}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-[20px] px-4 py-2.5 text-[15px] leading-relaxed ${me ? 'rounded-br-md text-white' : 'rounded-bl-md bg-white shadow-sm'}`}
        style={me ? { background: BLUE } : { color: INK }}
      >
        {me ? text : <Rich text={text} />}
      </div>
    </div>
  )
}
