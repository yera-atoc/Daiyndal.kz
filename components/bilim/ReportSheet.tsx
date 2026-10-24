import {
  GROUP_NAME,
  commonDelta,
  TOTAL_MAX,
  fmtPct,
  gradeSubject,
  monthName,
  pct,
  rowTotal,
  sign,
  type Exam,
  type Graded,
  type ScoreRow,
  type Submission,
} from '@/lib/bilimTest'

export type ReportInput = {
  exam: Exam
  student: string
  subs: Submission[] // осы оқушының жауап парақтары
  prev: { id: string; title: string; row: ScoreRow | undefined } | null
  rank: { place: number; of: number } | null
}

const MONTHS_GEN = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан']
const BLUE = '#2563EB'
const LIGHT = '#A9C2F5'

export default function ReportSheet({ exam, student, subs, prev, rank }: ReportInput) {
  const rows = exam.subjects.map((s) => {
    const sub = subs.find((x) => x.subject === s.id)
    const g: Graded | null = sub ? gradeSubject(s, exam.answer_key[s.id], sub.answers) : null
    const before = prev?.row?.[s.id]
    return { s, g, now: g?.score ?? null, before: typeof before === 'number' ? before : null }
  })
  const nowTotal = rows.some((r) => r.now !== null) ? rows.reduce((a, r) => a + (r.now ?? 0), 0) : null
  const prevTotal = rowTotal(prev?.row)
  const nowRow = Object.fromEntries(rows.map((r) => [r.s.id, r.now]))
  const delta = commonDelta(nowRow, prev?.row)
  const nowM = monthName(exam.id)
  const prevM = prev ? monthName(prev.id) : null

  // Қорытынды мәтіндер
  const diffs = rows
    .filter((r) => r.now !== null && r.before !== null)
    .map((r) => ({ name: r.s.name, d: r.now! - r.before! }))
  const ups = diffs.filter((x) => x.d > 0).sort((a, b) => b.d - a.d).slice(0, 3)
  const downs = diffs.filter((x) => x.d < 0).sort((a, b) => a.d - b.d).slice(0, 3)
  const byPct = rows
    .filter((r) => r.now !== null)
    .map((r) => ({ name: r.s.name, p: pct(r.now!, r.s.max) }))
    .sort((a, b) => b.p - a.p)
  const strong = byPct.slice(0, 2)
  const weak = byPct.slice(-2).reverse().filter((x) => !strong.includes(x))
  const missing = rows.filter((r) => r.now === null).map((r) => r.s.name)

  const goodText = ups.length
    ? ups.map((u) => `${u.name} ${sign(u.d)} балл`).join(', ') + '.'
    : strong.length
      ? `Ең жоғары нәтиже: ${strong.map((x) => `${x.name} (${Math.round(x.p)} %)`).join(', ')}.`
      : '—'
  const badText = downs.length
    ? downs.map((u) => `${u.name} ${sign(u.d)} балл`).join(', ') + '. Келесі айда осы пәндерді көтеру керек.'
    : weak.length
      ? `Әлсіз тұс: ${weak.map((x) => `${x.name} (${Math.round(x.p)} %)`).join(', ')}.`
      : 'Төмендеген пән жоқ.'

  const hasPrev = prevTotal !== null
  const d0 = new Date()
  const date = `${d0.getDate()} ${MONTHS_GEN[d0.getMonth()]} ${d0.getFullYear()}`

  return (
    <section className="bt-sheet mx-auto flex flex-col bg-white text-[#111] shadow-xl print:shadow-none">
      {/* Тақырып */}
      <div className="flex items-start justify-between">
        <img src="/beles-logo.png" alt="Beles education" style={{ height: '17mm' }} />
        <div className="text-right">
          <div className="text-[9pt] font-bold uppercase tracking-[.12em]" style={{ color: BLUE }}>
            Оқушы карточкасы
          </div>
          <div className="mt-1 text-[10pt] text-slate-500">
            Білім тексеру сынағы · {prevM && hasPrev ? `${prevM} – ` : ''}
            {exam.title}
          </div>
        </div>
      </div>
      <div className="mt-[6mm] h-[1.2mm] bg-black" />

      <h1 className="mt-[7mm] text-[28pt] font-extrabold leading-none tracking-tight">{student}</h1>
      <p className="mt-[3mm] text-[10.5pt] text-slate-500">
        {GROUP_NAME} · {hasPrev ? 'екі айлық нәтиже және өзгеріс' : `${nowM} айының нәтижесі`} · барлығы{' '}
        {TOTAL_MAX} баллдан
      </p>

      {/* Карточкалар */}
      <div className="mt-[7mm] grid grid-cols-4 gap-[3.5mm]">
        <Card label={prevM ?? 'Алдыңғы ай'} value={hasPrev ? String(prevTotal) : '—'} sub={hasPrev ? fmtPct(pct(prevTotal!, TOTAL_MAX)) : 'тапсырмаған'} />
        <Card
          label={nowM}
          value={nowTotal !== null ? String(nowTotal) : '—'}
          sub={nowTotal !== null ? fmtPct(pct(nowTotal, TOTAL_MAX)) : 'нәтиже жоқ'}
          active
        />
        <Card
          label="Өзгеріс"
          value={delta !== null ? sign(delta) : '—'}
          unit={delta !== null ? 'балл' : ''}
          sub={delta !== null ? `${sign(Math.round(pct(delta, TOTAL_MAX) * 10) / 10).replace('.', ',')} пайыздық пункт` : 'салыстыру жоқ'}
          tone={delta === null ? undefined : delta >= 0 ? 'up' : 'down'}
        />
        <Card label="Топтағы орны" value={rank ? String(rank.place) : '—'} unit={rank ? `/ ${rank.of}` : ''} sub={`${nowM} бойынша`} />
      </div>

      {/* Пәндер */}
      <div className="mt-[8mm] flex items-end justify-between">
        <h2 className="text-[15pt] font-bold">Пәндер бойынша</h2>
        <div className="flex items-center gap-4 text-[8.5pt] text-slate-500">
          {hasPrev && (
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-[2mm] w-[4mm] rounded-full" style={{ background: LIGHT }} />
              {prevM}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <i className="inline-block h-[2mm] w-[4mm] rounded-full" style={{ background: BLUE }} />
            {nowM}
          </span>
        </div>
      </div>
      <div className="mt-[3mm] grid grid-cols-[38mm_1fr_36mm_18mm] border-b-2 border-black pb-[2mm] text-[7.5pt] font-semibold uppercase tracking-[.1em] text-slate-500">
        <span>Пән</span>
        <span>Максимумның қанша пайызы</span>
        <span className="text-right">Балл</span>
        <span className="text-right">Өзгеріс</span>
      </div>
      {rows.map(({ s, g, now, before }) => {
        const d = now !== null && before !== null ? now - before : null
        return (
          <div key={s.id} className="grid grid-cols-[38mm_1fr_36mm_18mm] items-center border-b border-slate-200 py-[2.6mm]">
            <div>
              <div className="text-[11pt] font-semibold">{s.name}</div>
              {g && (
                <div className="text-[8pt] text-slate-500">
                  {g.correct}/{s.questions} дұрыс
                </div>
              )}
            </div>
            <div className="space-y-[1.2mm] pr-[6mm]">
              {hasPrev && <Bar v={before} max={s.max} color={LIGHT} />}
              <Bar v={now} max={s.max} color={BLUE} />
            </div>
            <div className="text-right text-[9pt] text-slate-500">
              {before !== null && <>{before} → </>}
              <b className="text-[12.5pt] text-black">{now ?? '—'}</b> / {s.max}
            </div>
            <div
              className="text-right text-[12pt] font-bold"
              style={{ color: d === null ? '#94a3b8' : d > 0 ? BLUE : d < 0 ? '#DC2626' : '#475569' }}
            >
              {d === null ? '—' : sign(d)}
            </div>
          </div>
        )
      })}
      <div className="grid grid-cols-[38mm_1fr_36mm_18mm] items-center border-t-2 border-black py-[3.5mm]">
        <div className="text-[12pt] font-bold">Жиынтығы</div>
        <div className="space-y-[1.2mm] pr-[6mm]">
          {hasPrev && <Bar v={prevTotal} max={TOTAL_MAX} color={LIGHT} />}
          <Bar v={nowTotal} max={TOTAL_MAX} color={BLUE} />
        </div>
        <div className="text-right text-[9pt] text-slate-500">
          {hasPrev && <>{prevTotal} → </>}
          <b className="text-[12.5pt] text-black">{nowTotal ?? '—'}</b> / {TOTAL_MAX}
        </div>
        <div className="text-right text-[12pt] font-bold" style={{ color: delta === null ? '#94a3b8' : delta >= 0 ? BLUE : '#DC2626' }}>
          {delta === null ? '—' : sign(delta)}
        </div>
      </div>

      {/* Қорытынды */}
      <div className="mt-[6mm] grid grid-cols-2 gap-[4mm]">
        <div className="rounded-[3mm] p-[4mm]" style={{ background: '#EEF3FE' }}>
          <div className="text-[8.5pt] font-bold uppercase tracking-[.1em]" style={{ color: BLUE }}>
            {ups.length ? 'Өскен пәндер' : 'Күшті тұс'}
          </div>
          <p className="mt-[2mm] text-[10pt] leading-snug">{goodText}</p>
        </div>
        <div className="rounded-[3mm] p-[4mm]" style={{ background: '#FDF0EF' }}>
          <div className="text-[8.5pt] font-bold uppercase tracking-[.1em] text-red-600">Назар аудару керек</div>
          <p className="mt-[2mm] text-[10pt] leading-snug">
            {badText}
            {missing.length > 0 && ` Тапсырылмаған: ${missing.join(', ')}.`}
          </p>
        </div>
      </div>

      {/* Қате сұрақтар */}
      {rows.some((r) => r.g && (r.g.wrong.length || r.g.blank.length)) && (
        <div className="mt-[5mm]">
          <div className="text-[8.5pt] font-bold uppercase tracking-[.1em] text-slate-500">Қате және бос сұрақтар (нөмірлері)</div>
          <div className="mt-[2mm] space-y-[0.8mm] text-[8.5pt] leading-snug">
            {rows
              .filter((r) => r.g && (r.g.wrong.length || r.g.blank.length))
              .map((r) => (
                <div key={r.s.id} className="grid grid-cols-[30mm_1fr]">
                  <span className="font-semibold">{r.s.name}</span>
                  <span className="text-slate-600">
                    {r.g!.wrong.join(', ')}
                    {r.g!.blank.length > 0 && (
                      <span className="text-slate-400">
                        {r.g!.wrong.length ? ' · ' : ''}бос: {r.g!.blank.join(', ')}
                      </span>
                    )}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="mt-auto flex justify-between border-t border-slate-200 pt-[3mm] text-[8pt] text-slate-500">
        <span>Beles education · айлық есеп</span>
        <span>
          {student} · {date}
        </span>
      </div>
    </section>
  )
}

function Card({
  label,
  value,
  unit,
  sub,
  active,
  tone,
}: {
  label: string
  value: string
  unit?: string
  sub: string
  active?: boolean
  tone?: 'up' | 'down'
}) {
  return (
    <div
      className="rounded-[3mm] border p-[4mm]"
      style={{ borderColor: active ? BLUE : '#E2E8F0', background: active ? '#F1F5FE' : '#fff' }}
    >
      <div className="text-[8pt] font-bold uppercase tracking-[.12em]" style={{ color: active ? BLUE : '#475569' }}>
        {label}
      </div>
      <div className="mt-[2mm] flex items-baseline gap-1">
        <span
          className="text-[22pt] font-extrabold leading-none"
          style={{ color: tone === 'up' ? BLUE : tone === 'down' ? '#DC2626' : '#111' }}
        >
          {value}
        </span>
        {unit && <span className="text-[10pt] text-slate-500">{unit}</span>}
      </div>
      <div className="mt-[2mm] text-[8.5pt] text-slate-500">{sub}</div>
    </div>
  )
}

function Bar({ v, max, color }: { v: number | null | undefined; max: number; color: string }) {
  return (
    <div className="h-[2.2mm] overflow-hidden rounded-full bg-slate-100">
      {typeof v === 'number' && (
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct(v, max))}%`, background: color }} />
      )}
    </div>
  )
}
