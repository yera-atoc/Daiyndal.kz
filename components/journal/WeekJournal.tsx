'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DAY_FULL,
  DAY_SHORT,
  STATUS,
  addDays,
  dayMonth,
  isLessonDay,
  nextStatus,
  todayAlmaty,
  weekDates,
  weekLabel,
  weekStartOf,
  weekdayOf,
  type AttStatus,
  type JDetail,
  type JLesson,
} from '@/lib/journal'

const INK = '#0E1424'
const BLUE = '#2B6BF3'
const MUTED = '#687085'
const LINE = '#E3E7F0'

async function post(body: unknown) {
  const r = await fetch('/api/journal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Сақталмады')
  return j
}

/** Апталық журнал: қатысу торы, апта бойынша тақырып/тапсырма және әр сабақтың жазбасы */
export default function WeekJournal({ classId, week, onWeek, onBack, backLabel = 'Топтар' }: { classId: string; week: string; onWeek: (w: string) => void; onBack?: () => void; backLabel?: string }) {
  const [d, setD] = useState<JDetail | null>(null)
  const [err, setErr] = useState('')
  const [toast, setToast] = useState('')
  const today = todayAlmaty()

  const load = useCallback(async () => {
    setErr('')
    const r = await fetch(`/api/journal?class=${classId}&week=${week}`, { cache: 'no-store' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) return setErr(j.error || 'Жүктелмеді')
    setD(j)
  }, [classId, week])
  useEffect(() => {
    setD(null)
    load()
  }, [load])

  const fail = (e: any) => {
    setToast(e.message || 'Сақталмады')
    setTimeout(() => setToast(''), 3500)
    load()
  }

  if (err) return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{err}</p>

  const dates = weekDates(week)
  const lessonOf = (x: string) => d?.lessons.find((l) => l.date === x)
  const on = d ? dates.filter((x) => isLessonDay(x, d.class.days, lessonOf(x))) : []
  const statusOf = (sid: string, x: string) => d?.attendance.find((a) => a.student_id === sid && a.date === x)?.status ?? null

  const setAtt = (sid: string, x: string, s: AttStatus | null) => {
    if (!d) return
    const rest = d.attendance.filter((a) => !(a.student_id === sid && a.date === x))
    setD({ ...d, attendance: s ? [...rest, { student_id: sid, date: x, status: s }] : rest })
    post({ action: 'att', classId, date: x, studentId: sid, status: s }).catch(fail)
  }
  const allPresent = (x: string) => {
    if (!d) return
    const have = new Set(d.attendance.filter((a) => a.date === x).map((a) => a.student_id))
    setD({ ...d, attendance: [...d.attendance, ...d.students.filter((s) => !have.has(s.id)).map((s) => ({ student_id: s.id, date: x, status: 'present' as AttStatus }))] })
    post({ action: 'attAll', classId, date: x, status: 'present' }).catch(fail)
  }
  const toggleDay = (x: string) => {
    if (!d) return
    const isOn = on.includes(x)
    if (isOn && d.attendance.some((a) => a.date === x) && !confirm(`${DAY_FULL[weekdayOf(x) - 1]}, ${dayMonth(x)}: сабақ болмады ма? Бұл күнгі қатысу белгілері өшеді.`)) return
    const others = d.lessons.filter((l) => l.date !== x)
    const cur = lessonOf(x)
    setD({
      ...d,
      lessons: [...others, { date: x, topic: cur?.topic ?? null, homework: cur?.homework ?? null, cancelled: isOn }],
      attendance: isOn ? d.attendance.filter((a) => a.date !== x) : d.attendance,
    })
    post({ action: 'day', classId, date: x, on: !isOn }).catch(fail)
  }

  return (
    <div style={{ color: INK }}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {onBack && (
            <button onClick={onBack} className="mb-1 text-sm font-semibold" style={{ color: BLUE }}>
              ← {backLabel}
            </button>
          )}
          <h1 className="font-display truncate text-2xl font-semibold tracking-tight">{d?.class.name ?? '…'}</h1>
          {d && (
            <p className="mt-0.5 text-sm" style={{ color: MUTED }}>
              {[d.teacher, d.class.subject, `${d.students.length} оқушы`, d.class.days.length ? d.class.days.map((x) => DAY_SHORT[x - 1]).join(', ') : null].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <WeekNav week={week} onWeek={onWeek} />
      </div>

      {!d ? (
        <p className="py-16 text-center text-sm" style={{ color: MUTED }}>Жүктелуде…</p>
      ) : (
        <>
          {/* Сабақ күндері бұл аптада */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium" style={{ color: MUTED }}>Сабақ күндері:</span>
            {dates.map((x) => {
              const isOn = on.includes(x)
              const planned = d.class.days.includes(weekdayOf(x))
              return (
                <button
                  key={x}
                  onClick={() => toggleDay(x)}
                  title={isOn ? 'Сабақ болмаса — басыңыз' : 'Қосымша сабақ қосу'}
                  className="rounded-xl border px-2.5 py-1.5 text-left text-xs transition"
                  style={isOn ? { background: INK, color: '#fff', borderColor: INK } : { background: '#fff', borderColor: LINE, color: planned ? '#B91C1C' : MUTED, textDecoration: planned ? 'line-through' : undefined }}
                >
                  <b>{DAY_SHORT[weekdayOf(x) - 1]}</b> {Number(x.slice(8, 10))}
                </button>
              )
            })}
          </div>

          {/* Қатысу торы */}
          <section className="mt-4 overflow-hidden rounded-2xl border bg-white" style={{ borderColor: LINE }}>
            {!d.students.length ? (
              <p className="p-8 text-center text-sm" style={{ color: MUTED }}>Бұл топқа әлі оқушы бекітілмеген. Оқушыларды әкімші қосады.</p>
            ) : !on.length ? (
              <p className="p-8 text-center text-sm" style={{ color: MUTED }}>Бұл аптада сабақ күні белгіленбеген. Жоғарыдан күнді басып қосыңыз.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: LINE }}>
                      <th className="sticky left-0 z-10 min-w-[150px] bg-white px-4 py-2.5 text-left text-xs font-semibold" style={{ color: MUTED }}>
                        Оқушы
                      </th>
                      {on.map((x) => (
                        <th key={x} className="min-w-[76px] px-1 py-2 text-center" style={{ background: x === today ? '#EEF3FE' : undefined }}>
                          <div className="text-xs font-semibold">{DAY_SHORT[weekdayOf(x) - 1]} {Number(x.slice(8, 10))}</div>
                          {x <= addDays(today, 14) && (
                            <button onClick={() => allPresent(x)} className="mt-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold" style={{ background: '#DCFCE7', color: '#15803D' }} title="Белгіленбегендердің бәрін «келді» деу">
                              ✓ бәрі
                            </button>
                          )}
                        </th>
                      ))}
                      <th className="px-3 py-2.5 text-right text-xs font-semibold" style={{ color: MUTED }}>
                        Апта
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.students.map((s) => {
                      const came = on.filter((x) => ['present', 'late'].includes(statusOf(s.id, x) ?? '')).length
                      const marked = on.filter((x) => statusOf(s.id, x)).length
                      return (
                        <tr key={s.id} className="border-b last:border-0" style={{ borderColor: '#EDF0F5' }}>
                          <td className="sticky left-0 z-10 bg-white px-4 py-1.5 font-medium">
                            <span className="block max-w-[200px] truncate">{s.full_name}</span>
                          </td>
                          {on.map((x) => {
                            const st = statusOf(s.id, x)
                            const m = st ? STATUS[st] : null
                            const future = x > addDays(today, 14)
                            return (
                              <td key={x} className="px-1 py-1.5 text-center" style={{ background: x === today ? '#F6F9FF' : undefined }}>
                                <button
                                  disabled={future}
                                  onClick={() => setAtt(s.id, x, nextStatus(st))}
                                  onContextMenu={(e) => {
                                    e.preventDefault()
                                    setAtt(s.id, x, null)
                                  }}
                                  aria-label={`${s.full_name}, ${dayMonth(x)}: ${m?.label ?? 'белгіленбеген'}`}
                                  title={m?.label ?? 'Басыңыз: келді → келмеді → кешікті → себепті'}
                                  className="mx-auto grid h-9 w-full max-w-[60px] place-items-center rounded-lg border text-sm font-bold transition active:scale-95 disabled:opacity-30"
                                  style={m ? { background: m.bg, color: m.fg, borderColor: 'transparent' } : { borderColor: LINE, borderStyle: 'dashed', color: '#B8BFCC' }}
                                >
                                  {m?.short ?? '·'}
                                </button>
                              </td>
                            )
                          })}
                          <td className="px-3 py-1.5 text-right tabular-nums" style={{ color: marked ? INK : '#B8BFCC' }}>
                            {came}/{on.length}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2.5 text-xs" style={{ borderColor: LINE, color: MUTED }}>
              {(Object.keys(STATUS) as AttStatus[]).map((k) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span className="grid h-5 w-5 place-items-center rounded font-bold" style={{ background: STATUS[k].bg, color: STATUS[k].fg }}>{STATUS[k].short}</span>
                  {STATUS[k].label}
                </span>
              ))}
              <span className="ml-auto">Ұяшықты басқан сайын белгі ауысады</span>
            </div>
          </section>

          {/* Апта бойынша */}
          <WeekNotes key={`${classId}:${week}`} d={d} classId={classId} onError={fail} />

          {/* Әр сабақ */}
          {on.length > 0 && (
            <section className="mt-4">
              <h2 className="font-display text-[15px] font-semibold">Әр сабақ бойынша <span className="font-sans text-xs font-normal" style={{ color: MUTED }}>— міндетті емес, қажет болса</span></h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {on.map((x) => (
                  <LessonNote key={`${classId}:${x}`} date={x} lesson={lessonOf(x)} classId={classId} onError={fail} today={today} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
      {toast && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm text-white shadow-lg" style={{ background: '#B91C1C' }}>{toast}</div>}
    </div>
  )
}

export function WeekNav({ week, onWeek }: { week: string; onWeek: (w: string) => void }) {
  const cur = weekStartOf(todayAlmaty())
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={() => onWeek(addDays(week, -7))} aria-label="Алдыңғы апта" className="grid h-9 w-9 place-items-center rounded-lg border bg-white text-lg" style={{ borderColor: LINE }}>‹</button>
      <div className="min-w-[150px] rounded-lg border bg-white px-3 py-1.5 text-center text-sm font-semibold" style={{ borderColor: LINE }}>
        {weekLabel(week)}
        {week === cur && <span className="ml-1.5 text-xs font-medium" style={{ color: BLUE }}>осы апта</span>}
      </div>
      <button onClick={() => onWeek(addDays(week, 7))} aria-label="Келесі апта" className="grid h-9 w-9 place-items-center rounded-lg border bg-white text-lg" style={{ borderColor: LINE }}>›</button>
      {week !== cur && (
        <button onClick={() => onWeek(cur)} className="rounded-lg px-2.5 py-1.5 text-sm font-semibold" style={{ color: BLUE }}>Бүгін</button>
      )}
    </div>
  )
}

/** Мәтін өрісі: жазып болған соң (фокустан шыққанда) өзі сақталады */
function useAutosave(initial: Record<string, string>, save: (v: Record<string, string>) => Promise<unknown>, onError: (e: any) => void) {
  const [v, setV] = useState(initial)
  const [state, setState] = useState<'idle' | 'dirty' | 'saving' | 'saved'>('idle')
  const last = useRef(JSON.stringify(initial))
  const flush = async () => {
    const now = JSON.stringify(v)
    if (now === last.current) return
    setState('saving')
    try {
      await save(v)
      last.current = now
      setState('saved')
    } catch (e) {
      setState('dirty')
      onError(e)
    }
  }
  const set = (k: string, val: string) => {
    setV((p) => ({ ...p, [k]: val }))
    setState('dirty')
  }
  return { v, set, flush, state }
}

function SaveState({ s }: { s: string }) {
  if (s === 'idle') return null
  const t = s === 'dirty' ? 'Сақталмаған' : s === 'saving' ? 'Сақталуда…' : 'Сақталды ✓'
  return <span className="text-xs" style={{ color: s === 'saved' ? '#15803D' : MUTED }}>{t}</span>
}

const area = 'w-full resize-y rounded-xl border bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-[#2B6BF3] focus:ring-2 focus:ring-[#2B6BF3]/15'

function WeekNotes({ d, classId, onError }: { d: JDetail; classId: string; onError: (e: any) => void }) {
  const a = useAutosave(
    { topic: d.week?.topic ?? '', homework: d.week?.homework ?? '', note: d.week?.note ?? '' },
    (v) => post({ action: 'week', classId, weekStart: d.weekStart, ...v }),
    onError
  )
  return (
    <section className="mt-4 rounded-2xl border bg-white p-4 sm:p-5" style={{ borderColor: LINE }}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[15px] font-semibold">Апта бойынша</h2>
        <SaveState s={a.state} />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_0.8fr]">
        <label className="block">
          <span className="mb-1 block text-xs font-medium" style={{ color: MUTED }}>Өтілген тақырыптар</span>
          <textarea rows={4} value={a.v.topic} onChange={(e) => a.set('topic', e.target.value)} onBlur={a.flush} placeholder="Мысалы: Пропорция. Тура және кері пропорционалдық" className={area} style={{ borderColor: LINE }} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium" style={{ color: MUTED }}>Үй тапсырмасы</span>
          <textarea rows={4} value={a.v.homework} onChange={(e) => a.set('homework', e.target.value)} onBlur={a.flush} placeholder="Мысалы: №145–152, жаттығу кітабы 34-бет" className={area} style={{ borderColor: LINE }} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium" style={{ color: MUTED }}>Ескерту (әкімшіге)</span>
          <textarea rows={4} value={a.v.note} onChange={(e) => a.set('note', e.target.value)} onBlur={a.flush} placeholder="Мысалы: 2 оқушы артта қалып жатыр" className={area} style={{ borderColor: LINE }} />
        </label>
      </div>
    </section>
  )
}

function LessonNote({ date, lesson, classId, onError, today }: { date: string; lesson?: JLesson; classId: string; onError: (e: any) => void; today: string }) {
  const a = useAutosave({ topic: lesson?.topic ?? '', homework: lesson?.homework ?? '' }, (v) => post({ action: 'lesson', classId, date, ...v }), onError)
  return (
    <div className="rounded-2xl border bg-white p-4" style={{ borderColor: date === today ? '#BFD3FB' : LINE }}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">
          {DAY_FULL[weekdayOf(date) - 1]}, {dayMonth(date)}
          {date === today && <span className="ml-2 rounded-full px-2 py-0.5 text-[11px]" style={{ background: '#EEF3FE', color: BLUE }}>бүгін</span>}
        </div>
        <SaveState s={a.state} />
      </div>
      <input value={a.v.topic} onChange={(e) => a.set('topic', e.target.value)} onBlur={a.flush} placeholder="Сабақтың тақырыбы" className={`${area} mt-2`} style={{ borderColor: LINE }} />
      <input value={a.v.homework} onChange={(e) => a.set('homework', e.target.value)} onBlur={a.flush} placeholder="Үй тапсырмасы" className={`${area} mt-2`} style={{ borderColor: LINE }} />
    </div>
  )
}
