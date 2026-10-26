'use client'

import Link from 'next/link'
import { avgPct, comment, lastDelta, level, nextSteps, pcts, type MySubject } from '@/lib/subjectTests'

const INK = '#0E1424'
const BLUE = '#2B6BF3'
const MUTED = '#687085'
const LINE = '#E3E7F0'

/** Тест сайынғы пайыз: бағандар + топтың орташасы (сызық). Тапсырылмаған тест — бос орын. */
export function SubjectChart({ m, height = 150, slots }: { m: MySubject; height?: number; slots?: number }) {
  const t = m.sheet.tests
  const p = pcts(m.scores, t)
  const n = Math.max(slots ?? 0, t.length)
  const lastDone = p.map((x, i) => (x === null ? -1 : i)).filter((i) => i >= 0).pop() ?? -1
  return (
    <div>
      <div className="grid items-end gap-2.5 sm:gap-4" style={{ gridTemplateColumns: `repeat(${n}, minmax(0,1fr))`, height }}>
        {Array.from({ length: n }, (_, i) => {
          const v = p[i] ?? null
          const g = m.groupAvg[i] ?? null
          const future = i >= t.length || (v === null && i > lastDone)
          return (
            <div key={i} className="relative flex h-full flex-col justify-end">
              {v !== null ? (
                <div className="stripe relative rounded-t-[10px] rounded-b-[4px]" style={{ height: `${Math.max(v, 3)}%`, background: BLUE, animationDelay: `${i * 70}ms` }}>
                  <span className="absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-white px-1 text-[13px] font-semibold tabular-nums" style={{ color: INK }}>{v}%</span>
                </div>
              ) : (
                <div className="grid h-full place-items-center rounded-[10px] border-[1.5px] border-dashed text-[11px]" style={{ borderColor: '#CDD3DF', color: '#9AA1B2' }}>
                  {future ? 'алда' : 'жоқ'}
                </div>
              )}
              {g !== null && v !== null && <div className="pointer-events-none absolute -left-1 -right-1 border-t-2 opacity-50" style={{ bottom: `${g}%`, borderColor: INK }} />}
            </div>
          )
        })}
      </div>
      <div className="mt-2 grid gap-2.5 text-center text-[11.5px] sm:gap-4" style={{ gridTemplateColumns: `repeat(${n}, minmax(0,1fr))`, color: MUTED }}>
        {Array.from({ length: n }, (_, i) => <div key={i} className="truncate">{t[i]?.title ?? `${i + 1}-тест`}</div>)}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-[11.5px]" style={{ color: MUTED }}>
        <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-3.5 rounded-sm" style={{ background: BLUE }} />Менің нәтижем, % дұрыс</span>
        <span className="flex items-center gap-1.5"><i className="inline-block w-3.5 border-t-2 opacity-50" style={{ borderColor: INK }} />Топтың орташасы</span>
      </div>
    </div>
  )
}

/** Кабинеттегі карточка */
export function SubjectCard({ m }: { m: MySubject }) {
  const t = m.sheet.tests
  const p = pcts(m.scores, t)
  const avg = avgPct(m.scores, t)
  const lv = avg !== null ? level(avg) : null
  const dl = lastDelta(p)
  const li = p.map((x, i) => (x === null ? -1 : i)).filter((i) => i >= 0).pop()
  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-[#E3E7F0] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: BLUE }}>{m.sheet.subject}</p>
          <h2 className="font-display mt-0.5 text-lg font-semibold">{m.sheet.name}</h2>
        </div>
        {lv && <span className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ background: lv.color }}>{lv.label}</span>}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Mini label="Соңғы тест" value={li !== undefined ? `${m.scores[li]} / ${t[li].max}` : '—'} sub={li !== undefined ? t[li].title : ''} />
        <Mini label="Өзгеріс" value={dl ? `${dl.d > 0 ? '+' : ''}${dl.d}` : '—'} sub={dl ? 'п.п.' : 'бір тест'} tone={dl ? (dl.d > 0 ? '#0F9D6B' : dl.d < 0 ? '#E5383B' : undefined) : undefined} />
        <Mini label="Орны" value={m.rank ? `${m.rank} / ${m.of}` : '—'} sub="барлығы" />
      </div>
      <div className="mt-8"><SubjectChart m={m} height={130} slots={Math.max(5, t.length)} /></div>
      <Link href={`/ubt/subject?s=${m.sheet.id}`} className="mt-5 flex items-center justify-center rounded-2xl py-3 text-sm font-semibold text-white" style={{ background: INK }}>
        Толық есеп және PDF
      </Link>
    </div>
  )
}

function Mini({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-2xl px-3 py-2.5" style={{ background: '#F5F7FB' }}>
      <div className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>{label}</div>
      <div className="font-display mt-0.5 text-lg font-semibold tabular-nums" style={{ color: tone ?? INK }}>{value}</div>
      {sub && <div className="truncate text-[11px]" style={{ color: MUTED }}>{sub}</div>}
    </div>
  )
}

