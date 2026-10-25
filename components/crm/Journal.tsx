'use client'

import { useEffect, useState } from 'react'
import { BRAND } from './core'

type Row = { id: number; at: string; actor: string; action: string; ip: string | null; detail: any }
type Err = { id: number; at: string; source: string; message: string; url: string | null; ip: string | null }
type Data = { audit: Row[]; errors: Err[]; names: Record<string, string>; missing?: boolean }

// Әрекеттердің түсінікті атаулары
const LABEL: [RegExp, string][] = [
  [/^admin\.login$/, 'Әкімші кабинетіне кірді'],
  [/^admin\.login\.fail$/, '⚠ Әкімші: қате құпия сөз'],
  [/^login$/, 'Мұғалім кабинетіне кірді'],
  [/^login\.fail$/, '⚠ Мұғалім: қате құпия сөз'],
  [/ \/api\/students/, 'Оқушылар тізімін өзгертті'],
  [/ \/api\/teachers/, 'Мұғалімдерді өзгертті'],
  [/ \/api\/groups/, 'Топтарды өзгертті'],
  [/ \/api\/crm/, 'CRM: оқушы, төлем не қатысу'],
  [/ \/api\/payments/, 'Төлемдер'],
  [/ \/api\/attendance/, 'Қатысу'],
  [/ \/api\/schedule/, 'Сабақ кестесі'],
  [/ \/api\/bilim-test\/admin/, 'Білім тексеру: сынақ, жауаптар, нәтиже'],
  [/ \/api\/ielts\/teacher/, 'Mock тесттер: тест, рұқсат, бағалау'],
  [/ \/api\/materials/, 'Оқу материалдары'],
]
const label = (a: string) => LABEL.find(([re]) => re.test(a))?.[1] ?? a
const METHOD: Record<string, string> = { POST: 'қосу/өзгерту', PUT: 'өзгерту', PATCH: 'өзгерту', DELETE: 'өшіру' }

export default function Journal() {
  const [d, setD] = useState<Data | null>(null)
  const [tab, setTab] = useState<'audit' | 'errors'>('audit')
  useEffect(() => {
    fetch('/api/admin/journal', { cache: 'no-store' }).then((r) => r.json()).then(setD).catch(() => setD({ audit: [], errors: [], names: {}, missing: true }))
  }, [])
  if (!d) return <p className="py-10 text-center" style={{ color: BRAND.muted }}>Жүктелуде…</p>
  if (d.missing) return <div className="rounded-2xl border bg-white p-6 text-sm" style={{ borderColor: BRAND.line }}>Журнал әлі қосылмаған: Supabase-те <b>security</b> SQL файлын іске қосыңыз.</div>

  const who = (actor: string) => {
    const [kind, id] = actor.split(':')
    const n = d.names[id] ?? id
    return kind === 'admin' ? `${n} (әкімші)` : kind === 'teacher' ? `${n} (мұғалім)` : actor
  }
  const when = (s: string) => new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-xl p-1" style={{ background: '#EEF0F4' }}>
        {(['audit', 'errors'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className="rounded-lg px-4 py-1.5 text-sm font-semibold" style={tab === t ? { background: '#fff', color: BRAND.ink } : { color: BRAND.muted }}>
            {t === 'audit' ? `Әрекеттер · ${d.audit.length}` : `Сайт қателері · ${d.errors.length}`}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-white" style={{ borderColor: BRAND.line }}>
        {tab === 'audit' ? (
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b text-left text-xs" style={{ borderColor: BRAND.line, color: BRAND.muted }}><th className="px-4 py-3 font-medium">Уақыты</th><th className="px-4 py-3 font-medium">Кім</th><th className="px-4 py-3 font-medium">Не істеді</th><th className="px-4 py-3 font-medium">IP</th></tr></thead>
            <tbody>
              {d.audit.map((r) => {
                const m = r.action.split(' ')[0]
                return (
                  <tr key={r.id} className="border-b last:border-0" style={{ borderColor: BRAND.line }}>
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums" style={{ color: BRAND.muted }}>{when(r.at)}</td>
                    <td className="px-4 py-2 font-medium">{who(r.actor)}</td>
                    <td className="px-4 py-2" style={r.action.includes('fail') ? { color: BRAND.red } : undefined}>
                      {label(r.action)}{METHOD[m] ? <span style={{ color: BRAND.muted }}> · {METHOD[m]}</span> : null}
                    </td>
                    <td className="px-4 py-2 text-xs tabular-nums" style={{ color: BRAND.muted }}>{r.ip}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b text-left text-xs" style={{ borderColor: BRAND.line, color: BRAND.muted }}><th className="px-4 py-3 font-medium">Уақыты</th><th className="px-4 py-3 font-medium">Қате</th><th className="px-4 py-3 font-medium">Бет</th></tr></thead>
            <tbody>
              {d.errors.map((r) => (
                <tr key={r.id} className="border-b align-top last:border-0" style={{ borderColor: BRAND.line }}>
                  <td className="whitespace-nowrap px-4 py-2 tabular-nums" style={{ color: BRAND.muted }}>{when(r.at)}</td>
                  <td className="px-4 py-2"><span className="mr-2 rounded px-1.5 py-0.5 text-[11px] font-semibold" style={{ background: '#F1F3F7' }}>{r.source}</span>{r.message}</td>
                  <td className="break-all px-4 py-2 text-xs" style={{ color: BRAND.muted }}>{r.url}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {(tab === 'audit' ? d.audit : d.errors).length === 0 && <p className="p-8 text-center text-sm" style={{ color: BRAND.muted }}>Әзірге жазба жоқ.</p>}
      </div>
    </div>
  )
}
