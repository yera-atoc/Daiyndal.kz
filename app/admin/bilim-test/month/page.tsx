'use client'

// Айдың Білім тексеру нәтижелері — барлық топ, әр топ бөлек бетте (A4). НЗМ-6 — 2 бет: рейтинг + талдау.
// /admin/bilim-test/month?month=2026-10
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import PrintStyles from '@/components/bilim/PrintStyles'
import { MONTHS_GEN } from '@/components/bilim/ReportSheet'
import { commonDelta, examMax, monthName, ranking, rowTotal, type Exam, type Group, type ScoreRow, type Student, type Submission } from '@/lib/bilimTest'
import { NIS_GRANT_2026, NIS_SUBJECT_MIN } from '@/lib/nisGrant'

const BLUE = '#2563EB'
const INK = '#0E1424'

type GroupData = {
  group: Group
  exam: Exam
  students: Student[]
  subs: Submission[]
  previous: { title: string; scores: Record<string, ScoreRow> } | null
}

type Row = { name: string; place: number | null; scores: ScoreRow; total: number | null; delta: number | null }

async function api(url: string) {
  const r = await fetch(url, { cache: 'no-store' })
  const j = await r.json()
  if (!r.ok) throw new Error(j.error || 'Қате')
  return j
}

function rowsOf(d: GroupData): { done: Row[]; missing: string[] } {
  const roster = d.students.map((s) => s.full_name)
  const rk = ranking(d.exam, d.subs.filter((s) => roster.includes(s.student_name)))
  const done = roster
    .filter((n) => rk.scores[n] && rowTotal(rk.scores[n]) !== null)
    .map((n) => ({ name: n, place: rk.place[n] ?? null, scores: rk.scores[n], total: rowTotal(rk.scores[n]), delta: commonDelta(rk.scores[n], d.previous?.scores[n]) }))
    .sort((a, b) => (a.place ?? 999) - (b.place ?? 999) || a.name.localeCompare(b.name))
  return { done, missing: roster.filter((n) => !done.some((r) => r.name === n)) }
}