/** PDF есептің мазмұны (A4) */
export function SubjectReportBody({ m }: { m: MySubject }) {
  const t = m.sheet.tests
  const p = pcts(m.scores, t)
  const avg = avgPct(m.scores, t)
  const lv = avg !== null ? level(avg) : null
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-sm" style={{ color: MUTED }}>
        <span>{m.sheet.name}</span>
        {lv && <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white" style={{ background: lv.color }}>{lv.label}</span>}
      </div>
      {(() => {
        // Тапсырылған соңғы үш тест + орташа
        const done = p.map((x, i) => (x === null ? -1 : i)).filter((i) => i >= 0).slice(-3)
        return (
          <div className="mt-5 grid grid-cols-2 gap-3" style={{ gridTemplateColumns: undefined }}>
            <style>{`@media (min-width:640px){.st-tiles{grid-template-columns:repeat(${done.length + 1},minmax(0,1fr))!important}}`}</style>
            <div className="st-tiles col-span-2 grid grid-cols-2 gap-3">
              {done.map((i) => (
                <Tile key={i} label={t[i].title} value={m.scores[i] ?? null} max={t[i].max} sub={`${p[i]}% дұрыс`} />
              ))}
              <div className="rounded-2xl p-4" style={{ background: '#F5F7FB', border: `1px solid ${LINE}` }}>
                <div className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>Орташа</div>
                <div className="font-display mt-1 text-3xl font-semibold tabular-nums">{avg ?? '—'}<span className="text-base" style={{ color: '#9AA1B2' }}>%</span></div>
                <div className="text-xs" style={{ color: MUTED }}>{m.rank ? `${m.of} оқушының ішінде ${m.rank}-орын` : 'әлі тест жоқ'}</div>
              </div>
            </div>
          </div>
        )
      })()}

      <section className="avoid-break mt-6">
        <h3 className="font-display text-lg font-semibold">Тест сайынғы нәтиже</h3>
        <div className="mt-3 rounded-2xl p-4 pt-8" style={{ border: `1px solid ${LINE}` }}><SubjectChart m={m} height={120} slots={Math.max(5, t.length)} /></div>
      </section>

      <section className="avoid-break mt-4 grid gap-4 sm:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl p-4" style={{ border: `1px solid ${LINE}` }}>
          <h3 className="font-display font-semibold">Салыстыру</h3>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider" style={{ color: MUTED }}>
                <th className="py-1.5 font-semibold" />
                <th className="py-1.5 text-right font-semibold">Балл</th>
                <th className="py-1.5 text-right font-semibold">%</th>
                <th className="py-1.5 text-right font-semibold">Топ</th>
                <th className="py-1.5 text-right font-semibold">Барлығы</th>
              </tr>
            </thead>
            <tbody>
              {t.map((x, i) => (m.scores[i] ?? null) === null && m.groupAvg[i] === null ? null : (
                <tr key={i} className="border-t" style={{ borderColor: '#EDF0F5' }}>
                  <td className="py-2">{x.title}</td>
                  <td className="py-2 text-right font-semibold tabular-nums">{m.scores[i] ?? '—'}{m.scores[i] !== null && m.scores[i] !== undefined ? `/${x.max}` : ''}</td>
                  <td className="py-2 text-right tabular-nums">{p[i] !== null ? `${p[i]}%` : '—'}</td>
                  <td className="py-2 text-right tabular-nums">{m.groupAvg[i] !== null ? `${m.groupAvg[i]}%` : '—'}</td>
                  <td className="py-2 text-right tabular-nums">{m.allAvg[i] !== null ? `${m.allAvg[i]}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-2xl p-4" style={{ border: `1px solid ${LINE}` }}>
          <h3 className="font-display font-semibold">Қорытынды</h3>
          <p className="mt-2 text-sm leading-relaxed">{comment(m)}</p>
        </div>
      </section>

      {avg !== null && (
        <section className="avoid-break mt-4 rounded-2xl p-4" style={{ border: `1px solid ${LINE}` }}>
          <h3 className="font-display font-semibold">Келесі тестке дейін</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {nextSteps(avg).map((s) => (
              <li key={s} className="flex gap-2.5"><span className="mt-[7px] h-2 w-2 shrink-0 rounded-full" style={{ background: BLUE }} />{s}</li>
            ))}
          </ul>
        </section>
      )}
      <p className="mt-4 text-xs" style={{ color: MUTED }}>Пайыз — дұрыс жауаптардың үлесі. Орны — барлық топтардағы оқушылар арасында тапсырған тесттердің орташа пайызы бойынша.</p>
    </>
  )
}

function Tile({ label, value, max, sub }: { label: string; value: number | null; max: number; sub: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: '#F5F7FB', border: `1px solid ${LINE}` }}>
      <div className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>{label}</div>
      <div className="font-display mt-1 text-3xl font-semibold tabular-nums" style={{ color: value === null ? '#9AA1B2' : INK }}>
        {value ?? '—'}{value !== null && <span className="text-base" style={{ color: '#9AA1B2' }}> / {max}</span>}
      </div>
      <div className="text-xs" style={{ color: MUTED }}>{sub}</div>
    </div>
  )
}
