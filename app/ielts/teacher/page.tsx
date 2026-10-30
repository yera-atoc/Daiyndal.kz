'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Builder, { inp, tcall } from '@/components/ielts/Builder'
import { UbtResult } from '@/components/ielts/Runner'
import { UBT_COMBOS, comboName } from '@/lib/ubt'
import { BLUE, INK, LINE, MUTED } from '@/components/ielts/Questions'
import { SECTION_NAME, SPEAKING_CRITERIA, WRITING_CRITERIA, speakingBand, writingBand, overallBand, toeflOverall, toeflSpeakingBand, toeflWritingBand, wordCount, type Attempt, type Exam, type IeltsTest, type Scores } from '@/lib/ielts'

type Data = {
  me: { admin: boolean; teacher: { id: string; name: string } | null }
  tests: (Pick<IeltsTest, 'id' | 'title' | 'exam' | 'variant' | 'mode' | 'published' | 'teacher_id'> & { created_at: string })[]
  students: { id: string; full_name: string; group_id: string | null; grade: string | null; status: string; ielts_pin: string | null }[]
  groups: { id: string; name: string }[]
  access: { test_id: string; student_id: string; attempts_allowed: number; combos?: [string, string][] | null }[]
  attempts: { id: string; test_id: string; student_id: string; status: string; scores: Scores; published: boolean; started_at: string; submitted_at: string | null }[]
}

const band = (b: number | null | undefined) => (typeof b === 'number' ? b.toFixed(1) : '—')
const STATUS: Record<string, [string, string]> = {
  in_progress: ['Тапсырып жатыр', '#F59E0B'],
  submitted: ['Тексеру керек', '#E5383B'],
  graded: ['Бағаланды', '#15803D'],
}

