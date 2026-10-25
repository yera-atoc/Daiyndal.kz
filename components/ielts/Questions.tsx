'use client'

// Сұрақ топтарын көрсету: multiple choice, True/False/Not Given, Yes/No/Not Given, gap-fill, matching.
import type { QGroup } from '@/lib/ielts'

export const INK = '#111827'
export const BLUE = '#2B6BF3'
export const LINE = '#E3E7F0'
export const MUTED = '#6B7385'

/** Нұсқаның әрпі: «B The river» → «B»; әріп жоқ болса — реті бойынша A, B, C… */
export function optionKey(opt: string, i: number) {
  const m = opt.trim().match(/^([A-Z]|[ivxlc]+)[\s.)]/i)
  return m ? m[1] : String.fromCharCode(65 + i)
}
export function optionText(opt: string) {
  return opt.trim().replace(/^([A-Z]|[ivxlc]+)[\s.)]+/i, '')
}

const TF = ['TRUE', 'FALSE', 'NOT GIVEN']
const YN = ['YES', 'NO', 'NOT GIVEN']

export default function Questions({
  groups,
  answers,
  onChange,
  disabled,
  review,
}: {
  groups: QGroup[]
  answers: Record<string, string>
  onChange: (n: number, v: string) => void
  disabled?: boolean
  review?: (n: number) => { ok: boolean; correct?: string } | null
}) {
  return (
    <div className="space-y-8">
      {groups.map((g, gi) => {
        const first = g.items[0]?.n
        const last = g.items[g.items.length - 1]?.n
        return (
          <section key={gi} aria-label={`Questions ${first}–${last}`}>
            <h3 className="text-[15px] font-bold">Questions {first}{last !== first ? `–${last}` : ''}</h3>
            {g.instructions && <p className="mt-1 whitespace-pre-wrap text-[15px] italic" style={{ color: '#374151' }}>{g.instructions}</p>}

            {g.type === 'matching' && g.options?.some((o, i) => optionText(o) !== optionKey(o, i)) ? (
              <div className="mt-3 rounded-lg border p-3 text-[15px]" style={{ borderColor: LINE, background: '#F9FAFB' }}>
                {g.options.map((o, i) => (
                  <div key={i}><b className="mr-2">{optionKey(o, i)}</b>{optionText(o) !== optionKey(o, i) ? optionText(o) : ''}</div>
                ))}
              </div>
            ) : null}

            {g.type === 'cloze' ? (
              <Cloze g={g} answers={answers} onChange={onChange} disabled={disabled} review={review} />
            ) : (
            <div className="mt-3 space-y-4">
              {g.items.map((it) => {
                const v = answers[String(it.n)] ?? ''
                const r = review?.(it.n)
                const mark = r ? (
                  <span className="ml-2 rounded px-1.5 py-0.5 text-xs font-bold" style={r.ok ? { background: '#DCFCE7', color: '#15803D' } : { background: '#FEE2E2', color: '#B91C1C' }}>
                    {r.ok ? '✓' : `✗ ${r.correct ?? ''}`}
                  </span>
                ) : null
                const num = (
                  <span className="mr-2 inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded border px-1 text-sm font-bold" style={{ borderColor: INK }}>
                    {it.n}
                  </span>
                )

                if (g.type === 'order') {
                  return (
                    <div key={it.n} id={`q${it.n}`} className="text-[15px]">
                      <div className="flex items-start">{num}<span className="whitespace-pre-wrap pt-0.5">{it.prompt}</span>{mark}</div>
                      <OrderItem options={it.options ?? []} value={v} disabled={disabled} onChange={(x) => onChange(it.n, x)} />
                    </div>
                  )
                }

                if (g.type === 'gap') {
                  const parts = it.prompt.split(/_{3,}/)
                  const input = (
                    <input
                      id={`q${it.n}`}
                      value={v}
                      disabled={disabled}
                      onChange={(e) => onChange(it.n, e.target.value)}
                      aria-label={`Question ${it.n}`}
                      autoComplete="off"
                      spellCheck={false}
                      className="mx-1 inline-block w-40 rounded border px-2 py-1 text-[15px] outline-none focus:border-[#2B6BF3] focus:ring-2 focus:ring-[#2B6BF3]/20"
                      style={{ borderColor: '#9CA3AF' }}
                    />
                  )
                  return (
                    <div key={it.n} className="text-[15px] leading-9">
                      {num}
                      {parts.length > 1 ? parts.map((p, i) => <span key={i}>{p}{i < parts.length - 1 && input}</span>) : <>{it.prompt} {input}</>}
                      {mark}
                    </div>
                  )
                }

                const choices =
                  g.type === 'tfng' ? TF.map((x) => [x, x]) :
                  g.type === 'ynng' ? YN.map((x) => [x, x]) :
                  g.type === 'matching' ? (g.options ?? []).map((o, i) => [optionKey(o, i), optionKey(o, i)]) :
                  (it.options ?? []).map((o, i) => [optionKey(o, i), o])

                return (
                  <fieldset key={it.n} id={`q${it.n}`} className="text-[15px]">
                    <legend className="flex items-start">
                      {num}
                      <span className="pt-0.5">{it.prompt}</span>
                      {mark}
                    </legend>
                    <div className={`mt-2 pl-9 ${g.type === 'mcq' ? 'space-y-1.5' : 'flex flex-wrap gap-2'}`}>
                      {choices.map(([key, label]) => {
                        const on = v === key
                        return (
                          <label
                            key={key}
                            className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-1.5 ${disabled ? 'cursor-default' : 'hover:bg-slate-50'}`}
                            style={{ borderColor: on ? BLUE : LINE, background: on ? '#EEF3FE' : '#fff' }}
                          >
                            <input
                              type="radio"
                              name={`q${it.n}`}
                              value={key}
                              checked={on}
                              disabled={disabled}
                              onChange={() => onChange(it.n, key)}
                              className="mt-1 accent-[#2B6BF3]"
                            />
                            <span>{g.type === 'mcq' ? <><b className="mr-1.5">{key}</b>{optionText(label)}</> : label}</span>
                          </label>
                        )
                      })}
                    </div>
                  </fieldset>
                )
              })}
            </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

type Review = ((n: number) => { ok: boolean; correct?: string } | null) | undefined

/** TOEFL «Complete the Words»: абзац ішіндегі сөздердің жетпей тұрған әріптерін толтыру. Сұрақ мәтіні: «cen___» */
function Cloze({ g, answers, onChange, disabled, review }: { g: QGroup; answers: Record<string, string>; onChange: (n: number, v: string) => void; disabled?: boolean; review: Review }) {
  // Мәтіндегі [k] — осы топтың k-сұрағы (1-ден бастап)
  const parts = (g.text ?? '').split(/\[(\d+)\]/)
  return (
    <p className="mt-3 rounded-lg border p-4 text-[16px] leading-[2.4]" style={{ borderColor: LINE, background: '#FCFCFD' }}>
      {parts.map((chunk, i) => {
        if (i % 2 === 0) return <span key={i}>{chunk}</span>
        const it = g.items[Number(chunk) - 1]
        if (!it) return null
        const m = it.prompt.match(/^(.*?)(_+)(.*)$/)
        const prefix = m ? m[1] : it.prompt
        const len = m ? m[2].length : 4
        const r = review?.(it.n)
        return (
          <span key={i} className="whitespace-nowrap">
            {prefix}
            <input
              id={`q${it.n}`}
              value={answers[String(it.n)] ?? ''}
              disabled={disabled}
              maxLength={len + 2}
              onChange={(e) => onChange(it.n, e.target.value.replace(/\s/g, ''))}
              aria-label={`Question ${it.n}: complete the word ${prefix}`}
              autoComplete="off"
              spellCheck={false}
              className="mx-px inline-block rounded border-b-2 bg-[#EEF3FE] px-1 text-center font-mono text-[15px] outline-none focus:border-[#2B6BF3]"
              style={{ width: `${len * 0.72 + 1}em`, borderColor: r ? (r.ok ? '#15803D' : '#B91C1C') : '#9CA3AF' }}
            />
            {m?.[3]}
            {r && !r.ok && <sup className="ml-0.5 text-xs font-bold text-red-700">{(r.correct ?? '').split(/\s*[|/]\s*/)[0]}</sup>}
          </span>
        )
      })}
    </p>
  )
}

/** TOEFL «Build a Sentence»: сөздерді ретімен басып сөйлем құрау */
function OrderItem({ options, value, disabled, onChange }: { options: string[]; value: string; disabled?: boolean; onChange: (v: string) => void }) {
  const used = value ? value.split(' ') : []
  const left = [...options]
  for (const w of used) {
    const k = left.indexOf(w)
    if (k >= 0) left.splice(k, 1)
  }
  const chip = 'rounded-md border px-2.5 py-1 text-[15px]'
  return (
    <div className="mt-2 pl-9">
      <div className="flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-lg border-2 border-dashed px-2 py-1.5" style={{ borderColor: used.length ? BLUE : LINE }}>
        {used.length === 0 && <span className="text-sm" style={{ color: MUTED }}>Сөздерді ретімен басыңыз</span>}
        {used.map((w, i) => (
          <button key={i} type="button" disabled={disabled} onClick={() => onChange(used.filter((_, j) => j !== i).join(' '))} className={chip} style={{ borderColor: BLUE, background: '#EEF3FE' }} title="Алып тастау">
            {w}
          </button>
        ))}
      </div>
      {!disabled && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {left.map((w, i) => (
            <button key={i} type="button" onClick={() => onChange([...used, w].join(' '))} className={chip + ' bg-white hover:bg-slate-50'} style={{ borderColor: LINE }}>
              {w}
            </button>
          ))}
          {used.length > 0 && <button type="button" onClick={() => onChange('')} className="ml-2 text-xs underline" style={{ color: MUTED }}>Тазалау</button>}
        </div>
      )}
    </div>
  )
}
