import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isAdmin } from '@/lib/requireAdmin'

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCsv(headers: string[], rows: unknown[][]): string {
  // BOM so Excel opens Kazakh/Russian text correctly.
  return '\uFEFF' + [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
}

// GET /api/crm/export?type=students|payments — admin only
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }
  const type = req.nextUrl.searchParams.get('type') === 'payments' ? 'payments' : 'students'

  let csv: string
  if (type === 'payments') {
    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('student_name, amount, paid_on, period_end, note')
      .order('paid_on', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    csv = toCsv(
      ['Оқушы', 'Сома', 'Төленген күні', 'Келесі төлем', 'Ескерту'],
      (data ?? []).map((p) => [p.student_name, p.amount, p.paid_on, p.period_end, p.note])
    )
  } else {
    const { data, error } = await supabaseAdmin
      .from('students')
      .select(
        'full_name, grade, phone, payment_amount, payment_date, payment_deadline, comment, teachers(name), student_groups(name)'
      )
      .order('full_name')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    csv = toCsv(
      ['Аты-жөні', 'Сынып', 'Телефон', 'Мұғалім', 'Топ', 'Айлық сома', 'Соңғы төлем', 'Келесі төлем', 'Комментарий'],
      (data ?? []).map((s: any) => [
        s.full_name,
        s.grade,
        s.phone,
        s.teachers?.name,
        s.student_groups?.name,
        s.payment_amount,
        s.payment_date,
        s.payment_deadline,
        s.comment,
      ])
    )
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="daiyndal-${type}.csv"`,
    },
  })
}
