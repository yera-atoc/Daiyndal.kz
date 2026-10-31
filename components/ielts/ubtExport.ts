// ҰБТ тапсыруларының нәтижесін Excel-ге (.xlsx) және басып шығаруға (PDF) дайындау — мұғалім/әкімші кабинетінен
import { comboName, type UbtScores } from '@/lib/ubt'

export type UbtRow = { name: string; scores: UbtScores | null; status: string; submitted_at: string | null; started_at: string }

const date = (s: string | null) => (s ? new Date(s).toLocaleDateString('ru-RU') : '')

function rowsFor(list: UbtRow[]) {
  const done = list.filter((r) => r.scores).sort((a, b) => (b.scores!.total - a.scores!.total) || a.name.localeCompare(b.name))
  const rest = list.filter((r) => !r.scores)
  return [...done, ...rest].map((r, i) => {
    const s = r.scores
    const sub = (k: number) => (s?.subjects[k] ? { name: s.subjects[k].name, pts: s.subjects[k].points, max: s.subjects[k].max, ok: s.subjects[k].passed } : null)
    return {
      n: s ? i + 1 : '',
      name: r.name,
      combo: s ? comboName(s.combo) : '',
      hist: sub(0), mlit: sub(1), rlit: sub(2), p1: sub(3), p2: sub(4),
      total: s ? s.total : null,
      max: s ? s.max : 140,
      passed: s ? s.passed : null,
      status: r.status === 'in_progress' ? 'Тапсырып жатыр' : 'Аяқталды',
      date: date(r.submitted_at ?? r.started_at),
    }
  })
}

export async function ubtExcel(title: string, list: UbtRow[]) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('ҰБТ нәтижелері')
  const head = ['№', 'Аты-жөні', 'Комбинация', 'Қазақстан тарихы (20)', 'Мат. сауаттылық (10)', 'Оқу сауаттылығы (10)', 'Бейіндік пән 1', 'Балл (50)', 'Бейіндік пән 2', 'Балл (50)', 'Жалпы (140)', 'Шекті балл', 'Күйі', 'Күні']
  const border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } as const
  ws.mergeCells(1, 1, 1, head.length)
  ws.getCell(1, 1).value = `${title} · ҰБТ нәтижелері`
  ws.getCell(1, 1).font = { bold: true, size: 14 }
  ws.getCell(1, 1).alignment = { horizontal: 'center' }
  head.forEach((h, i) => {
    const c = ws.getRow(2).getCell(i + 1)
    c.value = h
    c.font = { bold: true }
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } }
    c.border = border
  })
  ws.getRow(2).height = 32
  rowsFor(list).forEach((r, i) => {
    const vals = [r.n, r.name, r.combo, r.hist?.pts ?? '', r.mlit?.pts ?? '', r.rlit?.pts ?? '', r.p1?.name ?? '', r.p1?.pts ?? '', r.p2?.name ?? '', r.p2?.pts ?? '', r.total ?? '', r.passed === null ? '' : r.passed ? 'Өтті' : 'Өтпеді', r.status, r.date]
    const row = ws.getRow(i + 3)
    vals.forEach((v, k) => {
      const c = row.getCell(k + 1)
      c.value = v as any
      c.border = border
      c.alignment = { horizontal: k === 1 || k === 2 || k === 6 || k === 8 ? 'left' : 'center', wrapText: k === 2 }
    })
    row.getCell(2).font = { bold: true }
    row.getCell(11).font = { bold: true }
    ;[[4, r.hist], [5, r.mlit], [6, r.rlit], [8, r.p1], [10, r.p2]].forEach(([col, s]: any) => {
      if (s && !s.ok) row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } }
    })
  })
  ws.columns.forEach((c, i) => (c.width = [5, 26, 30, 11, 11, 11, 20, 9, 20, 9, 11, 11, 15, 12][i]))
  ws.views = [{ state: 'frozen', ySplit: 2, xSplit: 2 }]
  const buf = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${title} — ҰБТ нәтижелері.xlsx`.replace(/[\\/:*?"<>|]/g, '')
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

// Басып шығаруға арналған кесте (браузерде «PDF ретінде сақтау»)
export function ubtPrint(title: string, list: UbtRow[]) {
  const rows = rowsFor(list)
  const cell = (s: { pts: number; ok: boolean } | null) => (s ? `<td class="${s.ok ? '' : 'bad'}">${s.pts}</td>` : '<td></td>')
  const prof = (s: { name: string; pts: number; ok: boolean } | null) => (s ? `<td class="${s.ok ? '' : 'bad'}"><small>${esc(s.name)}</small><b>${s.pts}</b></td>` : '<td></td>')
  const html = `<!doctype html><html lang="kk"><head><meta charset="utf-8"><title>${esc(title)} — ҰБТ нәтижелері</title><style>
