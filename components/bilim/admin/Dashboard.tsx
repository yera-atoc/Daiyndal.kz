'use client'

import { useMemo, useState } from 'react'
import ProgressChart, { type ChartPoint } from '@/components/bilim/ProgressChart'
import {
  commonDelta,
  examMax,
  fmtPct,
  pct,
  ranking,
  rowTotal,
  sign,
  topicStats,
  type Exam,
} from '@/lib/bilimTest'
import { BRAND, type Resp } from './shared'

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

function Panel({ title, note, children, className = '' }: { title: string; note?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border bg-white p-5 ${className}`} style={{ borderColor: BRAND.line }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-[15px] font-semibold tracking-tight">{title}</h2>
        {note && <span className="text-xs" style={{ color: BRAND.muted }}>{note}</span>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Kpi({ label, value, sub, tone, small }: { label: string; value: string; sub?: React.ReactNode; tone?: string; small?: boolean }) {
  return (
    <div className="rounded-2xl border bg-white px-5 py-4" style={{ borderColor: BRAND.line }}>
      <div className="text-[13px]" style={{ color: BRAND.muted }}>{label}</div>
      <div className={`font-display mt-1.5 font-semibold leading-none tracking-tight ${small ? 'text-lg leading-[28px]' : 'text-[28px]'}`} style={{ color: tone ?? BRAND.text }}>{value}</div>
      {sub && <div className="mt-2 text-[13px]" style={{ color: BRAND.muted }}>{sub}</div>}
    </div>
  )
}

export default function Dashboard({ data, exam, onOpenStudent }: { data: Resp; exam: Exam; onOpenStudent: (n: string) => void }) {
  const [hover, setHover] = useState<string | null>(null)
  const a = useMemo(() => {
    const roster = data.students.map((s) => s.full_name)
    const inGroup = new Set(roster)
    const subs = data.submissions.filter((s) => inGroup.has(s.student_name))
    const rk = ranking(exam, subs)
    const max = examMax(exam)
    const totals = Object.entries(rk.scores)
      .map(([name, row]) => ({ name, total: rowTotal(row), row }))
      .filter((x): x is { name: string; total: number; row: any } => x.total !== null)
      .sort((x, y) => y.total - x.total)
    const avgTotal = avg(totals.map((t) => t.total))
    const bySubj = new Map<string, Set<string>>()
    for (const s of subs) (bySubj.get(s.student_name) ?? bySubj.set(s.student_name, new Set()).get(s.student_name)!).add(s.subject)
    const submitted = roster.filter((n) => bySubj.has(n)).length
    const full = roster.filter((n) => (bySubj.get(n)?.size ?? 0) === exam.subjects.length).length
    const missing = roster
      .map((n) => ({ name: n, left: exam.subjects.filter((s) => !bySubj.get(n)?.has(s.id)).map((s) => s.short) }))
      .filter((x) => x.left.length)

    // Алдыңғы аймен салыстыру (ортақ пәндер бойынша)
    const prev = data.previous
    const movers = totals
      .map((t) => ({ name: t.name, total: t.total, d: commonDelta(t.row, prev?.scores[t.name]) }))
      .filter((x): x is { name: string; total: number; d: number } => x.d !== null)
    const avgDelta = avg(movers.map((m) => m.d))

    // Пәндер бойынша орташа пайыз
    const subjects = exam.subjects.map((s) => {
      const now = totals.map((t) => t.row[s.id]).filter((v): v is number => typeof v === 'number')
      const before = prev ? Object.values(prev.scores).map((r) => r[s.id]).filter((v): v is number => typeof v === 'number') : []
      const nowAvg = avg(now)
      const prevAvg = avg(before)
      return { s, n: now.length, now: nowAvg !== null ? pct(nowAvg, s.max) : null, prev: prevAvg !== null ? pct(prevAvg, s.max) : null }
    })

    // Ең қиын сұрақтар (кілт бар пәндер)
    const hard: { subject: string; n: number; topic?: string; rate: number; trap: string | null; takers: number }[] = []
    for (const s of exam.subjects) {
      const key = exam.answer_key[s.id]
      if (!key?.some(Boolean)) continue
      const ss = subs.filter((x) => x.subject === s.id)
      if (!ss.length) continue
      for (let i = 0; i < s.questions; i++) {
        if (!key[i]) continue
        let ok = 0
        const wrong: Record<string, number> = {}
        for (const x of ss) {
          const v = x.answers[i]
          if (v === key[i]) ok++
          else if (v) wrong[v] = (wrong[v] ?? 0) + 1
        }
        const trap = Object.entries(wrong).sort((p, q) => q[1] - p[1])[0]
        hard.push({ subject: s.short, n: i + 1, topic: exam.questions?.[s.id]?.[i]?.topic, rate: ok / ss.length, trap: trap ? trap[0] : null, takers: ss.length })
      }
    }
    hard.sort((x, y) => x.rate - y.rate)

    // Топ бойынша әлсіз тақырыптар
    const topicMap = new Map<string, { subject: string; topic: string; c: number; t: number }>()
    for (const s of exam.subjects) {
      for (const x of subs.filter((y) => y.subject === s.id)) {
        for (const t of topicStats(s, exam.answer_key[s.id], x.answers, exam.questions?.[s.id])) {
          const k = `${s.id}:${t.topic}`
          const e = topicMap.get(k) ?? { subject: s.short, topic: t.topic, c: 0, t: 0 }
          e.c += t.correct
          e.t += t.total
          topicMap.set(k, e)
        }
      }
    }
    const topics = Array.from(topicMap.values()).sort((x, y) => x.c / x.t - y.c / y.t)

    // Айлар бойынша топтың орташа балы
    const months = new Map<string, { sum: number; n: number; max: number }>()
    for (const name of roster) {
      for (const h of data.histories?.[name] ?? []) {
        if (h.total === null) continue
        const e = months.get(h.month) ?? { sum: 0, n: 0, max: h.max }
        e.sum += h.total
        e.n++
        e.max = Math.max(e.max, h.max)
        months.set(h.month, e)
      }
    }
    const trend: ChartPoint[] = Array.from(months, ([month, v]) => ({ month, value: Math.round(v.sum / v.n), max: v.max, kind: 'actual' as const })).sort((x, y) => x.month.localeCompare(y.month))

    return { roster, submitted, rk, max, totals, avgTotal, full, missing, movers, avgDelta, subjects, hard, topics, trend }
  }, [data, exam])

  const keyed = exam.subjects.filter((s) => exam.answer_key[s.id]?.some(Boolean)).length
  const top = a.totals[0]
  const hovered = a.totals.find((t) => t.name === hover)

  return (
    <div className="space-y-5">
      {/* Негізгі көрсеткіштер */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Тапсырғандар"
          value={`${a.submitted} / ${a.roster.length}`}
          sub={`${a.full} оқушы барлық ${exam.subjects.length} пәнді тапсырды`}
        />
        <Kpi
          label="Топтың орташа балы"
          value={a.avgTotal !== null ? `${Math.round(a.avgTotal)}` : '—'}
          sub={
            a.avgTotal !== null ? (
              <>
                {a.max}-ден · {fmtPct(pct(a.avgTotal, a.max))}
                {a.avgDelta !== null && (
                  <b className="ml-1.5" style={{ color: a.avgDelta >= 0 ? BRAND.blue : BRAND.red }}>
                    {sign(Math.round(a.avgDelta))}
                  </b>
                )}
              </>
            ) : keyed === 0 ? 'Кілт енгізілмеген' : undefined
          }
        />
        <Kpi label="Ең жоғары балл" value={top ? `${top.total}` : '—'} sub={top?.name} tone={BRAND.blue} />
        <Kpi
          label="Сынақ күйі"
          small
          value={exam.published ? 'Жарияланды' : exam.open_subjects.length ? 'Жүріп жатыр' : 'Жабық'}
          sub={`Кілт: ${keyed} / ${exam.subjects.length} пән`}
          tone={exam.published ? BRAND.green : exam.open_subjects.length ? BRAND.blue : BRAND.text}
        />
      </div>

      {/* Топтың штрих-коды */}
      <Panel title="Топтың штрих-коды" note="Әр сызық — бір оқушы. Сызықты басыңыз — оқушының профилі ашылады.">
        {a.totals.length === 0 ? (
          <p className="py-10 text-center text-sm" style={{ color: BRAND.muted }}>
            {keyed === 0 ? 'Жауап кілтін енгізгеннен кейін нәтижелер осында көрінеді.' : 'Әзірге тексерілген жауап парағы жоқ.'}
          </p>
        ) : (
          <>
            <div className="relative h-56">
              {a.avgTotal !== null && (
                <div className="absolute inset-x-0 border-t-2 border-dashed" style={{ bottom: `${pct(a.avgTotal, a.max)}%`, borderColor: '#9AA3B5' }}>
                  <span className="absolute -top-5 right-0 bg-white pl-1 text-xs" style={{ color: BRAND.muted }}>орташа {Math.round(a.avgTotal)}</span>
                </div>
              )}
              <div className="absolute inset-0 flex items-end gap-[3px]">
                {a.totals.map((t) => {
                  const p = pct(t.total, a.max)
                  const color = t.total >= (a.avgTotal ?? 0) ? BRAND.blue : p < 40 ? BRAND.red : BRAND.text
                  return (
                    <button
                      key={t.name}
                      onMouseEnter={() => setHover(t.name)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(t.name)}
                      onClick={() => onOpenStudent(t.name)}
                      aria-label={`${t.name}: ${t.total}`}
                      className="min-w-0 flex-1 rounded-t-[3px] outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-offset-2"
                      style={{ height: `${Math.max(p, 2)}%`, background: color, opacity: hover && hover !== t.name ? 0.35 : 1 }}
                    />
                  )
                })}
              </div>
            </div>
            <div className="mt-3 flex min-h-[1.5rem] flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {hovered ? (
                  <>
                    <b>{a.rk.place[hovered.name]}. {hovered.name}</b> — {hovered.total} балл ({fmtPct(pct(hovered.total, a.max))})
                  </>
                ) : (
                  <span style={{ color: BRAND.muted }}>Сызықтың үстіне апарыңыз</span>
                )}
              </span>
              <span className="flex gap-4 text-xs" style={{ color: BRAND.muted }}>
                <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: BRAND.blue }} />орташадан жоғары</span>
                <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: BRAND.text }} />орташадан төмен</span>
                <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: BRAND.red }} />40 %-дан төмен</span>
              </span>
            </div>
          </>
        )}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Пәндер */}
        <Panel title="Пәндер бойынша орташа" note={data.previous ? `сызықша — ${data.previous.title}` : undefined}>
          <div className="space-y-3.5">
            {a.subjects.map(({ s, n, now, prev }) => (
              <div key={s.id}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span style={{ color: BRAND.muted }}>
                    {now !== null ? <b style={{ color: BRAND.text }}>{Math.round(now)} %</b> : '—'}
                    {now !== null && prev !== null && (
                      <span className="ml-1.5 font-semibold" style={{ color: now >= prev ? BRAND.blue : BRAND.red }}>
                        {sign(Math.round(now - prev))}
                      </span>
                    )}
                    <span className="ml-2 text-xs">{n} оқушы</span>
                  </span>
                </div>
                <div className="relative mt-1.5 h-2.5 rounded-full" style={{ background: BRAND.paper }}>
                  {now !== null && <div className="h-full rounded-full" style={{ width: `${now}%`, background: now < 40 ? BRAND.red : BRAND.blue }} />}
                  {prev !== null && <div className="absolute -top-1 h-4.5 w-[3px] rounded-full" style={{ left: `calc(${prev}% - 1px)`, height: 18, background: BRAND.text }} />}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Айлар бойынша */}
        <Panel title="Топтың орташа балы айлар бойынша">
          {a.trend.length >= 2 ? (
            <ProgressChart points={a.trend} />
          ) : (
            <p className="py-10 text-center text-sm" style={{ color: BRAND.muted }}>Екі айдың нәтижесі жиналғанда динамика көрінеді.</p>
          )}
        </Panel>

        {/* Өскендер / төмендегендер */}
        <Panel title="Ең көп өскендер" note={data.previous ? `${data.previous.title}мен салыстырғанда` : undefined}>
          <MoverList items={[...a.movers].sort((x, y) => y.d - x.d).filter((m) => m.d > 0).slice(0, 6)} empty="Салыстыратын алдыңғы ай жоқ" onOpen={onOpenStudent} />
        </Panel>
        <Panel title="Назар аудару керек" note="балы төмендегендер">
          <MoverList items={[...a.movers].sort((x, y) => x.d - y.d).filter((m) => m.d < 0).slice(0, 6)} empty="Балы төмендеген оқушы жоқ" onOpen={onOpenStudent} />
        </Panel>

        {/* Ең қиын сұрақтар */}
        <Panel title="Ең қиын сұрақтар" note="ең аз дұрыс жауап берілгендер">
          {a.hard.length === 0 ? (
            <p className="py-6 text-center text-sm" style={{ color: BRAND.muted }}>Кілт пен жауаптар жиналғанда шығады.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs" style={{ color: BRAND.muted }}>
                  <th className="pb-2 font-medium">Сұрақ</th>
                  <th className="pb-2 font-medium">Тақырып</th>
                  <th className="pb-2 text-right font-medium">Дұрыс</th>
                  <th className="pb-2 text-right font-medium">Жиі қате</th>
                </tr>
              </thead>
              <tbody>
                {a.hard.slice(0, 8).map((h) => (
                  <tr key={`${h.subject}${h.n}`} className="border-t" style={{ borderColor: BRAND.line }}>
                    <td className="py-2 font-medium">{h.subject} №{h.n}</td>
                    <td className="py-2" style={{ color: BRAND.muted }}>{h.topic ?? '—'}</td>
                    <td className="py-2 text-right font-semibold tabular-nums" style={{ color: h.rate < 0.4 ? BRAND.red : BRAND.text }}>{Math.round(h.rate * 100)} %</td>
                    <td className="py-2 text-right tabular-nums">{h.trap ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        {/* Әлсіз тақырыптар */}
        <Panel title="Топ бойынша әлсіз тақырыптар">
          {a.topics.length === 0 ? (
            <p className="py-6 text-center text-sm" style={{ color: BRAND.muted }}>«Сұрақтар» бөлімінде тақырыптарды жазсаңыз, осында шығады.</p>
          ) : (
            <div className="space-y-3">
              {a.topics.slice(0, 7).map((t) => {
                const p = (t.c / t.t) * 100
                return (
                  <div key={t.subject + t.topic}>
                    <div className="flex justify-between text-sm">
                      <span><span style={{ color: BRAND.muted }}>{t.subject}:</span> {t.topic}</span>
                      <b className="tabular-nums">{Math.round(p)} %</b>
                    </div>
                    <div className="mt-1 h-2 rounded-full" style={{ background: BRAND.paper }}>
                      <div className="h-full rounded-full" style={{ width: `${p}%`, background: p < 40 ? BRAND.red : p < 70 ? '#F59E0B' : BRAND.green }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
      </div>

      {a.missing.length > 0 && (
        <Panel title="Тапсырмағандар" note={`${a.missing.length} оқушыда тапсырылмаған пән бар`}>
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {a.missing.map((m) => (
              <button key={m.name} onClick={() => onOpenStudent(m.name)} className="flex justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50">
                <span className="font-medium">{m.name}</span>
                <span className="truncate" style={{ color: BRAND.muted }}>
                  {m.left.length === exam.subjects.length ? 'ешбір пән' : m.left.join(', ')}
                </span>
              </button>
            ))}
          </div>
        </Panel>
      )}
    </div>
  )
}

function MoverList({ items, empty, onOpen }: { items: { name: string; total: number; d: number }[]; empty: string; onOpen: (n: string) => void }) {
  if (!items.length) return <p className="py-6 text-center text-sm" style={{ color: BRAND.muted }}>{empty}</p>
  return (
    <ul className="divide-y" style={{ borderColor: BRAND.line }}>
      {items.map((m) => (
        <li key={m.name}>
          <button onClick={() => onOpen(m.name)} className="flex w-full items-center justify-between py-2 text-left text-sm hover:bg-slate-50">
            <span className="font-medium">{m.name}</span>
            <span className="flex items-baseline gap-3">
              <span className="tabular-nums" style={{ color: BRAND.muted }}>{m.total}</span>
              <b className="w-12 text-right tabular-nums" style={{ color: m.d >= 0 ? BRAND.blue : BRAND.red }}>{sign(m.d)}</b>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