function today() {
  const d = new Date()
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`
}

const pct = (v: number, m: number) => (m ? Math.round((v / m) * 100) : 0)
const fmtDelta = (d: number | null) => (d === null ? '' : d > 0 ? `+${d}` : d < 0 ? `−${Math.abs(d)}` : '0')

function Head({ d, page, pages }: { d: GroupData; page?: number; pages?: number }) {
  return (
    <>
      <div className="flex items-start justify-between">
        <img src="/beles-logo.png" alt="Beles education" style={{ height: '12mm' }} />
        <div className="text-right">
          <div className="text-[8.5pt] font-bold uppercase tracking-[.12em]" style={{ color: BLUE }}>Білім тексеру · {d.exam.title}</div>
          <div className="mt-0.5 text-[9pt] text-slate-500">{pages ? `${page}/${pages} бет` : 'Топ нәтижелері'}{!d.exam.published && ' · жарияланбаған'}</div>
        </div>
      </div>
      <div className="mt-[4mm] h-[1mm] bg-black" />
      <h1 className="mt-[5mm] text-[19pt] font-extrabold leading-tight tracking-tight">{d.group.name}</h1>
    </>
  )
}

function Foot({ d }: { d: GroupData }) {
  return (
    <div className="mt-auto flex justify-between border-t border-slate-200 pt-[2.5mm] text-[7.5pt] text-slate-500">
      <span>Beles education · Білім тексеру · {d.exam.title}</span>
      <span>{d.group.name} · {today()}</span>
    </div>
  )
}

function Kpis({ items }: { items: [string, string, string?][] }) {
  return (
    <div className="mt-[4mm] grid gap-[3mm]" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map(([l, v, s]) => (
        <div key={l} className="rounded-[2.5mm] bg-[#F1F5FE] px-[3.5mm] py-[2.5mm]">
          <div className="text-[7pt] font-bold uppercase tracking-[.08em] text-slate-500">{l}</div>
          <div className="mt-[0.5mm] text-[16pt] font-extrabold leading-none">{v}</div>
          {s && <div className="mt-[0.8mm] text-[7.5pt] text-slate-500">{s}</div>}
        </div>
      ))}
    </div>
  )
}

// Нәтижелер кестесі (барлық топқа ортақ)
function Table({ d, done, missing, dense }: { d: GroupData; done: Row[]; missing: string[]; dense: boolean }) {
  const subj = d.exam.subjects
  const max = examMax(d.exam)
  const py = dense ? 'py-[1.1mm]' : 'py-[1.6mm]'
  const avg = (id: string) => {
    const v = done.map((r) => r.scores[id]).filter((x): x is number => typeof x === 'number')
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null
  }
  const totals = done.map((r) => r.total ?? 0)
  const avgTotal = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null
  return (
    <>
      <table className={`mt-[4mm] w-full border-collapse ${dense ? 'text-[8.3pt]' : 'text-[9pt]'}`}>
        <thead>
          <tr className="border-b-2 border-black text-[6.8pt] uppercase tracking-[.06em] text-slate-500">
            <th className="py-[1.4mm] pr-[1mm] text-right font-semibold">Орын</th>
            <th className="py-[1.4mm] pl-[2mm] text-left font-semibold">Оқушы</th>
            {subj.map((s) => (
              <th key={s.id} className="py-[1.4mm] text-right font-semibold">{s.short}<div className="font-normal normal-case tracking-normal text-slate-400">/{s.max}</div></th>
            ))}
            <th className="py-[1.4mm] text-right font-semibold text-black">Жалпы<div className="font-normal normal-case tracking-normal text-slate-400">/{max}</div></th>
            <th className="py-[1.4mm] text-right font-semibold">%</th>
            {d.previous && <th className="py-[1.4mm] text-right font-semibold">Өзг.</th>}
          </tr>
        </thead>
        <tbody>
          {done.map((r, i) => (
            <tr key={r.name} className={`border-b border-slate-200 ${i % 2 ? 'bg-slate-50/70' : ''}`}>
              <td className={`${py} pr-[1mm] text-right font-bold tabular-nums`} style={{ color: (r.place ?? 9) <= 3 ? BLUE : undefined }}>{r.place ?? '—'}</td>
              <td className={`${py} pl-[2mm] font-semibold`}>{r.name}</td>
              {subj.map((s) => {
                const v = r.scores[s.id]
                return <td key={s.id} className={`${py} text-right tabular-nums`}>{typeof v === 'number' ? v : <span className="text-[7pt] text-slate-400">—</span>}</td>
              })}
              <td className={`${py} text-right font-extrabold tabular-nums`}>{r.total}</td>
              <td className={`${py} text-right tabular-nums text-slate-600`}>{pct(r.total ?? 0, max)}</td>
              {d.previous && (
                <td className={`${py} text-right tabular-nums`} style={{ color: r.delta === null ? '#94A3B8' : r.delta >= 0 ? '#16A34A' : '#DC2626' }}>{fmtDelta(r.delta)}</td>
              )}
            </tr>
          ))}
          {done.length > 1 && (
            <tr className="border-t-2 border-black text-slate-600">
              <td />
              <td className={`${py} pl-[2mm] font-semibold`}>Топ бойынша орташа</td>
              {subj.map((s) => <td key={s.id} className={`${py} text-right tabular-nums`}>{avg(s.id) ?? '—'}</td>)}
              <td className={`${py} text-right font-bold tabular-nums`}>{avgTotal}</td>
              <td className={`${py} text-right tabular-nums`}>{avgTotal !== null ? pct(avgTotal, max) : ''}</td>
              {d.previous && <td />}
            </tr>
          )}
        </tbody>
      </table>
      {missing.length > 0 && (
        <p className="mt-[3mm] text-[8pt] leading-snug text-slate-500"><b className="text-slate-700">Тапсырмаған ({missing.length}):</b> {missing.join(', ')}</p>
      )}
      <p className="mt-[2mm] text-[7.5pt] leading-snug text-slate-400">
        «—» — пән тапсырылмаған (0 болып саналады). {d.previous ? `«Өзг.» — ${d.previous.title} айымен салыстырғанда, екі айда да тапсырылған пәндер бойынша.` : ''} Тең балл — тең орын.
      </p>
    </>
  )
}

function GroupPage({ d }: { d: GroupData }) {
  const { done, missing } = rowsOf(d)
  const max = examMax(d.exam)
  const best = done[0]
  const avg = done.length ? Math.round(done.reduce((a, r) => a + (r.total ?? 0), 0) / done.length) : 0
  return (
    <section className="bt-sheet mx-auto flex flex-col bg-white text-[#111] shadow-xl">
      <Head d={d} />
      <Kpis
        items={[
          ['Тапсырғандар', `${done.length}`, `${d.students.length} оқушының ішінде`],
          ['Орташа балл', `${avg}`, `/ ${max} · ${pct(avg, max)} %`],
          ['Ең жоғары', best ? `${best.total}` : '—', best ? best.name : ''],
        ]}
      />
      <Table d={d} done={done} missing={missing} dense={done.length > 24} />
      <Foot d={d} />
    </section>
  )
}

// НЗМ-6: 2-бет — пәндер бойынша талдау, грант шегі
function NzmAnalysis({ d }: { d: GroupData }) {
  const { done } = rowsOf(d)
  const subj = d.exam.subjects
  const stats = subj.map((s) => {
    const vals = done.map((r) => ({ name: r.name, v: r.scores[s.id] })).filter((x): x is { name: string; v: number } => typeof x.v === 'number')
    const avg = vals.length ? vals.reduce((a, x) => a + x.v, 0) / vals.length : 0
    const top = [...vals].sort((a, b) => b.v - a.v).slice(0, 3)
    return { s, n: vals.length, avg, top, p: pct(avg, s.max) }
  })
  const strongest = [...stats].sort((a, b) => b.p - a.p)[0]
  const weakest = [...stats].sort((a, b) => a.p - b.p)[0]
  const thr = NIS_SUBJECT_MIN.map((t) => ({ ...t, max: subj.find((s) => s.id === t.id)?.max ?? 0 })).filter((t) => t.max)
  const grant = done.map((r) => {
    const okSubj = thr.every((t) => typeof r.scores[t.id] === 'number' && (r.scores[t.id] as number) >= Math.ceil(t.max * t.share))
    const total = r.total ?? 0
    const schools = okSubj ? NIS_GRANT_2026.filter((s) => total >= s.min).length : 0
    return { r, okSubj, schools }
  })
  const minAll = Math.min(...NIS_GRANT_2026.map((s) => s.min))
  return (
    <section className="bt-sheet mx-auto flex flex-col bg-white text-[#111] shadow-xl">
      <Head d={d} page={2} pages={2} />
      <p className="mt-[1mm] text-[10pt] text-slate-500">Пәндер бойынша талдау және НЗМ грант шегімен салыстыру</p>

      <h2 className="mt-[5mm] text-[12pt] font-bold">Пәндер бойынша орташа нәтиже, %</h2>
      <div className="mt-[2.5mm] space-y-[2mm]">
        {stats.map((x) => (
          <div key={x.s.id} className="grid grid-cols-[38mm_1fr_22mm] items-center gap-[3mm] text-[9pt]">
            <span className="font-semibold">{x.s.name}</span>
            <span className="relative h-[4mm] rounded-full bg-slate-100">
              <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${x.p}%`, background: x === weakest ? '#F87171' : x === strongest ? '#16A34A' : BLUE }} />
            </span>
            <span className="text-right tabular-nums"><b>{x.p} %</b> <span className="text-[7.5pt] text-slate-400">{Math.round(x.avg)}/{x.s.max}</span></span>
          </div>
        ))}
      </div>
      <p className="mt-[2.5mm] text-[8.5pt] text-slate-600">
        Ең күшті пән — <b>{strongest?.s.name}</b> ({strongest?.p} %), ең көп назар керек — <b>{weakest?.s.name}</b> ({weakest?.p} %).
      </p>

      <h2 className="mt-[6mm] text-[12pt] font-bold">Әр пәннің үздік үштігі</h2>
      <div className="mt-[2.5mm] grid grid-cols-3 gap-[3mm]">
        {stats.map((x) => (
          <div key={x.s.id} className="rounded-[2.5mm] border border-slate-200 px-[3mm] py-[2.5mm]">
            <div className="text-[7.5pt] font-bold uppercase tracking-[.06em]" style={{ color: BLUE }}>{x.s.short}</div>
            <ol className="mt-[1mm] space-y-[0.6mm] text-[8.3pt]">
              {x.top.map((t, i) => (
                <li key={t.name} className="flex justify-between gap-2"><span className="truncate">{i + 1}. {t.name}</span><b className="tabular-nums">{t.v}</b></li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      {thr.length > 0 && (
        <>
          <h2 className="mt-[6mm] text-[12pt] font-bold">НЗМ грант шегі (2026 жылғы балдар)</h2>
          <p className="mt-[1mm] text-[8.3pt] text-slate-500">
            Шарт: {thr.map((t) => `${t.name} ≥ ${Math.ceil(t.max * t.share)}`).join(', ')}. «Мектеп» — Min баллынан өткен мектеп саны ({NIS_GRANT_2026.length}-ден). Ең төменгі шек — {minAll}.
          </p>
          <table className="mt-[2mm] w-full border-collapse text-[8.3pt]">
            <thead>
              <tr className="border-b-2 border-black text-[6.8pt] uppercase tracking-[.06em] text-slate-500">
                <th className="py-[1.2mm] text-left font-semibold">Оқушы</th>
                <th className="py-[1.2mm] text-right font-semibold">Жалпы</th>
                {thr.map((t) => <th key={t.id} className="py-[1.2mm] text-right font-semibold">{t.name.split(' ')[0]}</th>)}
                <th className="py-[1.2mm] text-right font-semibold">Мектеп</th>
              </tr>
            </thead>
            <tbody>
              {grant.map(({ r, okSubj, schools }) => (
                <tr key={r.name} className="border-b border-slate-200">
                  <td className="py-[0.9mm]">{r.name}</td>
                  <td className="py-[0.9mm] text-right font-bold tabular-nums">{r.total}</td>
                  {thr.map((t) => {
                    const v = r.scores[t.id]
                    const ok = typeof v === 'number' && v >= Math.ceil(t.max * t.share)
                    return <td key={t.id} className="py-[0.9mm] text-right tabular-nums" style={{ color: ok ? '#16A34A' : '#DC2626' }}>{typeof v === 'number' ? v : '—'}</td>
                  })}
                  <td className="py-[0.9mm] text-right tabular-nums">{okSubj ? schools : <span className="text-[7.5pt] text-rose-600">шек ✗</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <Foot d={d} />
    </section>
  )
}

// Excel: «Жиынтық» парағы + әр топқа бөлек парақ
async function exportXlsx(list: GroupData[], month: string) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Beles education'
  const title = `${monthName(month)} ${month.slice(0, 4)}`
  const border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } as const
  const headFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } } as const
  const sum = wb.addWorksheet('Жиынтық')
  sum.addRow([`Білім тексеру · ${title} · барлық топ`]).font = { bold: true, size: 14 }
  sum.addRow([])
  const sh = sum.addRow(['Топ', 'Оқушы саны', 'Тапсырғандар', 'Орташа балл', 'Максимум', 'Орташа %', 'Ең жоғары', 'Үздік оқушы', 'Жарияланған'])
  sh.eachCell((c) => { c.font = { bold: true }; c.fill = headFill; c.border = border })
  const used = new Set<string>(['Жиынтық'])
  for (const d of list) {
    const { done, missing } = rowsOf(d)
    if (!done.length) continue
    const max = examMax(d.exam)
    const avg = Math.round(done.reduce((a, r) => a + (r.total ?? 0), 0) / done.length)
    const r = sum.addRow([d.group.name, d.students.length, done.length, avg, max, avg / max, done[0].total, done[0].name, d.exam.published ? 'иә' : 'жоқ'])
    r.getCell(6).numFmt = '0%'
    r.eachCell({ includeEmpty: true }, (c) => { c.border = border })
    // топ парағы
    let name = d.group.name.replace(/[\\/?*\[\]:]/g, ' ').slice(0, 31).trim()
    while (used.has(name)) name = name.slice(0, 28) + ' ' + used.size
    used.add(name)
    const ws = wb.addWorksheet(name)
    const subj = d.exam.subjects
    const cols = ['Орын', 'Оқушы', ...subj.map((s) => `${s.short} (${s.max})`), `Жалпы (${max})`, '%', ...(d.previous ? [`Өзгеріс (${d.previous.title})`] : [])]
    ws.addRow([`${d.group.name} · ${d.exam.title} · Білім тексеру`]).font = { bold: true, size: 13 }
    ws.mergeCells(1, 1, 1, cols.length)
    const h = ws.addRow(cols)
    h.eachCell((c) => { c.font = { bold: true }; c.fill = headFill; c.border = border; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true } })
    h.height = 30
    const first = 3
    done.forEach((x) => {
      const row = ws.addRow([x.place, x.name, ...subj.map((s) => (typeof x.scores[s.id] === 'number' ? x.scores[s.id] : null)), null, null, ...(d.previous ? [x.delta] : [])])
      const rn = row.number
      const a = ws.getColumn(3).letter, b = ws.getColumn(2 + subj.length).letter
      row.getCell(3 + subj.length).value = { formula: `SUM(${a}${rn}:${b}${rn})`, result: x.total ?? 0 }
      row.getCell(4 + subj.length).value = { formula: `${ws.getColumn(3 + subj.length).letter}${rn}/${max}`, result: (x.total ?? 0) / max }
      row.getCell(4 + subj.length).numFmt = '0%'
      row.getCell(3 + subj.length).font = { bold: true }
      row.eachCell({ includeEmpty: true }, (c) => { c.border = border })
    })
    const last = first + done.length - 1
    const avgRow = ws.addRow(['', 'Орташа', ...subj.map((_, i) => ({ formula: `ROUND(AVERAGE(${ws.getColumn(3 + i).letter}${first}:${ws.getColumn(3 + i).letter}${last}),0)` })), { formula: `ROUND(AVERAGE(${ws.getColumn(3 + subj.length).letter}${first}:${ws.getColumn(3 + subj.length).letter}${last}),0)` }])
    avgRow.font = { bold: true, italic: true }
    if (missing.length) ws.addRow(['', `Тапсырмаған: ${missing.join(', ')}`])
    ws.getColumn(1).width = 7
    ws.getColumn(2).width = 28
    for (let i = 3; i <= cols.length; i++) ws.getColumn(i).width = 12
    ws.views = [{ state: 'frozen', ySplit: 2, xSplit: 2 }]
  }
  sum.getColumn(1).width = 34
  for (let i = 2; i <= 9; i++) sum.getColumn(i).width = i === 8 ? 26 : 13
  const buf = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `Білім тексеру — ${title} — барлық топ.xlsx`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

function Report() {
  const month = useSearchParams().get('month') ?? '2026-10'
  const [list, setList] = useState<GroupData[] | null>(null)
  const [err, setErr] = useState('')
  const [progress, setProgress] = useState('')

  useEffect(() => {
    document.title = `Білім тексеру — ${monthName(month)} ${month.slice(0, 4)} — барлық топ`
    ;(async () => {
      try {
        const first = await api('/api/bilim-test/admin')
        const groups: Group[] = first.groups ?? []
        const out: GroupData[] = []
        for (let i = 0; i < groups.length; i++) {
          const g = groups[i]
          setProgress(`${i + 1} / ${groups.length} · ${g.name}`)
          const a = await api(`/api/bilim-test/admin?group=${encodeURIComponent(g.id)}`)
          const meta = (a.exams ?? []).find((e: { month: string; id: string }) => e.month === month)
          if (!meta) continue
          const b = a.exam?.id === meta.id ? a : await api(`/api/bilim-test/admin?group=${encodeURIComponent(g.id)}&exam=${encodeURIComponent(meta.id)}`)
          if (!b.exam || b.exam.practice) continue
          out.push({ group: b.group, exam: b.exam, students: b.students ?? [], subs: b.submissions ?? [], previous: b.previous })
        }
        setList(out)
      } catch (e: any) {
        setErr(e.message)
      }
    })()
  }, [month])

  const shown = (list ?? []).filter((d) => rowsOf(d).done.length > 0)
  return (
    <div id="bt-report" className="min-h-screen bg-slate-200">
      <PrintStyles />
      <div className="bt-toolbar sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <a href="/admin/bilim-test" className="text-sm text-blue-600">← Білім тексеру</a>
        <span className="text-sm text-slate-500">{list ? `${monthName(month)} ${month.slice(0, 4)} · ${shown.length} топ` : progress || 'Жүктелуде…'}</span>
        <div className="flex gap-2">
          <button onClick={() => list && exportXlsx(list, month)} disabled={!list} className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-50">Excel</button>
          <button onClick={() => window.print()} disabled={!list} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">PDF сақтау / басып шығару</button>
        </div>
      </div>
      {err && <p className="p-10 text-center text-rose-600">{err}</p>}
      {list && !shown.length && <p className="p-10 text-center text-slate-500">Бұл айда нәтиже жоқ.</p>}
      <div className="bt-pages space-y-8 py-6">
        {shown.map((d) =>
          d.group.id === 'nzm' ? (
            <div key={d.group.id} className="space-y-8">
              <NzmFirst d={d} />
              <NzmAnalysis d={d} />
            </div>
          ) : (
            <GroupPage key={d.group.id} d={d} />
          ),
        )}
      </div>
    </div>
  )
}

function NzmFirst({ d }: { d: GroupData }) {
  const { done, missing } = rowsOf(d)
  const max = examMax(d.exam)
  const avg = done.length ? Math.round(done.reduce((a, r) => a + (r.total ?? 0), 0) / done.length) : 0
  const up = done.filter((r) => (r.delta ?? 0) > 0).length
  return (
    <section className="bt-sheet mx-auto flex flex-col bg-white text-[#111] shadow-xl">
      <Head d={d} page={1} pages={2} />
      <Kpis
        items={[
          ['Тапсырғандар', `${done.length}`, `${d.students.length} оқушының ішінде`],
          ['Орташа балл', `${avg}`, `/ ${max} · ${pct(avg, max)} %`],
          ['Ең жоғары', done[0] ? `${done[0].total}` : '—', done[0]?.name ?? ''],
          ['Өскендер', d.previous ? `${up}` : '—', d.previous ? `${d.previous.title} айымен салыстырғанда` : ''],
        ]}
      />
      <Table d={d} done={done} missing={missing} dense={done.length > 20} />
      <Foot d={d} />
    </section>
  )
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Report />
    </Suspense>
  )
}