@page { size: A4 landscape; margin: 10mm; }
* { box-sizing: border-box; } body { font-family: Inter, Arial, sans-serif; color: #0E1424; margin: 0; padding: 8mm; font-size: 10pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
header { display: flex; align-items: center; gap: 12px; border-bottom: 3px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
header img { height: 34px; } h1 { font-size: 16pt; margin: 0; } .sub { color: #687085; font-size: 9pt; margin-left: auto; text-align: right; }
table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #D6DCE8; padding: 4px 6px; text-align: center; }
th { background: #EEF5FF; font-size: 8.5pt; } td:nth-child(2) { text-align: left; font-weight: 600; } td:nth-child(3) { text-align: left; font-size: 8.5pt; }
td small { display: block; font-size: 7.5pt; color: #687085; } .bad { background: #FDECEC; color: #B91C1C; } .tot { font-weight: 800; }
.no { color: #94A3B8; } .bar { margin-bottom: 10px; } .bar button { padding: 8px 14px; border-radius: 8px; border: 0; background: #2B6BF3; color: #fff; font-weight: 600; cursor: pointer; }
@media print { .bar { display: none; } body { padding: 0; } }
</style></head><body>
<div class="bar"><button onclick="window.print()">PDF сақтау / басып шығару</button></div>
<header><img src="${location.origin}/beles-logo.png"><h1>${esc(title)} · ҰБТ нәтижелері</h1><div class="sub">${rows.filter((r) => r.total !== null).length} оқушы аяқтады<br>${new Date().toLocaleDateString('ru-RU')}</div></header>
<table><thead><tr><th>№</th><th>Аты-жөні</th><th>Комбинация</th><th>Қаз. тарихы<br>(20)</th><th>Мат. сауат.<br>(10)</th><th>Оқу сауат.<br>(10)</th><th>Бейіндік 1<br>(50)</th><th>Бейіндік 2<br>(50)</th><th>Жалпы<br>(140)</th><th>Шекті балл</th><th>Күні</th></tr></thead><tbody>
${rows.map((r) => `<tr><td>${r.n}</td><td>${esc(r.name)}</td><td>${esc(r.combo)}</td>${cell(r.hist)}${cell(r.mlit)}${cell(r.rlit)}${prof(r.p1)}${prof(r.p2)}<td class="tot">${r.total ?? `<span class="no">${esc(r.status)}</span>`}</td><td>${r.passed === null ? '' : r.passed ? 'Өтті' : '<b style="color:#B91C1C">Өтпеді</b>'}</td><td>${esc(r.date)}</td></tr>`).join('')}
</tbody></table>
<p style="color:#687085;font-size:8pt;margin-top:8px">Қызыл — шекті балдан төмен (тарих, бейіндік пәндер — 5, сауаттылықтар — 3). Beles education.</p>
</body></html>`
  const w = window.open('', '_blank')
  if (!w) return alert('Жаңа терезе ашылмады. Браузерде pop-up рұқсатын беріңіз.')
  w.document.open()
  w.document.write(html)
  w.document.close()
}
