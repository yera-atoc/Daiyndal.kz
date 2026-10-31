'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { B, waLink } from '@/components/site/brand'
import { GRADES, inp, lbl } from '@/components/site/forms'

type Track = { id: string; title: string; who: string; minutes: number; count: number }
type Q = { text: string; options: string[]; topic: string }
type Result = { correct: number; total: number; level: string; text: string; weak: string[]; review: { given: string; key: string }[] }
const L = ['A', 'B', 'C', 'D']

export default function TrialTest({ tracks }: { tracks: Track[] }) {
  const [track, setTrack] = useState<Track | null>(null)
  const [step, setStep] = useState<'pick' | 'info' | 'test' | 'done'>('pick')
  const [info, setInfo] = useState({ child_name: '', grade: '', parent_name: '', phone: '', website: '' })
  const [qs, setQs] = useState<Q[]>([])
  const [ans, setAns] = useState<string[]>([])
  const [res, setRes] = useState<Result | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [start, setStart] = useState(0)
  const [now, setNow] = useState(0)

  useEffect(() => {
    if (step !== 'test') return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [step])

  const begin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    if (info.phone.replace(/\D/g, '').length < 10) return setErr('Телефон нөмірін толық жазыңыз')
    setBusy(true)
    try {
      const r = await fetch(`/api/trial?track=${track!.id}`)
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      setQs(j.questions)
      setAns([])
      setStart(Date.now())
      setNow(Date.now())
      setStep('test')
      window.scrollTo({ top: 0 })
    } catch (e: any) {
      setErr(e.message || 'Жүктелмеді')
    } finally {
      setBusy(false)
    }
  }

  const finish = async () => {
    setBusy(true)
    setErr('')
    try {
      const r = await fetch('/api/trial', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...info, track: track!.id, answers: ans }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      setRes(j)
      setStep('done')
      window.scrollTo({ top: 0 })
    } catch (e: any) {
      setErr(e.message || 'Жіберілмеді')
    } finally {
      setBusy(false)
    }
  }

  if (step === 'pick')
    return (
      <>
        <h1 className="font-display text-[2rem] font-semibold leading-tight sm:text-[2.6rem]">Тегін сынақ</h1>
        <p className="mt-3 max-w-xl leading-relaxed" style={{ color: B.muted }}>12 сұрақ, 15–25 минут. Нәтиже, деңгей және қай топқа барған дұрыс екені туралы ұсыныс бірден шығады.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {tracks.map((t, i) => (
            <button key={t.id} onClick={() => { setTrack(t); setStep('info') }} className="flex flex-col rounded-2xl border bg-white p-5 text-left transition hover:border-black" style={{ borderColor: B.line }}>
              <span className="self-start rounded-md px-2 py-0.5 text-xs font-semibold text-white" style={{ background: [B.blue, B.red, B.ink][i % 3] }}>{t.who}</span>
              <span className="font-display mt-3 text-xl font-semibold">{t.title}</span>
              <span className="mt-1 text-sm" style={{ color: B.muted }}>{t.count} сұрақ · ~{t.minutes} минут</span>
              <span className="mt-4 text-sm font-semibold" style={{ color: B.blue }}>Бастау →</span>
            </button>
          ))}
        </div>
      </>
    )

  if (step === 'info')
    return (
      <form onSubmit={begin} className="rounded-3xl border bg-white p-6 sm:p-8" style={{ borderColor: B.line }}>
        <button type="button" onClick={() => setStep('pick')} className="-ml-1 text-sm" style={{ color: B.blue }}>← Бағыттар</button>
        <h1 className="font-display mt-2 text-2xl font-semibold">{track!.title}</h1>
        <p className="mt-1 text-sm" style={{ color: B.muted }}>Нәтиже мен ұсынысты жіберу үшін деректеріңізді қалдырыңыз.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className={`${lbl} sm:col-span-2`}>Баланың аты-жөні *<input required value={info.child_name} onChange={(e) => setInfo({ ...info, child_name: e.target.value })} className={inp} autoComplete="off" /></label>
          <label className={lbl}>Сыныбы
            <select value={info.grade} onChange={(e) => setInfo({ ...info, grade: e.target.value })} className={inp}>
              <option value="">—</option>
              {GRADES.map((g) => <option key={g} value={g}>{g}-сынып</option>)}
            </select>
          </label>
          <label className={lbl}>Телефон (WhatsApp) *<input required type="tel" inputMode="tel" placeholder="+7 7__ ___ __ __" value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} className={inp} autoComplete="tel" /></label>
          <label className={`${lbl} sm:col-span-2`}>Ата-ананың аты<input value={info.parent_name} onChange={(e) => setInfo({ ...info, parent_name: e.target.value })} className={inp} autoComplete="name" /></label>
          <input tabIndex={-1} autoComplete="off" value={info.website} onChange={(e) => setInfo({ ...info, website: e.target.value })} className="hidden" aria-hidden />
        </div>
        {err && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
        <button disabled={busy} className="mt-6 w-full rounded-xl py-3.5 font-semibold text-white disabled:opacity-60" style={{ background: B.ink }}>{busy ? 'Жүктелуде…' : `Сынақты бастау · ${track!.count} сұрақ`}</button>
      </form>
    )

  if (step === 'test') {
    const filled = ans.filter(Boolean).length
    const sec = Math.max(0, Math.floor((now - start) / 1000))
    return (
      <>
        <div className="sticky top-16 z-10 -mx-4 border-b bg-[#F5F7FB]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6" style={{ borderColor: B.line }}>
          <div className="flex items-center justify-between text-sm">
            <b>{track!.title}</b>
            <span className="tabular-nums" style={{ color: B.muted }}>{String(Math.floor(sec / 60)).padStart(2, '0')}:{String(sec % 60).padStart(2, '0')} · {filled}/{qs.length}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E3E7F0]"><div className="h-full transition-all" style={{ width: `${(filled / qs.length) * 100}%`, background: B.blue }} /></div>
        </div>
        <ol className="mt-5 space-y-3">
          {qs.map((q, i) => (
            <li key={i} className="rounded-2xl border bg-white p-4" style={{ borderColor: B.line }}>
              <p className="font-semibold leading-snug"><span style={{ color: B.muted }}>{i + 1}.</span> {q.text}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {q.options.map((o, k) => (
                  <button key={k} onClick={() => setAns((p) => { const n = [...p]; n[i] = L[k]; return n })} className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition ${ans[i] === L[k] ? 'border-[#2B6BF3] bg-[#EEF3FE]' : 'border-[#E3E7F0]'}`}>
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${ans[i] === L[k] ? 'bg-[#2B6BF3] text-white' : 'bg-slate-100 text-slate-600'}`}>{L[k]}</span>
                    <span>{o}</span>
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ol>
        {err && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
        <button onClick={finish} disabled={busy || filled === 0} className="mt-6 w-full rounded-xl py-3.5 font-semibold text-white disabled:opacity-50" style={{ background: B.blue }}>
          {busy ? 'Тексерілуде…' : filled < qs.length ? `Аяқтау (${qs.length - filled} сұрақ бос)` : 'Аяқтау және нәтижені көру'}
        </button>
      </>
    )
  }

  const r = res!
  const pct = Math.round((r.correct / r.total) * 100)
  return (
    <>
      <div className="rounded-3xl p-6 text-white sm:p-8" style={{ background: B.ink }}>
        <div className="text-sm text-white/60">{info.child_name} · {track!.title}</div>
        <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
          <div className="font-display text-6xl font-semibold tabular-nums">{r.correct}<span className="text-2xl text-white/50"> / {r.total}</span></div>
          <div className="pb-2">
            <div className="text-xl font-semibold">{r.level}</div>
            <div className="text-sm text-white/60">{pct}% дұрыс</div>
          </div>
        </div>
        <p className="mt-4 max-w-xl leading-relaxed text-white/85">{r.text}</p>
      </div>
      {r.weak.length > 0 && (
        <div className="mt-4 rounded-2xl border bg-white p-5" style={{ borderColor: B.line }}>
          <h2 className="font-semibold">Қайталау керек тақырыптар</h2>
          <div className="mt-3 flex flex-wrap gap-2">{r.weak.map((w) => <span key={w} className="rounded-lg bg-rose-50 px-2.5 py-1 text-sm text-rose-700">{w}</span>)}</div>
          <div className="mt-4 grid grid-cols-6 gap-1.5 sm:grid-cols-12">
            {r.review.map((x, i) => (
              <div key={i} className={`grid h-10 place-items-center rounded-lg text-sm font-semibold text-white ${x.given === x.key ? 'bg-emerald-500' : x.given ? 'bg-red-500' : 'bg-amber-400'}`}>{i + 1}</div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4 rounded-2xl border bg-white p-5" style={{ borderColor: B.line }}>
        <h2 className="font-semibold">Келесі қадам</h2>
        <p className="mt-1 text-sm" style={{ color: B.muted }}>Менеджер {info.phone} нөміріне хабарласып, нәтижені түсіндіреді және лайықты топ ұсынады. Тезірек білгіңіз келсе — WhatsApp-қа жазыңыз.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <a href={waLink(`Сәлеметсіз бе! ${info.child_name} тегін сынақты тапсырды: ${track!.title}, ${r.correct}/${r.total} (${r.level}). Сабаққа жазылғымыз келеді.`)} target="_blank" rel="noopener noreferrer" className="rounded-xl px-5 py-3 text-center text-sm font-semibold text-white" style={{ background: '#16A34A' }}>WhatsApp-қа жазу</a>
          <Link href="/zhetistikter" className="rounded-xl border px-5 py-3 text-center text-sm font-semibold" style={{ borderColor: B.line }}>Оқушыларымыздың жетістіктері</Link>
        </div>
      </div>
      <button onClick={() => { setStep('pick'); setRes(null) }} className="mt-4 text-sm" style={{ color: B.blue }}>Басқа бағыт бойынша тапсыру</button>
    </>
  )
}
