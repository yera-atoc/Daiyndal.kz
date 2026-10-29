'use client'

// Жылдық есеп (PDF): барлық айлардың Білім тексеру нәтижесі бір парақта — Қыркүйек, Қазан, … және келесі айлар бос
import { useEffect, useState } from 'react'
import PrintStyles from '@/components/bilim/PrintStyles'
import { MONTHS_GEN } from '@/components/bilim/ReportSheet'
import { countdown, seasonFor, type SeasonView } from '@/lib/bilimSeason'

const BLUE = '#2563EB'

type Me = { student: { id: string; name: string }; group: { id: string; name: string }; season?: SeasonView | null }

function today() {
  const d = new Date()
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`
}

export default function Page() {
  const [me, setMe] = useState<Me | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    fetch('/api/bilim-test/me', { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json()
        if (r.status === 401) throw new Error('Алдымен кабинетке кіріңіз')
        if (!r.ok) throw new Error(j.error)
        if (!j.season) throw new Error('Бұл топ үшін жылдық есеп жоқ')
        setMe(j)
        document.title = `${j.student.name} — Білім тексеру нәтижелері` // PDF файлының атауы
      })
      .catch((e) => setErr(e.message))
  }, [])

  return (
    <div id="bt-report" className="min-h-screen bg-slate-200">
      <PrintStyles />
      <div className="bt-toolbar sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <a href="/bilim-test" className="text-sm text-blue-600">← Кабинет</a>
        <button onClick={() => window.print()} disabled={!me} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          PDF сақтау
        </button>
      </div>
      {err && <p className="p-10 text-center text-rose-600">{err}</p>}
      {!me && !err && <p className="p-10 text-center text-slate-400">Жүктелуде…</p>}
      {me?.season && (
        <div className="bt-pages py-6">
          <SeasonSheet me={me} season={me.season} />
        </div>
      )}
    </div>
  )
}

function SeasonSheet({ me, season }: { me: Me; season: SeasonView }) {
  const cfg = seasonFor(me.group.id, me.group.name)
  const row = season.rows.find((r) => r.me)
  const months = season.months
  // Пән бағандары: нәтижесі бар айлардағы барлық пән (соңғы айдың максимумымен)
  const subjects: { id: string; short: string; max: number }[] = []
  for (const m of [...months].reverse()) for (const s of m.subjects) if (!subjects.some((x) => x.id === s.id)) subjects.push(s)
  const done = months.filter((m) => row?.cells[m.month])
  const last = done.at(-1)
  const lastCell = last ? row!.cells[last.month]! : null
  const prev = done.length > 1 ? done[done.length - 2] : null
  const prevCell = prev ? row!.cells[prev.month]! : null
  const pct = (c: { total: number; max: number }) => (c.max ? (c.total / c.max) * 100 : 0)
  const diff = lastCell && prevCell ? pct(lastCell) - pct(prevCell) : null
  const best = done.reduce<{ name: string; p: number } | null>((b, m) => {
    const p = pct(row!.cells[m.month]!)
    return !b || p > b.p ? { name: m.name, p } : b
  }, null)
  const cd = cfg ? countdown(new Date(), new Date(cfg.examDate)) : null

  return (
    <section className="bt-sheet mx-auto flex flex-col bg-white text-[#111] shadow-xl">
      <div className="flex items-start justify-between">
        <img src="/beles-logo.png" alt="Beles education" style={{ height: '14mm' }} />
        <div className="text-right">
          <div className="text-[9pt] font-bold uppercase tracking-[.12em]" style={{ color: BLUE }}>Білім тексеру · жылдық есеп</div>
          <div className="mt-1 text-[10pt] text-slate-500">{me.group.name}</div>
        </div>
      </div>
      <div className="mt-[5mm] h-[1.2mm] bg-black" />

      <h1 className="mt-[6mm] text-[26pt] font-extrabold leading-none tracking-tight">{me.student.name}</h1>
      <p className="mt-[2mm] text-[10.5pt] text-slate-500">
        Айлар бойынша нәтиже: {months[0]?.name.toLowerCase()} – {months.at(-1)?.name.toLowerCase()} {months.at(-1)?.month.slice(0, 4)}
        {cfg && cd && !cd.done && <> · {cfg.examName}на дейін <b className="text-black">{cd.months} ай {cd.days} күн</b> ({cfg.examLabel})</>}
      </p>

      <div className="mt-[6mm] grid grid-cols-3 gap-[4mm]">
        <Kpi label={last ? `${last.name} — соңғы нәтиже` : 'Соңғы нәтиже'} value={lastCell ? `${lastCell.total}` : '—'} sub={lastCell ? `/ ${lastCell.max} · ${pct(lastCell).toFixed(0)} %` : 'әлі жоқ'} />
        <Kpi label="Топтағы орны" value={lastCell ? `${lastCell.place}` : '—'} sub={last && lastCell ? `${last.of} оқушының ішінде` : ''} />
        <Kpi
          label={prev ? `${prev.name} айымен салыстырғанда` : 'Өзгеріс'}
          value={diff === null ? '—' : `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${Math.abs(diff).toFixed(0)} %`}
          sub={diff === null ? 'екі айдың нәтижесі керек' : best ? `ең жақсы ай: ${best.name.toLowerCase()}` : ''}
          tone={diff === null ? undefined : diff >= 0 ? '#16A34A' : '#DC2626'}
        />
      </div>

      <h2 className="mt-[7mm] text-[13pt] font-bold">Айлар бойынша баллдар</h2>
      <table className="mt-[2mm] w-full border-collapse text-[9.5pt]">
        <thead>
          <tr className="border-b-2 border-black text-[7.5pt] uppercase tracking-[.08em] text-slate-500">
            <th className="py-[1.6mm] text-left font-semibold">Ай</th>
            {subjects.map((s) => <th key={s.id} className="py-[1.6mm] text-right font-semibold">{s.short}</th>)}
            <th className="py-[1.6mm] text-right font-semibold text-black">Жалпы</th>
            <th className="py-[1.6mm] text-right font-semibold">%</th>
            <th className="py-[1.6mm] text-right font-semibold">Орны</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => {
            const c = row?.cells[m.month] ?? null
            const pending = !c
            return (
              <tr key={m.month} className="border-b border-slate-200" style={pending ? { color: '#94A3B8' } : undefined}>
                <td className="py-[1.8mm]"><b className={pending ? 'font-semibold' : ''}>{m.name}</b> <span className="text-[7.5pt] text-slate-400">{m.month.slice(0, 4)}</span></td>
                {subjects.map((s) => {
                  const inMonth = m.subjects.some((x) => x.id === s.id)
                  const v = c?.scores[s.id]
                  return (
                    <td key={s.id} className="py-[1.8mm] text-right tabular-nums">
                      {c ? (typeof v === 'number' ? <>{v}<span className="text-[7pt] text-slate-400">/{m.subjects.find((x) => x.id === s.id)?.max}</span></> : inMonth ? <span className="text-[8pt] text-slate-400">тапсырмаған</span> : '—') : ''}
                    </td>
                  )
                })}
                <td className="py-[1.8mm] text-right font-bold tabular-nums">
                  {c ? <>{c.total}<span className="text-[7pt] font-normal text-slate-400">/{c.max}</span></> : <span className="text-[8.5pt] font-normal">{m.shown && m.of ? 'тапсырмаған' : 'күтілуде'}</span>}
                </td>
                <td className="py-[1.8mm] text-right tabular-nums">{c ? `${pct(c).toFixed(0)}` : ''}</td>
                <td className="py-[1.8mm] text-right tabular-nums">{c ? <>{c.place}<span className="text-[7pt] text-slate-400">/{m.of}</span></> : ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <h2 className="mt-[7mm] text-[13pt] font-bold">Өсу динамикасы, %</h2>
      <div className="mt-[3mm] flex h-[48mm] items-end gap-[3mm] border-b border-slate-300 pb-[1mm]">
        {months.map((m) => {
          const c = row?.cells[m.month] ?? null
          const p = c ? pct(c) : 0
          return (
            <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end">
              {c && <div className="mb-[1mm] text-[8.5pt] font-bold">{p.toFixed(0)}</div>}
              <div className="w-full rounded-t-[1.2mm]" style={c ? { height: `${Math.max(2, p)}%`, background: m.month === last?.month ? BLUE : '#93B4F6' } : { height: '3mm', border: '1px dashed #CBD5E1', borderBottom: 0 }} />
            </div>
          )
        })}
      </div>
      <div className="mt-[1.5mm] flex gap-[3mm] text-center text-[8pt] text-slate-500">
        {months.map((m) => <div key={m.month} className="flex-1">{m.name.slice(0, 3)}</div>)}
      </div>

      <p className="mt-[6mm] text-[8.5pt] leading-snug text-slate-500">
        Жалпы балл айдың барлық пәні бойынша есептеледі; тапсырылмаған пән 0 болып саналады. Орны — топ ішіндегі орын.
        Бос айлардың нәтижесі сол айдың Білім тексеру сынағынан кейін толады.
      </p>

      <div className="mt-auto flex justify-between border-t border-slate-200 pt-[3mm] text-[8pt] text-slate-500">
        <span>Beles education · Білім тексеру</span>
        <span>{me.student.name} · {today()}</span>
      </div>
    </section>
  )
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-[3mm] bg-[#F1F5FE] px-[4mm] py-[3.5mm]">
      <div className="text-[8pt] font-bold uppercase tracking-[.08em] text-slate-500">{label}</div>
      <div className="mt-[1mm] text-[22pt] font-extrabold leading-none" style={tone ? { color: tone } : undefined}>{value}</div>
      {sub && <div className="mt-[1mm] text-[8.5pt] text-slate-500">{sub}</div>}
    </div>
  )
}
