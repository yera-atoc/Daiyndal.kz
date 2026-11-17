import type { Metadata } from 'next'
import { DAY_FULL, dayMonth, weekdayOf } from '@/lib/journal'
import { money } from '@/lib/payments'
import { studentOfToken, studentReport } from '@/lib/reportServer'
import type { BtReport, ReportClass } from '@/lib/report'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata: Metadata = { title: 'Оқушы есебі · Beles education', robots: { index: false, follow: false } }

const INK = '#0E1424'
const MUTED = '#6B7285'
const LINE = '#E3E6EE'
const PAPER = '#F6F7FB'
const tone = (v: number | null) => (v == null ? MUTED : v >= 80 ? '#15803D' : v >= 60 ? '#B45309' : '#B91C1C')
const markColor = (r: number) => (r >= 0.85 ? { bg: '#DCFCE7', fg: '#15803D' } : r >= 0.65 ? { bg: '#E0F2FE', fg: '#0369A1' } : r >= 0.45 ? { bg: '#FEF3C7', fg: '#B45309' } : { bg: '#FEE2E2', fg: '#B91C1C' })
const num = (n: number) => String(n).replace('.', ',')
const NOTE = { good: { bg: '#F0FDF4', fg: '#166534', dot: '#22C55E' }, warn: { bg: '#FFFBEB', fg: '#92400E', dot: '#F59E0B' }, bad: { bg: '#FEF2F2', fg: '#991B1B', dot: '#EF4444' } }

function Stat({ label, v, hint }: { label: string; v: number | null; hint?: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: PAPER }}>
      <div className="text-xl font-bold tabular-nums" style={{ color: tone(v) }}>{v == null ? '—' : `${v}%`}</div>
      <div className="text-[11px] font-medium" style={{ color: MUTED }}>{label}</div>
      {hint && <div className="text-[10px]" style={{ color: MUTED }}>{hint}</div>}
    </div>
  )
}

