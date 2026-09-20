import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isAdmin } from '@/lib/requireAdmin'
import { currentTeacherId } from '@/lib/requireTeacher'
import { dayName, hhmm, parseSlotInput } from '@/lib/schedule'

// GET /api/schedule
//   - ?mine=1  -> the logged-in teacher's own slots (teacher session required;
//                 an admin cookie does NOT bypass this, so the teacher cabinet
//                 always shows only that teacher's schedule)
//   - otherwise -> admin only: all slots, optionally filtered by ?teacherId=
export async function GET(req: NextRequest) {
  const mine = req.nextUrl.searchParams.get('mine') === '1'

  let teacherFilter: string | null = null

  if (mine) {
    teacherFilter = await currentTeacherId()
    if (!teacherFilter) {
      return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
    }
  } else {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
    }
    teacherFilter = req.nextUrl.searchParams.get('teacherId')
  }

  let query = supabaseAdmin
    .from('schedule_slots')
    .select(
      'id, teacher_id, day_of_week, start_time, end_time, title, note, group_id, student_groups(id, name)'
    )
    .order('day_of_week')
    .order('start_time')

  if (teacherFilter) query = query.eq('teacher_id', teacherFilter)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/schedule — admin only. Creates one slot per selected weekday
// (so "Mon/Wed/Fri 15:00–16:00" is a single request).
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = parseSlotInput(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }
  const { teacherId, days, startTime, endTime, title, note, groupId } = parsed.value

  // Don't let a teacher be double-booked.
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('schedule_slots')
    .select('day_of_week, start_time, end_time')
    .eq('teacher_id', teacherId)
    .in('day_of_week', days)

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }

  const clash = (existing ?? []).find(
    (s) => hhmm(s.start_time) < endTime && startTime < hhmm(s.end_time)
  )
  if (clash) {
    return NextResponse.json(
      {
        error: `${dayName(clash.day_of_week)} күні ${hhmm(clash.start_time)}–${hhmm(
          clash.end_time
        )} сабағымен уақыты қиылысады`,
      },
      { status: 409 }
    )
  }

  // A group can't be in two lessons at once either (even with another teacher).
  if (groupId) {
    const { data: groupSlots, error: groupError } = await supabaseAdmin
      .from('schedule_slots')
      .select('day_of_week, start_time, end_time')
      .eq('group_id', groupId)
      .in('day_of_week', days)

    if (groupError) {
      return NextResponse.json({ error: groupError.message }, { status: 500 })
    }

    const groupClash = (groupSlots ?? []).find(
      (s) => hhmm(s.start_time) < endTime && startTime < hhmm(s.end_time)
    )
    if (groupClash) {
      return NextResponse.json(
        {
          error: `Бұл топтың ${dayName(groupClash.day_of_week)} күні ${hhmm(
            groupClash.start_time
          )}–${hhmm(groupClash.end_time)} басқа сабағы бар`,
        },
        { status: 409 }
      )
    }
  }

  const rows = days.map((day) => ({
    teacher_id: teacherId,
    day_of_week: day,
    start_time: startTime,
    end_time: endTime,
    title,
    note,
    group_id: groupId,
  }))

  const { data, error } = await supabaseAdmin.from('schedule_slots').insert(rows).select()

  if (error) {
    // 23503 = foreign key violation (teacher doesn't exist)
    if (error.code === '23503') {
      return NextResponse.json({ error: 'Мұғалім немесе топ табылмады' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
