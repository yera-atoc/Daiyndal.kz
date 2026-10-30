// Сынақ нәтижесін Excel-ге (.xlsx) шығару — админкадағы «Нәтижелер» бетінен
import { commonDelta, examMax, gradeSubject, ranking, rowTotal, type Exam } from '@/lib/bilimTest'
import type { Resp } from './shared'

const GREEN = 'FF92D050'
const RED = 'FFFF5050'

export async function exportResultsXlsx(data: Resp, exam: Exam) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Beles education'
  const names = new Set(data.students.map((s) => s.full_name))
  const subs = data.submissions.filter((s) => names.has(s.student_name))
  const rk = ranking(exam, subs)
  const prev = data.previous
  const MAX = examMax(exam)
  const group = data.group?.name ?? ''
  const border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } as const

  const rows = data.students
    .map((s) => ({ name: s.full_name, total: rowTotal(rk.scores[s.full_name]), scores: rk.scores[s.full_name] ?? {} }))
    .sort((a, b) => (b.total ?? -1) - (a.total ?? -1) || a.name.localeCompare(b.name))

  // ── 1-парақ: баллдар
  const ws = wb.addWorksheet(exam.title.slice(0, 31))
  const cols = ['№', 'Аты-жөні', ...exam.subjects.map((s) => `${s.short} (${s.max})`), `Жалпы (${MAX})`, 'Орны', ...(prev ? [`${prev.title}`, 'Өзгеріс'] : [])]
  ws.mergeCells(1, 1, 1, cols.length)
  ws.getCell(1, 1).value = `${group} · ${exam.title} · Білім тексеру сынағы`
  ws.getCell(1, 1).font = { bold: true, size: 14 }
  ws.getCell(1, 1).alignment = { horizontal: 'center' }
  ws.getCell(1, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } }
  const head = ws.getRow(2)
  cols.forEach((c, i) => {
    const cell = head.getCell(i + 1)
    cell.value = c
    cell.font = { bold: true }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } }
    cell.border = border
  })
  head.height = 30
  rows.forEach((r, i) => {
    const row = ws.getRow(i + 3)
    const vals: (string | number | null)[] = [
      i + 1,
      r.name,
      ...exam.subjects.map((s) => {
        const v = r.scores[s.id]
        return typeof v === 'number' ? v : subs.some((x) => x.student_name === r.name && x.subject === s.id) ? 'кілт жоқ' : 'Тапсырмады'
      }),
      r.total,
      rk.place[r.name] ?? null,
    ]
    if (prev) {
      const p = prev.scores[r.name]
      vals.push(rowTotal(p), commonDelta(r.scores, p))
    }
    vals.forEach((v, k) => {
      const cell = row.getCell(k + 1)
      cell.value = v ?? ''
      cell.border = border
      cell.alignment = { horizontal: k === 1 ? 'left' : 'center' }
      if (k === 1) cell.font = { bold: true }
    })
    exam.subjects.forEach((s, k) => {
      const v = r.scores[s.id]
      if (typeof v === 'number' && v / s.max < 0.35) row.getCell(k + 3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED } }
    })
    const tc = row.getCell(exam.subjects.length + 3)
    tc.font = { bold: true }
    if (r.total !== null) {
      const p = r.total / MAX
      tc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: p >= 0.7 ? 'FF00B050' : p >= 0.5 ? GREEN : p >= 0.35 ? 'FFC6EFCE' : 'FFFFC7CE' } }
    }
  })
  ws.columns.forEach((c, i) => (c.width = i === 0 ? 5 : i === 1 ? 28 : 14))
  ws.views = [{ state: 'frozen', ySplit: 2, xSplit: 2 }]

  // ── 2-парақ: дұрыс / қате / бос
  const ws2 = wb.addWorksheet('Дұрыс-қате')
  const h2 = ['№', 'Аты-жөні', ...exam.subjects.flatMap((s) => [`${s.short}: дұрыс`, 'қате', 'бос'])]
  h2.forEach((c, i) => {
    const cell = ws2.getRow(1).getCell(i + 1)
    cell.value = c
    cell.font = { bold: true }
    cell.alignment = { horizontal: 'center', wrapText: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } }
    cell.border = border
  })
  rows.forEach((r, i) => {
    const row = ws2.getRow(i + 2)
    const vals: (string | number)[] = [i + 1, r.name]
    for (const s of exam.subjects) {
      const sub = subs.find((x) => x.student_name === r.name && x.subject === s.id)
      const g = sub ? gradeSubject(s, exam.answer_key[s.id], sub.answers) : null
      vals.push(g ? g.correct : '—', g ? g.wrong.length : '—', g ? g.blank.length : '—')
    }
    vals.forEach((v, k) => {
      const cell = row.getCell(k + 1)
      cell.value = v
      cell.border = border
      cell.alignment = { horizontal: k === 1 ? 'left' : 'center' }
    })
  })
  ws2.columns.forEach((c, i) => (c.width = i === 0 ? 5 : i === 1 ? 28 : 11))

  const buf = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${group} — ${exam.title}.xlsx`.replace(/[\\/:*?"<>|]/g, '')
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
