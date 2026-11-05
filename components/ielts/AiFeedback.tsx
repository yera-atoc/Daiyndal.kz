'use client'

// ИИ бағасының картасы: band, критерийлер, күшті жақтар, не жақсарту керек, қателер түзетуімен, жақсартылған нұсқа
import type { AiResult } from '@/lib/aiGrade'

const NAMES: Record<string, string> = {
  ta: 'Task Achievement / Response',
  cc: 'Coherence & Cohesion',
  lr: 'Lexical Resource',
  gra: 'Grammar Range & Accuracy',
  fc: 'Fluency & Coherence',
  p: 'Pronunciation*',
  score: 'Band (1–6)',
}
export const TASK_NAMES: Record<string, string> = {
  task1: 'Writing Task 1',
  task2: 'Writing Task 2',
  email: 'Write an Email',
  discussion: 'Academic Discussion',
  part1: 'Speaking Part 1',
  part2: 'Speaking Part 2',
  part3: 'Speaking Part 3',
  interview: 'Take an Interview',
  repeat: 'Listen and Repeat',
}

const fmt = (b: number) => (Number.isInteger(b) ? b.toFixed(1) : String(b))

export default function AiFeedback({ r, compact = false }: { r: AiResult; compact?: boolean }) {
  const ielts = r.exam === 'ielts'
  const keys = Object.keys(r.scores)
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 rounded-2xl px-5 py-4 text-white" style={{ background: '#0B0F19' }}>
        <div>
          <div className="text-[11px] font-semibold uppercase opacity-70">ИИ бағасы · {TASK_NAMES[r.task] ?? r.task}</div>
          <div className="text-4xl font-bold tabular-nums">{fmt(r.band)}<span className="text-base font-medium opacity-60"> / {ielts ? 9 : 6}</span></div>
        </div>
        {(r.words || r.wpm) && (
          <div className="text-right text-sm opacity-80">
            {r.words ? <div><b>{r.words}</b> сөз</div> : null}
            {r.wpm ? <div><b>{r.wpm}</b> сөз/мин</div> : null}
          </div>
        )}
      </div>
      {keys.length > 1 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {keys.map((k) => (
            <div key={k} className="rounded-xl border bg-white px-3 py-2" style={{ borderColor: '#E3E7F0' }}>
              <div className="text-xs leading-tight text-slate-500">{NAMES[k] ?? k}</div>
              <div className="text-xl font-bold tabular-nums">{fmt(r.scores[k])}</div>
            </div>
          ))}
        </div>
      )}
      {r.summary && <p className="leading-relaxed">{r.summary}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {r.strengths.length > 0 && (
          <div className="rounded-2xl bg-emerald-50 p-4">
            <div className="text-sm font-bold text-emerald-800">Жақсы шыққаны</div>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm">{r.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
        )}
        {r.improve.length > 0 && (
          <div className="rounded-2xl bg-amber-50 p-4">
            <div className="text-sm font-bold text-amber-800">Баллды көтеру үшін</div>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm">{r.improve.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
        )}
      </div>
      {!compact && r.fixes.length > 0 && (
        <div className="rounded-2xl border bg-white p-4" style={{ borderColor: '#E3E7F0' }}>
          <div className="text-sm font-bold">Қателер және түзетуі</div>
          <ol className="mt-2 space-y-2.5">
            {r.fixes.map((f, i) => (
              <li key={i} className="text-sm">
                <span className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-700 line-through decoration-rose-400">{f.from}</span>
                <span className="mx-1.5 text-slate-400">→</span>
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-800">{f.to}</span>
                {f.why && <div className="mt-0.5 text-xs text-slate-500">{f.why}</div>}
              </li>
            ))}
          </ol>
        </div>
      )}
      {!compact && r.better && (
        <div className="rounded-2xl border bg-blue-50/60 p-4" style={{ borderColor: '#DBEAFE' }}>
          <div className="text-sm font-bold text-blue-800">Жақсартылған нұсқа (үлгі)</div>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{r.better}</p>
        </div>
      )}
      <p className="text-xs text-slate-400">
        ИИ бағасы — алдын ала, нақты емтихан нәтижесімен сәйкес келмеуі мүмкін.{r.note ? ` ${r.note}` : ''}
      </p>
    </div>
  )
}
