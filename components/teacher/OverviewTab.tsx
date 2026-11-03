'use client'

import { useEffect, useMemo, useState } from 'react'
import { statusLabel } from '@/lib/payments'
import { WINDOW_DAYS, type Alert, type Overview, type StudentInsight } from '@/lib/teacherInsights'
import type { TeacherReport } from '@/lib/teacherOps'

const ALERT_STYLE: Record<Alert['level'], { bg: string; dot: string; label: string }> = {
  high: { bg: 'bg-red-50 border-red-200', dot: 'bg-red-500', label: 'Шұғыл' },
  medium: { bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500', label: 'Назар аударыңыз' },
  info: { bg: 'bg-sky-50 border-sky-200', dot: 'bg-sky-500', label: 'Еске салу' },
}

const RISK_BADGE: Record<StudentInsight['risk'], { cls: string; label: string }> = {
  high: { cls: 'bg-red-100 text-red-700', label: 'Қауіп' },
  medium: { cls: 'bg-amber-100 text-amber-700', label: 'Назар' },
  ok: { cls: 'bg-emerald-100 text-emerald-700', label: 'Жақсы' },
}

function rateColor(r: number | null) {
  if (r == null) return 'bg-zinc-200'
  if (r >= 80) return 'bg-emerald-500'
  if (r >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

function fmtDate(iso: string | null) {
  return iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}` : '—'
}

export default function OverviewTab() {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [classFilter, setClassFilter] = useState<string>('all')
  const [riskOnly, setRiskOnly] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [week, setWeek] = useState<{ from: string; to: string; row: TeacherReport | null } | null>(null)

  useEffect(() => {
    fetch('/api/teacher/report')
      .then((r) => (r.ok ? r.json() : null))
      .then(setWeek)
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/teacher/overview')
      .then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error ?? 'Қате')
        setData(j)
      })
      .catch((e) => setError(e.message))
  }, [])

  const students = useMemo(() => {
    if (!data) return []
    const cls = data.classes.find((c) => c.id === classFilter)
    return data.students.filter((s) => (!cls || s.classes.includes(cls.name)) && (!riskOnly || s.risk !== 'ok'))
  }, [data, classFilter, riskOnly])

  if (error) return <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
  if (!data) return <p className="mt-6 text-sm text-zinc-500">Жүктелуде...</p>

  const { totals } = data

  return (
    <div className="mt-6 space-y-6">
      {/* Жалпы көрсеткіштер */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Оқушылар" value={String(totals.students)} />
        <Stat label="Топтар" value={String(totals.classes)} />
        <Stat label={`Қатысу (${WINDOW_DAYS} күн)`} value={totals.rate == null ? '—' : `${totals.rate}%`} />
        <Stat label="Назар керек" value={String(totals.atRisk)} accent={totals.atRisk > 0} />
      </div>

      {/* Менің аптам */}
      {week?.row && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-bold">Менің аптам <span className="text-sm font-normal text-zinc-500">· {week.from.slice(8, 10)}.{week.from.slice(5, 7)}–{week.to.slice(8, 10)}.{week.to.slice(5, 7)}</span></h2>
            {week.row.score !== null && <span className="text-2xl font-black">{week.row.score}<span className="text-xs font-normal text-zinc-400">/100</span></span>}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-xl bg-zinc-50 p-2"><div className="text-lg font-bold">{week.row.held}{week.row.scheduled ? `/${week.row.scheduled}` : ''}</div><div className="text-xs text-zinc-500">сабақ</div></div>
            <div className="rounded-xl bg-zinc-50 p-2"><div className="text-lg font-bold">{week.row.journal ?? '—'}%</div><div className="text-xs text-zinc-500">журнал</div></div>
            <div className="rounded-xl bg-zinc-50 p-2"><div className="text-lg font-bold">{week.row.attendance ?? '—'}%</div><div className="text-xs text-zinc-500">қатысу</div></div>
          </div>
          {week.row.unmarked.length > 0 ? (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Журналда белгіленбеген: {week.row.unmarked.map((u) => `${u.class} (${u.date.slice(8, 10)}.${u.date.slice(5, 7)})`).join(', ')} — «Сабақ журналы» бөлімінде толтырыңыз.
            </p>
          ) : (
            <p className="mt-3 text-sm text-emerald-700">Журнал толық толтырылған ✓</p>
          )}
        </section>
      )}

      {/* Хабарламалар */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-base font-bold">
          Хабарламалар
          {data.alerts.length > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">{data.alerts.length}</span>}
        </h2>
        {data.alerts.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Бәрі жақсы — жаңа ескерту жоқ.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.alerts.map((a, i) => (
              <li key={i} className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm ${ALERT_STYLE[a.level].bg}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ALERT_STYLE[a.level].dot}`} />
                <div className="flex-1">
                  <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{ALERT_STYLE[a.level].label}</span>
                  {a.studentId ? (
                    <button className="text-left hover:underline" onClick={() => setOpen(a.studentId!)}>{a.text}</button>
                  ) : (
                    a.text
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Топтар */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-bold">Менің топтарым</h2>
        {data.classes.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Сізге әлі топ бекітілмеген. Әкімшіге жазыңыз.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {data.classes.map((c) => (
              <button
                key={c.id}
                onClick={() => setClassFilter(classFilter === c.id ? 'all' : c.id)}
                className={`rounded-xl border p-4 text-left transition ${classFilter === c.id ? 'border-black ring-1 ring-black' : 'border-zinc-200 hover:border-zinc-400'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-zinc-500">{c.subject ?? 'Пән көрсетілмеген'} · {c.students} оқушы</p>
                  </div>
                  <span className="text-lg font-black">{c.rate == null ? '—' : `${c.rate}%`}</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                  <div className={`h-full ${rateColor(c.rate)}`} style={{ width: `${c.rate ?? 0}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {c.atRisk > 0 && <span className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-700">{c.atRisk} оқушыға назар керек</span>}
                  {c.unmarked.length > 0 && <span className="rounded-md bg-sky-100 px-2 py-0.5 text-sky-700">{c.unmarked.length} сабақ белгіленбеген</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Оқушылар талдауы */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold">Оқушылар талдауы</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="rounded-lg border border-zinc-300 px-2 py-1.5">
              <option value="all">Барлық топтар</option>
              {data.classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={riskOnly} onChange={(e) => setRiskOnly(e.target.checked)} />
              Тек назар керектер
            </label>
          </div>
        </div>

        {students.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">Оқушы табылмады.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100">
            {students.map((s) => (
              <li key={s.id}>
                <button onClick={() => setOpen(open === s.id ? null : s.id)} className="flex w-full items-center gap-3 py-3 text-left">
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${RISK_BADGE[s.risk].cls}`}>{RISK_BADGE[s.risk].label}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.full_name}</p>
                    <p className="truncate text-xs text-zinc-500">{[s.classes.join(', ') || s.group_name, s.grade ? `${s.grade} сынып` : null].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="hidden w-28 sm:block">
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                      <div className={`h-full ${rateColor(s.rate)}`} style={{ width: `${s.rate ?? 0}%` }} />
                    </div>
                  </div>
                  <span className="w-12 text-right text-sm font-bold">{s.rate == null ? '—' : `${s.rate}%`}</span>
                  {s.trend != null && s.trend !== 0 && (
                    <span className={`w-10 text-right text-xs font-semibold ${s.trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {s.trend > 0 ? '▲' : '▼'}{Math.abs(s.trend)}
                    </span>
                  )}
                </button>
                {open === s.id && <StudentDetail s={s} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'border-amber-300 bg-amber-50' : 'border-zinc-200 bg-white'}`}>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  )
}

function StudentDetail({ s }: { s: StudentInsight }) {
  return (
    <div className="mb-3 rounded-xl bg-zinc-50 p-4 text-sm">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini label="Келді" value={s.present} />
        <Mini label="Кешікті" value={s.late} />
        <Mini label="Келмеді" value={s.absent} />
        <Mini label="Себепті" value={s.excused} />
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        <Row k="Соңғы келген күні" v={fmtDate(s.lastPresent)} />
        <Row k="Қатарынан келмеді" v={String(s.absentStreak)} />
        <Row k="Рейтинг ұпайы" v={String(s.rating)} />
        <Row k="Төлем" v={statusLabel(s.payment)} />
      </dl>
      {s.reasons.length > 0 && (
        <ul className="mt-3 list-inside list-disc text-amber-800">
          {s.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white p-2 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-zinc-200 py-1">
      <dt className="text-zinc-500">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  )
}
