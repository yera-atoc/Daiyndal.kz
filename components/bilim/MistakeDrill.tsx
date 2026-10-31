'use client'

// «Қатемен жұмыс»: оқушы өз қателерін бір-бірлеп қайта шешеді, жауабы бірден тексеріледі.
// Түзетілген сұрақтар телефонда сақталады; бәрі түзетілгенше «қалғандарын қайта шешу».
import { useEffect, useMemo, useState } from 'react'
import { LETTERS } from '@/lib/bilimTest'
import { collectMistakes } from '@/lib/bilimMistakes'
import type { StudentResult } from '@/lib/bilimTestResults'

const storeKey = (exam: string, student: string) => `bt_mistakes:${exam}:${student}`
function loadFixed(k: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(k) || '[]')
  } catch {
    return []
  }
}
function saveFixed(k: string, v: string[]) {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {}
}

export function mistakeCount(data: StudentResult) {
  return collectMistakes(data.exam, data.subs).length
}

export default function MistakeDrill({ data, onBack }: { data: StudentResult; onBack: () => void }) {
  const all = useMemo(() => collectMistakes(data.exam, data.subs), [data])
  const k = storeKey(data.exam.id, data.student)
  const [fixed, setFixed] = useState<string[]>([])
  const [subject, setSubject] = useState<string | 'all'>('all')
  const [queue, setQueue] = useState<string[] | null>(null)
  const [pos, setPos] = useState(0)
  const [pick, setPick] = useState('')
  const [missed, setMissed] = useState<string[]>([])

  useEffect(() => setFixed(loadFixed(k)), [k])

  const subjects = Array.from(new Map(all.map((m) => [m.subject, m.subjectName])).entries())
  const pool = all.filter((m) => subject === 'all' || m.subject === subject)
  const left = pool.filter((m) => !fixed.includes(m.id))
  const byId = new Map(all.map((m) => [m.id, m]))

  const start = (ids: string[]) => {
    setQueue(ids)
    setPos(0)
    setPick('')
    setMissed([])
    window.scrollTo({ top: 0 })
  }

  const back = (
    <button onClick={queue ? () => setQueue(null) : onBack} className="-ml-2 rounded-lg px-2 py-1 text-sm text-blue-600 active:bg-blue-50">
      ← {queue ? 'Қатемен жұмыс' : 'Нәтиже'}
    </button>
  )

  if (!all.length)
    return (
      <>
        {back}
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <h2 className="text-lg font-bold">Қате жоқ</h2>
          <p className="mt-1 text-slate-500">Бұл сынақта мәтіні бар сұрақтардан қате жібермегенсің. Жарайсың!</p>
        </div>
      </>
    )

  // ── Шешу ──
  if (queue) {
    if (pos >= queue.length) {
      const right = queue.length - missed.length
      return (
        <>
          {back}
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <div className="text-4xl font-extrabold tabular-nums">{right}<span className="text-xl text-slate-400"> / {queue.length}</span></div>
            <p className="mt-1 text-slate-600">{missed.length ? `${right} сұрақты түзеттің. ${missed.length} сұрақ әлі қиын — тағы бір рет шешіп көр.` : 'Бәрін түзеттің! Келесі сынақта осы тақырыптар саған оңай болады.'}</p>
            <div className="mt-5 grid gap-2">
              {missed.length > 0 && <button onClick={() => start(missed)} className="rounded-xl bg-blue-600 py-3 font-semibold text-white">Қиындарын қайта шешу ({missed.length})</button>}
              <button onClick={() => setQueue(null)} className="rounded-xl border border-slate-300 py-3 font-semibold">Тізімге оралу</button>
            </div>
          </div>
        </>
      )
    }
    const m = byId.get(queue[pos])!
    const q = m.question
    const real = q.options?.filter((o) => o && o !== '—').length ?? 0
    const letters = LETTERS.slice(0, real > 0 ? real : m.optionCount)
    const answered = !!pick
    const ok = pick === m.key
    const choose = (l: string) => {
      if (answered) return
      setPick(l)
      if (l === m.key) {
        const next = Array.from(new Set([...fixed, m.id]))
        setFixed(next)
        saveFixed(k, next)
      } else setMissed((x) => [...x, m.id])
    }
    return (
      <>
        {back}
        <div className="mt-1 flex items-center justify-between text-sm text-slate-500">
          <span>{m.subjectName} · {m.index + 1}-сұрақ</span>
          <span className="tabular-nums">{pos + 1} / {queue.length}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-blue-600 transition-all" style={{ width: `${(pos / queue.length) * 100}%` }} /></div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          {m.passage && <div className="mb-3 max-h-80 overflow-y-auto whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">{m.passage}</div>}
          {m.image && <img src={m.image} alt="" className="mb-3 max-h-72 rounded-lg border border-slate-200" />}
          {q.text && <p className="whitespace-pre-line font-semibold leading-snug">{q.text}</p>}
          {q.topic && <p className="mt-1 text-xs text-slate-400">Тақырып: {q.topic}</p>}
          <p className="mt-2 text-xs text-slate-500">Сынақта: {m.given ? <b className="text-red-600">{m.given}</b> : <b className="text-amber-600">бос қалдырдың</b>}</p>
          <div className="mt-3 grid gap-2">
            {letters.map((l, i) => {
              const tone = !answered ? (l === m.given ? 'border-slate-200 bg-slate-50' : 'border-slate-200 active:border-blue-300') : l === m.key ? 'border-emerald-500 bg-emerald-50' : l === pick ? 'border-red-500 bg-red-50' : 'border-slate-200 opacity-60'
              return (
                <button key={l} onClick={() => choose(l)} disabled={answered} className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition ${tone}`}>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${answered && l === m.key ? 'bg-emerald-500 text-white' : answered && l === pick ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'}`}>{l}</span>
                  <span className="text-[15px]">{q.options?.[i] ?? ''}</span>
                </button>
              )
            })}
          </div>
          {answered && (
            <div className={`mt-3 rounded-xl p-3 text-sm font-semibold ${ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
              {ok ? 'Дұрыс! Бұл қатені түзеттің ✓' : `Дұрыс жауап — ${m.key}. Мәтінді / шешуді қайта қарап шық, соңында тағы кездеседі.`}
            </div>
          )}
        </div>
        {answered && (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
            <div className="mx-auto max-w-xl">
              <button onClick={() => { setPick(''); setPos((p) => p + 1); window.scrollTo({ top: 0 }) }} className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white">
                {pos + 1 < queue.length ? 'Келесі сұрақ' : 'Қорытынды'}
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  // ── Тізім ──
  const topics = new Map<string, number>()
  for (const m of left) if (m.question.topic) topics.set(m.question.topic, (topics.get(m.question.topic) ?? 0) + 1)
  return (
    <>
      {back}
      <h1 className="mt-1 text-2xl font-bold">Қатемен жұмыс</h1>
      <p className="text-sm text-slate-500">{data.exam.title}: қате жіберген және бос қалдырған сұрақтарыңды қайта шеш. Жауабың бірден тексеріледі.</p>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-extrabold tabular-nums">{pool.length - left.length}<span className="text-lg text-slate-400"> / {pool.length}</span></div>
            <div className="text-xs text-slate-500">қате түзетілді</div>
          </div>
          {fixed.length > 0 && (
            <button onClick={() => { setFixed([]); saveFixed(k, []) }} className="text-xs text-slate-400 underline">Басынан бастау</button>
          )}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${pool.length ? ((pool.length - left.length) / pool.length) * 100 : 0}%` }} /></div>
        {subjects.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {[['all', 'Барлығы'] as [string, string], ...subjects].map(([id, name]) => {
              const n = all.filter((m) => (id === 'all' || m.subject === id) && !fixed.includes(m.id)).length
              return (
                <button key={id} onClick={() => setSubject(id)} className={`shrink-0 rounded-xl border px-3 py-1.5 text-sm ${subject === id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white'}`}>
                  {name} <span className={subject === id ? 'text-blue-100' : 'text-slate-400'}>{n}</span>
                </button>
              )
            })}
          </div>
        )}
        {topics.size > 0 && (
          <p className="mt-3 text-xs text-slate-500">Қайталайтын тақырыптар: {Array.from(topics.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, n]) => `${t} (${n})`).join(', ')}</p>
        )}
        <button
          onClick={() => start((left.length ? left : pool).map((m) => m.id))}
          className="mt-4 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white active:bg-blue-700"
        >
          {left.length ? `Бастау · ${left.length} сұрақ` : 'Бәрі түзетілді — қайта қайталау'}
        </button>
      </div>
      <ol className="mt-4 grid grid-cols-6 gap-1.5 sm:grid-cols-10">
        {pool.map((m) => (
          <li key={m.id}>
            <button onClick={() => start([m.id])} title={`${m.subjectName}, ${m.index + 1}`} className={`h-10 w-full rounded-lg text-sm font-semibold ${fixed.includes(m.id) ? 'bg-emerald-500 text-white' : m.given ? 'bg-red-500 text-white' : 'bg-amber-400 text-white'}`}>
              {m.index + 1}
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-slate-400">Қызыл — қате, сары — бос, жасыл — түзетілді. Нөмірді бассаң, сол сұрақ ашылады.</p>
    </>
  )
}
