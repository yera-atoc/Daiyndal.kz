import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { currentAdmin } from '@/lib/requireAdmin'
import { driveId, parseWorkbook, type Cell, type Sheet } from '@/lib/sheetImport'

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

/** «Сілтемесі бар кез келген адам көре алады» файлды жүктеу: алдымен Excel файлы ретінде, болмаса Google Sheets экспорты */
async function fromDrive(id: string): Promise<Buffer> {
  const urls = [`https://drive.google.com/uc?export=download&id=${id}`, `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`]
  for (const url of urls) {
    const r = await fetch(url, { redirect: 'follow', cache: 'no-store' }).catch(() => null)
    if (!r || !r.ok) continue
    const buf = Buffer.from(await r.arrayBuffer())
    if (buf.length > MAX) throw new Error('Файл тым үлкен (5 МБ-тан аспасын)')
    if (buf[0] === 0x50 && buf[1] === 0x4b) return buf // xlsx = zip
  }
  throw new Error('Файлды Google Drive-тан алу мүмкін болмады. Кестеде «Поделиться → Все, у кого есть ссылка» қосулы екенін тексеріңіз, не файлды жүктеп алып, «Excel кестесінен жүктеу» арқылы салыңыз.')
}

// Excel файлын талдау: ештеңе жазбайды, тек енгізу жоспарын қайтарады (әкімші тексеріп, сосын енгізеді)
export async function POST(req: NextRequest) {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  try {
    let buf: Buffer
    if ((req.headers.get('content-type') ?? '').includes('application/json')) {
      const b = await req.json().catch(() => null)
      const id = driveId(String(b?.url ?? ''))
      if (!id) return NextResponse.json({ error: 'Google Drive сілтемесі қате' }, { status: 400 })
      try {
        buf = await fromDrive(id)
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 })
      }
    } else {
      const form = await req.formData()
      const file = form.get('file')
      if (!(file instanceof Blob)) return NextResponse.json({ error: 'Файл таңдалмаған' }, { status: 400 })
      if (file.size > MAX) return NextResponse.json({ error: 'Файл тым үлкен (5 МБ-тан аспасын)' }, { status: 400 })
      buf = Buffer.from(await file.arrayBuffer())
    }
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buf as any)
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
