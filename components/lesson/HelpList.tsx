'use client'

import { useEffect, useMemo, useState } from 'react'
import { dayMonth, todayAlmaty } from '@/lib/journal'
import type { HelpStudent } from '@/lib/help'
import { BLUE, INK, LINE, MUTED, SOFT, Toast } from './ui'

const KEY = 'beles-help-contacted'
const TONE = { bad: { bg: '#FEF2F2', fg: '#B91C1C' }, warn: { bg: '#FFFBEB', fg: '#B45309' } }

/** «Көмек керек» оқушылар: себебі нақты, ата-анаға бір басумен жазу, «хабарластым» белгісі. */
export default function HelpList({ admin, onBack }: { admin?: boolean; onBack?: () => void }) {
  const [data, setData] = useState<{ students: HelpStudent[]; checked: number } | null>(null)
  const [err, setErr] = useState('')
  const [teacher, setTeacher] = useState('')
  const [q, setQ] = useState('')
  const [done, setDone] = useState<Record<string, string>>({})
  const [toast, setToast] = useState('')

  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || '{}')
      // 14 күннен ескі белгілер өшеді — оқушы қайта тізімде болса, қайта хабарласу керек
      const fresh = Object.fromEntries(Object.entries(v).filter(([, d]) => typeof d === 'string' && d >= new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10)))
      setDone(fresh as Record<string, string>)
    } catch {}
    fetch('/api/lesson/help', { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(j.error || 'Жүктелмеді')
        setData(j)
      })
      .catch((e) => setErr(e.message))
  }, [])

  const mark = (id: string, on: boolean) => {
    const next = { ...done }
    if (on) next[id] = todayAlmaty()
    else delete next[id]
    setDone(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {}
  }

  const teachers = useMemo(() => Array.from(new Set((data?.students ?? []).flatMap((s) => s.classes.map((c) => c.teacher)).filter(Boolean))).sort(), [data])
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return (data?.students ?? [])
      .map((s) => (teacher ? { ...s, classes: s.classes.filter((c) => c.teacher === teacher) } : s))
      .filter((s) => s.classes.length && (!t || `${s.name} ${s.group ?? ''}`.toLowerCase().includes(t)))
      .sort((a, b) => Number(!!done[a.id]) - Number(!!done[b.id]))
  }, [data, teacher, q, done])
  const open = list.filter((s) => !done[s.id]).length

  const copy = async (s: HelpStudent) => {
    try {
      await navigator.clipboard.writeText(s.reportUrl)
      setToast('Есеп сілтемесі көшірілді')
    } catch {
      window.prompt('Сілтемені көшіріңіз:', s.reportUrl)
    }
    setTimeout(() => setToast(''), 2200)
  }

  return (
    <div className="mt-6" style={{ color: INK }}>
      {onBack && <button onClick={onBack} className="mb-1 text-sm font-semibold" style={{ color: BLUE }}>← Артқа</button>}
      <h1 className="font-display text-2xl font-semibold tracking-tight">Көмек керек оқушылар</h1>
      <p className="mt-1 text-sm" style={{ color: MUTED }}>
        Соңғы 30 күн: қатарынан келмеген, үй тапсырмасын орындамай жүрген, бағасы төмен немесе түсіп бара жатқан оқушылар. Себебі пән бойынша көрсетілген — ата-анаға бір басумен жазыңыз.
      </p>

      {err && <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{err}</p>}
      {!data && !err && <p className="py-12 text-center text-sm" style={{ color: MUTED }}>Тексерілуде…</p>}

      {data && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-xl px-3 py-2 text-sm font-semibold" style={{ background: open ? '#FEF2F2' : '#F0FDF4', color: open ? '#B91C1C' : '#15803D' }}>
              {open ? `${open} оқушыға көмек керек` : 'Барлығы жақсы — көмек керек оқушы жоқ'}
            </span>
            <span className="text-xs" style={{ color: MUTED }}>{data.checked} оқушы тексерілді</span>
            <div className="ml-auto flex flex-wrap gap-2">
              {admin && teachers.length > 1 && (
                <select value={teacher} onChange={(e) => setTeacher(e.target.value)} className="h-10 rounded-xl border bg-white px-2 text-sm" style={{ borderColor: LINE }} aria-label="Мұғалім">
                  <option value="">Барлық мұғалім</option>
                  {teachers.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
              {data.students.length > 8 && <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Іздеу" className="h-10 w-40 rounded-xl border bg-white px-3 text-sm" style={{ borderColor: LINE }} />}
            </div>
          </div>

          <ul className="mt-3 space-y-2">
            {list.map((s) => {
              const isDone = !!done[s.id]
              const red = s.classes.some((c) => c.reasons.some((r) => r.tone === 'bad'))
              return (
                <li key={s.id} className="rounded-2xl border bg-white p-4" style={{ borderColor: LINE, opacity: isDone ? 0.6 : 1 }}>
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 font-semibold">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: isDone ? '#22C55E' : red ? '#EF4444' : '#F59E0B' }} />
                        <span className="truncate">{s.name}</span>
                      </div>
                      <div className="text-xs" style={{ color: MUTED }}>{[s.group, isDone && `хабарласылды ${dayMonth(done[s.id])}`].filter(Boolean).join(' · ')}</div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <a href={s.reportUrl} target="_blank" rel="noreferrer" className="rounded-lg border px-2.5 py-2 text-xs font-semibold" style={{ borderColor: LINE }}>Есеп</a>
                      {s.wa ? (
                        <a href={s.wa} target="_blank" rel="noreferrer" onClick={() => mark(s.id, true)} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-white" style={{ background: '#16A34A' }}>Ата-анаға</a>
                      ) : (
                        <button onClick={() => copy(s)} className="rounded-lg px-2.5 py-2 text-xs font-semibold" style={{ background: SOFT }} title="Ата-ананың нөмірі CRM-де жоқ">Көшіру</button>
                      )}
                    </div>
                  </div>
                  <ul className="mt-2.5 space-y-1.5">
                    {s.classes.map((c) => (
                      <li key={c.classId} className="text-sm">
                        <span className="font-medium">{c.subject || c.className}</span>
                        {admin && c.teacher && <span style={{ color: MUTED }}> · {c.teacher}</span>}
                        <span className="mt-1 flex flex-wrap gap-1">
                          {c.reasons.map((r) => (
                            <span key={r.kind} className="rounded-md px-2 py-0.5 text-xs font-semibold" style={{ background: TONE[r.tone].bg, color: TONE[r.tone].fg }}>{r.text}</span>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => mark(s.id, !isDone)} className="mt-2.5 text-xs font-semibold" style={{ color: isDone ? MUTED : BLUE }}>
                    {isDone ? 'Белгіні алу' : '✓ Хабарластым'}
                  </button>
                </li>
              )
            })}
          </ul>
          {list.length > 0 && <p className="mt-3 text-xs" style={{ color: MUTED }}>«Хабарластым» белгісі осы құрылғыда 14 күн сақталады. Себептер журналдағы белгілерден автоматты есептеледі — белгі қойылмаса, оқушы тізімге түспейді.</p>}
        </>
      )}
      <Toast text={toast} />
    </div>
  )
}
