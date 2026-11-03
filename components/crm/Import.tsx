'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ChevronDown, Plus, Trash2, Upload } from 'lucide-react'
import { BRAND, inputCls, selCls, btnDark, btnLine, type CTeacher } from './core'
import { IMPORT_SEED, REMOVED_SEED_KEYS } from '@/lib/importSeed'
import { guessTeacher, validateGroup, type ImpGroup, type ImpLesson, type ImpStudent } from '@/lib/importPlan'

const DAYS = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс']
const KEY = 'beles-import-draft-v1'

type Draft = ImpGroup & { note?: string; open?: boolean }

function fromSeed(teachers: CTeacher[], only?: Set<string>): Draft[] {
  return IMPORT_SEED.filter((g) => !only || only.has(g.key)).map((g) => ({
    key: g.key,
    name: g.name,
    grade: g.grade,
    note: g.note,
    teacherId: guessTeacher(g.teacherHint, teachers),
    lessons: g.lessons.map((l) => ({ ...l, teacherId: '' })),
    students: g.students.map((s) => ({ name: s.name, parentName: '', parentPhone: '', note: s.note ?? '' })),
  }))
}

export default function Import({ teachers, reload, flash }: { teachers: CTeacher[]; reload: () => Promise<void>; flash: (m: string) => void }) {
  const [groups, setGroups] = useState<Draft[] | null>(null)
  const [done, setDone] = useState<string[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Жоба браузерде сақталады: беттен шығып кетсе де, түзетулер жоғалмайды
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
      if (saved?.groups) {
        // Жобада жоқ жаңа топтарды (кейін қосылған журналдар) соңына қосамыз, ауыстырылған ескілерін аламыз
        const doneKeys: string[] = saved.done ?? []
        const have = new Set((saved.groups as Draft[]).map((g) => g.key))
        const added = fromSeed(teachers, new Set(IMPORT_SEED.map((g) => g.key).filter((k) => !have.has(k))))
        const kept = (saved.groups as Draft[]).filter((g) => !REMOVED_SEED_KEYS.includes(g.key) || doneKeys.includes(g.key))
        setGroups([...kept, ...added])
        setDone(doneKeys)
        return
      }
    } catch {}
    setGroups(fromSeed(teachers))
  }, [teachers])
  useEffect(() => {
    if (!groups) return
    try {
      localStorage.setItem(KEY, JSON.stringify({ groups, done }))
    } catch {}
  }, [groups, done])

  const issues = useMemo(() => (groups ?? []).map((g) => validateGroup(g)), [groups])

  if (!groups) return null

  const set = (i: number, patch: Partial<Draft>) => setGroups(groups.map((g, j) => (j === i ? { ...g, ...patch } : g)))
  const setStudent = (i: number, k: number, patch: Partial<ImpStudent>) => set(i, { students: groups[i].students.map((s, j) => (j === k ? { ...s, ...patch } : s)) })
  const setLesson = (i: number, k: number, patch: Partial<ImpLesson>) => set(i, { lessons: groups[i].lessons.map((l, j) => (j === k ? { ...l, ...patch } : l)) })

  async function send(list: Draft[]) {
    setBusy(list.length === 1 ? list[0].key : 'all')
    setError('')
    try {
      const r = await fetch('/api/admin/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groups: list }) })
      const j = await r.json()
      if (j.done?.length) setDone((d) => Array.from(new Set([...d, ...j.done])))
      if (!r.ok) throw new Error(j.error ?? 'Қате')
      const c = j.counts
      flash(`Енгізілді: ${c.students} жаңа оқушы, ${c.groups} топ, ${c.classes} журнал тобы, ${c.slots} сабақ кестеге`)
      await reload()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }

  const ready = groups.filter((g, i) => !done.includes(g.key) && issues[i].length === 0)
  const totalStudents = groups.reduce((a, g) => a + g.students.length, 0)
  const unsure = groups.reduce((a, g) => a + g.students.filter((s) => s.name.includes('?')).length, 0)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4 text-sm" style={{ borderColor: BRAND.line }}>
        <p>
          Қағаз журналдардан <b>{groups.length} топ</b>, <b>{totalStudents} оқушы</b> көшірілді.
          {unsure > 0 && <> Қолжазбадан нақты оқылмаған <b style={{ color: '#B45309' }}>{unsure} атты</b> (сары, «?» белгісі бар) тексеріп түзетіңіз.</>}
        </p>
        <p className="mt-1" style={{ color: BRAND.muted }}>
          Әр топқа мұғалімді таңдаңыз, ата-ананың WhatsApp нөмірін жазыңыз (кейін де қосуға болады) да, «Енгізу» басыңыз. Қайта басса, екі есе жазылмайды.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={!ready.length || !!busy} onClick={() => send(ready)} className={btnDark} style={{ background: BRAND.ink }}>
            <Upload size={15} className="mr-1.5 inline" />
            Дайын топтарды енгізу ({ready.length})
          </button>
          <button
            onClick={() =>
              setGroups([...groups, { key: `new-${Date.now()}`, name: 'Жаңа топ', grade: null, teacherId: '', open: true, lessons: [{ days: [], start: '', end: '', subject: '', teacherId: '' }], students: [{ name: '', parentName: '', parentPhone: '', note: '' }] }])
            }
            className={btnLine}
            style={{ borderColor: BRAND.line }}
          >
            <Plus size={15} className="mr-1 inline" /> Жаңа топ
          </button>
          <button
            onClick={() => {
              if (confirm('Барлық түзетулер өшіп, журналдағы бастапқы тізім қайта жүктеледі. Жалғастырасыз ба?')) {
                setGroups(fromSeed(teachers))
                setDone([])
              }
            }}
            className={btnLine}
            style={{ borderColor: BRAND.line, color: BRAND.muted }}
          >
            Бастапқы тізімге қайтару
          </button>
        </div>
        {error && <p className="mt-3 rounded-lg p-2 text-sm" style={{ background: '#FEF2F2', color: BRAND.red }}>{error}</p>}
      </div>

      {groups.map((g, i) => {
        const isDone = done.includes(g.key)
        const errs = issues[i]
        return (
          <section key={g.key} className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: isDone ? '#86EFAC' : BRAND.line }}>
            <button onClick={() => set(i, { open: !g.open })} className="flex w-full items-center gap-3 px-4 py-3 text-left">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{g.name || 'Атауы жоқ'}</div>
                <div className="truncate text-xs" style={{ color: BRAND.muted }}>
                  {g.students.length} оқушы · {teachers.find((t) => t.id === g.teacherId)?.name ?? 'мұғалім таңдалмаған'} · {g.lessons.map((l) => `${l.days.map((d) => DAYS[d - 1]).join('/')} ${l.start || '—'}`).join(', ')}
                </div>
              </div>
              {isDone ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 size={15} /> Енгізілді</span>
              ) : errs.length ? (
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">{errs.length} мәселе</span>
              ) : (
                <span className="rounded-md bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">Дайын</span>
              )}
              <ChevronDown size={18} className={`shrink-0 transition ${g.open ? 'rotate-180' : ''}`} style={{ color: BRAND.muted }} />
            </button>

            {g.open && (
              <div className="space-y-4 border-t px-4 py-4" style={{ borderColor: BRAND.line }}>
                {g.note && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{g.note}</p>}
                <div className="grid gap-3 sm:grid-cols-[1fr_90px_1fr]">
                  <label className="text-xs" style={{ color: BRAND.muted }}>
                    Топ атауы
                    <input value={g.name} onChange={(e) => set(i, { name: e.target.value })} className={`${inputCls} mt-1`} style={{ borderColor: BRAND.line }} />
                  </label>
                  <label className="text-xs" style={{ color: BRAND.muted }}>
                    Сынып
                    <input type="number" min={1} max={11} value={g.grade ?? ''} onChange={(e) => set(i, { grade: e.target.value ? Number(e.target.value) : null })} className={`${inputCls} mt-1`} style={{ borderColor: BRAND.line }} />
                  </label>
                  <label className="text-xs" style={{ color: BRAND.muted }}>
                    Мұғалімі (топ жетекшісі)
                    <select value={g.teacherId} onChange={(e) => set(i, { teacherId: e.target.value })} className={`${selCls} mt-1 w-full`} style={{ borderColor: BRAND.line }}>
                      <option value="">— таңдаңыз —</option>
                      {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}{t.subject ? ` (${t.subject})` : ''}</option>)}
                    </select>
                  </label>
                </div>

                {/* Сабақтар */}
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: BRAND.muted }}>Сабақ кестесі</div>
                  <div className="space-y-2">
                    {g.lessons.map((l, k) => (
                      <div key={k} className="flex flex-wrap items-center gap-2 rounded-xl border p-2" style={{ borderColor: BRAND.line }}>
                        <input value={l.subject} onChange={(e) => setLesson(i, k, { subject: e.target.value })} placeholder="Пән" className={inputCls} style={{ borderColor: BRAND.line, width: 170 }} />
                        <div className="flex gap-1">
                          {DAYS.slice(0, 6).map((d, n) => {
                            const on = l.days.includes(n + 1)
                            return (
                              <button key={d} onClick={() => setLesson(i, k, { days: on ? l.days.filter((x) => x !== n + 1) : [...l.days, n + 1].sort() })} className="h-8 w-8 rounded-lg text-xs font-semibold" style={{ background: on ? BRAND.ink : '#F1F3F7', color: on ? '#fff' : BRAND.muted }}>
                                {d}
                              </button>
                            )
                          })}
                        </div>
                        <input type="time" value={l.start} onChange={(e) => setLesson(i, k, { start: e.target.value })} className={inputCls} style={{ borderColor: l.start ? BRAND.line : '#FCD34D', width: 112 }} />
                        <span style={{ color: BRAND.muted }}>–</span>
                        <input type="time" value={l.end} onChange={(e) => setLesson(i, k, { end: e.target.value })} className={inputCls} style={{ borderColor: l.end ? BRAND.line : '#FCD34D', width: 112 }} />
                        <select value={l.teacherId} onChange={(e) => setLesson(i, k, { teacherId: e.target.value })} className={selCls} style={{ borderColor: BRAND.line }}>
                          <option value="">Топ мұғалімі</option>
                          {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <button onClick={() => set(i, { lessons: g.lessons.filter((_, j) => j !== k) })} aria-label="Сабақты өшіру" className="p-1.5" style={{ color: BRAND.muted }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => set(i, { lessons: [...g.lessons, { days: [], start: '', end: '', subject: '', teacherId: '' }] })} className="mt-2 text-sm font-semibold" style={{ color: BRAND.blue }}>
                    + Сабақ қосу
                  </button>
                  <p className="mt-1 text-xs" style={{ color: BRAND.muted }}>Уақыты бос сабақ журналға қосылады, бірақ кестеге түспейді.</p>
                </div>

                {/* Оқушылар */}
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: BRAND.muted }}>Оқушылар және ата-аналары</div>
                  <div className="space-y-2">
                    {g.students.map((s, k) => (
                      <div key={k} className="grid grid-cols-[24px_1fr_auto] items-center gap-2 sm:grid-cols-[24px_1.3fr_1fr_1fr_1fr_auto]">
                        <span className="text-right text-xs tabular-nums" style={{ color: BRAND.muted }}>{k + 1}</span>
                        <input value={s.name} onChange={(e) => setStudent(i, k, { name: e.target.value })} placeholder="Аты-жөні" className={inputCls} style={{ borderColor: s.name.includes('?') ? '#F59E0B' : BRAND.line, background: s.name.includes('?') ? '#FFFBEB' : undefined }} />
                        <button onClick={() => set(i, { students: g.students.filter((_, j) => j !== k) })} aria-label="Оқушыны өшіру" className="p-1.5 sm:order-last" style={{ color: BRAND.muted }}>
                          <Trash2 size={15} />
                        </button>
                        <input value={s.parentName} onChange={(e) => setStudent(i, k, { parentName: e.target.value })} placeholder="Ата-анасы" className={`${inputCls} col-span-2 col-start-2 sm:col-span-1 sm:col-start-auto`} style={{ borderColor: BRAND.line }} />
                        <input value={s.parentPhone} onChange={(e) => setStudent(i, k, { parentPhone: e.target.value })} inputMode="tel" placeholder="WhatsApp: 8 7XX…" className={`${inputCls} col-span-2 col-start-2 sm:col-span-1 sm:col-start-auto`} style={{ borderColor: BRAND.line }} />
                        <input value={s.note} onChange={(e) => setStudent(i, k, { note: e.target.value })} placeholder="Ескерту (тек математика…)" className={`${inputCls} col-span-2 col-start-2 sm:col-span-1 sm:col-start-auto`} style={{ borderColor: BRAND.line }} />
                      </div>
                    ))}
                  </div>
                  <button onClick={() => set(i, { students: [...g.students, { name: '', parentName: '', parentPhone: '', note: '' }] })} className="mt-2 text-sm font-semibold" style={{ color: BRAND.blue }}>
                    + Оқушы қосу
                  </button>
                </div>

                {errs.length > 0 && (
                  <ul className="list-disc rounded-lg bg-amber-50 py-2 pl-8 pr-3 text-xs text-amber-800">
                    {errs.map((e) => <li key={e}>{e}</li>)}
                  </ul>
                )}
                <div className="flex flex-wrap gap-2">
                  <button disabled={errs.length > 0 || !!busy} onClick={() => send([g])} className={btnDark} style={{ background: BRAND.ink }}>
                    {busy === g.key ? 'Енгізілуде…' : isDone ? 'Қайта енгізу (жаңартулар)' : 'Осы топты енгізу'}
                  </button>
                  <button
                    onClick={() => confirm(`«${g.name}» тобын тізімнен алып тастау керек пе? (Платформадағы деректерге тимейді)`) && setGroups(groups.filter((_, j) => j !== i))}
                    className={btnLine}
                    style={{ borderColor: BRAND.line, color: BRAND.muted }}
                  >
                    Тізімнен алу
                  </button>
                </div>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
