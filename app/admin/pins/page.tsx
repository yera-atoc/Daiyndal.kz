'use client'

import { useCallback, useEffect, useState } from 'react'

type S = { id: string; name: string; group: string | null; pin: string | null; bt: string | null }
type G = { id: string; name: string }

/** Кабинетке кіру карточкалары: топ бойынша PIN жасау және A4-ке басып шығару (10 карточка/бет) */
export default function PinsPage() {
  const [groups, setGroups] = useState<G[]>([])
  const [students, setStudents] = useState<S[] | null>(null)
  const [gid, setGid] = useState<string>('all')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [host, setHost] = useState('')

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/pins', { cache: 'no-store' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) return setMsg(j.error || 'Жүктелмеді')
    setGroups(j.groups)
    setStudents(j.students)
  }, [])
  useEffect(() => {
    setHost(location.host)
    load()
  }, [load])

  const shown = (students ?? []).filter((s) => gid === 'all' || (gid === 'none' ? !s.group : s.group === gid))
  const noPin = shown.filter((s) => !s.pin).length
  const gName = (id: string | null) => groups.find((g) => g.id === id)?.name ?? ''

  const make = async () => {
    setBusy(true)
    try {
      const r = await fetch('/api/admin/pins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId: gid }) })
      const j = await r.json()
      setMsg(r.ok ? `${j.made} оқушыға PIN берілді` : j.error)
      load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-[200mm] p-5 text-[#0E1424] print:p-0">
      <style>{`@page{size:A4;margin:10mm} @media print{.np{display:none!important}}`}</style>
      <div className="np">
        <a href="/admin" className="text-sm font-semibold text-[#2B6BF3]">← Әкімші</a>
        <h1 className="mt-1 text-2xl font-semibold">Кабинетке кіру карточкалары</h1>
        <p className="mt-1 text-sm text-[#687085]">Оқушы «Менің кабинетім» бетінде тобын → атын таңдап, PIN тереді. Бір PIN барлық кабинетті ашады (ҰБТ, IELTS, Білім тексеру).</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {[{ id: 'all', name: 'Барлығы' }, ...groups, { id: 'none', name: 'Топсыз' }].map((g) => (
            <button key={g.id} onClick={() => setGid(g.id)} className={`rounded-full px-3 py-1.5 text-sm ${gid === g.id ? 'bg-[#0E1424] text-white' : 'bg-white ring-1 ring-[#E3E7F0]'}`}>{g.name}</button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {noPin > 0 && <button onClick={make} disabled={busy} className="rounded-xl bg-[#2B6BF3] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Жасалуда…' : `PIN жоқ ${noPin} оқушыға PIN жасау`}</button>}
          <button onClick={() => window.print()} className="rounded-xl bg-[#0E1424] px-4 py-2.5 text-sm font-semibold text-white">Басып шығару / PDF ({shown.filter((s) => s.pin).length})</button>
          {msg && <span className="text-sm text-[#15803D]">{msg}</span>}
        </div>
        <p className="mt-2 text-xs text-[#687085]">Бар PIN өзгермейді. Білім тексеру PIN-і бар оқушыға сол PIN беріледі, ол бұрынғыдай жұмыс істей береді. PIN — жеке ақпарат: карточканы оқушының өзіне немесе ата-анасына беріңіз.</p>
      </div>
      {!students && <p className="np py-10 text-center text-sm text-[#687085]">Жүктелуде…</p>}
      <div className="mt-5 grid grid-cols-2 gap-[4mm] print:mt-0">
        {shown.filter((s) => s.pin).map((s) => (
          <div key={s.id} className="break-inside-avoid rounded-xl border-2 border-dashed border-[#CBD2DE] p-[4mm]" style={{ height: '40mm' }}>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold tracking-[.2em] text-[#2B6BF3]">BELES EDUCATION</span>
              <span className="text-[10px] text-[#687085]">{gName(s.group)}</span>
            </div>
            <div className="mt-2 text-[15px] font-bold leading-tight">{s.name}</div>
            <div className="mt-2 flex items-end justify-between">
              <div>
                <div className="text-[9px] uppercase text-[#687085]">PIN</div>
                <div className="font-mono text-[28px] font-bold tracking-[.3em]">{s.pin}</div>
                {s.bt && <div className="text-[9px] text-[#687085]">Білім тексеру PIN-і ({s.bt}) де жарайды</div>}
              </div>
              <div className="text-right text-[10px] leading-snug text-[#687085]">
                <b className="text-[#0E1424]">{host}/me</b>
                <br />Менің кабинетім → тобың → атың
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
