import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isAdmin } from '@/lib/requireAdmin'
import { hhmm, parseSlotInput } from '@/lib/schedule'

// Admin only. Teachers can never change their own schedule.
// Edits one slot: teacher, single weekday, time range, title, note.
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = parseSlotInput(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }
  const { teacherId, days, startTime, endTime, title, note } = parsed.value
  if (days.length !== 1) {
    return NextResponse.json({ error: 'Бір күнді таңдаңыз' }, { status: 400 })
  }
  const day = days[0]

  // Double-booking check against the teacher's other slots that day.
  const { data: others, error: othersError } = await supabaseAdmin
    .from('schedule_slots')
    .select('start_time, end_time')
    .eq('teacher_id', teacherId)
    .eq('day_of_week', day)
    .neq('id', params.id)

  if (othersError) {
    return NextResponse.json({ error: othersError.message }, { status: 500 })
  }

  const clash = (others ?? []).find(
    (s) => hhmm(s.start_time) < endTime && startTime < hhmm(s.end_time)
  )
  if (clash) {
    return NextResponse.json(
      {
        error: `${hhmm(clash.start_time)}–${hhmm(clash.end_time)} сабағымен уақыты қиылысады`,
      },
      { status: 409 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from('schedule_slots')
    .update({
      teacher_id: teacherId,
      day_of_week: day,
      start_time: startTime,
      end_time: endTime,
      title,
      note,
    })
    .eq('id', params.id)
    .select()
    .maybeSingle()

  if (error) {
    if (error.code === '23503') {
      return NextResponse.json({ error: 'Мұғалім табылмады' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Сабақ табылмады' }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const { error } = await supabaseAdmin.from('schedule_slots').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
