'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type Row = { groupId: string; groupName: string; students: number; subject: string; source: 'bt' | 'name' | 'slot' | 'guess'; grade: number | null; teacherId: string | null; rule: string; linked: boolean }
type T = { id: string; name: string; subject: string | null }

const SRC: Record<Row['source'], string> = { bt: 'Білім тексеруден', name: 'атауынан', slot: 'кестеден', guess: 'болжам — тексеріңіз' }

/** Оқушыларды мұғалімдерге бөлу: ереже бойынша ұсыныс → тексеру → бір батырмамен бекіту */
export default function AssignPage() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [teachers, setTeachers] = useState<T[]>([])
  const [subjects, setSubjects] = useState<Record<string, string>>({})
  const [pick, setPick] = useState<Record<string, string>>({})
  const [on, setOn] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const key = (r: Row) => `${r.groupId}|${r.subject}`
  const load = useCallback(async () => {
    const r = await fetch('/api/admin/assign', { cache: 'no-store' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) return setErr(j.error || 'Жүктелмеді')
    setRows(j.rows)
    setTeachers(j.teachers)
    setSubjects(j.subjects)
    setPick(Object.fromEntries(j.rows.map((x: Row) => [key(x), x.teacherId ?? ''])))
    setOn(Object.fromEntries(j.rows.map((x: Row) => [key(x), !!x.teacherId && !x.linked])))
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const tName = (id: string) => teachers.find((t) => t.id === id)?.name ?? ''
  const summary = useMemo(() => {
    const m = new Map<string, { groups: number; students: number }>()
    for (const r of rows ?? []) {
      const t = pick[key(r)]
      if (!t) continue
      const x = m.get(t) ?? { groups: 0, students: 0 }
      x.groups++
      x.students += r.students
      m.set(t, x)
    }
    return Array.from(m.entries()).sort((a, b) => tName(a[0]).localeCompare(tName(b[0])))
  }, [rows, pick, teachers]) // eslint-disable-line react-hooks/exhaustive-deps

  const chosen = (rows ?? []).filter((r) => on[key(r)] && pick[key(r)])
  const apply = async () => {
    setBusy(true)
    setErr('')
    setMsg('')
    try {
      const r = await fetch('/api/admin/assign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows: chosen.map((x) => ({ groupId: x.groupId, subject: x.subject, teacherId: pick[key(x)] })) }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Сақталмады')
      setMsg(`Бекітілді: ${j.created} жаңа журнал тобы, ${j.reused} бар топ жаңартылды. Мұғалімдер енді өз оқушыларын көреді.`)
      load()
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-4 pb-28 text-[#0E1424] sm:p-6">
      <a href="/admin" className="text-sm font-semibold text-[#2B6BF3]">← Әкімші</a>
      <h1 className="mt-1 text-2xl font-semibold">Оқушыларды мұғалімдерге бөлу</h1>
      <p className="mt-1 text-sm text-[#687085]">
        Ереже: ағылшын — Ернар; математика 5–6 сынып — Жолтай (5 сыныптағы Бибі, Алима, Зере тобы — Айдын); математика 3, 4, 7–11 сынып — Айдын; физика — Асан; қазақ тілі — Ақниет Рамазанова; орыс тілі — орыс тілі мұғалімі; Қазақстан тарихы — Алуа; жаратылыстану — Карабаева Диана.
        Бір оқушының бірнеше мұғалімі болуы мүмкін (мысалы, математика мен ағылшын). Тексеріп, керек болса мұғалімді ауыстырып, «Бекіту» басыңыз.
      </p>
      {err && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {msg && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</p>}
      {!rows && !err && <p className="py-10 text-center text-sm text-[#687085]">Жүктелуде…</p>}

      {summary.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {summary.map(([id, s]) => (
            <div key={id} className="rounded-2xl border border-[#E3E7F0] bg-white p-3">
              <div className="truncate text-sm font-semibold">{tName(id)}</div>
              <div className="text-xs text-[#687085]">{s.groups} топ · {s.students} оқушы</div>
            </div>
          ))}
        </div>
      )}

      {rows && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-[#E3E7F0] bg-white">
          {rows.map((r, i) => {
            const k = key(r)
            const prevSame = i > 0 && rows[i - 1].groupId === r.groupId
            return (
              <div key={k} className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5 ${i ? 'border-t border-[#EEF1F6]' : ''}`} style={{ background: !pick[k] ? '#FFFBEB' : undefined }}>
                <input type="checkbox" checked={!!on[k]} onChange={(e) => setOn({ ...on, [k]: e.target.checked })} className="h-4 w-4" aria-label="Бекіту" />
                <div className="min-w-0 flex-1 basis-56">
                  <div className="truncate text-sm font-semibold" style={{ color: prevSame ? '#94A3B8' : undefined }}>{r.groupName} <span className="font-normal text-[#687085]">· {r.students} оқушы</span></div>
                  <div className="text-[11px] text-[#687085]">
                    <b className="text-[#0E1424]">{subjects[r.subject]}</b> · пәні {SRC[r.source]} · {r.rule}
                    {r.linked && <span className="ml-1 text-emerald-700">· бекітілген ✓</span>}
                  </div>
                </div>
                <select value={pick[k] ?? ''} onChange={(e) => { setPick({ ...pick, [k]: e.target.value }); setOn({ ...on, [k]: !!e.target.value }) }} className="w-52 rounded-lg border border-[#E3E7F0] bg-white px-2 py-1.5 text-sm">
                  <option value="">— мұғалім таңдаңыз —</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}{t.subject ? ` (${t.subject})` : ''}</option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E3E7F0] bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="min-w-0 flex-1 text-xs text-[#687085]">{chosen.length} жол таңдалды · сары жолдарға мұғалім таңдаңыз</div>
          <button onClick={apply} disabled={busy || !chosen.length} className="rounded-2xl bg-[#0E1424] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Бекітілуде…' : 'Бекіту'}</button>
        </div>
      </div>
    </main>
  )
}
