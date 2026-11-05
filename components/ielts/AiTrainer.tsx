'use client'

// ИИ-тренажёр: IELTS / TOEFL Writing (эссе) және Speaking (дауыспен жауап) — бағасы мен пікірі 1 минутта
import { useCallback, useEffect, useRef, useState } from 'react'
import AiFeedback, { TASK_NAMES } from '@/components/ielts/AiFeedback'
import { speechSupported, startSpeech, type SpeechCtl } from '@/lib/speechRec'
import type { AiResult } from '@/lib/aiGrade'

type Topic = { id: string; text: string; target?: string }
type Bank = { task: string; title: string; hint: string; minWords?: number; seconds?: number; prep?: number; topics: Topic[] }
type Hist = { id: string; created_at: string; kind: 'writing' | 'speaking'; task: string; prompt: string; answer: string; seconds: number | null; band: number; result: AiResult }
type Data = { available: boolean; ready: boolean; banks: { writing: Bank[]; speaking: Bank[] }; history: Hist[]; used: { writing: number; speaking: number }; limits: { writing: number; speaking: number } }

const LINE = '#E3E7F0'
const MUTED = '#6B7385'
const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]

export default function AiTrainer({ exam, accent }: { exam: 'ielts' | 'toefl'; accent: string }) {
  const [d, setD] = useState<Data | null>(null)
  const [kind, setKind] = useState<'writing' | 'speaking'>('writing')
  const [bankIdx, setBankIdx] = useState(0)
  const [topic, setTopic] = useState<Topic | null>(null)
  const [custom, setCustom] = useState('')
  const [answer, setAnswer] = useState('')
  const [secs, setSecs] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [res, setRes] = useState<AiResult | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch(`/api/ielts/ai?exam=${exam}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(setD)
      .catch(() => setErr('Жүктелмеді'))
  }, [exam])
  useEffect(load, [load])

  const banks = d?.banks[kind] ?? []
  const bank = banks[bankIdx]
  useEffect(() => {
    if (bank && !topic) setTopic(pick(bank.topics))
  }, [bank, topic])

  const reset = (k = kind, b = 0) => {
    setKind(k)
    setBankIdx(b)
    setTopic(null)
    setCustom('')
    setAnswer('')
    setSecs(0)
    setRes(null)
    setErr('')
  }

  const submit = async (text = answer, seconds = secs) => {
    setBusy(true)
    setErr('')
    try {
      const r = await fetch('/api/ielts/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam, kind, task: bank.task, topicId: topic?.id === 'custom' ? '' : topic?.id, custom: topic?.id === 'custom' ? custom : '', answer: text, seconds }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      setRes(j.result)
      setD((x) => (x ? { ...x, used: j.used, history: [{ id: j.id, created_at: j.created_at, kind, task: bank.task, prompt: topic?.text ?? custom, answer: text, seconds, band: j.result.band, result: j.result }, ...x.history] } : x))
      setTimeout(() => document.getElementById('ai-result')?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch (e: any) {
      setErr(e.message || 'Тексерілмеді')
    } finally {
      setBusy(false)
    }
  }

  if (!d) return <p className="py-16 text-center" style={{ color: MUTED }}>{err || 'Жүктелуде…'}</p>
  const left = d.limits[kind] - d.used[kind]

  return (
    <div className="space-y-5">
      <section className="rounded-3xl p-6 text-white sm:p-7" style={{ background: '#0B0F19' }}>
        <p className="text-sm font-semibold opacity-70">{exam === 'ielts' ? 'IELTS' : 'TOEFL iBT'} · ИИ-тренажёр</p>
        <h1 className="font-display mt-1 text-2xl font-semibold sm:text-3xl">Жаз немесе сөйле — бағаң 1 минутта</h1>
        <p className="mt-2 max-w-xl text-sm opacity-75">ИИ ресми критерийлер бойынша бағалап, қателеріңді түзетіп, баллды көтерудің нақты жолын көрсетеді. Бүгін қалды: Writing {d.limits.writing - d.used.writing}, Speaking {d.limits.speaking - d.used.speaking}.</p>
      </section>

      {!d.available && <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">ИИ әзірге қосылмаған — орталық әкімшісіне хабарлаңыз.</p>}
      {d.available && !d.ready && <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">ИИ-тренажёр дерекқорда әлі іске қосылмаған — орталық әкімшісіне хабарлаңыз.</p>}

      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-white p-1 ring-1" style={{ ['--tw-ring-color' as any]: LINE }}>
        {(['writing', 'speaking'] as const).map((k) => (
          <button key={k} onClick={() => reset(k)} className="rounded-xl py-2.5 text-sm font-semibold" style={kind === k ? { background: accent, color: '#fff' } : { color: MUTED }}>
            {k === 'writing' ? '✍️ Writing' : '🎤 Speaking'}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {banks.map((b, i) => (
          <button key={b.task} onClick={() => reset(kind, i)} className="shrink-0 rounded-xl border px-3.5 py-2 text-sm font-semibold" style={i === bankIdx ? { borderColor: accent, color: accent, background: '#fff' } : { borderColor: LINE, background: '#fff' }}>
            {b.title}
          </button>
        ))}
      </div>

      {bank && (
        <section className="rounded-3xl border bg-white p-5 sm:p-6" style={{ borderColor: LINE }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm" style={{ color: MUTED }}>{bank.hint}</span>
            <div className="flex gap-2">
              <button onClick={() => { setTopic(pick(bank.topics.filter((x) => x.id !== topic?.id))); setAnswer(''); setRes(null); setSecs(0) }} className="rounded-lg border px-3 py-1.5 text-sm font-semibold" style={{ borderColor: LINE }}>↻ Басқа тақырып</button>
              {kind === 'writing' && <button onClick={() => { setTopic({ id: 'custom', text: '' }); setRes(null) }} className="rounded-lg border px-3 py-1.5 text-sm font-semibold" style={{ borderColor: LINE }}>Өз тақырыбым</button>}
            </div>
          </div>
          {topic?.id === 'custom' ? (
            <textarea value={custom} onChange={(e) => setCustom(e.target.value)} rows={3} placeholder="Тапсырманың мәтінін осында қойыңыз (ағылшынша)" className="mt-3 w-full rounded-xl border p-3 text-[15px]" style={{ borderColor: LINE }} />
          ) : (
            <div className="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-[15px] leading-7">{topic?.text}</div>
          )}

          {kind === 'writing' ? (
            <WritingBox answer={answer} setAnswer={setAnswer} minWords={bank.minWords ?? 0} onSecs={setSecs} />
          ) : (
            <SpeakingBox key={`${bank.task}-${topic?.id}`} bank={bank} topic={topic} accent={accent} onDone={(t, s) => { setAnswer(t); setSecs(s) }} answer={answer} />
          )}

          {err && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
          <button
            disabled={busy || !d.available || left <= 0 || (kind === 'writing' ? words(answer) < 30 : words(answer) < 3) || (topic?.id === 'custom' && custom.trim().length < 20)}
            onClick={() => submit()}
            className="mt-4 w-full rounded-2xl py-3.5 font-semibold text-white disabled:opacity-40"
            style={{ background: accent }}
          >
            {busy ? 'ИИ тексеріп жатыр… (20–40 секунд)' : left <= 0 ? 'Бүгінгі шек таусылды' : 'ИИ-мен тексеру'}
          </button>
        </section>
      )}

      {res && (
        <section id="ai-result" className="scroll-mt-20 rounded-3xl border bg-white p-5 sm:p-6" style={{ borderColor: LINE }}>
          <AiFeedback r={res} />
        </section>
      )}

      {d.history.length > 0 && (
        <section className="rounded-3xl border bg-white p-5 sm:p-6" style={{ borderColor: LINE }}>
          <h2 className="font-display text-lg font-semibold">Менің тексерістерім</h2>
          <div className="mt-3 divide-y" style={{ borderColor: LINE }}>
            {d.history.map((h) => (
              <div key={h.id} className="py-2.5">
                <button onClick={() => setOpen(open === h.id ? null : h.id)} className="flex w-full items-center gap-3 text-left">
                  <span className="grid h-10 w-12 shrink-0 place-items-center rounded-lg text-sm font-bold text-white" style={{ background: '#0B0F19' }}>{Number(h.band).toFixed(1)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{TASK_NAMES[h.task] ?? h.task}</span>
                    <span className="block truncate text-xs" style={{ color: MUTED }}>{new Date(h.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {h.prompt.split('\n')[0]}</span>
                  </span>
                  <span style={{ color: MUTED }}>{open === h.id ? '▴' : '▾'}</span>
                </button>
                {open === h.id && (
                  <div className="mt-3 space-y-3">
                    <details className="text-sm"><summary className="cursor-pointer" style={{ color: MUTED }}>Менің жауабым</summary><p className="mt-1 whitespace-pre-wrap rounded-xl bg-slate-50 p-3">{h.answer}</p></details>
                    <AiFeedback r={h.result} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function WritingBox({ answer, setAnswer, minWords, onSecs }: { answer: string; setAnswer: (v: string) => void; minWords: number; onSecs: (s: number) => void }) {
  const start = useRef<number | null>(null)
  const n = words(answer)
  return (
    <>
      <textarea
        value={answer}
        onChange={(e) => {
          if (start.current === null) start.current = Date.now()
          onSecs(Math.round((Date.now() - start.current) / 1000))
          setAnswer(e.target.value)
        }}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="sentences"
        rows={14}
        placeholder="Жауабыңызды ағылшынша осында жазыңыз…"
        className="mt-4 w-full rounded-2xl border p-4 text-[16px] leading-7 outline-none focus:border-[#2B6BF3]"
        style={{ borderColor: LINE }}
      />
      <div className="mt-1 text-right text-sm" style={{ color: n >= minWords ? '#15803D' : MUTED }}>{n} сөз{minWords ? ` / ${minWords}+` : ''}</div>
    </>
  )
}

function SpeakingBox({ bank, topic, accent, answer, onDone }: { bank: Bank; topic: Topic | null; accent: string; answer: string; onDone: (t: string, s: number) => void }) {
  const [phase, setPhase] = useState<'idle' | 'prep' | 'rec' | 'done'>(answer ? 'done' : 'idle')
  const [count, setCount] = useState(0)
  const [live, setLive] = useState('')
  const ctl = useRef<SpeechCtl | null>(null)
  const t0 = useRef(0)
  const ok = speechSupported()
  const limit = bank.seconds ?? 60

  const stop = useCallback(async () => {
    const c = ctl.current
    ctl.current = null
    const text = c ? await c.stop() : live
    const s = Math.round((Date.now() - t0.current) / 1000)
    setPhase('done')
    onDone(text, s)
  }, [live, onDone])

  useEffect(() => {
    if (phase !== 'prep' && phase !== 'rec') return
    if (count <= 0) {
      if (phase === 'prep') begin()
      else stop()
      return
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, count])

  const begin = async () => {
    try {
      // микрофонға рұқсатты алдын ала сұрау (кей браузерлерде тану өзі сұрамайды)
      const s = await navigator.mediaDevices?.getUserMedia({ audio: true })
      s?.getTracks().forEach((t) => t.stop())
    } catch {}
    setLive('')
    ctl.current = startSpeech(setLive)
    t0.current = Date.now()
    setCount(limit)
    setPhase('rec')
  }

  if (!ok) return <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Бұл браузер сөйлеуді мәтінге айналдыра алмайды. Google Chrome (компьютер не Android) немесе iPhone-да Safari арқылы ашыңыз.</p>

  return (
    <div className="mt-4">
      {topic?.target && (phase === 'idle' || phase === 'done') && <p className="rounded-2xl border p-4 text-lg font-semibold" style={{ borderColor: accent }}>{topic.target}</p>}
      {topic?.target && phase === 'rec' && <p className="rounded-2xl border border-dashed p-4 text-sm" style={{ borderColor: LINE, color: MUTED }}>Сөйлем жасырылды — жатқа қайталаңыз.</p>}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {(phase === 'idle' || phase === 'done') && (
          <button
            onClick={() => {
              onDone('', 0)
              if (bank.prep) {
                setCount(bank.prep)
                setPhase('prep')
              } else begin()
            }}
            className="rounded-full px-6 py-3 font-semibold text-white"
            style={{ background: '#DC2626' }}
          >
            {phase === 'done' ? '↻ Қайта жазу' : bank.prep ? `▶ Дайындық (${bank.prep} с), сосын сөйлеу` : '● Сөйлеуді бастау'}
          </button>
        )}
        {phase === 'prep' && (
          <>
            <span className="text-lg font-semibold">Дайындық: {count} с</span>
            <button onClick={() => begin()} className="rounded-full border px-5 py-2.5 font-semibold" style={{ borderColor: LINE }}>Қазір бастау</button>
          </>
        )}
        {phase === 'rec' && (
          <>
            <span className="flex items-center gap-2 text-lg font-semibold text-red-600"><span className="inline-block h-3 w-3 animate-pulse rounded-full bg-red-600" /> Тыңдап тұрмын · {count} с</span>
            <button onClick={stop} className="rounded-full border px-5 py-2.5 font-semibold" style={{ borderColor: LINE }}>■ Аяқтау</button>
          </>
        )}
      </div>
      {(phase === 'rec' || phase === 'done') && (
        <div className="mt-3 min-h-[64px] rounded-2xl bg-slate-50 p-4 text-[15px] leading-7">
          <div className="mb-1 text-xs font-semibold uppercase" style={{ color: MUTED }}>Сіздің сөзіңіз (автоматты мәтін)</div>
          {(phase === 'rec' ? live : answer) || <span style={{ color: MUTED }}>{phase === 'rec' ? 'Сөйлей беріңіз…' : 'Сөз танылмады — қаттырақ, анығырақ сөйлеп, қайта жазыңыз.'}</span>}
        </div>
      )}
    </div>
  )
}
