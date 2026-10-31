'use client'

// Күннің 5 сұрағы: кабинеттегі карточка және шешу беті (тапсырған соң — шешімдері мен топ рейтингі)
import { useEffect, useState } from 'react'
import { LETTERS } from '@/lib/bilimTest'

type DailyData = {
  day: string
  trackName: string
  questions: { id: number; text: string; options: string[]; topic: string | null }[]
  result: { answers: string[]; correct: number; key: string[]; explain: string[] } | null
  streak: number
  board: { name: string; me: boolean; days: number; correct: number }[]
}

const draftKey = (day: string) => `bt_daily:${day}`

export function useDaily(enabled: boolean) {
  const [data, setData] = useState<DailyData | null>(null)
  const load = () =>
    fetch('/api/bilim-test/daily', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null))
  useEffect(() => {
    if (enabled) load()
  }, [enabled])
  return { data, setData, reload: load }
}

export function DailyCard({ data, onOpen }: { data: DailyData; onOpen: () => void }) {
  if (!data.questions.length) return null
  const done = !!data.result
  return (
    <button onClick={onOpen} className="mb-4 flex w-full items-center gap-3.5 rounded-2xl bg-gradient-to-r from-[#0E1424] to-[#1F2A4A] p-4 text-left text-white active:opacity-90">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10 text-center">
        <span>
          <span className="block text-lg font-extrabold leading-none">{data.streak}</span>
          <span className="block text-[9px] uppercase tracking-wider text-white/60">күн</span>
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">Күннің 5 сұрағы</span>
        <span className="block text-sm text-white/70">
          {done ? `Бүгін: ${data.result!.correct} / ${data.questions.length} · ертең жаңа сұрақтар` : `${data.trackName} · 5–10 минут`}
        </span>
      </span>
      <span className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold ${done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white text-[#0E1424]'}`}>{done ? 'Орындалды ✓' : 'Бастау'}</span>
    </button>
  )
}

export function DailyRunner({ data, onBack, onDone }: { data: DailyData; onBack: () => void; onDone: (d: DailyData) => void }) {
  const k = draftKey(data.day)
  const [ans, setAns] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(k) || '[]')
    } catch {
      return []
    }
  })
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => {
    try {
      localStorage.setItem(k, JSON.stringify(ans))
    } catch {}
  }, [k, ans])

  const r = data.result
  const filled = data.questions.filter((_, i) => ans[i]).length
  const submit = async () => {
    setSending(true)
    setErr('')
    try {
      const res = await fetch('/api/bilim-test/daily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: ans }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      try {
        localStorage.removeItem(k)
      } catch {}
      onDone(j)
      window.scrollTo({ top: 0 })
    } catch (e: any) {
      setErr(e.message || 'Жіберілмеді')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button onClick={onBack} className="-ml-2 rounded-lg px-2 py-1 text-sm text-blue-600 active:bg-blue-50">← Кабинет</button>
      <div className="mt-1 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Күннің 5 сұрағы</h1>
          <p className="text-sm text-slate-500">{data.trackName} · күн сайын жаңа сұрақтар</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-extrabold tabular-nums">{data.streak}</div>
          <div className="text-xs text-slate-500">күн қатарынан</div>
        </div>
      </div>

      {r && (
        <div className={`mt-4 rounded-2xl p-4 ${r.correct >= 4 ? 'bg-emerald-50' : r.correct >= 2 ? 'bg-blue-50' : 'bg-amber-50'}`}>
          <div className="text-3xl font-extrabold tabular-nums">{r.correct}<span className="text-lg text-slate-400"> / {data.questions.length}</span></div>
          <p className="text-sm text-slate-600">{r.correct === data.questions.length ? 'Керемет! Бәрі дұрыс.' : 'Төменде әр сұрақтың шешімі бар — қатені қарап шық.'} Ертең жаңа 5 сұрақ.</p>
        </div>
      )}

      <ol className="mt-4 space-y-3">
        {data.questions.map((q, i) => {
          const a = r ? r.answers[i] : ans[i]
          return (
            <li key={q.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex gap-2.5">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-line font-semibold leading-snug">{q.text}</p>
                  {q.topic && <p className="mt-0.5 text-xs text-slate-400">{q.topic}</p>}
                </div>
              </div>
              <div className="mt-3 grid gap-2">
                {q.options.map((o, j) => {
                  const l = LETTERS[j]
                  const key = r?.key[i]
                  const tone = r
                    ? l === key ? 'border-emerald-500 bg-emerald-50' : l === a ? 'border-red-500 bg-red-50' : 'border-slate-200 opacity-60'
                    : a === l ? 'border-blue-600 bg-blue-50' : 'border-slate-200 active:border-blue-300'
                  return (
                    <button key={l} disabled={!!r} onClick={() => setAns((p) => { const n = [...p]; n[i] = n[i] === l ? '' : l; return n })} className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition ${tone}`}>
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${r && l === key ? 'bg-emerald-500 text-white' : r && l === a ? 'bg-red-500 text-white' : !r && a === l ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{l}</span>
                      <span className="text-[15px]">{o}</span>
                    </button>
                  )
                })}
              </div>
              {r && r.explain[i] && <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><b>Шешімі:</b> {r.explain[i]}</p>}
            </li>
          )
        })}
      </ol>

      {r && data.board.length > 0 && (
        <section className="mt-6">
          <h2 className="font-bold">Топ рейтингі · осы ай</h2>
          <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {data.board.map((b, i) => (
              <div key={b.name} className={`flex items-center gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-0 ${b.me ? 'bg-blue-50 font-semibold' : ''}`}>
                <span className="w-6 text-right tabular-nums text-slate-400">{i + 1}</span>
                <span className="flex-1 truncate">{b.name}</span>
                <span className="tabular-nums text-slate-500">{b.days} күн</span>
                <span className="w-14 text-right font-bold tabular-nums">{b.correct} ✓</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {!r && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
          <div className="mx-auto max-w-xl">
            {err && <p className="mb-2 rounded-xl bg-rose-50 p-2 text-sm text-rose-700">{err}</p>}
            <button onClick={submit} disabled={sending || filled === 0} className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white disabled:opacity-50">
              {sending ? 'Тексерілуде…' : `Тексеру (${filled} / ${data.questions.length})`}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
