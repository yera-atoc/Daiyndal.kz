'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { GROUP_NAME, LETTERS } from '@/lib/bilimTest'

type PubSubject = { id: string; name: string; questions: number; options: number; open: boolean }
type PubExam = { id: string; title: string; subjects: PubSubject[] }
type Data = { exam: PubExam | null; roster: string[]; submitted: Record<string, string[]> }

const NAME_KEY = 'bt_student'
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

export default function BilimTestPage() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [student, setStudent] = useState<string | null>(null)
  const [subject, setSubject] = useState<PubSubject | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/bilim-test', { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      setData(j)
    } catch (e: any) {
      setError(e.message || 'Қате')
    }
  }, [])

  useEffect(() => {
    refresh()
    // Мұғалім пәнді ашқанда бет өзі жаңарсын: 20 секунд сайын және телефонға қайта оралғанда
    const t = setInterval(refresh, 20000)
    const onVis = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVis)
    const saved = load<string | null>(NAME_KEY, null)
    if (saved) setStudent(saved)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [refresh])

  const chooseStudent = (n: string | null) => {
    setStudent(n)
    store(NAME_KEY, n)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* WhatsApp түймесі тапсыру түймесін жаппасын */}
      <style>{`a[aria-label="WhatsApp арқылы хабарласу"]{display:none}`}</style>

      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
          <img src="/beles-logo.png" alt="Beles education" className="h-8 w-auto" />
          <div className="text-right text-[11px] font-semibold uppercase tracking-wider text-blue-600">
            Білім тексеру
            <div className="font-normal normal-case tracking-normal text-slate-500">{GROUP_NAME}</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-32 pt-5">
        {error && <p className="rounded-xl bg-rose-50 p-4 text-rose-700">Қате: {error}</p>}
        {!data && !error && <p className="py-20 text-center text-slate-400">Жүктелуде…</p>}

        {data && !data.exam && (
          <Empty title="Сынақ әлі ашылмаған" text="Мұғалім сынақты ашқанда осы бетте пайда болады." />
        )}

        {data?.exam && !student && <NamePicker data={data} onPick={chooseStudent} />}

        {data?.exam && student && !subject && (
          <SubjectList
            exam={data.exam}
            student={student}
            submitted={data.submitted[student] ?? []}
            done={done}
            onOpen={(s) => {
              setDone(null)
              setSubject(s)
            }}
            onChangeName={() => chooseStudent(null)}
          />
        )}

        {data?.exam && student && subject && (
          <AnswerSheet
            exam={data.exam}
            student={student}
            subject={subject}
            onBack={() => setSubject(null)}
            onSubmitted={async () => {
              setDone(subject.name)
              setSubject(null)
              await refresh()
              window.scrollTo({ top: 0 })
            }}
          />
        )}
      </main>
    </div>
  )
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-2 text-slate-500">{text}</p>
    </div>
  )
}

function NamePicker({ data, onPick }: { data: Data; onPick: (n: string) => void }) {
  const [q, setQ] = useState('')
  const list = data.roster.filter((n) => n.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <>
      <h1 className="text-2xl font-bold leading-tight">{data.exam!.title}: Білім тексеру сынағы</h1>
      <p className="mt-1 text-slate-500">Өз атыңды тап та, бас.</p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Атыңды іздеу…"
        className="mt-5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {list.map((n) => {
          const cnt = data.submitted[n]?.length ?? 0
          return (
            <li key={n}>
              <button
                onClick={() => onPick(n)}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left text-base font-medium active:bg-blue-50"
              >
                {n}
                {cnt > 0 && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    {cnt} пән ✓
                  </span>
                )}
              </button>
            </li>
          )
        })}
        {list.length === 0 && <li className="px-4 py-6 text-center text-slate-400">Табылмады</li>}
      </ul>
    </>
  )
}

function SubjectList({
  exam,
  student,
  submitted,
  done,
  onOpen,
  onChangeName,
}: {
  exam: PubExam
  student: string
  submitted: string[]
  done: string | null
  onOpen: (s: PubSubject) => void
  onChangeName: () => void
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{exam.title} · Білім тексеру</p>
          <h1 className="text-2xl font-bold leading-tight">{student}</h1>
        </div>
        <button onClick={onChangeName} className="shrink-0 rounded-lg px-2 py-1 text-sm text-blue-600 active:bg-blue-50">
          Мен емес
        </button>
      </div>

      {done && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <b>{done}</b> жауаптары қабылданды. Жарайсың!
        </div>
      )}

      <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-slate-400">Пәндер</p>
      <div className="mt-2 space-y-2.5">
        {exam.subjects.map((s) => {
          const isDone = submitted.includes(s.id)
          const can = s.open && !isDone
          return (
            <button
              key={s.id}
              disabled={!can}
              onClick={() => onOpen(s)}
              className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                can
                  ? 'border-blue-200 bg-white shadow-sm active:scale-[.99]'
                  : 'border-slate-200 bg-slate-100/60'
              }`}
            >
              <div>
                <div className={`text-lg font-semibold ${can ? '' : 'text-slate-500'}`}>{s.name}</div>
                <div className="text-sm text-slate-500">{s.questions} сұрақ</div>
              </div>
              {isDone ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">Тапсырылды ✓</span>
              ) : s.open ? (
                <span className="rounded-full bg-blue-600 px-3 py-1 text-sm font-semibold text-white">Бастау →</span>
              ) : (
                <span className="rounded-full bg-slate-200 px-3 py-1 text-sm text-slate-500">Жабық</span>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}

function AnswerSheet({
  exam,
  student,
  subject,
  onBack,
  onSubmitted,
}: {
  exam: PubExam
  student: string
  subject: PubSubject
  onBack: () => void
  onSubmitted: () => void
}) {
  const key = draftKey(exam.id, student, subject.id)
  const [answers, setAnswers] = useState<string[]>(() => {
    const d = load<string[]>(key, [])
    return Array.from({ length: subject.questions }, (_, i) => d[i] ?? '')
  })
  const [confirm, setConfirm] = useState(false)
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => store(key, answers), [key, answers])

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
        body: JSON.stringify({ examId: exam.id, student, subject: subject.id, answers }),
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
