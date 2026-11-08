'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { DAY_FULL, STATUS, dayMonth, weekdayOf, type AttStatus } from '@/lib/journal'
import { HW, type HwMark, type LessonStudent, type LessonView } from '@/lib/lesson'
import { BLUE, INK, LINE, MUTED, Pct, SOFT, Sheet, Toast, lessonPost } from './ui'

const ATT_CYCLE: AttStatus[] = ['present', 'absent', 'late', 'excused']
const nextAtt = (s: AttStatus) => ATT_CYCLE[(ATT_CYCLE.indexOf(s) + 1) % ATT_CYCLE.length]
const tg = (n: number | null | undefined) => (n == null ? '' : `${n.toLocaleString('ru-RU')} ₸`)

/** Бір сабақ — бір экран: тақырып (КТП-дан), қатысу, үй тапсырмасы, төлем, тест; бір «Сақтау» */
export default function LessonScreen({ classId, date, onBack, onPlan }: { classId: string; date: string; onBack: () => void; onPlan: (classId: string) => void }) {
  const [v, setV] = useState<LessonView | null>(null)
  const [err, setErr] = useState('')
  const [topic, setTopic] = useState('')
  const [homework, setHomework] = useState('')
  const [planId, setPlanId] = useState<string | null>(null)
  const [att, setAtt] = useState<Record<string, AttStatus>>({})
  const [hw, setHw] = useState<Record<string, HwMark | null>>({})
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ text: string; tone?: 'ok' | 'err' }>({ text: '' })
  const [pay, setPay] = useState<LessonStudent | null>(null)
  const [photos, setPhotos] = useState<{ name: string; urls: string[] } | null>(null)
  const [pins, setPins] = useState<{ name: string; pin: string | null }[] | null>(null)
  const [quizBusy, setQuizBusy] = useState(false)
  const [defaulted, setDefaulted] = useState(false)

  const flash = (text: string, tone: 'ok' | 'err' = 'ok') => {
    setToast({ text, tone })
    setTimeout(() => setToast({ text: '' }), 3000)
  }

  const load = useCallback(async () => {
    setErr('')
    const r = await fetch(`/api/lesson?class=${classId}&date=${date}`, { cache: 'no-store' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) return setErr(j.error || 'Жүктелмеді')
    const d = j as LessonView
    setV(d)
    // Сақталған сабақ болса — соны; әйтпесе КТП-ның келесі тақырыбы
    const saved = d.lesson && !d.lesson.cancelled && (d.lesson.topic || d.lesson.plan_id)
    setTopic(saved ? d.lesson!.topic ?? '' : d.next?.topic ?? '')
    setHomework(saved ? d.lesson!.homework ?? '' : d.next?.homework ?? '')
    setPlanId(saved ? d.lesson!.plan_id : d.next?.id ?? null)
    // Белгі қойылмаған оқушылар — әдепкіде «келді» (тек келмегендерін басу керек)
    const a: Record<string, AttStatus> = {}
    let def = false
    for (const s of d.students) {
      a[s.id] = d.attendance[s.id] ?? 'present'
      if (!d.attendance[s.id]) def = true
    }
    setAtt(a)
    setDefaulted(def)
    setHw({ ...d.homework })
    setDirty(def || !saved)
  }, [classId, date])
  useEffect(() => {
    load()
  }, [load])

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, excused: 0 } as Record<AttStatus, number>
    Object.values(att).forEach((s) => c[s]++)
    return c
  }, [att])

  if (err)
    return (
      <div className="mt-6">
        <button onClick={onBack} className="mb-2 text-sm font-semibold" style={{ color: BLUE }}>← Бүгін</button>
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{err}</p>
      </div>
    )
  if (!v) return <p className="py-16 text-center text-sm" style={{ color: MUTED }}>Жүктелуде…</p>

  const pickPlan = (id: string) => {
    const p = v.plan.find((x) => x.id === id)
    setPlanId(p?.id ?? null)
    if (p) {
      setTopic(p.topic)
      setHomework(p.homework ?? '')
    }
    setDirty(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      await lessonPost('/api/lesson', { action: 'save', classId, date, topic, homework, planId, attendance: att, homeworkMarks: hw })
      setDirty(false)
      setDefaulted(false)
      flash('Сабақ сақталды ✓')
      load()
    } catch (e: any) {
      flash(e.message, 'err')
    } finally {
      setSaving(false)
    }
  }

  const makeQuiz = async () => {
    if (!topic.trim()) return flash('Алдымен тақырыпты жазыңыз', 'err')
    setQuizBusy(true)
    try {
      await lessonPost('/api/lesson', { action: 'quiz', classId, date, topic })
      flash('Тест дайын — оқушылар өз кабинетінде көреді')
      load()
    } catch (e: any) {
      flash(e.message, 'err')
    } finally {
      setQuizBusy(false)
    }
  }
  const toggleQuiz = async () => {
    if (!v.quiz) return
    try {
      await lessonPost('/api/lesson', { action: 'quizClose', quizId: v.quiz.id, open: !v.quiz.open })
      load()
    } catch (e: any) {
      flash(e.message, 'err')
    }
  }

  const quizOf = (sid: string) => v.quiz?.results.find((r) => r.student_id === sid)
  const doneCount = v.plan.filter((p) => p.done).length

  return (
    <div className="mt-4" style={{ color: INK }}>
      <button onClick={onBack} className="mb-1 text-sm font-semibold" style={{ color: BLUE }}>← Бүгінгі сабақтар</button>
      <h1 className="font-display text-2xl font-semibold tracking-tight">{v.class.name}</h1>
      <p className="mt-0.5 text-sm" style={{ color: MUTED }}>
        {[`${DAY_FULL[weekdayOf(date) - 1]}, ${dayMonth(date)}`, v.time, v.class.subject, `${v.students.length} оқушы`].filter(Boolean).join(' · ')}
      </p>

      {/* 1. Тақырып және үй тапсырмасы */}
      <section className="mt-5 rounded-2xl border bg-white p-4" style={{ borderColor: LINE }}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold">1. Тақырып</h2>
          {v.plan.length > 0 ? (
            <button onClick={() => onPlan(classId)} className="text-xs font-semibold" style={{ color: BLUE }}>КТП: {doneCount}/{v.plan.length} өтілді</button>
          ) : (
            <button onClick={() => onPlan(classId)} className="rounded-lg px-2.5 py-1 text-xs font-semibold text-white" style={{ background: BLUE }}>+ КТП қосу</button>
          )}
        </div>
        {v.plan.length > 0 && (
          <select value={planId ?? ''} onChange={(e) => pickPlan(e.target.value)} className="mt-3 w-full rounded-xl border bg-white px-3 py-2.5 text-sm" style={{ borderColor: LINE }}>
            <option value="">— КТП-дан тыс тақырып —</option>
            {v.plan.map((p, i) => (
              <option key={p.id} value={p.id}>
                {p.done && p.id !== planId ? '✓ ' : p.id === v.next?.id ? '→ ' : ''}
                {i + 1}. {p.topic}
              </option>
            ))}
          </select>
        )}
        <input value={topic} onChange={(e) => { setTopic(e.target.value); setDirty(true) }} placeholder="Бүгінгі сабақ тақырыбы" className="mt-2 w-full rounded-xl border px-3 py-2.5 text-[15px] font-medium" style={{ borderColor: LINE }} />
        <textarea value={homework} onChange={(e) => { setHomework(e.target.value); setDirty(true) }} placeholder="Үй тапсырмасы" rows={2} className="mt-2 w-full resize-none rounded-xl border px-3 py-2.5 text-sm" style={{ borderColor: LINE }} />
      </section>

      {/* 2. Оқушылар: қатысу, өткен үй тапсырмасы, төлем, тест нәтижесі */}
      <section className="mt-4 rounded-2xl border bg-white" style={{ borderColor: LINE }}>
        <div className="border-b p-4" style={{ borderColor: LINE }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              2. Оқушылар
              <button
                onClick={async () => {
                  const r = await fetch(`/api/lesson?pins=${classId}`, { cache: 'no-store' })
                  const j = await r.json().catch(() => ({}))
                  if (r.ok) setPins(j.students)
                  else flash(j.error || 'Жүктелмеді', 'err')
                }}
                className="rounded-lg px-2 py-0.5 text-xs font-semibold"
                style={{ background: SOFT, color: BLUE }}
              >
                PIN-дер
              </button>
            </h2>
            <div className="flex gap-1.5 text-xs font-semibold">
              <span className="rounded-full px-2 py-0.5" style={{ background: STATUS.present.bg, color: STATUS.present.fg }}>Келді {counts.present + counts.late}</span>
              {counts.absent > 0 && <span className="rounded-full px-2 py-0.5" style={{ background: STATUS.absent.bg, color: STATUS.absent.fg }}>Келмеді {counts.absent}</span>}
              {counts.excused > 0 && <span className="rounded-full px-2 py-0.5" style={{ background: STATUS.excused.bg, color: STATUS.excused.fg }}>Себепті {counts.excused}</span>}
            </div>
          </div>
          {defaulted && <p className="mt-1.5 text-xs" style={{ color: MUTED }}>Барлығы «келді» деп тұр — тек келмегендерін басыңыз.</p>}
          {v.prev?.homework && (
            <p className="mt-1.5 text-xs" style={{ color: MUTED }}>
              Өткен үй тапсырмасы ({dayMonth(v.prev.date)}): <b style={{ color: INK }}>{v.prev.homework}</b> — ✓ ½ ✕ арқылы тексеріңіз
            </p>
          )}
        </div>
        {!v.students.length && <p className="p-6 text-center text-sm" style={{ color: MUTED }}>Топта оқушы жоқ. Оқушыларды әкімші «Сабақ журналында» қосады.</p>}
        <ul>
          {v.students.map((s, idx) => {
            const a = att[s.id] ?? 'present'
            const st = STATUS[a]
            const q = quizOf(s.id)
            const owes = s.pay.kind === 'overdue' || s.pay.kind === 'today'
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3" style={{ borderTop: idx ? `1px solid ${LINE}` : undefined }}>
                <div className="min-w-0 flex-1 basis-40">
                  <div className="flex items-center gap-1.5">
                    {s.progress.risk !== 'ok' && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.progress.risk === 'high' ? '#DC2626' : '#F59E0B' }} title="Назар аударыңыз" />}
                    <span className="truncate text-[15px] font-medium">{s.full_name}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-2.5 text-[11px]" style={{ color: MUTED }}>
                    <Pct label="Қатысу" v={s.progress.att} />
                    <Pct label="ҮТ" v={s.progress.hw} />
                    <Pct label="Тест" v={s.progress.quiz} />
                    {s.progress.absStreak >= 2 && <span style={{ color: '#B91C1C' }}>{s.progress.absStreak} рет қатар келмеді</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {owes && (
                    <button onClick={() => setPay(s)} className="h-9 rounded-xl px-2.5 text-xs font-bold" style={{ background: '#FEE2E2', color: '#B91C1C' }} title="Төлем">
                      ₸ {s.pay.kind === 'today' ? 'бүгін' : `${Math.abs(s.pay.days ?? 0)} күн`}
                    </button>
                  )}
                  {q && <span className="rounded-lg px-2 py-1 text-xs font-bold tabular-nums" style={{ background: SOFT }}>{q.score}/{q.total}</span>}
                  {(v.hwFiles?.[s.id]?.length ?? 0) > 0 && (
                    <button onClick={() => setPhotos({ name: s.full_name, urls: v.hwFiles[s.id] })} className="h-9 rounded-xl px-2.5 text-xs font-bold" style={{ background: '#E0E7FF', color: '#4338CA' }} title="Үй тапсырмасының суреті">
                      📷 {v.hwFiles[s.id].length}
                    </button>
                  )}
                  {v.prev?.homework && (
                    <div className="flex overflow-hidden rounded-xl border" style={{ borderColor: LINE }}>
                      {(['done', 'partial', 'none'] as HwMark[]).map((m) => {
                        const on = hw[s.id] === m
                        return (
                          <button
                            key={m}
                            onClick={() => { setHw({ ...hw, [s.id]: on ? null : m }); setDirty(true) }}
                            className="h-9 w-9 text-sm font-bold"
                            style={{ background: on ? HW[m].bg : '#fff', color: on ? HW[m].fg : '#B6BCCB' }}
                            aria-label={HW[m].label}
                            title={`Үй тапсырмасы: ${HW[m].label}`}
                          >
                            {HW[m].short}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  <button
                    onClick={() => { setAtt({ ...att, [s.id]: nextAtt(a) }); setDirty(true) }}
                    className="h-9 min-w-[92px] rounded-xl px-3 text-sm font-semibold"
                    style={{ background: st.bg, color: st.fg }}
                    aria-label={`Қатысу: ${st.label}`}
                  >
                    {st.short} {st.label}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {/* 3. Сабақ тесті */}
      <section className="mt-4 rounded-2xl border bg-white p-4" style={{ borderColor: LINE }}>
        <h2 className="text-[15px] font-semibold">3. Тақырып бойынша тест</h2>
        {v.quiz ? (
          <div className="mt-2">
            <p className="text-sm">
              «{v.quiz.topic}» · {v.quiz.total} сұрақ ·{' '}
              <b>{v.quiz.results.length}/{v.students.length}</b> оқушы тапсырды
              {v.quiz.results.length > 0 && ` · орташа ${Math.round((v.quiz.results.reduce((a, r) => a + r.score / r.total, 0) / v.quiz.results.length) * 100)}%`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`/teacher/quiz?id=${v.quiz.id}`} target="_blank" className="rounded-xl border px-3 py-2 text-sm font-semibold" style={{ borderColor: LINE }}>Сұрақтар · басып шығару</a>
              <button onClick={toggleQuiz} className="rounded-xl border px-3 py-2 text-sm font-semibold" style={{ borderColor: LINE }}>{v.quiz.open ? 'Тестті жабу' : 'Қайта ашу'}</button>
            </div>
            <p className="mt-2 text-xs" style={{ color: MUTED }}>{v.quiz.open ? 'Оқушылар кабинетіне кіріп («Сабақ тесті») тапсырады, нәтиже осы жерде көрінеді.' : 'Тест жабық — оқушылар енді тапсыра алмайды.'}</p>
          </div>
        ) : (
          <div className="mt-2">
            <p className="text-sm" style={{ color: MUTED }}>ИИ осы сабақ тақырыбына 8 сұрақ құрастырады, тест бірден топтағы оқушылардың кабинетінде ашылады. Қағазға басып шығаруға да болады.</p>
            <button onClick={makeQuiz} disabled={quizBusy || !topic.trim()} className="mt-3 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50" style={{ background: BLUE }}>
              {quizBusy ? 'ИИ құрастырып жатыр… (10–30 сек)' : `«${topic.trim().slice(0, 40) || 'тақырып'}» бойынша тест жасау`}
            </button>
          </div>
        )}
      </section>

      {/* Бір батырма */}
      <div className="sticky bottom-0 z-40 -mx-4 mt-5 border-t bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border" style={{ borderColor: LINE }}>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 text-xs" style={{ color: MUTED }}>
            {dirty ? 'Өзгерістер сақталмаған' : 'Барлығы сақталды ✓'}
          </div>
          <button onClick={save} disabled={saving} className="rounded-2xl px-6 py-3.5 text-[15px] font-semibold text-white disabled:opacity-60" style={{ background: dirty ? INK : '#15803D' }}>
            {saving ? 'Сақталуда…' : dirty ? 'Сабақты сақтау' : 'Сақталды ✓'}
          </button>
        </div>
      </div>

      {photos && (
        <Sheet title={`Үй тапсырмасы · ${photos.name}`} onClose={() => setPhotos(null)}>
          <div className="grid gap-3">
            {photos.urls.map((u, i) => (
              <a key={i} href={u} target="_blank" rel="noreferrer"><img src={u} alt="Дәптер суреті" className="w-full rounded-2xl border" style={{ borderColor: LINE }} /></a>
            ))}
          </div>
          <p className="mt-3 text-center text-xs" style={{ color: MUTED }}>Тексеріп болған соң ✓ / ½ / ✕ белгісін қойыңыз.</p>
        </Sheet>
      )}
      {pins && (
        <Sheet title="Оқушылардың PIN-дері" onClose={() => setPins(null)}>
          <p className="text-sm" style={{ color: MUTED }}>Планшетте: «Менің кабинетім» → топ → аты → PIN. PIN жоқ болса — әкімші «Кабинетке кіру карточкалары» бетінде жасайды.</p>
          <ul className="mt-3 divide-y rounded-2xl border" style={{ borderColor: LINE }}>
            {pins.map((p, i) => (
              <li key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span>{p.name}</span>
                <b className="font-mono tracking-widest">{p.pin ?? '—'}</b>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
      {pay && <PaySheet s={pay} classId={classId} date={date} onClose={() => setPay(null)} onDone={(m) => { setPay(null); flash(m); load() }} />}
      <Toast text={toast.text} tone={toast.tone} />
    </div>
  )
}

function PaySheet({ s, classId, date, onClose, onDone }: { s: LessonStudent; classId: string; date: string; onClose: () => void; onDone: (msg: string) => void }) {
  const [amount, setAmount] = useState(s.pay.amount ? String(s.pay.amount) : '')
  const [method, setMethod] = useState<'kaspi' | 'cash' | 'transfer'>('kaspi')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const go = async () => {
    setBusy(true)
    setErr('')
    try {
      const r = await lessonPost('/api/lesson', { action: 'pay', classId, date, studentId: s.id, amount: Number(amount.replace(/\D/g, '')), method })
      onDone(`Төлем жазылды: ${tg(r.amount)} · келесі төлем ${dayMonth(r.nextDeadline)}`)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet title="Төлем қабылдау" onClose={onClose}>
      <p className="text-[15px] font-medium">{s.full_name}</p>
      <p className="text-sm" style={{ color: '#B91C1C' }}>{s.pay.kind === 'today' ? 'Төлем күні — бүгін' : `${Math.abs(s.pay.days ?? 0)} күн кешікті`}{s.pay.deadline ? ` (${dayMonth(s.pay.deadline)})` : ''}</p>
      <label className="mt-4 block text-xs font-semibold" style={{ color: MUTED }}>Сомасы, ₸</label>
      <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-3 text-lg font-semibold tabular-nums" style={{ borderColor: LINE }} />
      <div className="mt-3 grid grid-cols-3 gap-2">
        {([['kaspi', 'Kaspi'], ['cash', 'Қолма-қол'], ['transfer', 'Аударым']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setMethod(k)} className="rounded-xl border py-2.5 text-sm font-semibold" style={{ borderColor: method === k ? INK : LINE, background: method === k ? INK : '#fff', color: method === k ? '#fff' : INK }}>{l}</button>
        ))}
      </div>
      {err && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <button onClick={go} disabled={busy} className="mt-4 w-full rounded-2xl py-3.5 text-[15px] font-semibold text-white disabled:opacity-60" style={{ background: '#15803D' }}>
        {busy ? 'Сақталуда…' : `Төледі${amount ? ` — ${Number(amount.replace(/\D/g, '')).toLocaleString('ru-RU')} ₸` : ''}`}
      </button>
      <p className="mt-2 text-center text-xs" style={{ color: MUTED }}>Әкімші «Бүгін» бетінде кім қабылдағанын көреді.</p>
    </Sheet>
  )
}
