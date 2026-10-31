'use client'

// НЗМ гранты: 2026 жылғы мектептер бойынша Min–Max балдар және оқушының соңғы нәтижесі
import type { SeasonView } from '@/lib/bilimSeason'
import { grantCheck, NIS_GRANT_2026, NIS_GRANT_YEAR, NIS_SUBJECT_MIN, NIS_TOTAL } from '@/lib/nisGrant'

const LO = 850
const HI = NIS_TOTAL
const pos = (v: number) => `${Math.max(0, Math.min(100, ((v - LO) / (HI - LO)) * 100))}%`

export function GrantPanel({ season }: { season: SeasonView }) {
  const g = grantCheck(season)
  const rows = g ? g.schools : NIS_GRANT_2026.map((s) => ({ ...s, gap: 0, ok: false }))
  return (
    <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h3 className="font-bold">НЗМ гранты: {NIS_GRANT_YEAR} жылғы балдар</h3>
      <p className="mt-0.5 text-xs text-slate-500">
        Грант жалпы балл бойынша беріледі, бірақ Математикадан кемінде 35 %, Сандық сипаттамадан кемінде 40 % жинау міндетті. Min — сол мектепте грант алған ең төменгі балл.
      </p>

      {g ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-blue-50 p-3">
            <div className="text-xs text-slate-500">{g.monthName} нәтижең</div>
            <div className="text-2xl font-extrabold tabular-nums">{g.total}<span className="text-sm font-medium text-slate-400"> / {NIS_TOTAL}</span></div>
            <div className="text-xs text-slate-600">{g.reached > 0 ? `${g.reached} мектептің шегінен өттің` : 'әзірге бірде-бір мектептің шегіне жетпедің'}</div>
          </div>
          {g.subjects.map((s) => (
            <div key={s.id} className={`rounded-xl p-3 ${s.ok ? 'bg-emerald-50' : 'bg-rose-50'}`}>
              <div className="text-xs text-slate-500">{s.name} · шегі {s.need}</div>
              <div className="text-2xl font-extrabold tabular-nums">{s.score ?? '—'}<span className="text-sm font-medium text-slate-400"> / {s.max}</span></div>
              <div className={`text-xs font-semibold ${s.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{s.ok ? 'Шекті мәннен өттің ✓' : `Шекті мәнге ${s.score === null ? s.need : s.need - s.score} балл жетпейді`}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Барлық 6 пән бойынша нәтиже жарияланғанда, өз баллыңды мектептердің шегімен салыстыра аласың.</p>
      )}

      <div className="mt-4">
        <div className="mb-1 flex items-center gap-2 text-[10px] tabular-nums text-slate-400">
          <span className="w-[38%] shrink-0 sm:w-[30%]" />
          <span className="relative h-3 flex-1">
            {[900, 1100, 1300, 1500].map((v) => <span key={v} className="absolute -translate-x-1/2" style={{ left: pos(v) }}>{v}</span>)}
          </span>
          <span className="w-[84px] shrink-0" />
        </div>
        <ol className="space-y-1.5">
          {rows.map((s) => (
            <li key={s.name} className="flex items-center gap-2 text-[13px]">
              <span className="w-[38%] shrink-0 truncate sm:w-[30%]">{s.name}</span>
              <span className="relative h-5 flex-1 rounded bg-slate-100">
                <span className={`absolute inset-y-1 rounded ${g && s.ok ? 'bg-emerald-400' : 'bg-blue-300'}`} style={{ left: pos(s.min), right: `calc(100% - ${pos(s.max)})` }} title={`${s.min}–${s.max}`} />
                {g && <span className="absolute inset-y-0 w-0.5 bg-[#E5383B]" style={{ left: pos(g.total) }} />}
              </span>
              <span className="w-[84px] shrink-0 text-right text-xs tabular-nums text-slate-500">{s.min}–{s.max}</span>
            </li>
          ))}
        </ol>
        <div className="mt-2 text-xs text-slate-500">
          {g && <><span className="mr-1 inline-block h-3 w-0.5 bg-[#E5383B] align-middle" />сенің баллың · </>}жолақ — грант алғандардың Min–Max баллы
        </div>
      </div>
      <p className="mt-3 text-[11px] text-slate-400">Ай сайынғы Білім тексеру — бағдар ғана; нағыз емтихан нәтижесі басқаша болуы мүмкін.</p>
    </section>
  )
}

// Админ: топтағы әр оқушының соңғы толық айы бойынша грант шегі
export function GrantTable({ season }: { season: SeasonView }) {
  const rows = season.rows
    .map((r) => ({ r, g: grantCheck(season, r.id) }))
    .filter((x) => x.g)
    .sort((a, b) => b.g!.total - a.g!.total)
  if (!rows.length) return null
  return (
    <div className="mt-6">
      <h3 className="font-bold">НЗМ гранты ({NIS_GRANT_YEAR}) — шекті балмен салыстыру</h3>
      <p className="mb-2 text-sm text-slate-500">
        Соңғы толық ай бойынша. Шарт: Мат. ≥ 35 %, Сандық ≥ 40 %. «Мектеп» — Min баллынан өткен мектеп саны ({NIS_GRANT_2026.length} мектептің ішінде).
      </p>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-3 py-2.5">Оқушы</th>
              <th className="px-2 py-2.5 text-right">Ай</th>
              <th className="px-2 py-2.5 text-right">Жалпы</th>
              {NIS_SUBJECT_MIN.map((s) => <th key={s.id} className="px-2 py-2.5 text-right">{s.name.split(' ')[0]}</th>)}
              <th className="px-3 py-2.5 text-right">Мектеп</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ r, g }) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0">
                <td className="whitespace-nowrap px-3 py-2">{r.name}</td>
                <td className="px-2 py-2 text-right text-slate-500">{g!.monthName.slice(0, 3)}</td>
                <td className="px-2 py-2 text-right font-bold tabular-nums">{g!.total}</td>
                {g!.subjects.map((s) => (
                  <td key={s.id} className={`px-2 py-2 text-right tabular-nums ${s.ok ? 'text-emerald-700' : 'font-semibold text-rose-600'}`}>{s.score ?? '—'}/{s.need}</td>
                ))}
                <td className="px-3 py-2 text-right tabular-nums">{g!.thresholdsOk ? g!.reached : <span className="text-rose-600">шек ✗</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
