'use client'

import { useEffect, useMemo, useState } from 'react'
import { BRAND, selCls } from './core'
import { fmtSec, type ProctorFlag, type ProctorStats, type Risk } from '@/lib/proctor'

type Row = {
  id: number
  at: string
  actor: string
  action: string
  detail: { ref: string; title: string; name: string | null; partial: boolean; risk: Risk; flags: ProctorFlag[]; stats: ProctorStats; leaves?: { at: number; ms: number }[] }
}

const RISK: Record<Risk, { label: string; bg: string; fg: string }> = {
  high: { label: 'Күдікті', bg: '#FEE2E2', fg: '#B91C1C' },
  medium: { label: 'Назар', bg: '#FEF3C7', fg: '#B45309' },
  ok: { label: 'Таза', bg: '#DCFCE7', fg: '#15803D' },
}
const KIND: Record<string, string> = { bilim: 'Білім тексеру', practice: 'Дайындық', daily: 'Күннің сұрақтары', ielts: 'IELTS', toefl: 'TOEFL', ubt: 'ҰБТ' }

const when = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleString('ru-RU', { timeZone: 'Asia/Almaty', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function Proctor() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [err, setErr] = useState('')
  const [days, setDays] = useState(14)
  const [risk, setRisk] = useState<'all' | 'flagged' | 'high'>('flagged')
  const [kind, setKind] = useState('')
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => {
    setRows(null)
    fetch(`/api/admin/proctor?days=${days}`, { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error ?? 'Қате')
        setRows(j.rows)
      })
      .catch((e) => setErr(e.message))
  }, [days])

  const list = useMemo(
    () =>
      (rows ?? []).filter((r) => {
        const k = r.action.replace('proctor:', '')
        if (kind && k !== kind) return false
        if (risk === 'high') return r.detail.risk === 'high'
        if (risk === 'flagged') return r.detail.risk !== 'ok'
        return true
      }),
    [rows, risk, kind],
  )
  const counts = useMemo(() => ({ high: (rows ?? []).filter((r) => r.detail.risk === 'high').length, medium: (rows ?? []).filter((r) => r.detail.risk === 'medium').length, all: rows?.length ?? 0 }), [rows])

  if (err) return <p className="text-sm" style={{ color: BRAND.red }}>{err}</p>
  if (!rows) return <p className="text-sm" style={{ color: BRAND.muted }}>Жүктелуде…</p>

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4 text-sm" style={{ borderColor: BRAND.line }}>
        <p>
          Онлайн тест кезінде тіркелетіндер: тест бетінен шығу (қанша рет, қанша уақыт), көшіру мен мәтін қою әрекеті, экранды бөлу, жауаптардың тым жылдамдығы және беттен оралған соң бірден жауап беру. Камера қолданылмайды.
        </p>
        <p className="mt-1" style={{ color: BRAND.muted }}>
          «Күдікті» — дәлел емес, белгі: оқушымен сөйлесіп, бір-екі есепті сабақта қайта шығартып көріңіз.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-lg px-2.5 py-1 text-xs font-semibold" style={{ background: RISK.high.bg, color: RISK.high.fg }}>Күдікті: {counts.high}</span>
          <span className="rounded-lg px-2.5 py-1 text-xs font-semibold" style={{ background: RISK.medium.bg, color: RISK.medium.fg }}>Назар: {counts.medium}</span>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Барлық тапсыру: {counts.all}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={risk} onChange={(e) => setRisk(e.target.value as any)} className={selCls} style={{ borderColor: BRAND.line }}>
          <option value="flagged">Тек белгісі барлар</option>
          <option value="high">Тек күдіктілер</option>
          <option value="all">Барлығы</option>
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className={selCls} style={{ borderColor: BRAND.line }}>
          <option value="">Барлық тест түрі</option>
          {Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={selCls} style={{ borderColor: BRAND.line }}>
          <option value={1}>Бүгін</option>
          <option value={7}>7 күн</option>
          <option value={14}>14 күн</option>
          <option value={30}>30 күн</option>
        </select>
      </div>

      <ul className="divide-y rounded-2xl border bg-white" style={{ borderColor: BRAND.line }}>
        {list.length === 0 && <li className="p-4 text-sm" style={{ color: BRAND.muted }}>Бұл кезеңде белгі жоқ.</li>}
        {list.map((r) => {
          const d = r.detail
          const rk = RISK[d.risk] ?? RISK.ok
          return (
            <li key={r.id} className="px-4 py-3">
              <button onClick={() => setOpen(open === r.id ? null : r.id)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-left">
                <span className="rounded-md px-2 py-0.5 text-xs font-semibold" style={{ background: rk.bg, color: rk.fg }}>{rk.label}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{d.name ?? r.actor}</span>
                  <span className="block truncate text-xs" style={{ color: BRAND.muted }}>
                    {KIND[r.action.replace('proctor:', '')] ?? r.action} · {d.title} · {when(r.at)}{d.partial ? ' · аяқталмай жабылды' : ''}
                  </span>
                </span>
                <span className="text-xs tabular-nums" style={{ color: BRAND.muted }}>
                  {d.stats.leaves ? `↗ ${d.stats.leaves} рет, ${fmtSec(d.stats.awaySec)}` : '↗ 0'} · {d.stats.minutes} мин
                </span>
              </button>
              {open === r.id && (
                <div className="mt-2 rounded-xl bg-slate-50 p-3 text-sm">
                  {d.flags.length ? (
                    <ul className="list-disc space-y-1 pl-5">
                      {d.flags.map((f, i) => <li key={i} style={{ color: f.level === 'high' ? '#B91C1C' : '#92400E' }}>{f.text}</li>)}
                    </ul>
                  ) : (
                    <p style={{ color: BRAND.muted }}>Белгі жоқ.</p>
                  )}
                  <p className="mt-2 text-xs" style={{ color: BRAND.muted }}>
                    Ұзақтығы {d.stats.minutes} мин · жауап берілген сұрақ {d.stats.answers}{d.stats.avgSec !== null ? ` · орташа ${d.stats.avgSec} сек/сұрақ` : ''}{d.stats.fastShare !== null ? ` · 3 сек-тан жылдам: ${Math.round(d.stats.fastShare * 100)}%` : ''}
                  </p>
                  {!!d.leaves?.length && (
                    <p className="mt-1 text-xs" style={{ color: BRAND.muted }}>
                      Шыққан сәттері: {d.leaves.map((l) => `${new Date(l.at).toLocaleTimeString('ru-RU', { timeZone: 'Asia/Almaty', hour: '2-digit', minute: '2-digit', second: '2-digit' })} (${Math.round(l.ms / 1000)} сек)`).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
