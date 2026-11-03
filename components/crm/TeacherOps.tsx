'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, MessageCircle, Trophy } from 'lucide-react'
import { BRAND, inputCls, btnDark, btnLine } from './core'
import { monthRange, payText, reminderText, weekStart, weeklyText, type TeacherReport } from '@/lib/teacherOps'
import { addDays } from '@/lib/journal'
import { waUrl } from '@/lib/parentMessages'

type Tab = 'week' | 'pay' | 'rating'
const MONTHS = ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым', 'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан']
const today = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10)
const dm = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`
const tg = (n: number | null | undefined) => (n == null ? '—' : `${n.toLocaleString('ru-RU')} ₸`)
const shiftMonth = (ym: string, k: number) => {
  const d = new Date(`${ym}-01T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + k)
  return d.toISOString().slice(0, 7)
}
const tone = (v: number | null) => (v == null ? BRAND.muted : v >= 85 ? '#15803D' : v >= 65 ? '#B45309' : '#B91C1C')

export default function TeacherOps({ flash }: { flash: (m: string) => void }) {
  const [tab, setTab] = useState<Tab>('week')
  const [week, setWeek] = useState(() => weekStart(today()))
  const [month, setMonth] = useState(() => today().slice(0, 7))
  const [rows, setRows] = useState<TeacherReport[] | null>(null)
  const [err, setErr] = useState('')

  const [from, to] = useMemo<[string, string]>(() => (tab === 'week' ? [week, addDays(week, 6)] : monthRange(month)), [tab, week, month])

  const load = useCallback(async () => {
    setRows(null)
    setErr('')
    const r = await fetch(`/api/admin/teacher-ops?from=${from}&to=${to}`, { cache: 'no-store' })
    const j = await r.json()
    if (!r.ok) return setErr(j.error ?? 'Қате')
    setRows(j.rows)
  }, [from, to])
  useEffect(() => {
    load()
  }, [load])

  const save = async (id: string, patch: Record<string, unknown>) => {
    const r = await fetch('/api/admin/teacher-ops', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...patch }) })
    const j = await r.json()
    if (!r.ok) return flash(j.error ?? 'Қате')
    flash('Сақталды')
    load()
  }

  const open = (phone: string | null, text: string | null) => {
    if (!text) return
    const u = waUrl(phone, text)
    if (!u) return flash('Мұғалімнің WhatsApp нөмірі жоқ — «Еңбекақы» бөлімінде қосыңыз')
    window.open(u, '_blank', 'noopener')
  }

  const totalPay = (rows ?? []).reduce((a, r) => a + (r.pay ?? 0), 0)
  const csv = () => {
    const lines = [['Мұғалім', 'Пәні', 'Өткізген сабақ', 'Бір сабақ (₸)', 'Барлығы (₸)', 'Журнал %', 'Қатысу %'].join(';')]
    for (const r of rows ?? []) lines.push([r.name, r.subject ?? '', r.held, r.rate ?? '', r.pay ?? '', r.journal ?? '', r.attendance ?? ''].join(';'))
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `enbekaky-${month}.csv`
    a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {([['week', 'Апталық есеп'], ['pay', 'Еңбекақы'], ['rating', 'Рейтинг пен бонус']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className="rounded-lg px-3.5 py-2 text-sm font-semibold" style={{ background: tab === k ? BRAND.ink : '#fff', color: tab === k ? '#fff' : BRAND.text, border: `1px solid ${BRAND.line}` }}>
            {l}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1 rounded-lg border bg-white px-1 py-1 text-sm" style={{ borderColor: BRAND.line }}>
          <button aria-label="Алдыңғы" onClick={() => (tab === 'week' ? setWeek(addDays(week, -7)) : setMonth(shiftMonth(month, -1)))} className="rounded p-1.5 hover:bg-slate-100"><ChevronLeft size={16} /></button>
          <span className="min-w-[130px] text-center font-semibold">{tab === 'week' ? `${dm(from)} – ${dm(to)}` : `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`}</span>
          <button aria-label="Келесі" onClick={() => (tab === 'week' ? setWeek(addDays(week, 7)) : setMonth(shiftMonth(month, 1)))} className="rounded p-1.5 hover:bg-slate-100"><ChevronRight size={16} /></button>
        </div>
      </div>

      {err && <p className="rounded-xl p-3 text-sm" style={{ background: '#FEF2F2', color: BRAND.red }}>{err}</p>}
      {!rows && !err && <p className="text-sm" style={{ color: BRAND.muted }}>Жүктелуде…</p>}

      {rows && tab === 'week' && (
        <>
          <p className="text-sm" style={{ color: BRAND.muted }}>
            Сабақ журналы бойынша өзі есептеледі. Әр мұғалімге есепті не белгіленбеген сабақтар туралы ескертуді WhatsApp-пен бір басып жіберуге болады.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {rows.map((r) => (
              <div key={r.id} className="rounded-2xl border bg-white p-4" style={{ borderColor: BRAND.line }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-xs" style={{ color: BRAND.muted }}>{r.subject ?? '—'} · {r.classes} топ · {r.students} оқушы</div>
                  </div>
                  {r.score !== null && <div className="text-right"><div className="text-xl font-bold tabular-nums" style={{ color: tone(r.score) }}>{r.score}</div><div className="text-[10px]" style={{ color: BRAND.muted }}>/100</div></div>}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <Mini label="Сабақ" value={`${r.held}${r.scheduled ? `/${r.scheduled}` : ''}`} />
                  <Mini label="Журнал" value={r.journal == null ? '—' : `${r.journal}%`} color={tone(r.journal)} />
                  <Mini label="Қатысу" value={r.attendance == null ? '—' : `${r.attendance}%`} color={tone(r.attendance)} />
                </div>
                {r.unmarked.length > 0 && (
                  <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                    Белгіленбеген: {r.unmarked.slice(0, 6).map((u) => `${u.class} (${dm(u.date)})`).join(', ')}{r.unmarked.length > 6 ? ` және тағы ${r.unmarked.length - 6}` : ''}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => open(r.phone, weeklyText(r, from, to))} className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold" style={{ borderColor: BRAND.line }}>
                    <MessageCircle size={13} className="text-green-600" /> Есепті жіберу
                  </button>
                  {r.unmarked.length > 0 && (
                    <button onClick={() => open(r.phone, reminderText(r))} className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold" style={{ borderColor: '#FCD34D' }}>
                      <MessageCircle size={13} className="text-amber-600" /> Журнал туралы ескерту
                    </button>
                  )}
                  {!r.phone && <span className="self-center text-xs" style={{ color: BRAND.red }}>нөмір жоқ</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {rows && tab === 'pay' && (
        <>
          <p className="text-sm" style={{ color: BRAND.muted }}>
            Өткізілген сабақ = журналда қатысуы белгіленген сабақ. Бір сабақтың ақысын және мұғалімнің WhatsApp нөмірін осы жерде жазыңыз — өзі сақталады.
          </p>
          <div className="overflow-x-auto rounded-2xl border bg-white" style={{ borderColor: BRAND.line }}>
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs" style={{ borderColor: BRAND.line, color: BRAND.muted }}>
                  <th className="px-4 py-3 font-medium">Мұғалім</th>
                  <th className="px-4 py-3 font-medium">WhatsApp</th>
                  <th className="px-4 py-3 text-right font-medium">Сабақ</th>
                  <th className="px-4 py-3 text-right font-medium">Бір сабақ, ₸</th>
                  <th className="px-4 py-3 text-right font-medium">Барлығы</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0" style={{ borderColor: BRAND.line }}>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-xs" style={{ color: BRAND.muted }}>{r.subject ?? '—'}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <input defaultValue={r.phone ?? ''} inputMode="tel" placeholder="8 7XX…" onBlur={(e) => e.target.value !== (r.phone ?? '') && save(r.id, { phone: e.target.value })} className={inputCls} style={{ borderColor: BRAND.line, width: 150 }} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.held}</td>
                    <td className="px-4 py-2.5 text-right">
                      <input defaultValue={r.rate ?? ''} inputMode="numeric" placeholder="0" onBlur={(e) => e.target.value !== String(r.rate ?? '') && save(r.id, { lesson_rate: e.target.value })} className={`${inputCls} text-right`} style={{ borderColor: BRAND.line, width: 110 }} />
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{tg(r.pay)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => open(r.phone, payText(r, `${MONTHS[Number(month.slice(5, 7)) - 1].toLowerCase()} ${month.slice(0, 4)}`))} aria-label="WhatsApp" className="rounded-lg border p-1.5" style={{ borderColor: BRAND.line }}>
                        <MessageCircle size={15} className="text-green-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right font-semibold">Барлық еңбекақы:</td>
                  <td className="px-4 py-3 text-right text-base font-bold tabular-nums">{tg(totalPay)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <button onClick={csv} className={`${btnLine} flex items-center gap-1.5`} style={{ borderColor: BRAND.line }}>
            <Download size={15} /> Excel (CSV) жүктеу
          </button>
        </>
      )}

      {rows && tab === 'rating' && (
        <>
          <p className="text-sm" style={{ color: BRAND.muted }}>
            Рейтинг = журналды уақтылы толтыру (40%) + оқушылардың қатысуы (40%) + оқушылардың орталықта қалуы (20%). Ай соңында үздікке бонус беру ұсынылады.
          </p>
          {rows[0]?.score != null && (
            <div className="flex items-center gap-3 rounded-2xl border bg-gradient-to-r from-amber-50 to-white p-4" style={{ borderColor: '#FCD34D' }}>
              <Trophy className="text-amber-500" size={28} />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">{MONTHS[Number(month.slice(5, 7)) - 1]} айының үздігі — бонус ұсынылады</div>
                <div className="text-lg font-bold">{rows[0].name} · {rows[0].score}/100</div>
              </div>
            </div>
          )}
          <ol className="divide-y rounded-2xl border bg-white" style={{ borderColor: BRAND.line }}>
            {rows.map((r, i) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="grid h-8 w-8 place-items-center rounded-full text-sm font-bold text-white" style={{ background: i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#B45309' : BRAND.ink }}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-xs" style={{ color: BRAND.muted }}>
                    Журнал {r.journal ?? '—'}% · Қатысу {r.attendance ?? '—'}% · Оқушылар қалды {r.retention ?? '—'}%{r.left ? ` (${r.left} кетті)` : ''}
                  </div>
                </div>
                <div className="hidden w-40 sm:block">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${r.score ?? 0}%`, background: tone(r.score) }} />
                  </div>
                </div>
                <span className="w-12 text-right text-lg font-bold tabular-nums" style={{ color: tone(r.score) }}>{r.score ?? '—'}</span>
              </li>
            ))}
          </ol>
          <button onClick={() => setTab('pay')} className={btnDark} style={{ background: BRAND.ink }}>Еңбекақыға өту</button>
        </>
      )}
    </div>
  )
}

function Mini({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-1.5">
      <div className="text-base font-bold tabular-nums" style={{ color }}>{value}</div>
      <div className="text-[11px]" style={{ color: BRAND.muted }}>{label}</div>
    </div>
  )
}
