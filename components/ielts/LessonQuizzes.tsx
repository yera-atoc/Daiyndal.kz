'use client'

import { useCallback, useEffect, useState } from 'react'
import type { QuizQ } from '@/lib/lesson'

const INK = '#0B0F19'
const MUTED = '#687085'
const LINE = '#E3E7F0'
const L = 'ABCD'

type Quiz = { id: string; date: string; topic: string; open: boolean; className: string; subject: string | null; questions: QuizQ[]; result: { answers: number[]; score: number; total: number } | null }

/** Оқушы кабинетінде: мұғалім ашқан сабақ тесттері (тақырып бойынша) */
export default function LessonQuizzes({ accent = '#2B6BF3' }: { accent?: string }) {
  const [list, setList] = useState<Quiz[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const load = useCallback(async () => {
    const r = await fetch('/api/ielts/quiz', { cache: 'no-store' })
    if (r.ok) setList((await r.json()).quizzes ?? [])
  }, [])
  useEffect(() => {
    load()
  }, [load])
  if (!list.length) return null
  const cur = list.find((q) => q.id === open)
  if (cur) return <Take q={cur} accent={accent} onBack={() => { setOpen(null); load() }} />
  const todo = list.filter((q) => !q.result)
  return (
    <section className="mt-5">
      <h2 className="font-display mb-3 text-lg font-semibold">Сабақ тесттері{todo.length > 0 && <span className="ml-2 rounded-full px-2 py-0.5 align-middle text-xs font-bold text-white" style={{ background: '#DC2626' }}>{todo.length} жаңа</span>}</h2>
      <div className="grid gap-3 lg:grid-cols-2">
        {list.map((q) => (
          <button key={q.id} onClick={() => setOpen(q.id)} className="flex items-center gap-4 rounded-3xl bg-white p-5 text-left ring-1 ring-[#E3E7F0] transition hover:ring-[#0B0F19]">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-sm font-bold" style={{ background: q.result ? '#DCFCE7' : accent, color: q.result ? '#15803D' : '#fff' }}>
              {q.result ? `${q.result.score}/${q.result.total}` : 'Тест'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[16px] font-semibold">{q.topic}</span>
              <span className="block text-sm" style={{ color: MUTED }}>{[q.className, `${q.questions.length} сұрақ`, q.date.split('-').reverse().slice(0, 2).join('.')].join(' · ')}</span>
            </span>
            <span className="text-sm font-semibold" style={{ color: q.result ? MUTED : accent }}>{q.result ? 'Қарау' : 'Бастау →'}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function Take({ q, accent, onBack }: { q: Quiz; accent: string; onBack: () => void }) {
  const [ans, setAns] = useState<number[]>(q.result?.answers ?? q.questions.map(() => -1))
  const [res, setRes] = useState<{ score: number; total: number; questions: QuizQ[] } | null>(q.result ? { ...q.result, questions: q.questions } : null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const left = ans.filter((a) => a < 0).length
  const submit = async () => {
    if (left && !confirm(`${left} сұраққа жауап берілмеді. Тапсыра бересіз бе?`)) return
    setBusy(true)
    setErr('')
    try {
      const r = await fetch('/api/ielts/quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quizId: q.id, answers: ans }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Жіберілмеді')
      setRes(j)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }
  const qs = res?.questions ?? q.questions
  return (
    <section className="mt-5" style={{ color: INK }}>
      <button onClick={onBack} className="text-sm font-semibold" style={{ color: accent }}>← Кабинет</button>
      <h2 className="font-display mt-1 text-xl font-semibold">{q.topic}</h2>
      <p className="text-sm" style={{ color: MUTED }}>{q.className}</p>
      {res && (
        <div className="mt-4 rounded-3xl p-5 text-white" style={{ background: INK }}>
          <div className="text-sm opacity-70">Нәтиже</div>
          <div className="text-4xl font-bold tabular-nums">{res.score} / {res.total}</div>
          <div className="mt-1 text-sm opacity-80">{res.score === res.total ? 'Керемет, бәрі дұрыс!' : 'Қатені төменнен қараңыз — жасылмен дұрыс жауабы.'}</div>
        </div>
      )}
      <ol className="mt-4 space-y-3">
        {qs.map((x, i) => (
          <li key={i} className="rounded-2xl border bg-white p-4" style={{ borderColor: LINE }}>
            <div className="text-[15px] font-semibold">{i + 1}. {x.q}</div>
            <div className="mt-3 grid gap-2">
              {x.options.map((o, j) => {
                const picked = ans[i] === j
                const right = res && x.correct === j
                const wrong = res && picked && x.correct !== j
                return (
                  <button
                    key={j}
                    disabled={!!res}
                    onClick={() => setAns(ans.map((a, k) => (k === i ? j : a)))}
                    className="flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm"
                    style={{ borderColor: right ? '#16A34A' : wrong ? '#DC2626' : picked ? accent : LINE, background: right ? '#DCFCE7' : wrong ? '#FEE2E2' : picked ? '#EFF4FF' : '#fff' }}
                  >
                    <b>{L[j]})</b> <span>{o}</span>
                  </button>
                )
              })}
            </div>
          </li>
        ))}
      </ol>
      {err && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {!res && (
        <button onClick={submit} disabled={busy} className="mt-4 w-full rounded-2xl py-3.5 text-[15px] font-semibold text-white disabled:opacity-60" style={{ background: accent }}>
          {busy ? 'Жіберілуде…' : left ? `Тапсыру (${left} жауапсыз)` : 'Тапсыру'}
        </button>
      )}
    </section>
  )
}