function ClassCard({ c }: { c: ReportClass }) {
  const empty = !c.lessons && !c.marks.length && c.hw == null && !c.topics.length
  return (
    <section className="rounded-2xl border bg-white p-4" style={{ borderColor: LINE }}>
      <h2 className="font-display text-lg font-semibold leading-tight">{c.subject || c.name}</h2>
      <p className="text-[13px]" style={{ color: MUTED }}>
        {[c.teacher && `Мұғалім: ${c.teacher}`, c.next && `келесі сабақ — ${DAY_FULL[weekdayOf(c.next.date) - 1].toLowerCase()}${c.next.time ? `, ${c.next.time}` : ''}`].filter(Boolean).join(' · ')}
      </p>
      {empty ? (
        <p className="mt-3 text-sm" style={{ color: MUTED }}>Бұл пән бойынша соңғы 30 күнде әлі белгі қойылмаған.</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Stat label="Сабаққа келу" v={c.att} hint={c.lessons ? `${c.present}/${c.lessons} сабақ` : undefined} />
            <Stat label="Үй тапсырмасы" v={c.hw} hint={c.hwNone ? `${c.hwNone} рет орындамады` : undefined} />
            <Stat label="Бағалар" v={c.markPct} hint={c.quiz != null ? `тесттер ${c.quiz}%` : undefined} />
          </div>
          {c.marks.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>Сабақтағы бағалар</h3>
              <ul className="mt-1.5 divide-y" style={{ borderColor: LINE }}>
                {c.marks.map((m) => {
                  const k = markColor(m.score / m.max)
                  return (
                    <li key={m.date} className="flex items-start gap-3 py-2" style={{ borderColor: LINE }}>
                      <span className="mt-0.5 w-14 shrink-0 rounded-lg py-1 text-center text-sm font-bold tabular-nums" style={{ background: k.bg, color: k.fg }}>{num(m.score)}<span className="text-[10px] font-semibold opacity-70">/{m.max}</span></span>
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="block" style={{ color: MUTED }}>{dayMonth(m.date)}{m.topic ? ` · ${m.topic}` : ''}</span>
                        {m.comment && <span className="block font-medium">«{m.comment}»</span>}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
          {c.topics.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>Соңғы өткен тақырыптар</h3>
              <ul className="mt-1.5 space-y-1 text-sm">
                {c.topics.map((t) => (
                  <li key={t.date} className="flex gap-2"><span className="w-16 shrink-0 tabular-nums" style={{ color: MUTED }}>{dayMonth(t.date)}</span><span className="min-w-0 flex-1">{t.topic}</span></li>
                ))}
              </ul>
            </div>
          )}
          {c.homework && (
            <div className="mt-4 rounded-xl p-3 text-sm" style={{ background: '#EEF2FF' }}>
              <div className="text-xs font-semibold" style={{ color: '#4338CA' }}>Қазіргі үй тапсырмасы · {dayMonth(c.homework.date)}</div>
              <p className="mt-0.5 whitespace-pre-line">{c.homework.text}</p>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function BtCard({ bt }: { bt: BtReport }) {
  const p = bt.total != null && bt.max ? Math.round((bt.total / bt.max) * 100) : null
  const h = bt.history.filter((x) => x.total != null && x.max)
  const prev = h.length >= 2 ? h[h.length - 2] : null
  const d = prev && p != null ? p - Math.round((prev.total! / prev.max) * 100) : null
  return (
    <section className="rounded-2xl border bg-white p-4" style={{ borderColor: LINE }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold leading-tight">Білім тексеру</h2>
          <p className="text-[13px]" style={{ color: MUTED }}>Ай сайынғы сынақ · {bt.title}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tabular-nums leading-none" style={{ color: tone(p) }}>{bt.total ?? '—'}<span className="text-sm font-semibold" style={{ color: MUTED }}>/{bt.max}</span></div>
          <div className="mt-1 text-[11px] font-semibold" style={{ color: MUTED }}>
            {[p != null && `${p}%`, bt.place && `топта ${bt.place}-орын (${bt.of})`].filter(Boolean).join(' · ')}
          </div>
          {d != null && d !== 0 && <div className="text-[11px] font-bold" style={{ color: d > 0 ? '#15803D' : '#B91C1C' }}>{d > 0 ? '▲' : '▼'} {Math.abs(d)}% алдыңғы айға қарағанда</div>}
        </div>
      </div>
      <ul className="mt-3 space-y-2">
        {bt.subjects.map((x) => {
          const v = x.score != null && x.max ? Math.round((x.score / x.max) * 100) : null
          const dv = x.score != null && x.prev != null ? x.score - x.prev : null
          return (
            <li key={x.name}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{x.name}</span>
                <span className="tabular-nums">
                  <b style={{ color: tone(v) }}>{x.score ?? '—'}</b>
                  <span style={{ color: MUTED }}>/{x.max}</span>
                  {dv != null && dv !== 0 && <span className="ml-1.5 text-[11px] font-bold" style={{ color: dv > 0 ? '#15803D' : '#B91C1C' }}>{dv > 0 ? `+${dv}` : dv}</span>}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full" style={{ background: PAPER }}>
                <div className="h-1.5 rounded-full" style={{ width: `${v ?? 0}%`, background: tone(v) }} />
              </div>
            </li>
          )
        })}
      </ul>
      {h.length >= 2 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>Айлар бойынша</h3>
          <div className="mt-2 flex items-end gap-2">
            {h.map((x) => {
              const v = Math.round((x.total! / x.max) * 100)
              return (
                <div key={x.month} className="flex flex-1 flex-col items-center">
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: tone(v) }}>{v}%</span>
                  <div className="mt-0.5 w-full max-w-[36px] rounded-t-md" style={{ height: `${Math.max(6, v * 0.6)}px`, background: x.month === bt.month ? '#2563EB' : '#C7D2FE' }} />
                  <span className="mt-1 text-[10px]" style={{ color: MUTED }}>{x.title.split(' ')[0].slice(0, 3)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

export default async function ParentReport({ params }: { params: { token: string } }) {
  const id = studentOfToken(params.token)
  const r = id ? await studentReport(id).catch(() => null) : null
  if (!r)
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center" style={{ color: INK }}>
        <img src="/beles-logo.png" alt="Beles education" className="mx-auto h-8 w-auto" />
        <h1 className="font-display mt-6 text-xl font-semibold">Есеп табылмады</h1>
        <p className="mt-2 text-sm" style={{ color: MUTED }}>Сілтеме толық көшірілмеген болуы мүмкін. Мұғалімнен немесе орталық әкімшісінен сілтемені қайта сұраңыз.</p>
      </main>
    )
  const pay = r.pay
  return (
    <div className="min-h-screen pb-12" style={{ background: PAPER, color: INK }}>
      <header className="border-b bg-white" style={{ borderColor: LINE }}>
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <img src="/beles-logo.png" alt="Beles education" className="h-7 w-auto" />
          <span className="text-xs font-medium" style={{ color: MUTED }}>Ата-анаға есеп</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-3 px-4 pt-4">
        <section className="rounded-3xl p-5" style={{ background: '#EAF0FE' }}>
          <h1 className="font-display text-2xl font-semibold leading-tight">{r.student.name}</h1>
          <p className="mt-1 text-sm" style={{ color: MUTED }}>
            {[r.student.grade && `${r.student.grade}-сынып`, r.student.group, `${dayMonth(r.from)} – ${dayMonth(r.to)}`].filter(Boolean).join(' · ')}
          </p>
        </section>

        {r.notes.length > 0 && (
          <section className="rounded-2xl border bg-white p-4" style={{ borderColor: LINE }}>
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>Қысқаша</h2>
            <ul className="mt-2 space-y-1.5">
              {r.notes.map((n, i) => (
                <li key={i} className="flex items-start gap-2 rounded-xl px-3 py-2 text-sm font-medium" style={{ background: NOTE[n.tone].bg, color: NOTE[n.tone].fg }}>
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: NOTE[n.tone].dot }} />
                  {n.text}
                </li>
              ))}
            </ul>
          </section>
        )}

        {r.bt && <BtCard bt={r.bt} />}

        {!r.classes.length && !r.bt && <p className="rounded-2xl border border-dashed bg-white p-6 text-center text-sm" style={{ borderColor: LINE, color: MUTED }}>Оқушы әзірге сабақ топтарына қосылмаған. Есеп топқа қосылғаннан кейін осы сілтемеде шығады.</p>}
        {r.classes.map((c) => <ClassCard key={c.id} c={c} />)}

        {pay && (
          <section className="rounded-2xl border bg-white p-4 text-sm" style={{ borderColor: pay.kind === 'overdue' ? '#FECACA' : LINE }}>
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>Оқу ақысы</h2>
            <p className="mt-1 font-medium" style={{ color: pay.kind === 'overdue' ? '#B91C1C' : INK }}>
              {pay.kind === 'overdue' ? `Төлем мерзімі ${dayMonth(pay.deadline)} күні өтті (${Math.abs(pay.days)} күн)` : pay.kind === 'today' ? 'Төлем күні — бүгін' : `Келесі төлем — ${dayMonth(pay.deadline)}`}
              {pay.amount ? ` · ${money(pay.amount)}` : ''}
            </p>
          </section>
        )}

        <p className="px-1 pt-2 text-center text-xs leading-relaxed" style={{ color: MUTED }}>
          Есеп мұғалімдердің сабақ журналынан автоматты түрде жаңарып тұрады — осы сілтемені сақтап қойыңыз.<br />
          Сілтеме тек сізге арналған, басқаларға жібермеңіз. Сұрақтар болса — мұғалімге немесе орталыққа жазыңыз.
        </p>
      </main>
    </div>
  )
}
