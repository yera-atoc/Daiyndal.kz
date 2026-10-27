'use client'

import { useState } from 'react'
import ProgressChart, { type ChartPoint } from '@/components/bilim/ProgressChart'
import { LETTERS, examMax, gradeSubject, monthName, type Exam, type SubjectConfig, type Student, type Submission } from '@/lib/bilimTest'
import type { HistPoint } from '@/lib/bilimTestForecast'
import { BRAND } from './shared'

export default function StudentProfile({
  student,
  exam,
  subs,
  history,
  place,
  of,
  onClose,
  onDelete,
  onSave,
}: {
  student: Student | undefined
  exam: Exam
  subs: Submission[]
  history: HistPoint[]
  place: number | null
  of: number
  onClose: () => void
  onDelete: (id: string) => void
  onSave: (subject: string, answers: string[]) => Promise<void>
}) {
  const [editing, setEditing] = useState<string | null>(null)
  if (!student) return null
  const graded = exam.subjects.map((s) => {
    const sub = subs.find((x) => x.subject === s.id)
    return { s, sub, g: sub ? gradeSubject(s, exam.answer_key[s.id], sub.answers) : null }
  })
  const total = graded.some((x) => x.g) ? graded.reduce((a, x) => a + (x.g?.score ?? 0), 0) : null
  const pts: ChartPoint[] = history.filter((h) => h.total !== null).map((h) => ({ month: h.month, value: h.total!, max: h.max, kind: 'actual' }))

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <aside className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()} aria-label={`${student.full_name} профилі`}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-white px-6 py-5" style={{ borderColor: BRAND.line }}>
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">{student.full_name}</h2>
            <p className="mt-1 text-sm" style={{ color: BRAND.muted }}>
              PIN <span className="font-semibold tracking-widest" style={{ color: BRAND.text }}>{student.pin}</span>
              {place && <> · {exam.title}: {place}-орын / {of}</>}
            </p>
          </div>
          <button onClick={onClose} aria-label="Жабу" className="rounded-lg px-2 text-2xl leading-none" style={{ color: BRAND.muted }}>×</button>
        </div>

        <div className="space-y-6 px-6 py-5">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-sm" style={{ color: BRAND.muted }}>{exam.title}</div>
              <div className="font-display text-4xl font-semibold tracking-tight">{total ?? '—'}<span className="ml-1 text-base font-normal" style={{ color: BRAND.muted }}>/ {examMax(exam)}</span></div>
            </div>
            {subs.length > 0 && (
              <a href={`/admin/bilim-test/report?group=${exam.group_id}&exam=${exam.id}&student=${encodeURIComponent(student.full_name)}`} className="rounded-lg px-3 py-2 text-sm font-semibold text-white" style={{ background: BRAND.ink }}>
                PDF есеп
              </a>
            )}
          </div>

          {pts.length >= 2 && (
            <div>
              <h3 className="text-sm font-semibold">Айлар бойынша</h3>
              <ProgressChart points={pts} />
              <p className="text-xs" style={{ color: BRAND.muted }}>{pts.map((p) => `${monthName(p.month)}: ${p.value}/${p.max}`).join(', ')}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold">Жауап парақтары</h3>
            <div className="mt-2 space-y-3">
              {graded.map(({ s, sub, g }) => {
                const key = exam.answer_key[s.id]
                return (
                  <div key={s.id} className="rounded-xl border p-3" style={{ borderColor: BRAND.line }}>
                    <div className="flex items-baseline justify-between gap-2">
                      <b className="text-sm">{s.name}</b>
                      <span className="text-sm" style={{ color: BRAND.muted }}>
                        {g ? <><b style={{ color: BRAND.text }}>{g.score}</b> / {s.max} · {g.correct}/{s.questions}</> : sub ? 'кілт жоқ' : 'тапсырмаған'}
                      </span>
                    </div>
                    {editing === s.id ? (
                      <SheetEditor
                        s={s}
                        initial={sub?.answers ?? []}
                        answerKey={key}
                        onCancel={() => setEditing(null)}
                        onSave={async (a) => {
                          await onSave(s.id, a)
                          setEditing(null)
                        }}
                      />
                    ) : !sub ? (
                      <button onClick={() => setEditing(s.id)} className="mt-2 text-xs font-semibold" style={{ color: BRAND.blue }}>
                        + Жауаптарын қолмен енгізу
                      </button>
                    ) : null}
                    {sub && editing !== s.id && (
                      <>
                        <div className="mt-2 flex flex-wrap gap-1 text-[11px] font-semibold tabular-nums">
                          {sub.answers.map((v, i) => {
                            const k = key?.[i]
                            const [bg, fg] = !k ? ['#EEF1F6', BRAND.muted] : !v ? ['#FEF3C7', '#B45309'] : v === k ? ['#DCFCE7', '#15803D'] : ['#FEE2E2', '#B91C1C']
                            return (
                              <span key={i} title={k ? `Дұрысы: ${k}` : ''} className="rounded px-1 py-0.5" style={{ background: bg, color: fg }}>
                                {i + 1}{v || '·'}
                              </span>
                            )
                          })}
                        </div>
                        <div className="mt-2 flex justify-between text-xs" style={{ color: BRAND.muted }}>
                          <span>{new Date(sub.submitted_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                          <button onClick={() => setEditing(s.id)} className="ml-auto mr-4 font-semibold hover:underline" style={{ color: BRAND.blue }}>
                            Жауаптарын түзету
                          </button>
                          <button
                            onClick={() => confirm(`${s.name}: жауап парағы өшсін бе? Оқушы қайта тапсыра алады.`) && onDelete(sub.id)}
                            className="font-medium hover:underline"
                            style={{ color: BRAND.red }}
                          >
                            Парақты өшіру
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}

/** Жауап парағын түзету: «ABCD…» жолымен немесе ұяшықтарды басып */
function SheetEditor({ s, initial, answerKey, onCancel, onSave }: { s: SubjectConfig; initial: string[]; answerKey?: string[]; onCancel: () => void; onSave: (a: string[]) => Promise<void> }) {
  const letters = LETTERS.slice(0, s.options)
  const [a, setA] = useState<string[]>(() => Array.from({ length: s.questions }, (_, i) => initial[i] ?? ''))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const g = gradeSubject(s, answerKey, a)
  return (
    <div className="mt-2">
      <input
        value={a.map((x) => x || '·').join('')}
        onChange={(e) => {
          const ch = e.target.value.toUpperCase().replace(/[^A-E·.\-_ ]/g, '').replace(/ /g, '').split('')
          setA(Array.from({ length: s.questions }, (_, i) => (letters.includes(ch[i]) ? ch[i] : '')))
        }}
        spellCheck={false}
        className="w-full rounded-lg border px-3 py-2 font-mono text-sm tracking-[.2em] outline-none focus:border-[#2B6BF3]"
        style={{ borderColor: BRAND.line }}
        placeholder="ABCD… (бос сұрақ — нүкте)"
      />
      <div className="mt-2 grid grid-cols-5 gap-1 sm:grid-cols-10">
        {a.map((v, i) => (
          <button
            key={i}
            onClick={() => setA(a.map((x, j) => (j === i ? letters[(letters.indexOf(x) + 1) % (letters.length + 1)] ?? '' : x)))}
            className="rounded-md border py-1 text-center text-xs"
            style={v ? { borderColor: '#BFD3FB', background: '#EEF3FE', color: BRAND.blue, fontWeight: 700 } : { borderColor: BRAND.line, color: '#B8BFCC' }}
          >
            <span className="mr-0.5 text-[9px] font-normal" style={{ color: BRAND.muted }}>{i + 1}</span>
            {v || '·'}
          </button>
        ))}
      </div>
      {err && <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">{err}</p>}
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span style={{ color: BRAND.muted }}>{g ? `Жаңа балл: ${g.score} / ${s.max} · ${g.correct} дұрыс` : `${a.filter(Boolean).length} / ${s.questions} белгіленді`}</span>
        <div className="flex gap-2">
          <button onClick={onCancel} className="rounded-lg border px-3 py-1.5" style={{ borderColor: BRAND.line }}>Болдырмау</button>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              setErr('')
              try {
                await onSave(a)
              } catch (e: any) {
                setErr(e.message || 'Сақталмады')
                setBusy(false)
              }
            }}
            className="rounded-lg px-3 py-1.5 font-semibold text-white disabled:opacity-50"
            style={{ background: BRAND.blue }}
          >
            {busy ? 'Сақталуда…' : 'Сақтау'}
          </button>
        </div>
      </div>
    </div>
  )
}
