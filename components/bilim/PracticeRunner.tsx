'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { LETTERS, gradeSubject, topicStats, weakTopics, type Question } from '@/lib/bilimTest'

// Дайындық сынағы: сұрақтар мәтінімен, нұсқаларымен экранда. Тапсырған соң
// бірден тексеріліп, әр сұрақтың дұрыс жауабы көрсетіледі. Қайта тапсыруға болады.

type Data = {
  exam: { id: string; title: string }
  subject: { id: string; name: string; questions: number; options: number; max: number }
  questions: Question[]
  review: { answers: string[]; key: string[]; at: string } | null
}

const draftKey = (exam: string, subject: string) => `bt_practice:${exam}:${subject}`
function load(k: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(k) || '[]')
  } catch {
    return []
  }
}
function save(k: string, v: string[] | null) {
  try {
    if (v) localStorage.setItem(k, JSON.stringify(v))
    else localStorage.removeItem(k)
  } catch {}
}

export default function PracticeRunner({ examId, subjectId, onBack, onChanged }: { examId: string; subjectId: string; onBack: () => void; onChanged: () => void }) {
  const [data, setData] = useState<Data | null>(null)
  const [err, setErr] = useState('')
  const [retake, setRetake] = useState(false)

  const fetchData = useCallback(async () => {
    setErr('')
    const r = await fetch(`/api/bilim-test/me/practice?exam=${encodeURIComponent(examId)}&subject=${encodeURIComponent(subjectId)}`, { cache: 'no-store' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) return setErr(j.error || 'Жүктелмеді')
    setData(j)
  }, [examId, subjectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (err) return <p className="rounded-xl bg-rose-50 p-4 text-rose-700">{err}</p>
  if (!data) return <p className="py-20 text-center text-slate-400">Жүктелуде…</p>

  const back = (
    <button onClick={onBack} className="-ml-2 rounded-lg px-2 py-1 text-sm text-blue-600 active:bg-blue-50">
      ← Пәндер
    </button>
  )

  if (data.review && !retake)
    return (
      <>
        {back}
        <Review data={data} onRetake={() => { setRetake(true); window.scrollTo({ top: 0 }) }} />
      </>
    )

  return (
    <>
      {back}
      <Runner
        data={data}
        onSubmitted={async () => {
          await fetchData()
          setRetake(false)
          onChanged()
          window.scrollTo({ top: 0 })
        }}
      />
    </>
  )
}

function Passage({ text }: { text: string }) {
  return <div className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[15px] leading-relaxed text-slate-800">{text}</div>
}

function Runner({ data, onSubmitted }: { data: Data; onSubmitted: () => Promise<void> }) {
  const { subject, questions, exam } = data
  const key = draftKey(exam.id, subject.id)
  const [answers, setAnswers] = useState<string[]>(() => {
    const d = load(key)
    return Array.from({ length: subject.questions }, (_, i) => d[i] ?? '')
  })
  const [confirm, setConfirm] = useState(false)
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => save(key, answers), [key, answers])

  const letters = LETTERS.slice(0, subject.options)
  const filled = answers.filter(Boolean).length
  const blanks = useMemo(() => answers.map((a, i) => (a ? 0 : i + 1)).filter(Boolean), [answers])
  const pick = (i: number, l: string) => setAnswers((p) => p.map((a, j) => (j === i ? (a === l ? '' : l) : a)))

  const submit = async () => {
    setSending(true)
    setErr('')
    try {
      const r = await fetch('/api/bilim-test/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: exam.id, subject: subject.id, answers }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error)
      save(key, null)
      setConfirm(false)
      await onSubmitted()
    } catch (e: any) {
      setErr(e.message || 'Жіберілмеді. Интернетті тексеріп, қайта бас.')
    }
    setSending(false)
  }

  return (
    <>
      <div className="sticky top-[57px] z-10 -mx-4 mt-1 border-b border-slate-200 bg-slate-50/95 px-4 pb-3 pt-2 backdrop-blur">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">Дайындық · {exam.title}</div>
            <h1 className="text-xl font-bold">{subject.name}</h1>
          </div>
          <div className="text-right text-xl font-bold tabular-nums">
            {filled}
            <span className="text-sm font-normal text-slate-400">/{subject.questions}</span>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${(filled / subject.questions) * 100}%` }} />
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {Array.from({ length: subject.questions }, (_, i) => {
          const q = questions[i] ?? {}
          return (
            <div key={i} className="space-y-3">
              {q.passage && <Passage text={q.passage} />}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex gap-2">
                  <span className="shrink-0 font-bold text-slate-400 tabular-nums">{i + 1}.</span>
                  <p className="whitespace-pre-wrap font-medium leading-relaxed">{q.text || `${i + 1}-сұрақ`}</p>
                </div>
                {q.image && <img src={q.image} alt="" className="mt-3 max-h-80 w-full rounded-lg object-contain" />}
                <div className="mt-3 space-y-2">
                  {letters.map((l, j) => {
                    const on = answers[i] === l
                    return (
                      <button
                        key={l}
                        onClick={() => pick(i, l)}
                        className={`flex w-full items-start gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition ${on ? 'border-blue-600 bg-blue-50' : 'border-slate-200 active:border-blue-300'}`}
                      >
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${on ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{l}</span>
                        <span className="pt-0.5 leading-snug">{q.options?.[j] ?? ''}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-4 text-center text-xs text-slate-400">Жауаптар телефонда сақталып тұрады. Белгіні алу үшін қайта бас.</p>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-xl">
          <button onClick={() => setConfirm(true)} className="w-full rounded-xl bg-blue-600 py-3.5 text-base font-semibold text-white active:bg-blue-700">
            Тапсыру және тексеру
          </button>
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 sm:items-center" onClick={() => !sending && setConfirm(false)}>
          <div className="w-full max-w-xl rounded-t-3xl bg-white p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold">{subject.name}: тапсырасың ба?</h2>
            <p className="mt-2 text-slate-600">Бірден тексеріліп, дұрыс жауаптар көрсетіледі. Кейін қайта тапсыруға болады.</p>
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
                {sending ? 'Тексерілуде…' : 'Иә, тапсыру'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Review({ data, onRetake }: { data: Data; onRetake: () => void }) {
  const { subject, questions, exam } = data
  const { answers, key } = data.review!
  const [onlyWrong, setOnlyWrong] = useState(false)
  const g = gradeSubject({ ...subject, short: subject.name }, key, answers)
  const stats = topicStats({ ...subject, short: subject.name }, key, answers, questions)
  const weak = weakTopics(stats)
  const letters = LETTERS.slice(0, subject.options)
  const p = g ? g.correct / subject.questions : 0

  return (
    <>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-blue-600">Дайындық · {exam.title}</div>
      <h1 className="text-2xl font-bold">{subject.name}</h1>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Балл</div>
            <div className="text-4xl font-extrabold tabular-nums">
              {g?.score ?? '—'}
              <span className="text-lg font-semibold text-slate-400"> / {subject.max}</span>
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="font-semibold">{p >= 0.85 ? 'Керемет!' : p >= 0.6 ? 'Жақсы, тағы аздап' : 'Қателерді қарап шық'}</div>
            <div className="text-slate-500">{Math.round(p * 100)}% дұрыс</div>
          </div>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${p * 100}%` }} />
        </div>
        {g && (
          <div className="mt-3 flex flex-wrap gap-1.5 text-sm">
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-700">Дұрыс {g.correct}</span>
            <span className="rounded-md bg-red-50 px-2 py-0.5 text-red-600">Қате {g.wrong.length}</span>
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-amber-700">Бос {g.blank.length}</span>
          </div>
        )}
        {weak.length > 0 && (
          <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm">
            <b className="text-red-700">Қайталау керек:</b> {weak.join(' · ')}
          </p>
        )}
        <button onClick={onRetake} className="mt-4 w-full rounded-xl border border-blue-200 bg-blue-50 py-2.5 font-semibold text-blue-700 active:bg-blue-100">
          Қайта тапсыру
        </button>
      </div>

      <div className="mt-5 flex gap-2">
        {([[false, 'Барлық сұрақ'], [true, 'Тек қателер']] as const).map(([v, l]) => (
          <button key={l} onClick={() => setOnlyWrong(v)} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${onlyWrong === v ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-3">
        {Array.from({ length: subject.questions }, (_, i) => {
          const q = questions[i] ?? {}
          const a = answers[i] ?? ''
          const k = key[i] ?? ''
          const ok = !!k && a === k
          if (onlyWrong && ok) return null
          // Мәтін бірінші сұрақта ғана — «тек қателер» режимінде де контекст көрінсін
          let passage = q.passage
          if (onlyWrong && !passage) for (let j = i - 1; j >= 0 && !passage; j--) if (questions[j]?.passage) passage = questions[j]!.passage
          return (
            <div key={i} className="space-y-2">
              {passage && (onlyWrong ? <details className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm"><summary className="cursor-pointer font-medium text-slate-600">Мәтінді көру</summary><div className="mt-2 whitespace-pre-wrap leading-relaxed">{passage}</div></details> : <Passage text={passage} />)}
              <div className={`rounded-2xl border bg-white p-4 ${ok ? 'border-emerald-200' : a ? 'border-red-200' : 'border-amber-200'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex gap-2">
                    <span className="shrink-0 font-bold text-slate-400 tabular-nums">{i + 1}.</span>
                    <p className="whitespace-pre-wrap font-medium leading-relaxed">{q.text || `${i + 1}-сұрақ`}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${ok ? 'bg-emerald-100 text-emerald-700' : a ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>{ok ? 'дұрыс' : a ? 'қате' : 'бос'}</span>
                </div>
                <div className="mt-3 space-y-1.5">
                  {letters.map((l, j) => {
                    const right = l === k
                    const mine = l === a
                    return (
                      <div key={l} className={`flex items-start gap-3 rounded-xl px-3 py-2 ${right ? 'bg-emerald-50 ring-1 ring-emerald-300' : mine ? 'bg-red-50 ring-1 ring-red-300' : ''}`}>
                        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${right ? 'bg-emerald-600 text-white' : mine ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{l}</span>
                        <span className="text-[15px] leading-snug">{q.options?.[j] ?? ''}</span>
                        {mine && <span className="ml-auto shrink-0 text-xs text-slate-500">сенің жауабың</span>}
                      </div>
                    )
                  })}
                </div>
                {q.topic && <div className="mt-2 text-xs text-slate-400">{q.topic}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
