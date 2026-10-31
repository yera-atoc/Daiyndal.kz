'use client'

import Link from 'next/link'
import { useState } from 'react'
import { B, waLink } from '@/components/site/brand'
import { DIRECTIONS, GRADES, inp, lbl } from '@/components/site/forms'

export default function SignupForm({ initialDirection }: { initialDirection?: string }) {
  const [f, setF] = useState({ child_name: '', grade: '', parent_name: '', phone: '', direction: DIRECTIONS.find((d) => d.startsWith(initialDirection ?? '~')) ?? '', comment: '', website: '' })
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setErr('')
    try {
      const r = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      setDone(true)
    } catch (e: any) {
      setErr(e.message || 'Жіберілмеді')
    } finally {
      setSending(false)
    }
  }

  if (done)
    return (
      <div className="self-start rounded-3xl border bg-white p-6 sm:p-8" style={{ borderColor: B.line }}>
        <div className="grid h-12 w-12 place-items-center rounded-2xl text-2xl text-white" style={{ background: '#16A34A' }}>✓</div>
        <h2 className="font-display mt-4 text-2xl font-semibold">Өтінім қабылданды</h2>
        <p className="mt-2" style={{ color: B.muted }}>Рақмет! Менеджер жақын арада {f.phone} нөміріне хабарласады.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href="/sinaq" className="rounded-xl px-5 py-3 text-center text-sm font-semibold text-white" style={{ background: B.blue }}>Тегін сынақ тапсыру</Link>
          <a href={waLink(`Сәлеметсіз бе! Сайттан өтінім қалдырдым: ${f.child_name}, ${f.grade ? f.grade + '-сынып, ' : ''}${f.direction}.`)} target="_blank" rel="noopener noreferrer" className="rounded-xl border px-5 py-3 text-center text-sm font-semibold" style={{ borderColor: B.line }}>WhatsApp-қа жазу</a>
        </div>
      </div>
    )

  return (
    <form onSubmit={submit} className="self-start rounded-3xl border bg-white p-6 sm:p-8" style={{ borderColor: B.line }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={`${lbl} sm:col-span-2`}>Баланың аты-жөні *<input required value={f.child_name} onChange={set('child_name')} className={inp} autoComplete="off" /></label>
        <label className={lbl}>Сыныбы
          <select value={f.grade} onChange={set('grade')} className={inp}>
            <option value="">—</option>
            {GRADES.map((g) => <option key={g} value={g}>{g}-сынып</option>)}
          </select>
        </label>
        <label className={lbl}>Бағыт
          <select value={f.direction} onChange={set('direction')} className={inp}>
            <option value="">—</option>
            {DIRECTIONS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </label>
        <label className={lbl}>Ата-ананың аты<input value={f.parent_name} onChange={set('parent_name')} className={inp} autoComplete="name" /></label>
        <label className={lbl}>Телефон (WhatsApp) *<input required type="tel" inputMode="tel" placeholder="+7 7__ ___ __ __" value={f.phone} onChange={set('phone')} className={inp} autoComplete="tel" /></label>
        <label className={`${lbl} sm:col-span-2`}>Қосымша (міндетті емес)<textarea rows={3} value={f.comment} onChange={set('comment')} className={inp} placeholder="Мысалы: НЗМ-ге 2027 жылы түсуді жоспарлап отырмыз" /></label>
        {/* Боттарға арналған жасырын өріс */}
        <input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} name="website" className="hidden" aria-hidden />
      </div>
      {err && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
      <button disabled={sending} className="mt-6 w-full rounded-xl py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60" style={{ background: B.ink }}>
        {sending ? 'Жіберілуде…' : 'Өтінім жіберу'}
      </button>
      <p className="mt-3 text-center text-xs" style={{ color: B.muted }}>Деректеріңіз тек орталық менеджеріне көрінеді.</p>
    </form>
  )
}
