'use client'

import ProgressChart, { type ChartPoint } from '@/components/bilim/ProgressChart'
import { examMax, gradeSubject, monthName, type Exam, type Student, type Submission } from '@/lib/bilimTest'
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
}: {
  student: Student | undefined
  exam: Exam
  subs: Submission[]
  history: HistPoint[]
  place: number | null
  of: number
  onClose: () => void
  onDelete: (id: string) => void
}) {
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
                    {sub && (
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
