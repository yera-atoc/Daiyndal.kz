'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  BarChart3,
  FileQuestion,
  KeyRound,
  Layers,
  LayoutDashboard,
  Plus,
  Settings2,
  Users,
} from 'lucide-react'
import { ranking, type Exam, type Group } from '@/lib/bilimTest'
import Dashboard from '@/components/bilim/admin/Dashboard'
import StudentProfile from '@/components/bilim/admin/StudentProfile'
import { GroupModal, KeyEditor, QuestionsEditor, Results, Settings, StudentsTab } from '@/components/bilim/admin/Editors'
import { BRAND, post, type Resp } from '@/components/bilim/admin/shared'

type View = 'overview' | 'results' | 'key' | 'questions' | 'settings' | 'students' | 'groups'

const NAV: { id: View; label: string; icon: typeof LayoutDashboard; needsExam?: boolean }[] = [
  { id: 'overview', label: 'Шолу', icon: LayoutDashboard, needsExam: true },
  { id: 'results', label: 'Нәтижелер', icon: BarChart3, needsExam: true },
  { id: 'key', label: 'Жауап кілті', icon: KeyRound, needsExam: true },
  { id: 'questions', label: 'Сұрақтар', icon: FileQuestion, needsExam: true },
  { id: 'settings', label: 'Сынақты басқару', icon: Settings2, needsExam: true },
  { id: 'students', label: 'Оқушылар', icon: Users },
  { id: 'groups', label: 'Топтар', icon: Layers },
]

function thisMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function Admin() {
  const sp = useSearchParams()
  const router = useRouter()
  const groupId = sp.get('group') ?? ''
  const examId = sp.get('exam') ?? ''
  const view = (sp.get('view') as View) || 'overview'
  const [data, setData] = useState<Resp | null>(null)
  const [draft, setDraft] = useState<Exam | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [newMonth, setNewMonth] = useState(thisMonth())
  const [profile, setProfile] = useState<string | null>(null)
  const [groupModal, setGroupModal] = useState<Group | 'new' | null>(null)

  const load = useCallback(async () => {
    const q = new URLSearchParams()
    if (groupId) q.set('group', groupId)
    if (examId) q.set('exam', examId)
    const r = await fetch(`/api/bilim-test/admin?${q}`, { cache: 'no-store' })
    const j: Resp = await r.json()
    setData(j)
    setDraft(j.exam ? structuredClone(j.exam) : null)
  }, [groupId, examId])

  useEffect(() => {
    load()
  }, [load])

  const nav = (patch: Partial<Record<'group' | 'exam' | 'view', string>>) => {
    const q = new URLSearchParams(sp.toString())
    for (const [k, v] of Object.entries(patch)) v ? q.set(k, v) : q.delete(k)
    if (patch.group) q.delete('exam')
    router.push(`/admin/bilim-test?${q}`)
  }

  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(''), 2500)
  }

  const save = async (e: Exam, note = 'Сақталды') => {
    setBusy(true)
    try {
      await post({ action: 'save', exam: e })
      await load()
      flash(note)
    } catch (err: any) {
      flash(err.message)
    } finally {
      setBusy(false)
    }
  }

  const rk = useMemo(() => {
    if (!data?.exam) return null
    const n = new Set(data.students.map((s) => s.full_name))
    return ranking(data.exam, data.submissions.filter((s) => n.has(s.student_name)))
  }, [data])

  if (!data) return <p className="p-10 text-center" style={{ color: BRAND.muted }}>Жүктелуде…</p>
  if (data.error) return <p className="p-10 text-center" style={{ color: BRAND.red }}>{data.error}</p>

  const group = data.group
  const exam = data.exam
  const dirty = !!exam && !!draft && JSON.stringify(exam) !== JSON.stringify(draft)
  const current = !exam && NAV.find((n) => n.id === view)?.needsExam ? 'students' : view

  const createMonth = async () => {
    if (!group) return
    setBusy(true)
    try {
      const j = await post({ action: 'create', group: group.id, month: newMonth })
      nav({ exam: j.id, view: 'settings' })
    } catch (err: any) {
      flash(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[232px_1fr]" style={{ background: BRAND.paper, color: BRAND.text }}>
      {/* Бүйір мәзір */}
      <aside className="border-b bg-white md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r" style={{ borderColor: BRAND.line }}>
        <div className="flex items-center justify-between px-5 py-4 md:block">
          <a href="/admin" aria-label="Админ панель">
            <img src="/beles-logo.png" alt="Beles education" className="h-9 w-auto" />
          </a>
          <div className="text-xs md:mt-3" style={{ color: BRAND.muted }}>Білім тексеру</div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:space-y-0.5 md:px-3" aria-label="Бөлімдер">
          {NAV.map(({ id, label, icon: Icon, needsExam }) => {
            const disabled = needsExam && !exam
            const active = current === id
            return (
              <button
                key={id}
                disabled={disabled}
                onClick={() => nav({ view: id })}
                className="relative flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors disabled:opacity-35 md:w-full"
                style={{ background: active ? BRAND.ink : 'transparent', color: active ? '#fff' : BRAND.text }}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={17} strokeWidth={2} />
                {label}
                {id === 'settings' && exam && dirty && <span className="ml-auto h-2 w-2 rounded-full" style={{ background: BRAND.red }} />}
              </button>
            )
          })}
        </nav>
        <div className="hidden px-5 pt-6 md:block">
          {/* Логотиптегі штрих — бөлгіш */}
          <div className="flex h-6 items-stretch gap-[3px]" aria-hidden>
            {[3, 1, 2, 1, 3, 1, 1, 2].map((w, i) => <span key={i} style={{ width: w * 2, background: i % 3 === 2 ? BRAND.blue : BRAND.ink }} />)}
          </div>
          <a href="/admin" className="mt-4 block text-sm" style={{ color: BRAND.muted }}>← Негізгі админ</a>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Жоғарғы жолақ: топ және ай */}
        <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur" style={{ borderColor: BRAND.line }}>
          <div className="flex flex-wrap items-center gap-2 px-5 py-3 lg:px-8">
            <div className="flex gap-1 overflow-x-auto">
              {data.groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => nav({ group: g.id })}
                  className="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium"
                  style={group?.id === g.id ? { background: BRAND.blue, color: '#fff' } : { color: BRAND.text, border: `1px solid ${BRAND.line}` }}
                >
                  {g.name}
                </button>
              ))}
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {data.exams.length > 0 && (
                <select value={exam?.id ?? ''} onChange={(e) => nav({ exam: e.target.value })} className="rounded-lg border bg-white px-3 py-1.5 text-sm" style={{ borderColor: BRAND.line }} aria-label="Ай">
                  {data.exams.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
              )}
              <input type="month" value={newMonth} onChange={(e) => setNewMonth(e.target.value)} className="rounded-lg border bg-white px-2 py-1.5 text-sm" style={{ borderColor: BRAND.line }} aria-label="Жаңа ай" />
              <button disabled={busy || !group} onClick={createMonth} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-white" style={{ background: BRAND.ink }}>
                <Plus size={15} /> Ай ашу
              </button>
            </div>
          </div>
        </header>

        <main className="px-5 py-6 lg:px-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight md:text-[28px]">
                {current === 'groups' ? 'Топтар' : current === 'students' ? 'Оқушылар' : exam ? `${exam.title}` : group?.name}
              </h1>
              <p className="mt-1 text-sm" style={{ color: BRAND.muted }}>
                {current === 'groups'
                  ? `${data.groups.length} топ`
                  : `${group?.name ?? ''} · ${data.students.length} оқушы${exam ? ` · ${NAV.find((n) => n.id === current)?.label}` : ''}`}
              </p>
            </div>
            {exam && (current === 'overview' || current === 'results') && (
              <div className="flex gap-2">
                <span
                  className="rounded-full px-3 py-1.5 text-xs font-semibold"
                  style={exam.published ? { background: '#DCFCE7', color: '#15803D' } : { background: '#EEF1F6', color: BRAND.muted }}
                >
                  {exam.published ? 'Оқушыларға жарияланған' : 'Жарияланбаған'}
                </span>
                <a href={`/admin/bilim-test/report?group=${exam.group_id}&exam=${exam.id}`} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white" style={{ background: BRAND.blue }}>
                  Барлығының PDF есебі
                </a>
              </div>
            )}
          </div>

          {!group && <Empty text="Әзірге топ жоқ." action="Топ қосу" onAction={() => setGroupModal('new')} />}

          {group && !exam && current !== 'students' && current !== 'groups' && (
            <Empty text="Бұл топта әзірге сынақ жоқ. Жоғарыдан айды таңдап, «Ай ашу» басыңыз." />
          )}

          {group && exam && draft && rk && (
            <>
              {current === 'overview' && <Dashboard data={data} exam={exam} onOpenStudent={setProfile} />}
              {current === 'results' && <Results data={data} exam={exam} onOpen={setProfile} />}
              {current === 'key' && <KeyEditor draft={draft} setDraft={setDraft} />}
              {current === 'questions' && <QuestionsEditor draft={draft} setDraft={setDraft} flash={flash} />}
              {current === 'settings' && (
                <Settings exam={exam} draft={draft} setDraft={setDraft} hasSubs={data.submissions.length > 0} onInstant={(e, note) => save(e, note)} busy={busy} />
              )}
            </>
          )}

          {group && current === 'students' && <StudentsTab group={group} students={data.students} reload={load} flash={flash} />}

          {current === 'groups' && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.groups.map((g) => (
                <div key={g.id} className="rounded-2xl border bg-white p-5" style={{ borderColor: g.id === group?.id ? BRAND.blue : BRAND.line }}>
                  <div className="font-display text-lg font-semibold tracking-tight">{g.name}</div>
                  <ol className="mt-3 space-y-1 text-sm" style={{ color: BRAND.muted }}>
                    {g.subjects.map((s, i) => (
                      <li key={s.id}>{i + 1}. {s.name} <span className="text-xs">· {s.questions} сұрақ · {s.max} балл</span></li>
                    ))}
                  </ol>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => nav({ group: g.id, view: 'overview' })} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white" style={{ background: BRAND.ink }}>Ашу</button>
                    <button onClick={() => setGroupModal(g)} className="rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: BRAND.line }}>Баптау</button>
                  </div>
                </div>
              ))}
              <button onClick={() => setGroupModal('new')} className="flex min-h-[10rem] items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-sm font-semibold" style={{ borderColor: BRAND.line, color: BRAND.muted }}>
                <Plus size={16} /> Топ қосу
              </button>
            </div>
          )}

          {dirty && (current === 'key' || current === 'questions' || current === 'settings') && exam && (
            <div className="sticky bottom-4 z-30 mt-6 flex items-center justify-end gap-3 rounded-xl border bg-white p-3 shadow-lg" style={{ borderColor: BRAND.line }}>
              <span className="text-sm" style={{ color: BRAND.muted }}>Сақталмаған өзгерістер бар</span>
              <button onClick={() => setDraft(structuredClone(exam))} className="rounded-lg px-3 py-2 text-sm">Болдырмау</button>
              <button disabled={busy} onClick={() => save(draft!)} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: BRAND.blue }}>
                Сақтау
              </button>
            </div>
          )}
        </main>
      </div>

      {profile && exam && rk && (
        <StudentProfile
          student={data.students.find((s) => s.full_name === profile)}
          exam={exam}
          subs={data.submissions.filter((s) => s.student_name === profile)}
          history={data.histories?.[profile] ?? []}
          place={rk.place[profile] ?? null}
          of={rk.of}
          onClose={() => setProfile(null)}
          onDelete={async (id) => {
            await post({ action: 'delete-submission', id })
            await load()
            flash('Парақ өшірілді')
          }}
        />
      )}

      {groupModal && (
        <GroupModal
          group={groupModal === 'new' ? null : groupModal}
          onClose={() => setGroupModal(null)}
          onSaved={async (id, note) => {
            setGroupModal(null)
            flash(note)
            if (id && id !== group?.id) nav({ group: id, view: 'students' })
            else await load()
          }}
        />
      )}

      {msg && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm text-white" style={{ background: BRAND.ink }} role="status">{msg}</div>}
    </div>
  )
}

function Empty({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) {
  return (
    <div className="rounded-2xl border-2 border-dashed bg-white p-10 text-center" style={{ borderColor: BRAND.line }}>
      <p style={{ color: BRAND.muted }}>{text}</p>
      {action && <button onClick={onAction} className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: BRAND.ink }}>{action}</button>}
    </div>
  )
}

export default function Page() {
  return (
    <>
      <style>{`a[aria-label="WhatsApp арқылы хабарласу"]{display:none}`}</style>
      <Suspense fallback={null}>
        <Admin />
      </Suspense>
    </>
  )
}
