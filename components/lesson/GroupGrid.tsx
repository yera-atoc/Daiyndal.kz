'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { DAY_SHORT, STATUS, dayMonth, todayAlmaty, weekdayOf, type AttStatus } from '@/lib/journal'
import { HW, type HwMark } from '@/lib/lesson'
import { markTone, monthLabel, shiftMonth, summarize, type GridCell, type GridView } from '@/lib/grid'
import { BLUE, INK, LINE, MUTED, SOFT, Sheet, Toast, lessonPost } from './ui'

const MON = ['қаң', 'ақп', 'нау', 'сәу', 'мам', 'мау', 'шіл', 'там', 'қыр', 'қаз', 'қар', 'жел']
const fmt = (m: number) => (Number.isInteger(m) ? String(m) : m.toFixed(1).replace('.', ','))
const pctTone = (v: number | null) => (v == null ? MUTED : v >= 80 ? '#15803D' : v >= 60 ? '#B45309' : '#B91C1C')

const SUM_RIGHT = [156, 104, 52, 0] // оң жаққа бекітілген қорытынды бағандар (әрқайсысы 52px)

type ClassRow = { id: string; name: string; subject: string | null; teacher?: string | null }

/** Топ журналы: оқушылар × сабақтар. Ұяшықта — қатысу, үй тапсырмасы, баға, тест. Оң жақта — айлық қорытынды. */
export default function GroupGrid({ classId, onBack }: { classId: string | null; onBack?: () => void }) {
  const [cid, setCid] = useState<string | null>(classId)
  const [classes, setClasses] = useState<ClassRow[] | null>(null)
  const [month, setMonth] = useState(todayAlmaty().slice(0, 7))
  const [v, setV] = useState<GridView | null>(null)
  const [err, setErr] = useState('')
  const [edit, setEdit] = useState<{ sid: string; date: string } | null>(null)
  const [topicEdit, setTopicEdit] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [toast, setToast] = useState<{ text: string; tone?: 'ok' | 'err' }>({ text: '' })
  const flash = (text: string, tone: 'ok' | 'err' = 'ok') => {
    setToast({ text, tone })
    setTimeout(() => setToast({ text: '' }), 2500)
  }

  useEffect(() => {
    if (cid) return
    fetch('/api/lesson/plan', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setClasses(j.classes ?? []))
      .catch(() => setClasses([]))
  }, [cid])

  const load = useCallback(async () => {
    if (!cid) return
    setErr('')
    const r = await fetch(`/api/lesson/grid?class=${cid}&month=${month}`, { cache: 'no-store' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) return setErr(j.error || 'Жүктелмеді')
    setV(j)
  }, [cid, month])
  useEffect(() => {
    setV(null)
    load()
  }, [load])

  // Бір ұяшықты өзгерту: бірден экранда, сосын серверге (қате болса — қайтарамыз)
  const change = async (sid: string, date: string, patch: { att?: AttStatus | null; hw?: HwMark | null; mark?: number | null; comment?: string }) => {
    if (!v) return
    const prev = v
    const cur: GridCell = { ...(v.cells[sid]?.[date] ?? {}) }
    if (patch.att !== undefined) patch.att === null ? delete cur.a : (cur.a = patch.att)
    if (patch.hw !== undefined) patch.hw === null ? delete cur.h : (cur.h = patch.hw)
    if (patch.mark !== undefined) patch.mark === null ? (delete cur.m, delete cur.c) : (cur.m = patch.mark)
    if (patch.comment !== undefined) cur.c = patch.comment || undefined
    // Баға қойылса, бірақ қатысу белгісі жоқ болса — «келді» деп белгілейміз
    const autoPresent = patch.mark != null && !cur.a
    if (autoPresent) cur.a = 'present'
    const cells = { ...v.cells, [sid]: { ...(v.cells[sid] ?? {}), [date]: cur } }
    setV({ ...v, cells, summary: { ...v.summary, [sid]: summarize(cells[sid], v.class.scale) } })
    try {
      await lessonPost('/api/lesson/grid', { action: 'cell', classId: v.class.id, date, studentId: sid, ...patch, ...(autoPresent ? { att: 'present' } : {}) })
    } catch (e: any) {
      setV(prev)
      flash(e.message, 'err')
    }
  }

  const setScale = async (scale: number) => {
    if (!v || scale === v.class.scale) return
    const over = Object.values(v.cells).some((row) => Object.values(row).some((c) => typeof c.m === 'number' && c.m > scale))
    if (over) return flash(`Бұл айда ${scale}-тен жоғары бағалар бар — алдымен оларды өзгертіңіз`, 'err')
    try {
      await lessonPost('/api/lesson/grid', { action: 'scale', classId: v.class.id, scale })
      setV({ ...v, class: { ...v.class, scale } })
      flash(`Баға шкаласы: ${scale} балл`)
    } catch (e: any) {
      flash(e.message, 'err')
    }
  }

  const saveTopic = async (date: string, topic: string) => {
    if (!v) return
    try {
      await lessonPost('/api/lesson/grid', { action: 'topic', classId: v.class.id, date, topic })
      setV({ ...v, dates: v.dates.map((d) => (d.date === date ? { ...d, topic: topic || null } : d)) })
      setTopicEdit(null)
    } catch (e: any) {
      flash(e.message, 'err')
    }
  }

  const colStats = useMemo(() => {
    if (!v) return {}
    const out: Record<string, { present: number; marked: number; avg: number | null }> = {}
    for (const d of v.dates) {
      let present = 0
      let marked = 0
      let sum = 0
      let n = 0
      for (const s of v.students) {
        const c = v.cells[s.id]?.[d.date]
        if (c?.a) marked++
        if (c?.a === 'present' || c?.a === 'late') present++
        if (typeof c?.m === 'number') {
          sum += c.m
          n++
        }
      }
      out[d.date] = { present, marked, avg: n ? Math.round((sum / n) * 10) / 10 : null }
    }
    return out
  }, [v])

  const exportExcel = async () => {
    if (!v) return
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Журнал')
    ws.addRow([`Топ: ${v.class.name}`, '', `Мұғалім: ${v.class.teacher}`, '', `Ай: ${monthLabel(v.month)}`, '', `Шкала: ${v.class.scale} балл`]).font = { bold: true }
    ws.addRow([])
    const head = ws.addRow(['№', 'Оқушы', ...v.dates.map((d) => `${d.date.slice(8)}.${d.date.slice(5, 7)}`), 'Қатысу %', 'ҮТ %', 'Орташа баға', 'Тест %'])
    head.font = { bold: true }
    ws.addRow(['', 'Тақырып', ...v.dates.map((d) => d.topic ?? ''), '', '', '', '']).font = { italic: true, size: 9 }
    v.students.forEach((s, i) => {
      const sm = v.summary[s.id]
      ws.addRow([
        i + 1,
        s.name,
        ...v.dates.map((d) => {
          const c = v.cells[s.id]?.[d.date]
          if (!c) return ''
          const parts = [c.a === 'absent' ? 'н' : c.a === 'excused' ? 'с' : c.a === 'late' ? 'к' : '', typeof c.m === 'number' ? fmt(c.m) : '', c.h ? HW[c.h].short : '', c.q ? `т${c.q[0]}/${c.q[1]}` : '']
          return parts.filter(Boolean).join(' ')
        }),
        sm?.att ?? '',
        sm?.hw ?? '',
        sm?.mark ?? '',
        sm?.quiz ?? '',
      ])
    })
    ws.addRow([])
    ws.addRow(['', 'Белгілер: н — келмеді, к — кешікті, с — себепті; сан — сабақтағы баға; ✓ ½ ✕ — үй тапсырмасы; т — сабақ тесті'])
    ws.getColumn(1).width = 4
    ws.getColumn(2).width = 28
    for (let i = 3; i <= v.dates.length + 2; i++) ws.getColumn(i).width = 9
    ws.getRow(4).alignment = { wrapText: true, vertical: 'top' }
    ws.getRow(4).height = 60
    ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 4 }]
    const buf = await wb.xlsx.writeBuffer()
    const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `Журнал_${v.class.name.replace(/[\\/:*?"<>|]/g, ' ')}_${v.month}.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  // ── Топ таңдау ──
  if (!cid)
    return (
      <div className="mt-6" style={{ color: INK }}>
        {onBack && <button onClick={onBack} className="mb-1 text-sm font-semibold" style={{ color: BLUE }}>← Артқа</button>}
        <h1 className="font-display text-2xl font-semibold tracking-tight">Топ журналы</h1>
        <p className="mt-1 text-sm" style={{ color: MUTED }}>Топты таңдаңыз: әр оқушының әр сабақтағы қатысуы, үй тапсырмасы, бағасы және тест нәтижесі бір кестеде.</p>
        {!classes && <p className="py-10 text-center text-sm" style={{ color: MUTED }}>Жүктелуде…</p>}
        {classes && !classes.length && <p className="mt-4 rounded-2xl border border-dashed bg-white p-6 text-center text-sm" style={{ borderColor: LINE, color: MUTED }}>Сізге әлі топ бекітілмеген.</p>}
        {classes && classes.length > 8 && (
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Іздеу: топ, пән немесе мұғалім" className="mt-4 w-full rounded-xl border bg-white px-3 py-2.5 text-sm" style={{ borderColor: LINE }} />
        )}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {classes?.filter((c) => !q.trim() || `${c.name} ${c.subject ?? ''} ${c.teacher ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())).map((c) => (
            <button key={c.id} onClick={() => setCid(c.id)} className="rounded-2xl border bg-white p-4 text-left" style={{ borderColor: LINE }}>
              <span className="block truncate font-semibold">{c.name}</span>
              <span className="block text-xs" style={{ color: MUTED }}>{[c.subject, c.teacher].filter(Boolean).join(' · ')}</span>
            </button>
          ))}
        </div>
      </div>
    )

  const ed = edit && v ? { s: v.students.find((x) => x.id === edit.sid)!, d: v.dates.find((x) => x.date === edit.date)!, c: v.cells[edit.sid]?.[edit.date] ?? {} } : null
  const moveEdit = (dir: 1 | -1) => {
    if (!edit || !v) return
    const i = v.students.findIndex((s) => s.id === edit.sid) + dir
    if (i >= 0 && i < v.students.length) setEdit({ sid: v.students[i].id, date: edit.date })
    else setEdit(null)
  }

  return (
    <div className="mt-4" style={{ color: INK }}>
      {(onBack || !classId) && (
        <button onClick={() => (classId ? onBack?.() : (setCid(null), setV(null)))} className="mb-1 text-sm font-semibold" style={{ color: BLUE }}>
          ← {classId ? 'Артқа' : 'Топтар'}
        </button>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display truncate text-2xl font-semibold tracking-tight">{v?.class.name ?? 'Топ журналы'}</h1>
          <p className="text-sm" style={{ color: MUTED }}>{[v?.class.subject, v?.class.teacher, v ? `${v.students.length} оқушы · ${v.dates.length} сабақ` : null].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => setMonth(shiftMonth(month, -1))} className="h-10 rounded-xl border bg-white px-3 text-sm font-semibold" style={{ borderColor: LINE }} aria-label="Алдыңғы ай">←</button>
          <span className="min-w-[120px] text-center text-sm font-semibold">{monthLabel(month)}</span>
          <button onClick={() => setMonth(shiftMonth(month, 1))} className="h-10 rounded-xl border bg-white px-3 text-sm font-semibold" style={{ borderColor: LINE }} aria-label="Келесі ай">→</button>
          {v && (
            <select value={v.class.scale} onChange={(e) => setScale(Number(e.target.value))} className="h-10 rounded-xl border bg-white px-2 text-sm" style={{ borderColor: LINE }} aria-label="Баға шкаласы">
              <option value={5}>5 балдық</option>
              <option value={10}>10 балдық</option>
              <option value={100}>100 балдық</option>
            </select>
          )}
          {v && <button onClick={exportExcel} className="h-10 rounded-xl px-3 text-sm font-semibold text-white" style={{ background: '#15803D' }}>Excel</button>}
        </div>
      </div>

      {err && <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{err}</p>}
      {!v && !err && <p className="py-12 text-center text-sm" style={{ color: MUTED }}>Жүктелуде…</p>}
      {v && !v.dates.length && <p className="mt-4 rounded-2xl border border-dashed bg-white p-6 text-center text-sm" style={{ borderColor: LINE, color: MUTED }}>Бұл айда сабақ жоқ. Топтың сабақ күндері «Сабақ журналында» белгіленеді.</p>}

      {v && v.dates.length > 0 && (
        <>
          <div className="mt-4 overflow-x-auto rounded-2xl border bg-white" style={{ borderColor: LINE }}>
            <table className="border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 min-w-[150px] border-b border-r bg-white px-3 py-2 text-left text-xs font-semibold" style={{ borderColor: LINE, color: MUTED }}>Оқушы</th>
                  {v.dates.map((d) => (
                    <th key={d.date} className="min-w-[46px] max-w-[60px] border-b border-r px-0.5 py-1.5 align-top" style={{ borderColor: LINE, background: d.date === todayAlmaty() ? '#EFF6FF' : undefined }}>
                      <button onClick={() => setTopicEdit(d.date)} className="block w-full text-center" title={d.topic ?? 'Тақырып жазу'}>
                        <span className="block text-[15px] font-bold leading-none">{Number(d.date.slice(8))}</span>
                        <span className="block text-[10px] font-medium" style={{ color: MUTED }}>{MON[Number(d.date.slice(5, 7)) - 1]} · {DAY_SHORT[weekdayOf(d.date) - 1]}</span>
                        <span className="mt-0.5 line-clamp-2 block text-[9px] font-normal leading-tight" style={{ color: d.topic ? INK : '#B6BCCB' }}>{d.topic ?? '+ тақырып'}</span>
                      </button>
                    </th>
                  ))}
                  {['Қатысу', 'ҮТ', 'Баға', 'Тест'].map((h, i) => (
                    <th key={h} className={`sticky z-20 w-[52px] min-w-[52px] max-w-[52px] border-b px-1 py-2 text-center text-[11px] font-semibold ${i === 0 ? 'border-l' : ''}`} style={{ borderColor: LINE, background: SOFT, right: SUM_RIGHT[i] }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {v.students.map((s) => {
                  const sm = v.summary[s.id]
                  return (
                    <tr key={s.id}>
                      <td className="sticky left-0 z-10 max-w-[180px] truncate border-b border-r bg-white px-3 py-1.5 text-[13px] font-medium" style={{ borderColor: LINE }} title={s.name}>{s.name}</td>
                      {v.dates.map((d) => {
                        const c = v.cells[s.id]?.[d.date]
                        const st = c?.a ? STATUS[c.a] : null
                        const tone = typeof c?.m === 'number' ? markTone(c.m, v.class.scale) : null
                        const bg = c?.a === 'absent' ? '#FEF2F2' : c?.a === 'excused' ? '#F8FAFC' : c?.a === 'late' ? '#FFFBEB' : undefined
                        return (
                          <td key={d.date} className="border-b border-r p-0" style={{ borderColor: LINE, background: bg }}>
                            <button onClick={() => setEdit({ sid: s.id, date: d.date })} className="relative flex h-11 w-full min-w-[46px] items-center justify-center hover:bg-blue-50" aria-label={`${s.name}, ${dayMonth(d.date)}`}>
                              {tone ? (
                                <span className="rounded-md px-1.5 py-0.5 text-[14px] font-bold tabular-nums" style={{ background: tone.bg, color: tone.fg }}>{fmt(c!.m!)}</span>
                              ) : c?.a && c.a !== 'present' ? (
                                <span className="text-[12px] font-bold" style={{ color: st!.fg }}>{c.a === 'absent' ? 'н' : c.a === 'late' ? 'к' : 'с'}</span>
                              ) : c?.a === 'present' ? (
                                <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#22C55E' }} />
                              ) : null}
                              {c?.h && <span className="absolute bottom-0.5 right-1 text-[10px] font-bold" style={{ color: HW[c.h].fg }}>{HW[c.h].short}</span>}
                              {c?.q && <span className="absolute left-1 top-0.5 text-[9px] font-semibold tabular-nums" style={{ color: '#4338CA' }}>{c.q[0]}/{c.q[1]}</span>}
                              {c?.c && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full" style={{ background: '#6366F1' }} title={c.c} />}
                              {tone && c?.a === 'late' && <span className="absolute left-1 bottom-0.5 text-[9px] font-bold" style={{ color: '#B45309' }}>к</span>}
                            </button>
                          </td>
                        )
                      })}
                      <td className="sticky z-10 border-b border-l px-1 text-center text-[12px] font-semibold tabular-nums" style={{ borderColor: LINE, background: SOFT, right: SUM_RIGHT[0], color: pctTone(sm?.att ?? null) }} title={sm?.absent ? `Келмеген: ${sm.absent}` : undefined}>{sm?.att != null ? `${sm.att}%` : '—'}</td>
                      <td className="sticky z-10 border-b px-1 text-center text-[12px] font-semibold tabular-nums" style={{ borderColor: LINE, background: SOFT, right: SUM_RIGHT[1], color: pctTone(sm?.hw ?? null) }}>{sm?.hw != null ? `${sm.hw}%` : '—'}</td>
                      <td className="sticky z-10 border-b px-1 text-center text-[14px] font-bold tabular-nums" style={{ borderColor: LINE, background: SOFT, right: SUM_RIGHT[2], color: sm?.mark != null ? markTone(sm.mark, v.class.scale).fg : MUTED }} title={sm?.marks ? `${sm.marks} баға` : undefined}>{sm?.mark != null ? fmt(sm.mark) : '—'}</td>
                      <td className="sticky z-10 border-b px-1 text-center text-[12px] font-semibold tabular-nums" style={{ borderColor: LINE, background: SOFT, right: SUM_RIGHT[3], color: pctTone(sm?.quiz ?? null) }}>{sm?.quiz != null ? `${sm.quiz}%` : '—'}</td>
                    </tr>
                  )
                })}
                <tr>
                  <td className="sticky left-0 z-10 border-r bg-white px-3 py-1.5 text-[11px] font-semibold" style={{ borderColor: LINE, color: MUTED }}>Келді / орташа</td>
                  {v.dates.map((d) => {
                    const cs = colStats[d.date]
                    return (
                      <td key={d.date} className="border-r px-1 py-1 text-center text-[10px] leading-tight tabular-nums" style={{ borderColor: LINE, color: MUTED }}>
                        {cs?.marked ? `${cs.present}/${v.students.length}` : '—'}
                        {cs?.avg != null && <b className="block text-[11px]" style={{ color: INK }}>{fmt(cs.avg)}</b>}
                      </td>
                    )
                  })}
                  {SUM_RIGHT.map((r, i) => <td key={r} className={`sticky z-10 ${i === 0 ? 'border-l' : ''}`} style={{ background: SOFT, right: r, borderColor: LINE }} />)}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs" style={{ color: MUTED }}>
            Ұяшықты басыңыз — қатысу, үй тапсырмасы, баға және пікір. Белгілер: <b>сан</b> — сабақтағы баға, <b style={{ color: '#B91C1C' }}>н</b> — келмеді, <b style={{ color: '#B45309' }}>к</b> — кешікті, <b>с</b> — себепті, ✓ ½ ✕ — үй тапсырмасы, <b style={{ color: '#4338CA' }}>7/8</b> — сабақ тесті. Күнді басып тақырыпты жазуға болады.
          </p>
        </>
      )}

      {ed && v && (
        <Sheet title={ed.s.name} onClose={() => setEdit(null)}>
          <p className="-mt-2 text-sm" style={{ color: MUTED }}>{dayMonth(ed.d.date)} · {ed.d.topic ?? 'тақырып жазылмаған'}</p>
          <div className="mt-4 text-xs font-semibold" style={{ color: MUTED }}>Қатысу</div>
          <div className="mt-1.5 grid grid-cols-5 gap-1.5">
            {(['present', 'absent', 'late', 'excused'] as AttStatus[]).map((a) => (
              <button key={a} onClick={() => change(ed.s.id, ed.d.date, { att: ed.c.a === a ? null : a })} className="rounded-xl py-2.5 text-xs font-semibold" style={{ background: ed.c.a === a ? STATUS[a].bg : SOFT, color: ed.c.a === a ? STATUS[a].fg : INK, outline: ed.c.a === a ? `2px solid ${STATUS[a].fg}` : undefined }}>
                {STATUS[a].label}
              </button>
            ))}
            <button onClick={() => change(ed.s.id, ed.d.date, { att: null })} className="rounded-xl py-2.5 text-xs font-semibold" style={{ background: SOFT, color: MUTED }}>—</button>
          </div>
          <div className="mt-4 text-xs font-semibold" style={{ color: MUTED }}>Сабақтағы баға ({v.class.scale} балдық)</div>
          {v.class.scale === 100 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <input
                key={`${ed.s.id}${ed.d.date}`}
                inputMode="decimal"
                defaultValue={ed.c.m ?? ''}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const x = Number((e.target as HTMLInputElement).value.replace(',', '.'))
                    if (x >= 0 && x <= 100) change(ed.s.id, ed.d.date, { mark: x }).then(() => moveEdit(1))
                  }
                }}
                onBlur={(e) => {
                  const raw = e.target.value.trim()
                  const x = Number(raw.replace(',', '.'))
                  if (raw && x >= 0 && x <= 100 && x !== ed.c.m) change(ed.s.id, ed.d.date, { mark: x })
                }}
                placeholder="0–100"
                className="w-24 rounded-xl border px-3 py-2.5 text-lg font-bold tabular-nums"
                style={{ borderColor: LINE }}
              />
              {[50, 60, 70, 80, 90, 100].map((m) => (
                <button key={m} onClick={() => change(ed.s.id, ed.d.date, { mark: m })} className="rounded-xl px-3 py-2.5 text-sm font-bold" style={{ background: ed.c.m === m ? INK : SOFT, color: ed.c.m === m ? '#fff' : INK }}>{m}</button>
              ))}
            </div>
          ) : (
            <div className={`mt-1.5 grid gap-1.5 ${v.class.scale === 5 ? 'grid-cols-5' : 'grid-cols-5'}`}>
              {Array.from({ length: v.class.scale }, (_, i) => i + 1).map((m) => {
                const on = ed.c.m === m
                const tn = markTone(m, v.class.scale)
                return (
                  <button key={m} onClick={() => change(ed.s.id, ed.d.date, { mark: on ? null : m })} className="h-12 rounded-xl text-lg font-bold tabular-nums" style={{ background: on ? tn.fg : tn.bg, color: on ? '#fff' : tn.fg }}>
                    {m}
                  </button>
                )
              })}
            </div>
          )}
          {typeof ed.c.m === 'number' && <button onClick={() => change(ed.s.id, ed.d.date, { mark: null })} className="mt-1.5 text-xs font-semibold text-red-600">Бағаны өшіру</button>}
          <div className="mt-4 text-xs font-semibold" style={{ color: MUTED }}>Үй тапсырмасы</div>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5">
            {(['done', 'partial', 'none'] as HwMark[]).map((h) => (
              <button key={h} onClick={() => change(ed.s.id, ed.d.date, { hw: ed.c.h === h ? null : h })} className="rounded-xl py-2.5 text-xs font-semibold" style={{ background: ed.c.h === h ? HW[h].bg : SOFT, color: ed.c.h === h ? HW[h].fg : INK, outline: ed.c.h === h ? `2px solid ${HW[h].fg}` : undefined }}>
                {HW[h].short} {HW[h].label}
              </button>
            ))}
            <button onClick={() => change(ed.s.id, ed.d.date, { hw: null })} className="rounded-xl py-2.5 text-xs font-semibold" style={{ background: SOFT, color: MUTED }}>—</button>
          </div>
          {ed.c.q && <p className="mt-3 rounded-xl px-3 py-2 text-sm" style={{ background: '#EEF2FF', color: '#4338CA' }}>Сабақ тесті: <b>{ed.c.q[0]}/{ed.c.q[1]}</b></p>}
          {typeof ed.c.m === 'number' && (
            <input
              key={`c${ed.s.id}${ed.d.date}`}
              defaultValue={ed.c.c ?? ''}
              onBlur={(e) => e.target.value !== (ed.c.c ?? '') && change(ed.s.id, ed.d.date, { comment: e.target.value })}
              placeholder="Пікір (міндетті емес): не жақсы, не жетіспейді"
              className="mt-3 w-full rounded-xl border px-3 py-2.5 text-sm"
              style={{ borderColor: LINE }}
            />
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={() => moveEdit(-1)} className="rounded-xl border py-3 text-sm font-semibold" style={{ borderColor: LINE }}>↑ Алдыңғы оқушы</button>
            <button onClick={() => moveEdit(1)} className="rounded-xl py-3 text-sm font-semibold text-white" style={{ background: INK }}>Келесі оқушы ↓</button>
          </div>
        </Sheet>
      )}

      {topicEdit && v && (
        <Sheet title={`Тақырып · ${dayMonth(topicEdit)}`} onClose={() => setTopicEdit(null)}>
          <TopicForm initial={v.dates.find((d) => d.date === topicEdit)?.topic ?? ''} onSave={(t) => saveTopic(topicEdit, t)} />
        </Sheet>
      )}
      <Toast text={toast.text} tone={toast.tone} />
    </div>
  )
}

function TopicForm({ initial, onSave }: { initial: string; onSave: (t: string) => void }) {
  const [t, setT] = useState(initial)
  return (
    <div>
      <textarea value={t} onChange={(e) => setT(e.target.value)} rows={3} className="w-full rounded-xl border px-3 py-2.5 text-sm" style={{ borderColor: LINE }} placeholder="Сабақта не өттіңіздер?" />
      <button onClick={() => onSave(t.trim())} className="mt-3 w-full rounded-xl py-3 text-sm font-semibold text-white" style={{ background: INK }}>Сақтау</button>
    </div>
  )
}
