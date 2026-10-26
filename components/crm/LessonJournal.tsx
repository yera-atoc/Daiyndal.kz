'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BRAND, Field, Kpi, Modal, Panel, btnDark, btnLine, inputCls, selCls } from './core'
import WeekJournal, { WeekNav } from '@/components/journal/WeekJournal'
import { FillPill, useClassList } from '@/components/journal/TeacherJournal'
import { DAY_SHORT, fillState, todayAlmaty, weekStartOf } from '@/lib/journal'

type Admin = {
  classes: { id: string; teacher_id: string; name: string; subject: string | null; group_id: string | null; days: number[]; active: boolean; position: number; student_ids: string[] }[]
  teachers: { id: string; name: string; subject: string | null }[]
  students: { id: string; full_name: string; grade: number | null; group_id: string | null }[]
  groups: { id: string; name: string }[]
}
type Draft = Omit<Admin['classes'][number], 'id'> & { id?: string }

/** Әкімші: барлық мұғалімнің сабақ журналын қадағалау және топтарды бекіту */
export default function LessonJournal({ flash }: { flash: (m: string) => void }) {
  const [week, setWeek] = useState(weekStartOf(todayAlmaty()))
  const [teacher, setTeacher] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [manage, setManage] = useState(false)
  const { rows, err, reload } = useClassList(week, teacher || null)
  const [adm, setAdm] = useState<Admin | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)

  const loadAdmin = useCallback(async () => {
    const r = await fetch('/api/journal/classes', { cache: 'no-store' })
    const j = await r.json().catch(() => ({}))
    if (r.ok) setAdm(j)
  }, [])
  useEffect(() => {
    loadAdmin()
  }, [loadAdmin])

  const kpi = useMemo(() => {
    const r = rows ?? []
    const withLessons = r.filter((x) => x.stats.lessons)
    const full = withLessons.filter((x) => fillState(x.stats).label === 'Толық').length
    const empty = withLessons.filter((x) => fillState(x.stats).label === 'Толтырылмаған').length
    const marked = r.reduce((a, x) => a + x.stats.marked, 0)
    const came = r.reduce((a, x) => a + x.stats.present, 0)
    return { total: r.length, withLessons: withLessons.length, full, empty, rate: marked ? Math.round((came / marked) * 100) : null }
  }, [rows])

  if (open)
    return <WeekJournal classId={open} week={week} onWeek={setWeek} onBack={() => { setOpen(null); reload() }} backLabel="Барлық топтар" />

  if (manage) return <Manage adm={adm} onBack={() => setManage(false)} onEdit={setDraft} draft={draft} setDraft={setDraft} reload={async () => { await loadAdmin(); await reload() }} flash={flash} />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <WeekNav week={week} onWeek={setWeek} />
          <select value={teacher} onChange={(e) => setTeacher(e.target.value)} className={selCls} style={{ borderColor: BRAND.line }}>
            <option value="">Барлық мұғалім</option>
            {adm?.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <button onClick={() => setManage(true)} className={btnDark} style={{ background: BRAND.text }}>Топтар мен оқушыларды бекіту</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Топтар" value={String(kpi.total)} sub={`${kpi.withLessons} топта сабақ болды`} />
        <Kpi label="Толық толтырылған" value={String(kpi.full)} tone="#15803D" />
        <Kpi label="Толтырылмаған" value={String(kpi.empty)} tone={kpi.empty ? '#B91C1C' : undefined} />
        <Kpi label="Қатысу" value={kpi.rate !== null ? `${kpi.rate}%` : '—'} sub="белгіленген сабақтар бойынша" />
      </div>

      <Panel title="Апталық журнал" note="Қатысу, өтілген тақырып және үй тапсырмасы. Топты ашып, толық көріңіз — қажет болса, әкімші де түзете алады.">
        {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        {!rows && !err && <p className="py-8 text-center text-sm" style={{ color: BRAND.muted }}>Жүктелуде…</p>}
        {rows && !rows.length && <p className="py-8 text-center text-sm" style={{ color: BRAND.muted }}>Әлі топ жоқ. «Топтар мен оқушыларды бекіту» батырмасынан мұғалімге топ қосыңыз.</p>}
        {rows && rows.length > 0 && (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs" style={{ borderColor: BRAND.line, color: BRAND.muted }}>
                  <th className="px-5 py-2 font-medium">Мұғалім</th>
                  <th className="px-3 py-2 font-medium">Топ</th>
                  <th className="px-3 py-2 text-right font-medium">Сабақ</th>
                  <th className="px-3 py-2 text-right font-medium">Қатысу белгісі</th>
                  <th className="px-3 py-2 font-medium">Өтілген тақырып</th>
                  <th className="px-3 py-2 font-medium">Үй тапсырмасы</th>
                  <th className="px-5 py-2 text-right font-medium">Күйі</th>
                </tr>
              </thead>
              <tbody>
                {[...rows].sort((a, b) => a.teacher.localeCompare(b.teacher) || a.class.name.localeCompare(b.class.name)).map((r) => (
                  <tr key={r.class.id} onClick={() => setOpen(r.class.id)} className="cursor-pointer border-b last:border-0 hover:bg-slate-50" style={{ borderColor: '#EDF0F5' }}>
                    <td className="px-5 py-2.5 font-medium">{r.teacher}</td>
                    <td className="px-3 py-2.5">
                      {r.class.name}
                      <div className="text-xs" style={{ color: BRAND.muted }}>{r.students} оқушы · {r.class.days.map((d) => DAY_SHORT[d - 1]).join(', ') || 'күні жоқ'}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.stats.lessons}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.stats.expected ? `${r.stats.marked}/${r.stats.expected}` : '—'}</td>
                    <td className="max-w-[220px] px-3 py-2.5"><Clip text={r.week?.topic} alt={r.stats.lessons ? `${r.stats.topics}/${r.stats.lessons} сабақта` : ''} /></td>
                    <td className="max-w-[220px] px-3 py-2.5"><Clip text={r.week?.homework} alt={r.stats.lessons ? `${r.stats.homework}/${r.stats.lessons} сабақта` : ''} /></td>
                    <td className="px-5 py-2.5 text-right"><FillPill s={r.stats} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}

function Clip({ text, alt }: { text?: string | null; alt: string }) {
  if (text?.trim()) return <span className="line-clamp-2 text-[13px]">{text}</span>
  return <span className="text-[13px]" style={{ color: '#B8BFCC' }}>{alt || '—'}</span>
}

function Manage({ adm, onBack, draft, setDraft, onEdit, reload, flash }: { adm: Admin | null; onBack: () => void; draft: Draft | null; setDraft: (d: Draft | null) => void; onEdit: (d: Draft) => void; reload: () => Promise<void>; flash: (m: string) => void }) {
  if (!adm) return <p className="py-10 text-center text-sm" style={{ color: BRAND.muted }}>Жүктелуде…</p>
  const byTeacher = adm.teachers.map((t) => ({ t, list: adm.classes.filter((c) => c.teacher_id === t.id) }))
  const blank = (teacher_id = ''): Draft => ({ teacher_id, name: '', subject: adm.teachers.find((t) => t.id === teacher_id)?.subject ?? '', group_id: null, days: [], active: true, position: 0, student_ids: [] })
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="text-sm font-semibold" style={{ color: BRAND.blue }}>← Апталық журнал</button>
        <button onClick={() => onEdit(blank())} className={btnDark} style={{ background: BRAND.text }}>+ Жаңа топ</button>
      </div>
      <p className="text-sm" style={{ color: BRAND.muted }}>Әр мұғалім тек осында бекітілген топтары мен оқушыларын көреді. Бір оқушы бірнеше мұғалімнің тобында бола алады.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        {byTeacher.map(({ t, list }) => (
          <Panel key={t.id} title={t.name} note={t.subject ?? undefined} action={<button onClick={() => onEdit(blank(t.id))} className={btnLine} style={{ borderColor: BRAND.line }}>+ Топ</button>}>
            {!list.length && <p className="text-sm" style={{ color: BRAND.muted }}>Топ бекітілмеген.</p>}
            <div className="space-y-2">
              {list.map((c) => (
                <button key={c.id} onClick={() => onEdit({ ...c })} className="flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left hover:bg-slate-50" style={{ borderColor: BRAND.line, opacity: c.active ? 1 : 0.55 }}>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{c.name}</span>
                    <span className="text-xs" style={{ color: BRAND.muted }}>{[c.subject, c.days.map((d) => DAY_SHORT[d - 1]).join(', '), !c.active && 'тоқтатылған'].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums" style={{ color: BRAND.muted }}>{c.student_ids.length} оқушы ›</span>
                </button>
              ))}
            </div>
          </Panel>
        ))}
      </div>
      {draft && <Editor adm={adm} draft={draft} setDraft={setDraft} reload={reload} flash={flash} />}
    </div>
  )
}

function Editor({ adm, draft, setDraft, reload, flash }: { adm: Admin; draft: Draft; setDraft: (d: Draft | null) => void; reload: () => Promise<void>; flash: (m: string) => void }) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (p: Partial<Draft>) => setDraft({ ...draft, ...p })
  const chosen = new Set(draft.student_ids)
  const groupName = (id: string | null) => adm.groups.find((g) => g.id === id)?.name ?? ''
  const list = adm.students
    .filter((s) => !q.trim() || `${s.full_name} ${groupName(s.group_id)}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => Number(chosen.has(b.id)) - Number(chosen.has(a.id)) || a.full_name.localeCompare(b.full_name, 'kk'))
  const toggle = (id: string) => set({ student_ids: chosen.has(id) ? draft.student_ids.filter((x) => x !== id) : [...draft.student_ids, id] })
  const addGroup = () => {
    if (!draft.group_id) return
    const ids = adm.students.filter((s) => s.group_id === draft.group_id).map((s) => s.id)
    set({ student_ids: Array.from(new Set([...draft.student_ids, ...ids])), name: draft.name || groupName(draft.group_id) })
  }

  const save = async () => {
    setBusy(true)
    setErr('')
    const r = await fetch('/api/journal/classes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save', class: draft }) })
    const j = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) return setErr(j.error || 'Сақталмады')
    setDraft(null)
    flash('Топ сақталды')
    await reload()
  }
  const remove = async () => {
    if (!draft.id || !confirm(`«${draft.name}» тобын өшіресіз бе? Оның журналы да өшеді. Уақытша тоқтату үшін «Белсенді» белгісін алып тастаңыз.`)) return
    await fetch('/api/journal/classes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id: draft.id }) })
    setDraft(null)
    flash('Топ өшірілді')
    await reload()
  }

  return (
    <Modal title={draft.id ? 'Топты өзгерту' : 'Жаңа топ'} onClose={() => setDraft(null)} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Мұғалім">
          <select value={draft.teacher_id} onChange={(e) => set({ teacher_id: e.target.value, subject: draft.subject || adm.teachers.find((t) => t.id === e.target.value)?.subject || '' })} className={`${selCls} w-full`} style={{ borderColor: BRAND.line }}>
            <option value="">— таңдаңыз —</option>
            {adm.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}{t.subject ? ` · ${t.subject}` : ''}</option>)}
          </select>
        </Field>
        <Field label="Пән">
          <input value={draft.subject ?? ''} onChange={(e) => set({ subject: e.target.value })} className={inputCls} style={{ borderColor: BRAND.line }} placeholder="Математика" />
        </Field>
        <Field label="Топ атауы" className="sm:col-span-2">
          <input value={draft.name} onChange={(e) => set({ name: e.target.value })} className={inputCls} style={{ borderColor: BRAND.line }} placeholder="Математика · 6 сынып НЗМ-1" />
        </Field>
        <Box label="Сабақ күндері" className="sm:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {DAY_SHORT.map((d, i) => {
              const on = draft.days.includes(i + 1)
              return (
                <button key={d} type="button" onClick={() => set({ days: on ? draft.days.filter((x) => x !== i + 1) : [...draft.days, i + 1].sort() })} className="h-9 w-11 rounded-lg border text-sm font-semibold" style={on ? { background: BRAND.text, color: '#fff', borderColor: BRAND.text } : { borderColor: BRAND.line, color: BRAND.muted }}>
                  {d}
                </button>
              )
            })}
          </div>
        </Box>
        <Box label="CRM тобы (міндетті емес)">
          <div className="flex gap-2">
            <select value={draft.group_id ?? ''} onChange={(e) => set({ group_id: e.target.value || null })} className={`${selCls} min-w-0 flex-1`} style={{ borderColor: BRAND.line }}>
              <option value="">—</option>
              {adm.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <button type="button" disabled={!draft.group_id} onClick={addGroup} className={btnLine} style={{ borderColor: BRAND.line }}>Оқушыларын қосу</button>
          </div>
        </Box>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" checked={draft.active} onChange={(e) => set({ active: e.target.checked })} /> Белсенді
        </label>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Оқушылар: {draft.student_ids.length}</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Аты немесе тобы бойынша іздеу" className={`${inputCls} max-w-xs`} style={{ borderColor: BRAND.line }} />
        </div>
        <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border" style={{ borderColor: BRAND.line }}>
          {list.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 text-sm last:border-0 hover:bg-slate-50" style={{ borderColor: '#EDF0F5' }}>
              <input type="checkbox" checked={chosen.has(s.id)} onChange={() => toggle(s.id)} />
              <span className="min-w-0 flex-1 truncate">{s.full_name}</span>
              <span className="shrink-0 text-xs" style={{ color: BRAND.muted }}>{[s.grade ? `${s.grade} сынып` : '', groupName(s.group_id)].filter(Boolean).join(' · ')}</span>
            </label>
          ))}
          {!list.length && <p className="p-4 text-center text-sm" style={{ color: BRAND.muted }}>Табылмады</p>}
        </div>
      </div>

      {err && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <div className="mt-5 flex justify-between gap-2">
        {draft.id ? <button onClick={remove} className={btnLine} style={{ borderColor: BRAND.line, color: '#B91C1C' }}>Өшіру</button> : <span />}
        <div className="flex gap-2">
          <button onClick={() => setDraft(null)} className={btnLine} style={{ borderColor: BRAND.line }}>Бас тарту</button>
          <button disabled={busy} onClick={save} className={btnDark} style={{ background: BRAND.blue }}>{busy ? 'Сақталуда…' : 'Сақтау'}</button>
        </div>
      </div>
    </Modal>
  )
}

/** Батырмалары бар өріс: <label> емес (label ішіндегі батырма бүкіл аймақты басуға жауап береді) */
function Box({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className} role="group" aria-label={label}>
      <span className="mb-1 block text-xs font-medium" style={{ color: BRAND.muted }}>{label}</span>
      {children}
    </div>
  )
}
