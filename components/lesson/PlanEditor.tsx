'use client'

import { useCallback, useEffect, useState } from 'react'
import { dayMonth } from '@/lib/journal'
import { BLUE, INK, LINE, MUTED, SOFT, Sheet, Toast, lessonPost } from './ui'

type Row = { id?: string; topic: string; homework: string | null; date?: string | null }
type ClassRow = { id: string; name: string; subject: string | null; count: number }

/** КТП: топтың тақырыптары. Мәтіннен қою (Word/Excel), ИИ құрастыру, басқа топтан көшіру */
export default function PlanEditor({ classId, onBack }: { classId: string | null; onBack: () => void }) {
  const [cid, setCid] = useState<string | null>(classId)
  const [classes, setClasses] = useState<ClassRow[] | null>(null)
  const [name, setName] = useState('')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [dirty, setDirty] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ text: string; tone?: 'ok' | 'err' }>({ text: '' })
  const [sheet, setSheet] = useState<'paste' | 'ai' | 'copy' | null>(null)

  const flash = (text: string, tone: 'ok' | 'err' = 'ok') => {
    setToast({ text, tone })
    setTimeout(() => setToast({ text: '' }), 3000)
  }

  const loadClasses = useCallback(async () => {
    const r = await fetch('/api/lesson/plan', { cache: 'no-store' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) return setErr(j.error || 'Жүктелмеді')
    setClasses(j.classes)
  }, [])
  const load = useCallback(async () => {
    if (!cid) return
    setErr('')
    const r = await fetch(`/api/lesson/plan?class=${cid}`, { cache: 'no-store' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) return setErr(j.error || 'Жүктелмеді')
    setName(j.class.name)
    setRows(j.items)
    setDirty(false)
  }, [cid])
  useEffect(() => {
    loadClasses()
  }, [loadClasses])
  useEffect(() => {
    setRows(null)
    load()
  }, [load])

  const save = async () => {
    if (!cid || !rows) return
    setBusy(true)
    try {
      const r = await lessonPost('/api/lesson/plan', { action: 'save', classId: cid, items: rows })
      flash(`КТП сақталды: ${r.count} сабақ`)
      load()
      loadClasses()
    } catch (e: any) {
      flash(e.message, 'err')
    } finally {
      setBusy(false)
    }
  }
  const put = (items: Row[], mode: 'replace' | 'append') => {
    setRows(mode === 'replace' ? [...(rows ?? []).filter((r) => r.date), ...items] : [...(rows ?? []), ...items])
    setDirty(true)
    setSheet(null)
  }
  const edit = (i: number, patch: Partial<Row>) => {
    setRows(rows!.map((r, j) => (j === i ? { ...r, ...patch } : r)))
    setDirty(true)
  }
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (!rows || j < 0 || j >= rows.length) return
    const n = [...rows]
    ;[n[i], n[j]] = [n[j], n[i]]
    setRows(n)
    setDirty(true)
  }

  // Топ таңдау
  if (!cid)
    return (
      <div className="mt-6" style={{ color: INK }}>
        <button onClick={onBack} className="mb-1 text-sm font-semibold" style={{ color: BLUE }}>← Артқа</button>
        <h1 className="font-display text-2xl font-semibold tracking-tight">КТП — тақырыптық жоспар</h1>
        <p className="mt-1 text-sm" style={{ color: MUTED }}>Топты таңдаңыз. Әр топқа бір рет енгізесіз — кейін тақырып пен үй тапсырмасы әр сабаққа өзі қойылады.</p>
        {err && <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{err}</p>}
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {classes?.map((c) => (
            <button key={c.id} onClick={() => setCid(c.id)} className="flex items-center justify-between gap-3 rounded-2xl border bg-white p-4 text-left" style={{ borderColor: LINE }}>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{c.name}</span>
                <span className="block text-xs" style={{ color: MUTED }}>{c.subject}</span>
              </span>
              <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: c.count ? '#DCFCE7' : '#FEF3C7', color: c.count ? '#15803D' : '#B45309' }}>
                {c.count ? `${c.count} сабақ` : 'КТП жоқ'}
              </span>
            </button>
          ))}
        </div>
      </div>
    )

  return (
    <div className="mt-4" style={{ color: INK }}>
      <button onClick={() => (classId ? onBack() : setCid(null))} className="mb-1 text-sm font-semibold" style={{ color: BLUE }}>← {classId ? 'Сабаққа оралу' : 'Топтар'}</button>
      <h1 className="font-display text-2xl font-semibold tracking-tight">КТП · {name}</h1>
      <p className="mt-0.5 text-sm" style={{ color: MUTED }}>{rows ? `${rows.length} сабақ · өтілгені ${rows.filter((r) => r.date).length}` : ''}</p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button onClick={() => setSheet('paste')} className="rounded-2xl border bg-white p-3 text-left text-sm" style={{ borderColor: LINE }}>
          <b className="block">Мәтіннен қою</b>
          <span className="text-xs" style={{ color: MUTED }}>Word / Excel-ден көшіріп</span>
        </button>
        <button onClick={() => setSheet('ai')} className="rounded-2xl border bg-white p-3 text-left text-sm" style={{ borderColor: LINE }}>
          <b className="block">ИИ құрастырсын</b>
          <span className="text-xs" style={{ color: MUTED }}>Пән мен сынып бойынша</span>
        </button>
        <button onClick={() => setSheet('copy')} className="rounded-2xl border bg-white p-3 text-left text-sm" style={{ borderColor: LINE }}>
          <b className="block">Көшіру</b>
          <span className="text-xs" style={{ color: MUTED }}>Басқа топтан</span>
        </button>
      </div>

      {err && <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{err}</p>}
      {!rows && !err && <p className="py-12 text-center text-sm" style={{ color: MUTED }}>Жүктелуде…</p>}
      {rows && !rows.length && <p className="mt-5 rounded-2xl border border-dashed bg-white p-8 text-center text-sm" style={{ borderColor: LINE, color: MUTED }}>КТП әлі бос. Жоғарыдағы үш тәсілдің бірін таңдаңыз.</p>}

      {rows && rows.length > 0 && (
        <ol className="mt-4 overflow-hidden rounded-2xl border bg-white" style={{ borderColor: LINE }}>
          {rows.map((r, i) => (
            <li key={r.id ?? `n${i}`} className="flex gap-2 p-3" style={{ borderTop: i ? `1px solid ${LINE}` : undefined, background: r.date ? '#F6FEF9' : undefined }}>
              <div className="w-8 shrink-0 pt-2 text-center text-sm font-bold tabular-nums" style={{ color: MUTED }}>{i + 1}</div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <input value={r.topic} onChange={(e) => edit(i, { topic: e.target.value })} className="w-full rounded-lg border px-2.5 py-1.5 text-sm font-medium" style={{ borderColor: LINE }} />
                <input value={r.homework ?? ''} onChange={(e) => edit(i, { homework: e.target.value || null })} placeholder="Үй тапсырмасы" className="w-full rounded-lg border px-2.5 py-1.5 text-xs" style={{ borderColor: LINE }} />
                {r.date && <div className="text-[11px] font-semibold" style={{ color: '#15803D' }}>✓ өтілді: {dayMonth(r.date)}</div>}
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button onClick={() => move(i, -1)} className="h-7 w-7 rounded-lg text-xs" style={{ background: SOFT }} aria-label="Жоғары">▲</button>
                <button onClick={() => move(i, 1)} className="h-7 w-7 rounded-lg text-xs" style={{ background: SOFT }} aria-label="Төмен">▼</button>
                <button onClick={() => { setRows(rows.filter((_, j) => j !== i)); setDirty(true) }} className="h-7 w-7 rounded-lg text-xs text-red-600" style={{ background: '#FEF2F2' }} aria-label="Өшіру">✕</button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {rows && (
        <button onClick={() => { setRows([...rows, { topic: '', homework: null }]); setDirty(true) }} className="mt-3 w-full rounded-2xl border border-dashed py-3 text-sm font-semibold" style={{ borderColor: LINE, color: BLUE }}>
          + Тақырып қосу
        </button>
      )}

      <div className="sticky bottom-0 z-40 -mx-4 mt-5 border-t bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border" style={{ borderColor: LINE }}>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 text-xs" style={{ color: MUTED }}>{dirty ? 'Өзгерістер сақталмаған' : 'Сақталды ✓'}</div>
          <button onClick={save} disabled={busy || !dirty} className="rounded-2xl px-6 py-3.5 text-[15px] font-semibold text-white disabled:opacity-50" style={{ background: INK }}>
            {busy ? 'Сақталуда…' : 'КТП-ны сақтау'}
          </button>
        </div>
      </div>

      {sheet === 'paste' && <PasteSheet onClose={() => setSheet(null)} onPut={put} />}
      {sheet === 'ai' && <AiSheet classId={cid} onClose={() => setSheet(null)} onPut={put} />}
      {sheet === 'copy' && <CopySheet classId={cid} classes={(classes ?? []).filter((c) => c.id !== cid && c.count > 0)} onClose={() => setSheet(null)} onPut={put} />}
      <Toast text={toast.text} tone={toast.tone} />
    </div>
  )
}

function Preview({ items, onPut }: { items: Row[]; onPut: (items: Row[], mode: 'replace' | 'append') => void }) {
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold">{items.length} сабақ табылды</p>
      <ol className="mt-2 max-h-56 overflow-y-auto rounded-xl border p-2 text-sm" style={{ borderColor: LINE }}>
        {items.map((x, i) => (
          <li key={i} className="py-1">
            <b className="tabular-nums" style={{ color: MUTED }}>{i + 1}.</b> {x.topic}
            {x.homework && <span className="block pl-5 text-xs" style={{ color: MUTED }}>ҮТ: {x.homework}</span>}
          </li>
        ))}
      </ol>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => onPut(items, 'replace')} className="rounded-xl py-3 text-sm font-semibold text-white" style={{ background: INK }}>Ауыстыру</button>
        <button onClick={() => onPut(items, 'append')} className="rounded-xl border py-3 text-sm font-semibold" style={{ borderColor: LINE }}>Соңына қосу</button>
      </div>
      <p className="mt-2 text-xs" style={{ color: MUTED }}>«Ауыстыру» — өтілген тақырыптар сақталады, қалғаны жаңасымен ауысады. Кейін «КТП-ны сақтау» басыңыз.</p>
    </div>
  )
}

function PasteSheet({ onClose, onPut }: { onClose: () => void; onPut: (items: Row[], mode: 'replace' | 'append') => void }) {
  const [text, setText] = useState('')
  const [items, setItems] = useState<Row[] | null>(null)
  const [err, setErr] = useState('')
  const parse = async () => {
    setErr('')
    try {
      const r = await lessonPost('/api/lesson/plan', { action: 'parse', text })
      if (!r.items.length) return setErr('Тақырып табылмады. Әр тақырып жеке жолда болсын.')
      setItems(r.items)
    } catch (e: any) {
      setErr(e.message)
    }
  }
  return (
    <Sheet title="КТП-ны мәтіннен қою" onClose={onClose}>
      <p className="text-sm" style={{ color: MUTED }}>КТП-ның кестесін Word/Excel-ден белгілеп, көшіріп, осында қойыңыз. Әр жол — бір сабақ. Сағат саны (2, 3) болса, тақырып сонша сабаққа бөлінеді.</p>
      <textarea value={text} onChange={(e) => { setText(e.target.value); setItems(null) }} rows={8} placeholder={'1. Натурал сандар — үй: №12, 14\n2. Бөлшектер\n3. Пайыз (2 сағ)'} className="mt-3 w-full rounded-xl border p-3 font-mono text-xs" style={{ borderColor: LINE }} />
      {err && <p className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {!items && <button onClick={parse} disabled={!text.trim()} className="mt-3 w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50" style={{ background: BLUE }}>Тақырыптарға бөлу</button>}
      {items && <Preview items={items} onPut={onPut} />}
    </Sheet>
  )
}

function AiSheet({ classId, onClose, onPut }: { classId: string; onClose: () => void; onPut: (items: Row[], mode: 'replace' | 'append') => void }) {
  const [grade, setGrade] = useState('')
  const [count, setCount] = useState('32')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<Row[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const go = async () => {
    setBusy(true)
    setErr('')
    try {
      const r = await lessonPost('/api/lesson/plan', { action: 'ai', classId, grade, count: Number(count), notes })
      setItems(r.items)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet title="ИИ КТП құрастырсын" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-semibold" style={{ color: MUTED }}>
          Сынып / деңгей
          <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="6 сынып, НЗМ" className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-normal" style={{ borderColor: LINE, color: INK }} />
        </label>
        <label className="text-xs font-semibold" style={{ color: MUTED }}>
          Сабақ саны
          <input inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, ''))} className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-normal" style={{ borderColor: LINE, color: INK }} />
        </label>
      </div>
      <label className="mt-2 block text-xs font-semibold" style={{ color: MUTED }}>
        Талап (міндетті емес)
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Мысалы: қарашадан мамырға дейін, аптасына 3 сабақ, логика есептері көбірек" className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-normal" style={{ borderColor: LINE, color: INK }} />
      </label>
      {err && <p className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {!items && <button onClick={go} disabled={busy} className="mt-3 w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60" style={{ background: BLUE }}>{busy ? 'ИИ құрастырып жатыр… (20–50 сек)' : 'Құрастыру'}</button>}
      {items && <Preview items={items} onPut={onPut} />}
      <p className="mt-3 text-xs" style={{ color: MUTED }}>ИИ жоспары — бастама. Сақтамас бұрын тексеріп, керегін түзетіңіз.</p>
    </Sheet>
  )
}

function CopySheet({ classId, classes, onClose, onPut }: { classId: string; classes: ClassRow[]; onClose: () => void; onPut: (items: Row[], mode: 'replace' | 'append') => void }) {
  const [items, setItems] = useState<Row[] | null>(null)
  const [err, setErr] = useState('')
  const pick = async (from: string) => {
    setErr('')
    try {
      setItems((await lessonPost('/api/lesson/plan', { action: 'copy', classId, fromClassId: from })).items)
    } catch (e: any) {
      setErr(e.message)
    }
  }
  return (
    <Sheet title="Басқа топтан көшіру" onClose={onClose}>
      {!classes.length && <p className="text-sm" style={{ color: MUTED }}>КТП-сы бар басқа топ әлі жоқ.</p>}
      {!items && (
        <div className="grid gap-2">
          {classes.map((c) => (
            <button key={c.id} onClick={() => pick(c.id)} className="flex justify-between rounded-xl border p-3 text-left text-sm" style={{ borderColor: LINE }}>
              <span className="font-semibold">{c.name}</span>
              <span style={{ color: MUTED }}>{c.count} сабақ</span>
            </button>
          ))}
        </div>
      )}
      {err && <p className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {items && <Preview items={items} onPut={onPut} />}
    </Sheet>
  )
}
