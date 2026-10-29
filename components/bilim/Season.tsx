'use client'

// Маусым: нағыз емтиханға дейінгі кері санақ, айлар жолағы және айлар бойынша рейтинг кестесі
import { useEffect, useState } from 'react'
import { countdown, type SeasonConfig, type SeasonMonth, type SeasonView } from '@/lib/bilimSeason'

const pad = (n: number) => String(n).padStart(2, '0')

export function ExamCountdown({ cfg, compact = false }: { cfg: SeasonConfig; compact?: boolean }) {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const c = now ? countdown(now, new Date(cfg.examDate)) : null
  const parts: [number | string, string][] = c
    ? [
        [c.months, 'ай'],
        [c.days, 'күн'],
        [pad(c.hours), 'сағат'],
        [pad(c.minutes), 'минут'],
        ...(compact ? [] : ([[pad(c.seconds), 'секунд']] as [string, string][])),
      ]
    : []
  return (
    <section
      aria-label={`${cfg.examName}на дейін`}
      className="relative overflow-hidden rounded-2xl bg-[#0E1424] p-4 text-white sm:p-5"
    >
      <div aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#2B6BF3] to-[#E5383B]" />
      <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[.14em] text-blue-300">{cfg.examName}на дейін</div>
          <div className="mt-0.5 text-sm text-white/70">{cfg.examLabel}</div>
        </div>
        {c?.done ? (
          <div className="text-lg font-bold">Емтихан күні келді. Сәттілік!</div>
        ) : (
          <div className="flex items-end gap-2 sm:gap-3" role="timer" aria-live="off">
            {c
              ? parts.map(([v, l], i) => (
                  <div key={l} className={`text-center ${i > 1 ? 'opacity-80' : ''}`}>
                    <div className={`font-extrabold tabular-nums leading-none ${i < 2 ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'}`}>{v}</div>
                    <div className="mt-1 text-[11px] text-white/60">{l}</div>
                  </div>
                ))
              : <div className="h-10" />}
          </div>
        )}
      </div>
      {c && !c.done && <div className="relative mt-3 text-xs text-white/55">Барлығы {c.totalDays} күн қалды. Әр айдағы Білім тексеру сынағы — соған дайындық.</div>}
    </section>
  )
}

// Оқушының айлар жолағы: Қыркүйек ✓, Қазан…, Қараша — күтілуде
export function SeasonStrip({ season, onOpen }: { season: SeasonView; onOpen?: (examId: string) => void }) {
  const me = season.rows.find((r) => r.me)
  return (
    <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h3 className="font-bold">Білім тексеру сынақтары</h3>
      <p className="mt-0.5 text-xs text-slate-500">Ай сайынғы нәтижелерің осында сақталады.</p>
      <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {season.months.map((m) => {
          const cell = me?.cells[m.month] ?? null
          const st = monthState(m, cell, season.mine?.[m.month] ?? null)
          const click = cell && m.examId && onOpen ? () => onOpen(m.examId!) : undefined
          return (
            <li key={m.month}>
              <button
                type="button"
                disabled={!click}
                onClick={click}
                className={`flex h-full w-full flex-col rounded-xl border p-3 text-left ${st.tone} ${click ? 'active:scale-[.99]' : 'cursor-default'}`}
              >
                <span className="text-[13px] font-semibold">{m.name}</span>
                {cell ? (
                  <>
                    <span className="mt-1 text-xl font-extrabold tabular-nums leading-none">{cell.total}<span className="text-xs font-medium text-slate-400"> / {cell.max}</span></span>
                    <span className="mt-1 text-xs text-slate-500">{cell.place}-орын · {m.of} оқушы</span>
                  </>
                ) : (
                  <span className="mt-1 text-xs">{st.label}</span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function monthState(m: SeasonMonth, cell: unknown, mine: 'submitted' | null) {
  if (cell) return { label: '', tone: 'border-blue-200 bg-blue-50/40' }
  if (m.kind === 'exam' && !m.shown)
    return mine
      ? { label: 'Тапсырылды · нәтиже жарияланғанда шығады', tone: 'border-emerald-200 bg-emerald-50 text-emerald-800' }
      : m.open
        ? { label: 'Сынақ ашық — «Сынақ» бетінде', tone: 'border-blue-300 bg-white text-blue-700' }
        : { label: 'Білім тексеру сынағы', tone: 'border-dashed border-slate-300 bg-slate-50 text-slate-500' }
  if (m.shown) return { label: 'Тапсырмаған', tone: 'border-slate-200 bg-slate-50 text-slate-500' }
  return { label: 'Білім тексеру сынағы', tone: 'border-dashed border-slate-300 bg-slate-50 text-slate-400' }
}

// Айлар бойынша рейтинг: әр айдың жалпы баллы мен орны
export function SeasonMatrix({ season, admin = false, onOpen }: { season: SeasonView; admin?: boolean; onOpen?: (name: string) => void }) {
  const ms = season.months
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
            <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2.5 font-semibold uppercase tracking-wider">Оқушы</th>
            {ms.map((m) => (
              <th key={m.month} className={`px-2 py-2.5 text-right font-semibold ${m.shown && m.of ? 'text-slate-700' : 'text-slate-400'}`}>
                <div>{m.name.slice(0, 3)}</div>
                <div className="text-[10px] font-normal">
                  {m.shown && m.max ? `/ ${m.max}` : m.kind === 'exam' ? 'күтілуде' : '—'}
                  {admin && m.kind === 'exam' && !m.published ? ' · жарияланбаған' : ''}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {season.rows.map((r) => (
            <tr key={r.id} className={`border-b border-slate-100 last:border-0 ${r.me ? 'bg-blue-50 font-semibold' : ''}`}>
              <td className={`sticky left-0 z-10 whitespace-nowrap px-3 py-2 ${r.me ? 'bg-blue-50' : 'bg-white'}`}>
                {admin && onOpen ? (
                  <button className="text-left hover:underline" onClick={() => onOpen(r.name)}>{r.name}</button>
                ) : (
                  r.name
                )}
                {r.me && <span className="ml-1.5 rounded bg-blue-600 px-1.5 text-xs text-white">сен</span>}
              </td>
              {ms.map((m) => {
                const c = r.cells[m.month]
                return (
                  <td key={m.month} className="px-2 py-2 text-right tabular-nums">
                    {c ? (
                      <>
                        <b>{c.total}</b>
                        <span className={`ml-1 text-[11px] ${c.place <= 3 ? 'text-blue-600' : 'text-slate-400'}`}>#{c.place}</span>
                      </>
                    ) : (
                      <span className="text-slate-300">·</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
