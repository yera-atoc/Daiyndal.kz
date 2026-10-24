// Толық есеп: 1-бет карточка, 2-бет динамика мен болжам, 3-бет сұрақтар бойынша толық талдау
import ReportSheet, { MONTHS_GEN, type ReportInput } from './ReportSheet'
import ProgressChart, { type ChartPoint } from './ProgressChart'
import {
  examMax,
  fmtPct,
  gradeSubject,
  monthName,
  pct,
  topicStats,
  weakTopics,
  type ScoreRow,
} from '@/lib/bilimTest'
import { buildForecast, type HistPoint } from '@/lib/bilimTestForecast'

const BLUE = '#2563EB'

export type ReportPagesInput = ReportInput & { history: HistPoint[] }

function today() {
  const d = new Date()
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`
}

function Head({ kicker, sub }: { kicker: string; sub: string }) {
  return (
    <>
      <div className="flex items-start justify-between">
        <img src="/beles-logo.png" alt="Beles education" style={{ height: '14mm' }} />
        <div className="text-right">
          <div className="text-[9pt] font-bold uppercase tracking-[.12em]" style={{ color: BLUE }}>{kicker}</div>
          <div className="mt-1 text-[10pt] text-slate-500">{sub}</div>
        </div>
      </div>
      <div className="mt-[5mm] h-[1.2mm] bg-black" />
    </>
  )
}

function Foot({ student, page }: { student: string; page: number }) {
  return (
    <div className="mt-auto flex justify-between border-t border-slate-200 pt-[3mm] text-[8pt] text-slate-500">
      <span>Beles education · аналитика · {page}-бет</span>
      <span>{student} · {today()}</span>
    </div>
  )
}

function Box({ tone, title, children }: { tone: 'blue' | 'green' | 'red'; title: string; children: React.ReactNode }) {
  const c = { blue: ['#EEF3FE', BLUE], green: ['#EAF7EF', '#16A34A'], red: ['#FDF0EF', '#DC2626'] }[tone]
  return (
    <div className="rounded-[3mm] px-[4mm] py-[3.5mm]" style={{ background: c[0] }}>
      <div className="text-[8.5pt] font-bold uppercase tracking-[.1em]" style={{ color: c[1] }}>{title}</div>
      <div className="mt-[1.5mm] text-[9.5pt] leading-snug">{children}</div>
    </div>
  )
}

export default function ReportPages(props: ReportPagesInput) {
  const { exam, student, subs, history } = props
  const graded = exam.subjects.map((s) => {
    const sub = subs.find((x) => x.subject === s.id)
    return { s, sub, g: sub ? gradeSubject(s, exam.answer_key[s.id], sub.answers) : null }
  })
  const nowRow: ScoreRow = Object.fromEntries(graded.map((x) => [x.s.id, x.g?.score ?? null]))
  const fc = buildForecast(exam, nowRow, history)
  const nowTotal = graded.some((x) => x.g) ? graded.reduce((a, x) => a + (x.g?.score ?? 0), 0) : null
  const MAX = examMax(exam)

  // Тарих: осы айға дейінгі нақты нәтижелер (осы ай — нақты есептелген мән)
  const past = history.filter((h) => h.month < exam.month && h.total !== null)
  const points: ChartPoint[] = [
    ...past.map((h) => ({ month: h.month, value: h.total!, max: h.max || MAX, kind: 'actual' as const })),
    ...(nowTotal !== null ? [{ month: exam.month, value: nowTotal, max: fc?.max ?? MAX, kind: 'actual' as const }] : []),
    ...(fc ? fc.months.map((m, i) => ({ month: m, value: fc.totals[i], max: fc.max, kind: 'forecast' as const })) : []),
  ]
  const last = fc ? fc.totals[fc.totals.length - 1] : null
  const endM = fc ? fc.months[fc.months.length - 1] : null
  const gains = fc
    ? exam.subjects
        .filter((s) => fc.perSubject[s.id])
        .map((s) => ({ name: s.name, gain: fc.perSubject[s.id].at(-1)! - (nowRow[s.id] as number) }))
        .sort((a, b) => b.gain - a.gain)
        .slice(0, 3)
    : []
  const histCols = past.slice(-3)

  return (
    <>
      <ReportSheet {...props} />

      {/* ── 2-бет: динамика және болжам ── */}
      {fc && nowTotal !== null && (
        <section className="bt-sheet mx-auto flex flex-col bg-white text-[#111] shadow-xl">
          <Head kicker="Аналитика · Болжам" sub={`${student} · ${monthName(exam.month)} – ${monthName(endM!)} ${endM!.slice(0, 4)}`} />
          <h1 className="mt-[6mm] text-[24pt] font-extrabold leading-none tracking-tight">
            {monthName(exam.month)} – {monthName(endM!).toLowerCase()}: даму болжамы
          </h1>
          <p className="mt-[2.5mm] text-[10pt] text-slate-500">
            Қазіргі нәтиже негізінде жүйелі дайындық жалғасқанда күтілетін айлық жиынтық балл ({fc.max}-ден).
          </p>

          <div className="mt-[5mm] rounded-[3mm] border border-slate-200 px-[5mm] pb-[3mm] pt-[4mm]">
            <div className="flex items-center justify-between">
              <div className="text-[11pt] font-bold">Жалпы балл динамикасы</div>
              <div className="flex items-center gap-4 text-[8.5pt] text-slate-500">
                <span className="flex items-center gap-1.5"><i className="inline-block h-[0.8mm] w-[6mm]" style={{ background: BLUE }} />Нақты</span>
                <span className="flex items-center gap-1.5"><i className="inline-block h-[0.8mm] w-[6mm]" style={{ backgroundImage: `repeating-linear-gradient(90deg, ${BLUE} 0 4px, transparent 4px 7px)` }} />Болжам</span>
              </div>
            </div>
            <ProgressChart points={points} target={last ?? undefined} />
            <p className="text-[7.5pt] text-slate-400">Жалпы балл. Айлардың максимумы әртүрлі болуы мүмкін: {past.map((h) => `${monthName(h.month)} — ${h.max}`).concat(`${monthName(exam.month)} және кейін — ${fc.max}`).join(', ')}.</p>
          </div>

          <h2 className="mt-[6mm] text-[13pt] font-bold">Пәндер бойынша айлық жоспар</h2>
          <table className="mt-[2mm] w-full border-collapse text-[9pt]">
            <thead>
              <tr className="border-b-2 border-black text-[7.5pt] uppercase tracking-[.08em] text-slate-500">
                <th className="py-[1.5mm] text-left font-semibold">Пән</th>
                {histCols.map((h) => <th key={h.month} className="py-[1.5mm] text-right font-semibold">{monthName(h.month)}</th>)}
                <th className="py-[1.5mm] text-right font-semibold text-black">{monthName(exam.month)}</th>
                {fc.months.map((m) => <th key={m} className="py-[1.5mm] text-right font-semibold" style={{ color: BLUE }}>{monthName(m)}</th>)}
              </tr>
            </thead>
            <tbody>
              {exam.subjects.filter((s) => fc.perSubject[s.id]).map((s) => (
                <tr key={s.id} className="border-b border-slate-200">
                  <td className="py-[1.6mm]"><b>{s.name}</b> <span className="text-[7.5pt] text-slate-400">/{s.max}</span></td>
                  {histCols.map((h) => <td key={h.month} className="py-[1.6mm] text-right text-slate-500">{h.scores[s.id] ?? '—'}</td>)}
                  <td className="py-[1.6mm] text-right font-semibold">{nowRow[s.id]}</td>
                  {fc.perSubject[s.id].map((v, i) => (
                    <td key={i} className="py-[1.6mm] text-right" style={{ background: '#F1F5FE', fontWeight: i === fc.months.length - 1 ? 700 : 400 }}>{v}</td>
                  ))}
                </tr>
              ))}
              <tr className="border-t-2 border-black text-[10pt] font-bold">
                <td className="py-[2mm]">Жиынтығы <span className="text-[7.5pt] font-normal text-slate-400">/{fc.max}</span></td>
                {histCols.map((h) => <td key={h.month} className="py-[2mm] text-right">{h.total}<span className="text-[7pt] font-normal text-slate-400">/{h.max}</span></td>)}
                <td className="py-[2mm] text-right">{nowTotal}</td>
                {fc.totals.map((v, i) => <td key={i} className="py-[2mm] text-right" style={{ background: '#E2EAFD' }}>{v}</td>)}
              </tr>
            </tbody>
          </table>

          <div className="mt-[6mm] grid grid-cols-3 gap-[3.5mm]">
            <Box tone="blue" title={`${monthName(endM!)}ға дейін`}>
              {nowTotal} → {last}: барлығы +{last! - nowTotal}, яғни {fmtPct(pct(nowTotal, MAX))} → {fmtPct(pct(last!, fc.max))}.
            </Box>
            <Box tone="green" title={`Келесі ай · ${fc.totals[0]}+`}>
              {monthName(fc.months[0])} айындағы сынақта {fc.totals[0]}+ көрсету — жақын межелі нүкте.
            </Box>
            <Box tone="red" title="Ең үлкен резерв">
              {gains.map((g) => `${g.name} (+${g.gain})`).join(', ')}: осы пәндерге апта сайын қосымша уақыт бөлу.
            </Box>
          </div>
          <p className="mt-[4mm] text-[8pt] text-slate-500">
            Бұл болжам — оқушы мен мұғалімнің жұмыс бағыты. Нәтиже дайындық қарқынына байланысты, кепілдік емес.
          </p>
          <Foot student={student} page={2} />
        </section>
      )}

      {/* ── 3-бет: сұрақтар бойынша толық талдау (керек болса, келесі беттерге жалғасады) ── */}
      <section className="bt-flow mx-auto flex flex-col bg-white text-[#111] shadow-xl">
        <Head kicker="Аналитика · Толық талдау" sub={`${student} · ${exam.title}`} />
        <h1 className="mt-[6mm] text-[24pt] font-extrabold leading-none tracking-tight">Пәндер бойынша толық талдау</h1>
        <p className="mt-[2.5mm] text-[10pt] text-slate-500">Әр пәннің қате және бос қалдырылған сұрақтары, тақырыптар бойынша нәтиже.</p>
        <div className="mt-[5mm] space-y-[4mm]">
          {graded.map(({ s, sub, g }) => {
            const stats = sub ? topicStats(s, exam.answer_key[s.id], sub.answers, exam.questions?.[s.id]) : []
            const weak = weakTopics(stats)
            return (
              <div key={s.id} className="bt-block rounded-[3mm] border border-slate-200 px-[5mm] py-[3.5mm]">
                <div className="flex items-baseline justify-between">
                  <div className="text-[12pt] font-bold">{s.name}</div>
                  <div className="text-[10pt] text-slate-500">
                    {g ? (
                      <>
                        <b className="text-[13pt] text-black">{g.score}</b> / {s.max} · {g.correct}/{s.questions} дұрыс · {fmtPct(pct(g.score, s.max))}
                      </>
                    ) : sub ? 'кілт енгізілмеген' : 'тапсырылмаған'}
                  </div>
                </div>
                {g && (
                  <>
                    <div className="mt-[2mm] flex flex-wrap gap-[1mm]">
                      {Array.from({ length: s.questions }, (_, i) => {
                        const n = i + 1
                        const bg = g.wrong.includes(n) ? '#EF4444' : g.blank.includes(n) ? '#F59E0B' : exam.answer_key[s.id]?.[i] ? '#22C55E' : '#CBD5E1'
                        return (
                          <span key={n} className="inline-flex h-[5.2mm] w-[6.4mm] items-center justify-center rounded-[1mm] text-[7pt] font-bold text-white" style={{ background: bg }}>
                            {n}
                          </span>
                        )
                      })}
                    </div>
                    <div className="mt-[2mm] grid grid-cols-[18mm_1fr] gap-y-[0.8mm] text-[9pt]">
                      <span className="font-semibold text-red-600">Қате:</span>
                      <span>{g.wrong.length ? g.wrong.join(', ') : 'жоқ'}</span>
                      {g.blank.length > 0 && (
                        <>
                          <span className="font-semibold text-amber-600">Бос:</span>
                          <span>{g.blank.join(', ')}</span>
                        </>
                      )}
                    </div>
                    {stats.length > 0 && (
                      <div className="mt-[2.5mm] grid grid-cols-2 gap-x-[6mm] gap-y-[1.2mm]">
                        {stats.map((t) => {
                          const p = t.correct / t.total
                          return (
                            <div key={t.topic} className="grid grid-cols-[1fr_22mm_9mm] items-center gap-[2mm] text-[8.5pt]">
                              <span className="truncate">{t.topic}</span>
                              <span className="h-[1.8mm] overflow-hidden rounded-full bg-slate-100">
                                <span className="block h-full rounded-full" style={{ width: `${p * 100}%`, background: p >= 0.7 ? '#22C55E' : p >= 0.4 ? '#F59E0B' : '#EF4444' }} />
                              </span>
                              <span className="text-right tabular-nums text-slate-500">{t.correct}/{t.total}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {weak.length > 0 && (
                      <p className="mt-[2mm] text-[9pt]"><b className="text-red-600">Қайталау керек:</b> {weak.join(' · ')}</p>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-[3mm] flex gap-4 text-[8pt] text-slate-500">
          <span><i className="mr-1 inline-block h-[2.5mm] w-[2.5mm] rounded-[0.5mm] bg-green-500 align-middle" />дұрыс</span>
          <span><i className="mr-1 inline-block h-[2.5mm] w-[2.5mm] rounded-[0.5mm] bg-red-500 align-middle" />қате</span>
          <span><i className="mr-1 inline-block h-[2.5mm] w-[2.5mm] rounded-[0.5mm] bg-amber-500 align-middle" />бос</span>
        </div>
        <div className="pt-[6mm]" />
        <Foot student={student} page={3} />
      </section>
    </>
  )
}
