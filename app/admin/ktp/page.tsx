'use client'

import { useMemo, useState } from 'react'
import { TEMPLATES, buildPlan, calendar } from '@/lib/ktp'

const MON = ['қаң', 'ақп', 'нау', 'сәу', 'мам', 'мау', 'шіл', 'там', 'қыр', 'қаз', 'қар', 'жел']
const dm = (iso: string) => `${Number(iso.slice(8, 10))} ${MON[Number(iso.slice(5, 7)) - 1]}`
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const START = '2026-11-09'

/** КТП үлгілері: апта бойынша кесте (аптасына 2 сабақ), басып шығаруға / PDF-ке */
export default function KtpPage() {
  const [sel, setSel] = useState<string>('all')
  const cal = useMemo(() => calendar(START), [])
  const shown = TEMPLATES.filter((t) => sel === 'all' || t.id === sel)

  return (
    <main className="mx-auto max-w-[200mm] p-5 text-[#0E1424] print:p-0">
      <style>{`@page{size:A4;margin:10mm} @media print{.np{display:none!important}} .tpl{break-before:page} .tpl:first-of-type{break-before:auto}`}</style>
      <div className="np">
        <a href="/admin" className="text-sm font-semibold text-[#2B6BF3]">← Әкімші</a>
        <h1 className="mt-1 text-2xl font-semibold">КТП үлгілері · Қараша 2026 — Мамыр 2027</h1>
        <p className="mt-1 text-sm text-[#687085]">Аптасына 2 сабақ үшін көрсетілген. Топқа қойғанда сабақ күндеріне қарай өзі бейімделеді (1 сабақ — біріктіріледі, 3+ — практикум қосылады). Сары апта — айлық Білім тексеру.</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[{ id: 'all', title: 'Барлығы' }, ...TEMPLATES].map((t) => (
            <button key={t.id} onClick={() => setSel(t.id)} className={`rounded-full px-3 py-1.5 text-xs ${sel === t.id ? 'bg-[#0E1424] text-white' : 'bg-white ring-1 ring-[#E3E7F0]'}`}>{t.title}</button>
          ))}
        </div>
        <button onClick={() => window.print()} className="mt-3 rounded-xl bg-[#0E1424] px-4 py-2.5 text-sm font-semibold text-white">Басып шығару / PDF</button>
      </div>

      {shown.map((t) => {
        const plan = buildPlan(t, 2, START)
        const weeks = cal.map((w, i) => ({ w, items: plan.filter((x) => x.week === i) })).filter((x) => x.items.length)
        return (
          <section key={t.id} className="tpl mt-6 print:mt-0">
            <div className="flex items-end justify-between border-b-2 border-[#0E1424] pb-1.5">
              <div>
                <div className="text-[9px] font-bold tracking-[.2em] text-[#2B6BF3]">BELES EDUCATION · КТП</div>
                <h2 className="text-lg font-bold">{t.title}</h2>
              </div>
              <div className="text-right text-[10px] text-[#687085]">{plan.length} сабақ · {weeks.length} апта</div>
            </div>
            <table className="mt-2 w-full border-collapse text-[10.5px] leading-snug">
              <thead>
                <tr className="bg-[#F1F5F9] text-left">
                  <th className="w-[13mm] border border-[#CBD2DE] px-1.5 py-1">Апта</th>
                  <th className="border border-[#CBD2DE] px-1.5 py-1">1-сабақ</th>
                  <th className="border border-[#CBD2DE] px-1.5 py-1">2-сабақ</th>
                  <th className="w-[38mm] border border-[#CBD2DE] px-1.5 py-1">Үй тапсырмасы</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map(({ w, items }, i) => (
                  <tr key={i} style={{ background: w.kind === 'test' ? '#FEF3C7' : w.kind === 'review' ? '#EEF2FF' : undefined }} className="break-inside-avoid">
                    <td className="border border-[#CBD2DE] px-1.5 py-1 align-top">
                      <b>{i + 1}</b>
                      <div className="text-[9px] text-[#687085]">{dm(w.start)}–{dm(addDays(w.start, 6))}</div>
                    </td>
                    <td className="border border-[#CBD2DE] px-1.5 py-1 align-top">{items[0]?.topic}</td>
                    <td className="border border-[#CBD2DE] px-1.5 py-1 align-top">{items[1]?.topic}</td>
                    <td className="border border-[#CBD2DE] px-1.5 py-1 align-top text-[#475569]">{items[1]?.homework ?? items[0]?.homework ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )
      })}
    </main>
  )
}