export default function IeltsTeacherPage() {
  const [data, setData] = useState<Data | null>(null)
  const [view, setView] = useState<{ k: 'list' } | { k: 'edit'; test: any } | { k: 'ubtmeta'; test: any } | { k: 'access'; id: string } | { k: 'grade'; id: string }>({ k: 'list' })
  const [err, setErr] = useState('')
  const [at, setAt] = useState<Date | null>(null)
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    const r = await fetch('/api/ielts/teacher', { cache: 'no-store' })
    setAt(new Date())
    if (r.status === 401) {
      location.href = '/teacher/login?next=/ielts/teacher'
      return
    }
    const j = await r.json()
    if (!r.ok) return setErr(j.error || 'Қате')
    setData(j)
  }, [])
  useEffect(() => {
    load()
  }, [load])
  // Тізімде тұрғанда нәтижелер өзі жаңарып тұрады (оқушылар тапсырып жатқанда)
  useEffect(() => {
    if (view.k !== 'list') return
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 30000)
    return () => clearInterval(t)
  }, [view.k, load])
  const say = (m: string) => {
    setNote(m)
    setTimeout(() => setNote(''), 4000)
  }

  const edit = async (id?: string, exam: Exam = 'ielts') => {
    if (!id) return setView({ k: 'edit', test: exam === 'toefl' ? { exam: 'toefl' } : null })
    const r = await fetch(`/api/ielts/teacher?test=${id}`, { cache: 'no-store' })
    if (!r.ok) return
    const t = await r.json()
    setView(t.content?.ubt ? { k: 'ubtmeta', test: t } : { k: 'edit', test: t })
  }

  if (err) return <Shell><div className="m-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{err}. Supabase-та <code>migration_ielts.sql</code> іске қосылғанын тексеріңіз.</div></Shell>
  if (!data) return <Shell><div className="p-10 text-center" style={{ color: MUTED }}>Жүктелуде…</div></Shell>

  if (view.k === 'ubtmeta') return <Shell data={data}><UbtMeta test={view.test} onClose={(s) => { setView({ k: 'list' }); if (s) load() }} /></Shell>
  if (view.k === 'edit') return <Shell data={data}><Builder initial={view.test} onClose={(s) => { setView({ k: 'list' }); if (s) load() }} /></Shell>
  if (view.k === 'access') return <Shell data={data}><Access data={data} testId={view.id} onBack={() => { setView({ k: 'list' }); load() }} reload={load} /></Shell>
  if (view.k === 'grade') return <Shell data={data}><Grade id={view.id} onBack={() => { setView({ k: 'list' }); load() }} /></Shell>

  const name = (id: string) => data.students.find((s) => s.id === id)?.full_name ?? '—'
  const toGrade = data.attempts.filter((a) => a.status === 'submitted')

  return (
    <Shell data={data}>
      {note && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm text-white shadow-lg" style={{ background: INK }} role="status">{note}</div>}
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Тесттер" value={data.tests.length} />
          <Stat label="Рұқсаты бар оқушылар" value={new Set(data.access.map((a) => a.student_id)).size} />
          <Stat label="Тапсырулар" value={data.attempts.length} />
          <Stat label="Тексеру керек" value={toGrade.length} accent={toGrade.length > 0} />
        </div>

        {toGrade.length > 0 && (
          <section className="mt-5 rounded-2xl border bg-white p-5" style={{ borderColor: LINE }}>
            <h2 className="font-bold">Writing / Speaking тексеру керек</h2>
            <div className="mt-2 divide-y" style={{ borderColor: LINE }}>
              {toGrade.map((a) => (
                <button key={a.id} onClick={() => setView({ k: 'grade', id: a.id })} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-slate-50">
                  <span className="font-medium">{name(a.student_id)}</span>
                  <span className="text-sm" style={{ color: MUTED }}>{data.tests.find((t) => t.id === a.test_id)?.title}</span>
                  <span className="ml-auto text-sm font-semibold" style={{ color: BLUE }}>Тексеру →</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold">Тесттер</h2>
          <button onClick={() => { load(); say('Нәтижелер жаңартылды') }} className="rounded-lg border bg-white px-3 py-1.5 text-sm font-semibold" style={{ borderColor: LINE }} title="Соңғы тапсыруларды жүктеу">↻ Жаңарту</button>
          {at && <span className="text-xs" style={{ color: MUTED }}>{at.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} · 30 сек сайын өзі жаңарады</span>}
          <button onClick={() => edit()} className="ml-auto rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{ background: INK }}>+ IELTS тест</button>
          <button onClick={() => edit(undefined, 'toefl')} className="ml-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{ background: BLUE }}>+ TOEFL тест</button>
        </div>
        {!data.tests.length && <div className="mt-3 rounded-2xl border bg-white p-8 text-center text-sm" style={{ borderColor: LINE, color: MUTED }}>Әлі тест жоқ. «+ IELTS тест» немесе «+ TOEFL тест» батырмасын басып, Listening аудиосы мен сұрақтарды енгізіңіз.</div>}
        <div className="mt-3 space-y-3">
          {data.tests.map((t) => {
            const acc = data.access.filter((a) => a.test_id === t.id)
            const att = data.attempts.filter((a) => a.test_id === t.id)
            return (
              <section key={t.id} className="rounded-2xl border bg-white p-5" style={{ borderColor: LINE }}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold">{t.title}</h3>
                  <span className="rounded px-2 py-0.5 text-xs font-semibold" style={t.published ? { background: '#DCFCE7', color: '#15803D' } : { background: '#F3F4F6', color: MUTED }}>{t.published ? 'Ашық' : 'Жабық'}</span>
                  <span className="text-xs" style={{ color: MUTED }}>{t.exam === 'ubt' ? 'ҰБТ · 12 комбинация' : t.exam === 'toefl' ? 'TOEFL iBT' : t.variant === 'academic' ? 'IELTS Academic' : 'IELTS General'} · {t.mode === 'exam' ? 'емтихан' : 'жаттығу'}</span>
                  <div className="ml-auto flex gap-2">
                    <button onClick={() => edit(t.id)} className="rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: LINE }}>Өңдеу</button>
                    <button onClick={() => setView({ k: 'access', id: t.id })} className="rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: LINE }}>Оқушылар · {acc.length}</button>
                    {att.some((a) => a.status !== 'in_progress') && (
                      <button
                        title="Кілт не сұрақ түзетілсе — барлық аяқталған тапсырудың баллын қазіргі кілтпен қайта есептеу"
                        onClick={async () => {
                          if (!confirm(`«${t.title}»: аяқталған тапсырулардың баллы қазіргі жауап кілтімен қайта есептелсін бе? Мұғалімнің Writing/Speaking бағасы өзгермейді.`)) return
                          const j: any = await tcall({ action: 'regrade', testId: t.id }).catch((e) => (alert(e.message), null))
                          if (!j) return
                          await load()
                          say(j?.changed ? `Қайта есептелді: ${j.changed} нәтиже өзгерді (барлығы ${j.total})` : `Қайта есептелді: барлығы ${j?.total ?? 0}, өзгеріс жоқ`)
                        }}
                        className="rounded-lg border px-3 py-1.5 text-sm"
                        style={{ borderColor: LINE }}
                      >
                        Қайта есептеу
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        if (!confirm(`«${t.title}» тестін және оның барлық нәтижелерін өшіру керек пе?`)) return
                        await tcall({ action: 'delete-test', id: t.id })
                        load()
                      }}
                      className="rounded-lg px-2 py-1.5 text-sm text-red-600"
                    >
                      Өшіру
                    </button>
                  </div>
                </div>
                {att.length > 0 && t.exam === 'ubt' && (
                  <table className="mt-3 w-full text-sm">
                    <thead><tr className="text-left text-xs" style={{ color: MUTED }}><th className="py-1 font-medium">Оқушы</th><th className="font-medium">Комбинация</th><th className="font-medium">Балл</th><th className="font-medium">Күйі</th><th /></tr></thead>
                    <tbody>
                      {att.map((a) => (
                        <tr key={a.id} className="border-t" style={{ borderColor: LINE }}>
                          <td className="py-2 font-medium">{name(a.student_id)}</td>
                          <td className="text-xs">{comboName(a.scores?.ubt?.combo)}</td>
                          <td className="font-bold">{a.scores?.ubt ? `${a.scores.ubt.total} / ${a.scores.ubt.max}` : '—'}</td>
                          <td><span className="text-xs font-semibold" style={{ color: STATUS[a.status]?.[1] }}>{a.status === 'in_progress' ? STATUS.in_progress[0] : 'Аяқталды'}{a.published ? ' · жауаптар ашық' : ''}</span></td>
                          <td className="whitespace-nowrap text-right">
                            {a.status === 'in_progress' && <FinishBtn id={a.id} who={name(a.student_id)} done={async () => { await load(); say('Тапсыру аяқталып, бағаланды') }} />}
                            <button onClick={() => setView({ k: 'grade', id: a.id })} className="text-sm font-semibold" style={{ color: BLUE }}>Ашу</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {att.length > 0 && t.exam !== 'ubt' && (
                  <table className="mt-3 w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs" style={{ color: MUTED }}>
                        <th className="py-1 font-medium">Оқушы</th><th className="font-medium">L</th><th className="font-medium">R</th><th className="font-medium">W</th><th className="font-medium">S</th><th className="font-medium">Overall</th><th className="font-medium">Күйі</th><th />
                      </tr>
                    </thead>
                    <tbody>
                      {att.map((a) => (
                        <tr key={a.id} className="border-t" style={{ borderColor: LINE }}>
                          <td className="py-2 font-medium">{name(a.student_id)}</td>
                          <td>{band(a.scores?.listening?.band)}</td>
                          <td>{band(a.scores?.reading?.band)}</td>
                          <td>{band(a.scores?.writing?.band)}</td>
                          <td>{band(a.scores?.speaking?.band)}</td>
                          <td className="font-bold">{band(a.scores?.overall)}</td>
                          <td><span className="text-xs font-semibold" style={{ color: STATUS[a.status]?.[1] }}>{STATUS[a.status]?.[0]}{a.published ? ' · жарияланды' : ''}</span></td>
                          <td className="whitespace-nowrap text-right">
                            {a.status === 'in_progress' && <FinishBtn id={a.id} who={name(a.student_id)} done={async () => { await load(); say('Тапсыру аяқталды') }} />}
                            <button onClick={() => setView({ k: 'grade', id: a.id })} className="text-sm font-semibold" style={{ color: BLUE }}>Ашу</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </Shell>
  )
}

function FinishBtn({ id, who, done }: { id: string; who: string; done: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      disabled={busy}
      title="Оқушы бетті жауып кетсе: осы уақытқа дейінгі жауаптарымен аяқтап, бағалау"
      onClick={async () => {
        if (!confirm(`${who}: тапсыруды қазір аяқтау керек пе? Берген жауаптарымен бағаланады, оқушы жалғастыра алмайды.`)) return
        setBusy(true)
        const ok = await tcall({ action: 'finish-attempt', attemptId: id }).catch((e) => (alert(e.message), null))
        if (ok) await done()
        setBusy(false)
      }}
      className="mr-3 text-sm font-semibold disabled:opacity-50"
      style={{ color: '#B45309' }}
    >
      {busy ? '…' : 'Аяқтау'}
    </button>
  )
}

function Shell({ children, data }: { children: React.ReactNode; data?: Data }) {
  return (
    <main className="min-h-screen" style={{ background: '#F5F7FB', color: INK }}>
      <header className="border-b bg-white" style={{ borderColor: LINE }}>
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <img src="/beles-logo.png" alt="Beles" className="h-8 w-auto" />
          <div className="border-l pl-3 text-sm font-bold" style={{ borderColor: LINE }}>Mock тесттер · мұғалім кабинеті</div>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {data && <span style={{ color: MUTED }}>{data.me.teacher?.name ?? (data.me.admin ? 'Әкімші' : '')}</span>}
            <a href="/ielts/teacher/subjects" className="font-semibold" style={{ color: BLUE }}>Пән тесттері</a>
            <a href="/ielts" target="_blank" className="font-semibold" style={{ color: BLUE }}>Оқушы беті ↗</a>
            <a href={data?.me.teacher ? '/teacher' : '/admin'} className="rounded-lg border px-3 py-1.5" style={{ borderColor: LINE }}>← Кабинет</a>
          </div>
        </div>
      </header>
      {children}
    </main>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-2xl border bg-white p-4" style={{ borderColor: LINE }}>
      <div className="text-xs" style={{ color: MUTED }}>{label}</div>
      <div className="mt-1 text-3xl font-bold" style={{ color: accent ? '#E5383B' : INK }}>{value}</div>
    </div>
  )
}

// ── Рұқсат беру ──────────────────────────────────────────

// ҰБТ комбинациясын шектеу: '' — барлығы, 'phys' — физикасы барлар, 'a|b' — бір комбинация
const COMBO_OPTS: [string, string][] = [
  ['', 'Барлық комбинация'],
  ['phys', 'Физикасы барлар (Мат–Физ, Хим–Физ)'],
  ...UBT_COMBOS.map((c) => [c.join('|'), 'Тек ' + comboName(c)] as [string, string]),
]
const PHYS: [string, string][] = [['math', 'physics'], ['chemistry', 'physics']]
function comboList(k: string): [string, string][] | null {
  if (!k) return null
  if (k === 'phys') return PHYS
  const [a, b] = k.split('|')
  return [[a, b]]
}
function comboKey(c: [string, string][] | null | undefined): string {
  if (!c?.length) return ''
  if (c.length === 2 && PHYS.every((p) => c.some((x) => x[0] === p[0] && x[1] === p[1]))) return 'phys'
  return c.length === 1 ? c[0].join('|') : ''
}

function Access({ data, testId, onBack, reload }: { data: Data; testId: string; onBack: () => void; reload: () => Promise<void> }) {
  const test = data.tests.find((t) => t.id === testId)!
  const current = data.access.filter((a) => a.test_id === testId)
  const [sel, setSel] = useState<Set<string>>(() => new Set(current.map((a) => a.student_id)))
  const [tries, setTries] = useState(current[0]?.attempts_allowed ?? 1)
  // ҰБТ: оқушыға рұқсат етілген комбинациялар ('' — барлығы)
  const ubt = test.exam === 'ubt'
  const [combo, setCombo] = useState<Record<string, string>>(() => Object.fromEntries(current.map((a) => [a.student_id, comboKey(a.combos)])))
  const [newCombo, setNewCombo] = useState('')
  const [group, setGroup] = useState('')
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const shown = useMemo(
    () => data.students.filter((s) => (!group || s.group_id === group) && s.full_name.toLowerCase().includes(q.toLowerCase())),
    [data.students, group, q]
  )
  const gname = (id: string | null) => data.groups.find((g) => g.id === id)?.name ?? ''
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const chosen = data.students.filter((s) => sel.has(s.id))

  const save = async () => {
    setBusy(true)
    setMsg('')
    try {
      const ids = Array.from(sel)
      const combos = ubt ? Object.fromEntries(ids.map((id) => [id, comboList(combo[id] ?? newCombo)])) : undefined
      await tcall({ action: 'set-access', testId, studentIds: ids, attemptsAllowed: tries, combos })
      await reload()
      setMsg('Сақталды ✓ PIN-кодтар төмендегі тізімде')
    } catch (e: any) {
      setMsg(e.message)
    } finally {
      setBusy(false)
    }
  }
  const copy = () => {
    const txt = `IELTS mock · ${test.title}\n${location.origin}/ielts\n\n` + chosen.map((s) => `${s.full_name} — PIN ${s.ielts_pin ?? '(сақтағаннан кейін)'}`).join('\n')
    navigator.clipboard.writeText(txt).then(() => setMsg('Тізім көшірілді ✓ WhatsApp-қа қоюға болады'))
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <button onClick={onBack} className="text-sm font-semibold" style={{ color: BLUE }}>← Тесттер</button>
      <h1 className="mt-2 text-xl font-bold">{test.title} · оқушыларға рұқсат</h1>
      {!test.published && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Тест әлі жабық. Оқушылар көруі үшін «Өңдеу» → «Оқушыларға ашық» белгісін қойыңыз.</p>}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border bg-white p-4" style={{ borderColor: LINE }}>
          <div className="flex gap-2">
            <select value={group} onChange={(e) => setGroup(e.target.value)} className={inp}>
              <option value="">Барлық топтар</option>
              {data.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Іздеу" className={inp} />
          </div>
          <div className="mt-2 flex gap-3 text-xs">
            <button onClick={() => setSel((s) => new Set([...Array.from(s), ...shown.map((x) => x.id)]))} style={{ color: BLUE }}>Көрінгендердің бәрін таңдау</button>
            <button onClick={() => setSel((s) => { const n = new Set(s); shown.forEach((x) => n.delete(x.id)); return n })} style={{ color: MUTED }}>Алып тастау</button>
          </div>
          <div className="mt-2 max-h-[55vh] overflow-y-auto">
            {shown.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50">
                <input type="checkbox" checked={sel.has(s.id)} onChange={() => toggle(s.id)} className="accent-[#2B6BF3]" />
                <span className="text-sm">{s.full_name}</span>
                <span className="ml-auto text-xs" style={{ color: MUTED }}>{gname(s.group_id)}</span>
              </label>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border bg-white p-4" style={{ borderColor: LINE }}>
          <div className="flex items-end gap-3">
            <label className="text-xs font-semibold" style={{ color: MUTED }}>
              Әр оқушыға тапсыру саны
              <input type="number" min={1} max={20} value={tries} onChange={(e) => setTries(Number(e.target.value))} className={inp + ' mt-1 w-24'} />
            </label>
            {ubt && (
              <label className="text-xs font-semibold" style={{ color: MUTED }}>
                Жаңа қосылғандарға
                <select value={newCombo} onChange={(e) => setNewCombo(e.target.value)} className={inp + ' mt-1'}>
                  {COMBO_OPTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
            )}
            <button disabled={busy} onClick={save} className="ml-auto rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: INK }}>{busy ? '…' : `Сақтау · ${sel.size}`}</button>
          </div>
          {msg && <p className="mt-2 text-sm" style={{ color: msg.includes('✓') ? '#15803D' : '#B91C1C' }}>{msg}</p>}
          <div className="mt-4 flex items-center">
            <h3 className="text-sm font-bold">Таңдалғандар және PIN</h3>
            <button onClick={copy} className="ml-auto text-xs font-semibold" style={{ color: BLUE }}>Тізімді көшіру</button>
          </div>
          <div className="mt-2 max-h-[45vh] divide-y overflow-y-auto">
            {chosen.map((s) => (
              <div key={s.id} className="flex items-center gap-2 py-1.5 text-sm">
                <span className="min-w-0 flex-1 truncate">{s.full_name}</span>
                {ubt && (
                  <select
                    value={combo[s.id] ?? newCombo}
                    onChange={(e) => setCombo((c) => ({ ...c, [s.id]: e.target.value }))}
                    className="max-w-[11rem] rounded-md border px-1.5 py-1 text-xs"
                    style={{ borderColor: LINE }}
                    title="Бейіндік пәндер комбинациясы"
                  >
                    {COMBO_OPTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                )}
                <span className="font-mono font-bold tracking-widest">{s.ielts_pin ?? '····'}</span>
                <button
                  title="Жаңа PIN"
                  onClick={async () => {
                    if (!confirm(`${s.full_name}: жаңа PIN жасау керек пе? Ескісі жұмыс істемейді.`)) return
                    await tcall({ action: 'reset-pin', studentId: s.id })
                    await reload()
                  }}
                  className="text-xs"
                  style={{ color: MUTED }}
                >
                  ↻
                </button>
              </div>
            ))}
            {!chosen.length && <p className="py-4 text-center text-sm" style={{ color: MUTED }}>Оқушы таңдалмаған</p>}
          </div>
        </section>
      </div>
    </div>
  )
}

// ── Тексеру ──────────────────────────────────────────────

function Grade({ id, onBack }: { id: string; onBack: () => void }) {
  const [d, setD] = useState<{ attempt: Attempt; test: IeltsTest; student: { full_name: string } } | null>(null)
  const [w1, setW1] = useState<Record<string, string>>({})
  const [w2, setW2] = useState<Record<string, string>>({})
  const [sp, setSp] = useState<Record<string, string>>({})
  const [tv, setTv] = useState<Record<string, string>>({}) // TOEFL: email, discussion, repeat, interview (1–6)
  const [fb, setFb] = useState({ writing: '', speaking: '', general: '' })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch(`/api/ielts/teacher?attempt=${id}`, { cache: 'no-store' }).then(async (r) => {
      const j = await r.json()
      if (!r.ok) return setMsg(j.error)
      setD(j)
      const s = (o: any) => Object.fromEntries(Object.entries(o ?? {}).map(([k, v]) => [k, v === null || v === undefined ? '' : String(v)]))
      setW1(s(j.attempt.scores?.writing?.task1))
      setW2(s(j.attempt.scores?.writing?.task2))
      setSp(s(j.attempt.scores?.speaking?.criteria))
      const sc = j.attempt.scores ?? {}
      setTv(s({ email: sc.writing?.email, discussion: sc.writing?.discussion, repeat: sc.speaking?.repeat, interview: sc.speaking?.interview }))
      setFb({ writing: '', speaking: '', general: '', ...j.attempt.feedback })
    })
  }, [id])

  if (!d) return <div className="p-10 text-center" style={{ color: MUTED }}>{msg || 'Жүктелуде…'}</div>
  if (d.test.content.ubt) {
    const a0 = d.attempt
    const pub = async (publish: boolean) => {
      setBusy(true)
      try {
        await tcall({ action: 'grade', attemptId: a0.id, feedback: fb, publish })
        setD({ ...d, attempt: { ...a0, published: publish } })
        setMsg(publish ? 'Жауаптар оқушыға ашылды ✓' : 'Сақталды ✓')
      } catch (e: any) {
        setMsg(e.message)
      } finally {
        setBusy(false)
      }
    }
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <button onClick={onBack} className="text-sm font-semibold" style={{ color: BLUE }}>← Тесттер</button>
        <h1 className="mt-2 text-xl font-bold">{d.student?.full_name} · {d.test.title}</h1>
        {a0.scores?.ubt ? <UbtResult s={a0.scores.ubt} /> : <p className="mt-4" style={{ color: MUTED }}>Оқушы әлі тапсырып жатыр.</p>}
        <textarea value={fb.general} onChange={(e) => setFb({ ...fb, general: e.target.value })} rows={3} placeholder="Оқушыға пікір (міндетті емес)" className={inp + ' mt-2'} />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm" style={{ color: msg.includes('✓') ? '#15803D' : MUTED }}>{msg || (a0.published ? 'Дұрыс жауаптар оқушыға көрініп тұр' : 'Оқушы балын көреді, дұрыс жауаптар жабық')}</span>
          <button disabled={busy} onClick={() => pub(false)} className="ml-auto rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold" style={{ borderColor: LINE }}>{a0.published ? 'Жауаптарды жабу' : 'Сақтау'}</button>
          <button disabled={busy} onClick={() => pub(true)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{ background: BLUE }}>Дұрыс жауаптарды ашу</button>
          <button
            onClick={async () => { if (!confirm('Тапсыруды өшіру керек пе? Оқушы қайта тапсыра алады.')) return; await tcall({ action: 'delete-attempt', attemptId: a0.id }); onBack() }}
            className="text-sm text-red-600"
          >
            Өшіру
          </button>
        </div>
      </div>
    )
  }
  const a = d.attempt
  const c = d.test.content
  const order = a.state.order
  const toNum = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === '' ? null : Number(v)]))
  const toefl = d.test.exam === 'toefl'
  const tn = toNum(tv)
  const wb = toefl ? toeflWritingBand({ build: a.scores?.writing?.build, email: tn.email, discussion: tn.discussion }) : writingBand({ task1: toNum(w1), task2: toNum(w2) })
  const sb = toefl ? toeflSpeakingBand({ repeat: tn.repeat, interview: tn.interview }) : speakingBand({ criteria: toNum(sp) })
  const preview: Scores = { ...a.scores, writing: { band: wb }, speaking: { band: sb } }
  const ov = toefl ? toeflOverall(preview, order) : overallBand(preview, order)

  const save = async (publish: boolean) => {
    setBusy(true)
    setMsg('')
    try {
      await tcall({
        action: 'grade',
        attemptId: a.id,
        writing: toefl ? { email: tv.email, discussion: tv.discussion } : { task1: w1, task2: w2 },
        speaking: toefl ? { repeat: tv.repeat, interview: tv.interview } : { criteria: sp },
        feedback: fb,
        publish,
      })
      setMsg(publish ? 'Жарияланды ✓ Оқушы нәтижесін көреді' : 'Сақталды ✓')
      setD({ ...d, attempt: { ...a, published: publish } })
    } catch (e: any) {
      setMsg(e.message)
    } finally {
      setBusy(false)
    }
  }

  const speakingKeys = (c.speaking?.parts ?? []).flatMap((p, pi) =>
    !toefl && pi === 1 ? [{ key: 'p2q0', q: p.cueCard || p.questions[0] || 'Cue card', part: p.title }] : p.questions.map((q, qi) => ({ key: `p${pi + 1}q${qi}`, q, part: p.title }))
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <button onClick={onBack} className="text-sm font-semibold" style={{ color: BLUE }}>← Тесттер</button>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">{d.student?.full_name}</h1>
        <span className="text-sm" style={{ color: MUTED }}>· {d.test.title} · {a.submitted_at ? new Date(a.submitted_at).toLocaleString('kk-KZ') : 'аяқталмаған'}</span>
        <button
          onClick={async () => {
            if (!confirm('Бұл тапсыруды өшіру керек пе? Оқушы тестті қайта бастай алады.')) return
            await tcall({ action: 'delete-attempt', attemptId: a.id })
            onBack()
          }}
          className="ml-auto text-sm text-red-600"
        >
          Тапсыруды өшіру
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {order.map((s) => (
          <div key={s} className="rounded-xl border bg-white p-3" style={{ borderColor: LINE }}>
            <div className="text-xs font-semibold uppercase" style={{ color: MUTED }}>{SECTION_NAME[s]}</div>
            <div className="text-2xl font-bold">{band(s === 'writing' ? wb : s === 'speaking' ? sb : a.scores?.[s]?.band)}</div>
            {(s === 'listening' || s === 'reading') && a.scores?.[s] && <div className="text-xs" style={{ color: MUTED }}>{a.scores[s]!.raw}/{a.scores[s]!.of}</div>}
          </div>
        ))}
        <div className="rounded-xl p-3 text-white" style={{ background: INK }}>
          <div className="text-xs font-semibold uppercase opacity-70">Overall</div>
          <div className="text-2xl font-bold">{band(ov)}</div>
        </div>
      </div>

      {order.includes('writing') && (
        <section className="mt-5 rounded-2xl border bg-white p-5" style={{ borderColor: LINE }}>
          <h2 className="font-bold">Writing</h2>
          {toefl && a.scores?.writing?.build && (
            <p className="mt-2 text-sm">Build a Sentence (автоматты): <b>{a.scores.writing.build.raw}/{a.scores.writing.build.of}</b> · band <b>{band(a.scores.writing.build.band)}</b></p>
          )}
          {(['task1', 'task2'] as const).map((k) => {
            const txt = a.writing?.[k] ?? ''
            const vals = k === 'task1' ? w1 : w2
            const setVals = k === 'task1' ? setW1 : setW2
            return (
              <div key={k} className="mt-4 grid gap-4 md:grid-cols-[1fr_260px]">
                <div>
                  <div className="text-sm font-semibold">{toefl ? (k === 'task1' ? 'Write an Email' : 'Academic Discussion') : k === 'task1' ? 'Task 1' : 'Task 2'} · {wordCount(txt)} сөз {wordCount(txt) < (c.writing?.[k]?.minWords ?? 0) && <span className="text-amber-700">(аз)</span>}</div>
                  <details className="mt-1 text-xs" style={{ color: MUTED }}><summary className="cursor-pointer">Тапсырма</summary><p className="mt-1 whitespace-pre-wrap">{c.writing?.[k]?.prompt}</p></details>
                  <div className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border p-3 text-[15px] leading-7" style={{ borderColor: LINE, background: '#FAFBFD' }}>{txt || <i style={{ color: MUTED }}>Жауап жоқ</i>}</div>
                </div>
                {toefl ? (
                  <BandInputs rows={[[k === 'task1' ? 'email' : 'discussion', 'Band (1–6): мазмұн, ұйымдастыру, тіл']]} vals={tv} set={setTv} scale={BANDS6} />
                ) : (
                  <BandInputs rows={WRITING_CRITERIA} vals={vals} set={setVals} />
                )}
              </div>
            )
          })}
          <textarea value={fb.writing} onChange={(e) => setFb({ ...fb, writing: e.target.value })} rows={3} placeholder="Writing бойынша пікір: не жақсы, нені түзету керек" className={inp + ' mt-4'} />
        </section>
      )}

      {order.includes('speaking') && (
        <section className="mt-5 rounded-2xl border bg-white p-5" style={{ borderColor: LINE }}>
          <h2 className="font-bold">Speaking</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-[1fr_260px]">
            <div className="space-y-3">
              {speakingKeys.map((s) => (
                <div key={s.key} className="rounded-lg border p-3" style={{ borderColor: LINE }}>
                  <div className="text-xs" style={{ color: MUTED }}>{s.part}</div>
                  <div className="whitespace-pre-wrap text-sm font-medium">{s.q}</div>
                  {a.speaking?.[s.key] ? <audio src={a.speaking[s.key]} controls preload="none" className="mt-2 w-full" /> : <div className="mt-1 text-xs text-amber-700">Жазба жоқ</div>}
                </div>
              ))}
            </div>
            {toefl ? (
              <BandInputs rows={[['repeat', 'Listen and Repeat (1–6): дәлдік, айтылым'], ['interview', 'Take an Interview (1–6): еркіндік, тіл, мазмұн']]} vals={tv} set={setTv} scale={BANDS6} />
            ) : (
              <BandInputs rows={SPEAKING_CRITERIA} vals={sp} set={setSp} />
            )}
          </div>
          <textarea value={fb.speaking} onChange={(e) => setFb({ ...fb, speaking: e.target.value })} rows={3} placeholder="Speaking бойынша пікір" className={inp + ' mt-4'} />
        </section>
      )}

      <section className="mt-5 rounded-2xl border bg-white p-5" style={{ borderColor: LINE }}>
        <h2 className="font-bold">Жалпы пікір</h2>
        <textarea value={fb.general} onChange={(e) => setFb({ ...fb, general: e.target.value })} rows={3} placeholder="Келесі қадамдар, ұсыныстар" className={inp + ' mt-2'} />
      </section>

      <div className="sticky bottom-0 mt-6 flex flex-wrap items-center gap-3 border-t bg-[#F5F7FB] py-3" style={{ borderColor: LINE }}>
        <span className="text-sm" style={{ color: msg.includes('✓') ? '#15803D' : '#B91C1C' }}>{msg || (a.published ? 'Нәтиже оқушыға көрініп тұр' : 'Нәтиже әлі жарияланбаған')}</span>
        <button disabled={busy} onClick={() => save(false)} className="ml-auto rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold" style={{ borderColor: LINE }}>{a.published ? 'Жасыру' : 'Сақтау'}</button>
        <button disabled={busy} onClick={() => save(true)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{ background: BLUE }}>Сақтап, оқушыға жариялау</button>
      </div>
    </div>
  )
}

const BANDS = ['', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5.5', '5', '4.5', '4', '3.5', '3', '2.5', '2', '1', '0']
const BANDS6 = ['', '6', '5.5', '5', '4.5', '4', '3.5', '3', '2.5', '2', '1.5', '1']
function BandInputs({ rows, vals, set, scale = BANDS }: { rows: [string, string][]; vals: Record<string, string>; set: (v: Record<string, string>) => void; scale?: string[] }) {
  return (
    <div className="space-y-2 self-start rounded-xl border p-3" style={{ borderColor: LINE, background: '#FAFBFD' }}>
      {rows.map(([k, label]) => (
        <label key={k} className="flex items-center gap-2 text-xs">
          <span className="flex-1">{label}</span>
          <select value={vals[k] ?? ''} onChange={(e) => set({ ...vals, [k]: e.target.value })} className="w-20 rounded border bg-white px-2 py-1.5 text-sm font-bold" style={{ borderColor: LINE }}>
            {scale.map((b) => <option key={b} value={b}>{b || '—'}</option>)}
          </select>
        </label>
      ))}
    </div>
  )
}

function UbtMeta({ test, onClose }: { test: any; onClose: (saved: boolean) => void }) {
  const [t, setT] = useState({ title: test.title, mode: test.mode, published: test.published })
  const [msg, setMsg] = useState('')
  const u = test.content.ubt
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <button onClick={() => onClose(false)} className="text-sm font-semibold" style={{ color: BLUE }}>← Тесттер</button>
      <div className="mt-3 space-y-3 rounded-2xl border bg-white p-5" style={{ borderColor: LINE }}>
        <input value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })} className={inp + ' font-semibold'} />
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={t.published} onChange={(e) => setT({ ...t, published: e.target.checked })} /> Оқушыларға ашық</label>
        <p className="text-sm" style={{ color: MUTED }}>ҰБТ тестінің сұрақтары SQL арқылы жүктелген. Мұнда атауы мен ашықтығын өзгертуге болады.</p>
        <div className="text-sm">
          {[...u.compulsory, ...u.profile].map((s: any) => <div key={s.key} className="flex justify-between border-t py-1.5" style={{ borderColor: LINE }}><span>{s.name}</span><span style={{ color: MUTED }}>{s.questions.length} тапсырма</span></div>)}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-red-600">{msg}</span>
          <button
            onClick={async () => { try { await tcall({ action: 'save-test', test: { id: test.id, exam: 'ubt', ...t } }); onClose(true) } catch (e: any) { setMsg(e.message) } }}
            className="ml-auto rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
            style={{ background: INK }}
          >
            Сақтау
          </button>
        </div>
      </div>
    </div>
  )
}
