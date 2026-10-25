'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  SECTION_NAME,
  SPEAK_LIMIT,
  sectionItems,
  wordCount,
  type AttemptState,
  type IeltsContent,
  type Section,
} from '@/lib/ielts'
import Questions, { BLUE, INK, LINE, MUTED } from './Questions'
import type { QGroup } from '@/lib/ielts'
import { LETTERS, comboName, pointsOf, type UbtQ, type UbtScores } from '@/lib/ubt'

export type AttemptView = {
  attempt: {
    id: string
    status: 'in_progress' | 'submitted' | 'graded'
    state: AttemptState
    answers: Partial<Record<'listening' | 'reading' | 'build', Record<string, string>>> & { ubt?: Record<string, number[]> }
    writing: { task1?: string; task2?: string }
    speaking: Record<string, string>
    published: boolean
    scores: any
    feedback: any
  }
  test: { id: string; title: string; exam?: 'ielts' | 'toefl' | 'ubt'; variant: 'academic' | 'general'; mode: 'exam' | 'practice'; content: IeltsContent }
  now: number
  deadline: number | null
}

async function call(body: unknown) {
  const r = await fetch('/api/ielts/attempt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Қате')
  return j
}

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function Runner({ initial, student, onExit }: { initial: AttemptView; student: string; onExit: () => void }) {
  const [v, setV] = useState(initial)
  const [offset] = useState(() => initial.now - Date.now()) // сервер мен браузер сағатының айырмасы
  const [now, setNow] = useState(Date.now() + offset)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const sec: Section | undefined = v.attempt.state.order[v.attempt.state.current]
  const exam = v.test.mode === 'exam'

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset), 500)
    return () => clearInterval(t)
  }, [offset])

  const finish = useCallback(async () => {
    if (!sec) return
    setBusy(true)
    try {
      const j = await call({ action: 'finish', id: v.attempt.id, section: sec })
      setV(j)
      setConfirm(false)
      window.scrollTo({ top: 0 })
    } finally {
      setBusy(false)
    }
  }, [sec, v.attempt.id])

  // Уақыт біткенде бөлім өзі тапсырылады
  const left = v.deadline !== null ? v.deadline - now : null
  const fired = useRef<string | null>(null)
  useEffect(() => {
    if (left !== null && left <= 0 && sec && fired.current !== sec) {
      fired.current = sec
      saveRef.current?.().finally(finish)
    }
  }, [left, sec, finish])

  const saveRef = useRef<(() => Promise<void>) | null>(null)

  if (!sec || v.attempt.status !== 'in_progress') {
    if (v.attempt.scores?.ubt) return <UbtResult s={v.attempt.scores.ubt} onExit={onExit} />
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="text-5xl">✓</div>
        <h1 className="mt-4 text-2xl font-bold">Тест тапсырылды</h1>
        <p className="mt-2" style={{ color: MUTED }}>
          Listening мен Reading нәтижесі кабинетіңізде. Writing пен Speaking-ті мұғалім тексергеннен кейін толық нәтиже шығады.
        </p>
        <button onClick={onExit} className="mt-6 rounded-lg px-5 py-2.5 font-semibold text-white" style={{ background: INK }}>Кабинетке оралу</button>
      </div>
    )
  }

  const idx = v.attempt.state.current
  const order = v.attempt.state.order

  return (
    <div className="flex min-h-screen flex-col bg-white" style={{ color: INK }}>
      <header className="sticky top-0 z-30 flex items-center gap-4 border-b bg-white px-4 py-2.5" style={{ borderColor: LINE }}>
        <img src="/beles-logo.png" alt="Beles" className="h-7 w-auto" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{student}</div>
          <div className="truncate text-xs" style={{ color: MUTED }}>
            {v.test.title} · {order.map((s, i) => (i === idx ? `[${SECTION_NAME[s]}]` : SECTION_NAME[s])).join(' → ')}
          </div>
        </div>
        {left !== null && (
          <div
            className="rounded-lg px-3 py-1.5 font-mono text-lg font-bold tabular-nums"
            style={left < 5 * 60_000 ? { background: '#FEE2E2', color: '#B91C1C' } : { background: '#F3F4F6' }}
            role="timer"
            aria-label="Қалған уақыт"
          >
            {fmt(left)}
          </div>
        )}
        <button onClick={() => setConfirm(true)} disabled={busy} className="rounded-lg px-3 py-2 text-sm font-semibold text-white" style={{ background: BLUE }}>
          {idx === order.length - 1 ? 'Тестті аяқтау' : `${SECTION_NAME[sec]}-ті аяқтау`}
        </button>
      </header>

      {(sec === 'listening' || sec === 'reading') && <LRSection key={sec} v={v} sec={sec} exam={exam} now={now} saveRef={saveRef} />}
      {sec === 'writing' && <WritingSection key={sec} v={v} saveRef={saveRef} />}
      {sec === 'speaking' && <SpeakingSection key={sec} v={v} onDone={() => setConfirm(true)} />}
      {sec === 'ubt' && <UbtSection key={sec} v={v} saveRef={saveRef} />}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && setConfirm(false)}>
          <div role="dialog" className="w-full max-w-md rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">{sec === 'ubt' ? 'Тестті аяқтайсыз ба?' : `${SECTION_NAME[sec]} бөлімін аяқтайсыз ба?`}</h2>
            <p className="mt-2 text-sm" style={{ color: MUTED }}>{sec === 'ubt' ? 'Аяқтағаннан кейін жауаптарды өзгерту мүмкін емес. Нәтиже бірден шығады.' : 'Аяқтағаннан кейін бұл бөлімге қайта оралу мүмкін емес.'}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button disabled={busy} onClick={() => setConfirm(false)} className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: LINE }}>Қайту</button>
              <button disabled={busy} onClick={async () => { await saveRef.current?.(); await finish() }} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: BLUE }}>
                {busy ? 'Сақталуда…' : 'Иә, аяқтау'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Автоматты сақтау ─────────────────────────────────────

function useAutosave(send: () => Promise<void>, deps: unknown[], saveRef: React.MutableRefObject<(() => Promise<void>) | null>) {
  const [status, setStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const dirty = useRef(false)
  const first = useRef(true)
  const run = useCallback(async () => {
    if (!dirty.current) return
    dirty.current = false
    setStatus('saving')
    try {
      await send()
      setStatus('saved')
    } catch {
      dirty.current = true
      setStatus('error')
    }
  }, [send])
  saveRef.current = run
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    dirty.current = true
    const t = setTimeout(run, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => {
    const h = () => { if (dirty.current) run() }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [run])
  return status
}

function SaveBadge({ s }: { s: 'saved' | 'saving' | 'error' }) {
  return (
    <span className="text-xs" style={{ color: s === 'error' ? '#B91C1C' : MUTED }}>
      {s === 'saving' ? 'Сақталуда…' : s === 'error' ? 'Сақталмады — интернетті тексеріңіз' : 'Сақталды'}
    </span>
  )
}

// ── Listening / Reading ──────────────────────────────────

function LRSection({ v, sec, exam, now, saveRef }: { v: AttemptView; sec: 'listening' | 'reading'; exam: boolean; now: number; saveRef: React.MutableRefObject<(() => Promise<void>) | null> }) {
  const c = v.test.content
  const parts = ((sec === 'listening' ? c.listening?.parts ?? [] : c.reading?.passages ?? []) as { title: string; text?: string; groups: QGroup[] }[]).filter((p) => p.groups.some((g) => g.items.length))
  const [answers, setAnswers] = useState<Record<string, string>>(v.attempt.answers?.[sec] ?? {})
  const [part, setPart] = useState(0)
  const items = useMemo(() => sectionItems(c, sec), [c, sec])
  const status = useAutosave(
    useCallback(() => call({ action: 'save', id: v.attempt.id, section: sec, answers }).then(() => {}), [answers, sec, v.attempt.id]),
    [answers],
    saveRef
  )
  const partOf = (n: number) => parts.findIndex((p) => p.groups.some((g) => g.items.some((it) => it.n === n)))
  const jump = (n: number) => {
    setPart(Math.max(0, partOf(n)))
    setTimeout(() => document.getElementById(`q${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  }
  const p = parts[part]

  return (
    <>
      {sec === 'listening' && <ListeningAudio v={v} exam={exam} now={now} />}
      <div className="flex gap-1 border-b px-4" style={{ borderColor: LINE }}>
        {parts.map((pp, i) => (
          <button key={i} onClick={() => setPart(i)} className="-mb-px border-b-2 px-3 py-2 text-sm font-semibold" style={{ borderColor: i === part ? BLUE : 'transparent', color: i === part ? BLUE : MUTED }}>
            {pp.title || (sec === 'listening' ? `Part ${i + 1}` : `Passage ${i + 1}`)}
          </button>
        ))}
        <span className="ml-auto self-center"><SaveBadge s={status} /></span>
      </div>

      {sec === 'reading' && p && p.text?.trim() ? (
        <div className="grid flex-1 md:grid-cols-2" style={{ minHeight: 0 }}>
          <article className="overflow-y-auto border-b px-6 py-5 md:max-h-[calc(100vh-170px)] md:border-b-0 md:border-r" style={{ borderColor: LINE }}>
            <h2 className="text-xl font-bold">{p.title}</h2>
            <div className="mt-4 whitespace-pre-wrap text-[16px] leading-7">{p.text}</div>
          </article>
          <div className="overflow-y-auto px-6 py-5 md:max-h-[calc(100vh-170px)]">
            <Questions groups={p.groups} answers={answers} onChange={(n, val) => setAnswers((a) => ({ ...a, [n]: val }))} />
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-5">
          {p && <Questions groups={p.groups} answers={answers} onChange={(n, val) => setAnswers((a) => ({ ...a, [n]: val }))} />}
        </div>
      )}

      {/* Сұрақтар навигаторы */}
      <nav className="sticky bottom-0 z-20 flex flex-wrap gap-1 border-t bg-white px-4 py-2" style={{ borderColor: LINE }} aria-label="Сұрақтар">
        {items.map((it) => {
          const done = !!answers[String(it.n)]
          return (
            <button key={it.n} onClick={() => jump(it.n)} className="h-8 w-8 rounded text-xs font-bold" style={done ? { background: INK, color: '#fff' } : { border: `1px solid ${LINE}`, color: MUTED }} aria-label={`Question ${it.n}${done ? ', answered' : ''}`}>
              {it.n}
            </button>
          )
        })}
        <span className="ml-auto self-center text-xs" style={{ color: MUTED }}>{Object.values(answers).filter(Boolean).length} / {items.length} жауап берілді</span>
      </nav>
    </>
  )
}

function ListeningAudio({ v, exam, now }: { v: AttemptView; exam: boolean; now: number }) {
  const src = v.test.content.listening?.audio
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [ended, setEnded] = useState(false)
  const started = v.attempt.state.startedAt?.listening ? new Date(v.attempt.state.startedAt.listening).getTime() : now
  if (!src) return <div className="bg-amber-50 px-4 py-2 text-sm text-amber-800">Бұл тестте аудио жүктелмеген.</div>

  // Емтихан режимі: аудио бір рет ойнайды. Бет жаңартылса — басталған уақыттан бастап жалғасады.
  const startExam = () => {
    const a = ref.current
    if (!a) return
    const pos = Math.max(0, (Date.now() - started) / 1000 - 1)
    if (a.duration && pos >= a.duration) {
      setEnded(true)
      return
    }
    a.currentTime = pos
    a.play().then(() => setPlaying(true)).catch(() => {})
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b px-4 py-2" style={{ borderColor: LINE, background: '#F9FAFB' }}>
      {exam ? (
        <>
          <audio ref={ref} src={src} preload="auto" onEnded={() => { setPlaying(false); setEnded(true) }} onPlay={() => setPlaying(true)} onPause={() => { if (!ref.current?.ended) ref.current?.play().catch(() => {}) }} />
          {!playing && !ended && (
            <button onClick={startExam} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: BLUE }}>
              ▶ Аудионы бастау
            </button>
          )}
          <span className="text-sm" style={{ color: MUTED }}>
            {ended ? 'Аудио аяқталды. Жауаптарды тексеріп, бөлімді аяқтаңыз.' : playing ? 'Аудио ойнап тұр — бір-ақ рет тыңдалады' : 'Аудио бір-ақ рет ойнайды. Құлаққапты тексеріңіз.'}
          </span>
          <label className="ml-auto flex items-center gap-2 text-sm" style={{ color: MUTED }}>
            Дыбыс
            <input type="range" min={0} max={1} step={0.05} defaultValue={1} onChange={(e) => ref.current && (ref.current.volume = Number(e.target.value))} />
          </label>
        </>
      ) : (
        <audio src={src} controls className="w-full max-w-xl" />
      )}
    </div>
  )
}

// ── Writing ──────────────────────────────────────────────

function WritingSection({ v, saveRef }: { v: AttemptView; saveRef: React.MutableRefObject<(() => Promise<void>) | null> }) {
  const w = v.test.content.writing!
  const toefl = v.test.exam === 'toefl'
  const build = w.build?.filter((g) => g.items.length) ?? []
  const [task, setTask] = useState<'build' | 'task1' | 'task2'>(build.length ? 'build' : 'task1')
  const [text, setText] = useState({ task1: v.attempt.writing?.task1 ?? '', task2: v.attempt.writing?.task2 ?? '' })
  const [built, setBuilt] = useState<Record<string, string>>(v.attempt.answers?.build ?? {})
  const status = useAutosave(
    useCallback(() => call({ action: 'save', id: v.attempt.id, section: 'writing', writing: text, ...(build.length ? { build: built } : {}) }).then(() => {}), [text, built, build.length, v.attempt.id]),
    [text, built],
    saveRef
  )
  const label = (k: 'build' | 'task1' | 'task2') => (k === 'build' ? 'Build a Sentence' : toefl ? (k === 'task1' ? 'Write an Email' : 'Academic Discussion') : k === 'task1' ? 'Task 1' : 'Task 2')
  const tabs = (build.length ? ['build', 'task1', 'task2'] : ['task1', 'task2']) as ('build' | 'task1' | 'task2')[]
  const tabBar = (
    <div className="flex gap-1 border-b px-4" style={{ borderColor: LINE }}>
      {tabs.map((k) => (
        <button key={k} onClick={() => setTask(k)} className="-mb-px border-b-2 px-3 py-2 text-sm font-semibold" style={{ borderColor: k === task ? BLUE : 'transparent', color: k === task ? BLUE : MUTED }}>
          {label(k)} <span className="font-normal">· {k === 'build' ? `${Object.values(built).filter(Boolean).length}/${build.reduce((n, g) => n + g.items.length, 0)}` : `${wordCount(text[k])} сөз`}</span>
        </button>
      ))}
      <span className="ml-auto self-center"><SaveBadge s={status} /></span>
    </div>
  )
  if (task === 'build') {
    return (
      <>
        {tabBar}
        <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-5">
          <Questions groups={build} answers={built} onChange={(n, val) => setBuilt((a) => ({ ...a, [n]: val }))} />
        </div>
      </>
    )
  }
  const t = w[task]
  const wc = wordCount(text[task])
  const hint = toefl ? `You have about ${task === 'task1' ? 7 : 10} minutes for this task.${t.minWords ? ` Write at least ${t.minWords} words.` : ''}` : `You should spend about ${task === 'task1' ? 20 : 40} minutes on this task. Write at least ${t.minWords} words.`
  return (
    <>
      {tabBar}
      <div className="grid flex-1 md:grid-cols-2">
        <article className="border-b px-6 py-5 md:border-b-0 md:border-r" style={{ borderColor: LINE }}>
          <p className="text-sm font-semibold" style={{ color: MUTED }}>{hint}</p>
          <div className="mt-3 whitespace-pre-wrap text-[16px] leading-7">{t.prompt}</div>
          {t.image && <img src={t.image} alt="Task 1 chart" className="mt-4 max-h-[420px] w-full rounded-lg border object-contain" style={{ borderColor: LINE }} />}
        </article>
        <div className="flex flex-col px-6 py-5">
          <textarea
            value={text[task]}
            onChange={(e) => setText((x) => ({ ...x, [task]: e.target.value }))}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            aria-label={task === 'task1' ? 'Task 1 answer' : 'Task 2 answer'}
            className="min-h-[50vh] w-full flex-1 resize-none rounded-lg border p-4 text-[16px] leading-7 outline-none focus:border-[#2B6BF3]"
            style={{ borderColor: LINE }}
          />
          <div className="mt-2 text-sm" style={{ color: wc < t.minWords ? '#B45309' : '#15803D' }}>
            Сөз саны: <b>{wc}</b> {wc < t.minWords ? `(кемінде ${t.minWords})` : '✓'}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Speaking ─────────────────────────────────────────────

function SpeakingSection({ v, onDone }: { v: AttemptView; onDone: () => void }) {
  const parts = v.test.content.speaking?.parts ?? []
  const toefl = v.test.exam === 'toefl'
  const steps = useMemo(
    () =>
      toefl
        ? parts.flatMap((p, pi) => p.questions.map((q, qi) => ({ pi, qi, key: `p${pi + 1}q${qi}`, text: p.hideText ? '' : q, cue: false, audio: p.audios?.[qi], limit: p.limit ?? 45, prep: 0 })))
        : parts.flatMap((p, pi) =>
            pi === 1
              ? [{ pi, qi: 0, key: `p2q0`, text: p.cueCard || p.questions[0] || '', cue: true, audio: undefined as string | undefined, limit: SPEAK_LIMIT.p2talk, prep: SPEAK_LIMIT.p2prep }]
              : p.questions.map((q, qi) => ({ pi, qi, key: `p${pi + 1}q${qi}`, text: q, cue: false, audio: undefined as string | undefined, limit: pi === 0 ? SPEAK_LIMIT.p1 : SPEAK_LIMIT.p3, prep: 0 }))
          ),
    [parts, toefl]
  )
  const [done, setDone] = useState<Record<string, string>>(v.attempt.speaking ?? {})
  const startIdx = steps.findIndex((s) => !done[s.key])
  const [i, setI] = useState(startIdx === -1 ? steps.length : startIdx)
  const step = steps[i]

  if (!step) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <h2 className="text-xl font-bold">Speaking жазбалары сақталды</h2>
        <p className="mt-2" style={{ color: MUTED }}>{Object.keys(done).length} жауап жазылды. Тестті аяқтаңыз.</p>
        <button onClick={onDone} className="mt-5 rounded-lg px-5 py-2.5 font-semibold text-white" style={{ background: BLUE }}>Тестті аяқтау</button>
      </div>
    )
  }
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
      <div className="text-sm font-semibold" style={{ color: MUTED }}>
        {parts[step.pi]?.title} · {i + 1} / {steps.length}
      </div>
      <Recorder
        key={step.key}
        attemptId={v.attempt.id}
        stepKey={step.key}
        text={step.text}
        cue={step.cue}
        audio={step.audio}
        limit={step.limit}
        prep={step.prep}
        onSaved={(u) => {
          setDone((d) => ({ ...d, [step.key]: u }))
          setI(i + 1)
        }}
      />
    </div>
  )
}

function Recorder({ attemptId, stepKey, text, cue, audio, limit, prep, onSaved }: { attemptId: string; stepKey: string; text: string; cue: boolean; audio?: string; limit: number; prep: number; onSaved: (url: string) => void }) {
  const [phase, setPhase] = useState<'idle' | 'play' | 'prep' | 'rec' | 'upload' | 'error'>('idle')
  const player = useRef<HTMLAudioElement>(null)
  const [count, setCount] = useState(0)
  const [err, setErr] = useState('')
  const rec = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])

  useEffect(() => {
    if (phase !== 'prep' && phase !== 'rec') return
    if (count <= 0) {
      if (phase === 'prep') startRec()
      else rec.current?.stop()
      return
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, count])

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) ?? ''
      const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
      chunks.current = []
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setPhase('upload')
        try {
          const mime = mr.mimeType || 'audio/webm'
          const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm'
          const blob = new Blob(chunks.current, { type: mime })
          const info = await call({ action: 'speaking-url', id: attemptId, key: stepKey, ext })
          const { error } = await supabase.storage.from('materials').uploadToSignedUrl(info.path, info.token, blob, { contentType: mime })
          if (error) throw new Error(error.message)
          await call({ action: 'speaking-save', id: attemptId, key: stepKey, url: info.publicUrl })
          onSaved(info.publicUrl)
        } catch (e: any) {
          setErr(`Жазба сақталмады: ${e.message}. Қайта жазып көріңіз.`)
          setPhase('error')
        }
      }
      rec.current = mr
      mr.start()
      setCount(limit)
      setPhase('rec')
    } catch {
      setErr('Микрофонға рұқсат беріңіз (браузердің мекенжай жолағындағы белгіні басыңыз).')
      setPhase('error')
    }
  }

  return (
    <div className="mt-4 rounded-2xl border p-6" style={{ borderColor: LINE }}>
      {audio && <audio ref={player} src={audio} preload="auto" onEnded={() => startRec()} />}
      {cue ? (
        <div className="whitespace-pre-wrap rounded-xl border p-5 text-[16px] leading-7" style={{ borderColor: INK }}>{text}</div>
      ) : text ? (
        <p className="text-xl font-semibold leading-8">{text}</p>
      ) : (
        <p className="text-lg font-semibold" style={{ color: MUTED }}>🔊 Сөйлемді тыңдап, дәл солай қайталаңыз.</p>
      )}
      {phase === 'play' && <p className="mt-4 font-semibold" style={{ color: BLUE }}>Тыңдаңыз… аудио біткенде жазу өзі басталады.</p>}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {(phase === 'idle' || phase === 'error') && (
          <button
            onClick={() => {
              if (audio && player.current) {
                setErr('')
                setPhase('play')
                player.current.currentTime = 0
                player.current.play().catch(() => startRec())
              } else if (prep) {
                setCount(prep)
                setPhase('prep')
              } else startRec()
            }}
            className="rounded-full px-6 py-3 font-semibold text-white"
            style={{ background: '#DC2626' }}
          >
            {audio ? '▶ Тыңдау және жауап беру' : prep ? '▶ Дайындықты бастау (1 минут)' : '● Жауапты жазу'}
          </button>
        )}
        {phase === 'prep' && <span className="text-lg font-semibold">Дайындық: {count} с · жазбалар жасай аласыз</span>}
        {phase === 'rec' && (
          <>
            <span className="flex items-center gap-2 text-lg font-semibold" style={{ color: '#DC2626' }}>
              <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-red-600" /> Жазылып жатыр · {count} с
            </span>
            <button onClick={() => rec.current?.stop()} className="rounded-full border px-5 py-2.5 font-semibold" style={{ borderColor: LINE }}>■ Аяқтау</button>
          </>
        )}
        {phase === 'upload' && <span style={{ color: MUTED }}>Жазба сақталуда…</span>}
      </div>
      {err && <p className="mt-3 text-sm" style={{ color: '#B91C1C' }}>{err}</p>}
    </div>
  )
}

// ── ҰБТ ──────────────────────────────────────────────────

export function UbtResult({ s, onExit }: { s: UbtScores; onExit?: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-2xl p-6 text-white" style={{ background: INK }}>
        <div className="text-sm opacity-70">{comboName(s.combo)}</div>
        <div className="mt-1 text-5xl font-bold">{s.total} <span className="text-2xl opacity-60">/ {s.max}</span></div>
        <div className="mt-2 text-sm" style={{ color: s.passed ? '#86EFAC' : '#FCA5A5' }}>{s.passed ? 'Барлық пән бойынша шекті балдан өтті' : 'Кейбір пәндер бойынша шекті балл жиналмады'}</div>
      </div>
      <div className="mt-4 divide-y rounded-2xl border bg-white" style={{ borderColor: LINE }}>
        {s.subjects.map((x) => (
          <div key={x.key} className="flex items-center gap-3 px-5 py-3">
            <span className="flex-1 font-medium">{x.name}</span>
            <span className="text-xs" style={{ color: x.passed ? '#15803D' : '#B91C1C' }}>шекті {x.threshold}</span>
            <span className="w-20 text-right font-bold tabular-nums">{x.points} / {x.max}</span>
          </div>
        ))}
      </div>
      {onExit && <button onClick={onExit} className="mt-6 rounded-lg px-5 py-2.5 font-semibold text-white" style={{ background: BLUE }}>Кабинетке оралу</button>}
    </div>
  )
}

const TYPE_HINT: Record<string, string> = {
  single: 'Бір дұрыс жауапты таңдаңыз',
  context: 'Мәтінді оқып, бір дұрыс жауапты таңдаңыз',
  matching: 'Сәйкестендіріңіз: әр элементке бір жауап',
  multiple: 'Бір немесе бірнеше дұрыс жауапты таңдаңыз (ең көбі 3)',
}

function UbtSection({ v, saveRef }: { v: AttemptView; saveRef: React.MutableRefObject<(() => Promise<void>) | null> }) {
  const u = v.test.content.ubt!
  const subjects = [...u.compulsory, ...u.profile]
  const [answers, setAnswers] = useState<Record<string, number[]>>(v.attempt.answers?.ubt ?? {})
  const [si, setSi] = useState(0)
  const [qi, setQi] = useState(0)
  const status = useAutosave(
    useCallback(() => call({ action: 'save', id: v.attempt.id, section: 'ubt', answers }).then(() => {}), [answers, v.attempt.id]),
    [answers],
    saveRef
  )
  const subj = subjects[si]
  const q = subj?.questions[qi]
  const done = (x: UbtQ) => (answers[x.id] ?? []).some((a) => a >= 0)
  const set = (id: string, val: number[]) => setAnswers((a) => ({ ...a, [id]: val }))
  const go = (s: number, i: number) => {
    setSi(s)
    setQi(i)
    window.scrollTo({ top: 0 })
  }
  const next = () => (qi < subj.questions.length - 1 ? go(si, qi + 1) : si < subjects.length - 1 ? go(si + 1, 0) : null)
  const prev = () => (qi > 0 ? go(si, qi - 1) : si > 0 ? go(si - 1, subjects[si - 1].questions.length - 1) : null)

  return (
    <>
      <div className="flex gap-1 overflow-x-auto border-b px-4" style={{ borderColor: LINE }}>
        {subjects.map((s, i) => {
          const n = s.questions.filter(done).length
          return (
            <button key={s.key} onClick={() => go(i, 0)} className="-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-semibold" style={{ borderColor: i === si ? BLUE : 'transparent', color: i === si ? BLUE : MUTED }}>
              {s.name} <span className="font-normal">· {n}/{s.questions.length}</span>
            </button>
          )
        })}
        <span className="ml-auto self-center pl-3"><SaveBadge s={status} /></span>
      </div>
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-5 lg:grid-cols-[1fr_280px]">
        {q && (
          <div>
            <div className="flex items-center gap-2 text-sm" style={{ color: MUTED }}>
              <span className="rounded border px-2 py-0.5 font-bold" style={{ borderColor: INK, color: INK }}>{qi + 1}</span>
              <span>{TYPE_HINT[q.type]}</span>
              <span className="ml-auto">{pointsOf(q)} балл</span>
            </div>
            {q.context && <div className="mt-3 max-h-[45vh] overflow-y-auto whitespace-pre-wrap rounded-xl border p-4 text-[15px] leading-7" style={{ borderColor: LINE, background: '#FAFBFD' }}>{q.context}</div>}
            <p className="mt-4 whitespace-pre-wrap text-[17px] font-medium leading-8">{q.text}</p>
            <UbtAnswer q={q} value={answers[q.id] ?? []} onChange={(val) => set(q.id, val)} />
            <div className="mt-6 flex gap-2">
              <button onClick={prev} className="rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: LINE }}>← Алдыңғы</button>
              <button onClick={next} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: INK }}>Келесі →</button>
            </div>
          </div>
        )}
        <aside className="self-start rounded-xl border p-3 lg:sticky lg:top-20" style={{ borderColor: LINE }}>
          <div className="mb-2 text-sm font-semibold">{subj?.name}</div>
          <div className="grid grid-cols-8 gap-1 lg:grid-cols-6">
            {subj?.questions.map((x, i) => (
              <button key={x.id} onClick={() => go(si, i)} className="h-8 rounded text-xs font-bold" style={i === qi ? { background: BLUE, color: '#fff' } : done(x) ? { background: INK, color: '#fff' } : { border: `1px solid ${LINE}`, color: MUTED }}>
                {i + 1}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </>
  )
}

export function UbtAnswer({ q, value, onChange, disabled, review }: { q: UbtQ; value: number[]; onChange: (v: number[]) => void; disabled?: boolean; review?: boolean }) {
  const ans = q.answer ?? []
  const mark = (i: number) => (review ? (ans.includes(i) ? { borderColor: '#15803D', background: '#DCFCE7' } : value.includes(i) ? { borderColor: '#B91C1C', background: '#FEE2E2' } : {}) : {})
  if (q.type === 'matching') {
    return (
      <div className="mt-4 space-y-4">
        <div className="rounded-lg border p-3 text-[15px]" style={{ borderColor: LINE, background: '#F9FAFB' }}>
          {q.options.map((o, i) => <div key={i}><b className="mr-2">{LETTERS[i]})</b>{o}</div>)}
        </div>
        {(q.left ?? []).map((l, li) => (
          <label key={li} className="flex flex-wrap items-center gap-3 text-[15px]">
            <span className="min-w-0 flex-1"><b>{li + 1}.</b> {l}</span>
            <select
              disabled={disabled}
              value={value[li] ?? -1}
              onChange={(e) => { const nv = [value[0] ?? -1, value[1] ?? -1]; nv[li] = Number(e.target.value); onChange(nv) }}
              className="w-28 rounded-lg border px-2 py-2 font-bold"
              style={{ borderColor: review ? (value[li] === ans[li] ? '#15803D' : '#B91C1C') : LINE }}
            >
              <option value={-1}>—</option>
              {q.options.map((_, i) => <option key={i} value={i}>{LETTERS[i]}</option>)}
            </select>
            {review && value[li] !== ans[li] && <span className="text-sm font-bold text-green-700">{LETTERS[ans[li]]}</span>}
          </label>
        ))}
      </div>
    )
  }
  const multi = q.type === 'multiple'
  return (
    <div className="mt-4 space-y-2">
      {q.options.map((o, i) => {
        const on = value.includes(i)
        return (
          <label key={i} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-[15px] ${disabled ? 'cursor-default' : 'hover:bg-slate-50'}`} style={{ borderColor: on ? BLUE : LINE, background: on ? '#EEF3FE' : '#fff', ...mark(i) }}>
            <input
              type={multi ? 'checkbox' : 'radio'}
              name={q.id}
              checked={on}
              disabled={disabled}
              onChange={() => onChange(multi ? (on ? value.filter((x) => x !== i) : value.length >= 3 ? value : [...value, i]) : [i])}
              className="mt-1 accent-[#2B6BF3]"
            />
            <b>{LETTERS[i]})</b>
            <span className="whitespace-pre-wrap">{o}</span>
          </label>
        )
      })}
    </div>
  )
}
