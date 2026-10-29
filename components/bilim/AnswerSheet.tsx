'use client'

import { useEffect, useMemo, useState } from 'react'
import { LETTERS } from '@/lib/bilimTest'

export type SheetSubject = { id: string; name: string; questions: number; options: number }

const draftKey = (exam: string, student: string, subject: string) => `bt_draft:${exam}:${student}:${subject}`

function load<T>(k: string, fallback: T): T {
  try {
    const v = localStorage.getItem(k)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}
function store(k: string, v: unknown) {
  try {
    if (v === null) localStorage.removeItem(k)
    else localStorage.setItem(k, JSON.stringify(v))
  } catch {}
}

export default function AnswerSheet({
  examId,
  student,
  subject,
  onBack,
  onSubmitted,
}: {
  examId: string
  student: string
  subject: SheetSubject
  onBack: () => void
  onSubmitted: () => void
}) {
  const exam = { id: examId }
  const key = draftKey(exam.id, student, subject.id)
  const [answers, setAnswers] = useState<string[]>(() => {
    const d = load<string[]>(key, [])
    return Array.from({ length: subject.questions }, (_, i) => d[i] ?? '')
  })
  const [confirm, setConfirm] = useState(false)
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => store(key, answers), [key, answers])

  // Сұрақтар сайтта болса — мәтінімен көрсетеміз (жеке нұсқада оқушының өз ретімен)
  type Q = { text: string; image: string; passage: string; options: string[] }
  const [qs, setQs] = useState<Q[] | null>(null)
  const [mode, setMode] = useState<'questions' | 'sheet'>('questions')
  useEffect(() => {
    fetch(`/api/bilim-test/me/questions?exam=${encodeURIComponent(examId)}&subject=${encodeURIComponent(subject.id)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { questions: null }))
      .then((j) => setQs(Array.isArray(j.questions) && j.questions.length ? j.questions : null))
      .catch(() => setQs(null))
  }, [examId, subject.id])
  const withText = !!qs && mode === 'questions'

  const letters = LETTERS.slice(0, subject.options)
  const filled = answers.filter(Boolean).length
  const blanks = useMemo(() => answers.map((a, i) => (a ? 0 : i + 1)).filter(Boolean), [answers])

  const pick = (i: number, l: string) =>
    setAnswers((prev) => prev.map((a, j) => (j === i ? (a === l ? '' : l) : a)))

  const submit = async () => {
    setSending(true)
    setErr('')
    try {
      const r = await fetch('/api/bilim-test/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: exam.id, subject: subject.id, answers }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      store(key, null)
      onSubmitted()
    } catch (e: any) {
      setErr(e.message || 'Жіберілмеді. Интернетті тексеріп, қайта бас.')
      setSending(false)
    }
  }

  return (
    <>
      <button onClick={onBack} className="-ml-2 rounded-lg px-2 py-1 text-sm text-blue-600 active:bg-blue-50">
        ← Пәндер
      </button>
      <div className="mt-1 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">{subject.name}</h1>
          <p className="text-sm text-slate-500">{student}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tabular-nums">
            {filled}
            <span className="text-base font-normal text-slate-400">/{subject.questions}</span>
          </div>
          <div className="text-xs text-slate-500">белгіленді</div>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full bg-blue-600 transition-all" style={{ width: `${(filled / subject.questions) * 100}%` }} />
      </div>

      {qs && (
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
          {([['questions', 'Сұрақтармен'], ['sheet', 'Тек жауап парағы']] as const).map(([m, l]) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded-lg py-2 ${mode === m ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>{l}</button>
          ))}
        </div>
      )}

      {withText && (
        <ol className="mt-4 space-y-3">
          {answers.map((a, i) => {
            const q = qs![i]
            return (
              <li key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
                {q?.passage && <div className="mb-3 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">{q.passage}</div>}
                <div className="flex gap-2.5">
                  <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${a ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    {q?.text && <p className="whitespace-pre-line font-semibold leading-snug">{q.text}</p>}
                    {q?.image && <img src={q.image} alt="" className="mt-2 max-h-72 rounded-lg border border-slate-200" />}
                  </div>
                </div>
                <div className="mt-3 grid gap-2">
                  {letters.map((l, k) => (
                    <button
                      key={l}
                      onClick={() => pick(i, l)}
                      aria-label={`${i + 1}-сұрақ, ${l}`}
                      className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition ${a === l ? 'border-blue-600 bg-blue-50' : 'border-slate-200 active:border-blue-300'}`}
                    >
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${a === l ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{l}</span>
                      <span className="text-[15px]">{q?.options?.[k] ?? ''}</span>
                    </button>
                  ))}
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {!withText && (
      <ol className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {answers.map((a, i) => (
          <li
            key={i}
            className={`flex items-center gap-3 px-3 py-2 ${i % 5 === 4 ? 'border-b-2 border-slate-200' : 'border-b border-slate-100'} last:border-0`}
          >
            <span className="w-7 text-right text-sm font-semibold tabular-nums text-slate-400">{i + 1}</span>
            <div className="flex flex-1 justify-between gap-2">
              {letters.map((l) => (
                <button
                  key={l}
                  onClick={() => pick(i, l)}
                  aria-label={`${i + 1}-сұрақ, ${l}`}
                  className={`h-11 flex-1 rounded-full border-2 text-base font-bold transition ${
                    a === l
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 text-slate-500 active:border-blue-300'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>
      )}
      <p className="mt-3 text-center text-xs text-slate-400">
        Белгіні алу үшін қайта бас. Жауаптар телефонда сақталып тұрады.
      </p>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-xl">
          <button
            onClick={() => setConfirm(true)}
            className="w-full rounded-xl bg-blue-600 py-3.5 text-base font-semibold text-white active:bg-blue-700"
          >
            Тапсыру
          </button>
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 sm:items-center" onClick={() => !sending && setConfirm(false)}>
          <div className="w-full max-w-xl rounded-t-3xl bg-white p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold">{subject.name}: тапсырасың ба?</h2>
            <p className="mt-2 text-slate-600">
              Тапсырғаннан кейін жауапты өзгерту мүмкін емес.
            </p>
            {blanks.length > 0 ? (
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                <b>{blanks.length} сұрақ бос:</b> {blanks.join(', ')}
              </p>
            ) : (
              <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Барлық сұрақ белгіленді.</p>
            )}
            {err && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button disabled={sending} onClick={() => setConfirm(false)} className="rounded-xl border border-slate-300 py-3 font-semibold">
                Қайту
              </button>
              <button disabled={sending} onClick={submit} className="rounded-xl bg-blue-600 py-3 font-semibold text-white disabled:opacity-60">
                {sending ? 'Жіберілуде…' : 'Иә, тапсыру'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
