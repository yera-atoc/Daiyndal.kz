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
          </section>
        )
      })}
    </div>
  )
}
