import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { currentAdmin } from '@/lib/requireAdmin'
import { parseWorkbook, type Cell, type Sheet } from '@/lib/sheetImport'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX = 5 * 1024 * 1024

function cellValue(v: unknown): Cell {
  if (v === null || v === undefined) return null
  if (typeof v === 'string' || typeof v === 'number') return v
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'object') {
    const o = v as any
    if (o.result !== undefined) return cellValue(o.result)
    if (Array.isArray(o.richText)) return o.richText.map((x: any) => x.text).join('')
    if (o.text !== undefined) return String(o.text)
  }
  return String(v)
}

// Excel файлын талдау: ештеңе жазбайды, тек енгізу жоспарын қайтарады (әкімші тексеріп, сосын енгізеді)
export async function POST(req: NextRequest) {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof Blob)) return NextResponse.json({ error: 'Файл таңдалмаған' }, { status: 400 })
    if (file.size > MAX) return NextResponse.json({ error: 'Файл тым үлкен (5 МБ-тан аспасын)' }, { status: 400 })
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(Buffer.from(await file.arrayBuffer()) as any)
    const sheets: Sheet[] = wb.worksheets.map((ws) => {
      const rows: Cell[][] = []
      ws.eachRow({ includeEmpty: true }, (row, n) => {
        const vals: Cell[] = []
        row.eachCell({ includeEmpty: true }, (c, col) => {
          vals[col - 1] = cellValue(c.value)
        })
        rows[n - 1] = Array.from(vals, (x) => x ?? null)
      })
      return { name: ws.name, rows: Array.from(rows, (r) => r ?? []) }
    })
    return NextResponse.json(parseWorkbook(sheets))
  } catch (e: any) {
    return NextResponse.json({ error: `Файлды оқу мүмкін болмады: ${e?.message ?? 'қате'}. .xlsx форматында жүктеңіз.` }, { status: 400 })
  }
}
