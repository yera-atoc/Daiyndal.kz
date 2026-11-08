import { NextResponse } from 'next/server'
import { clearStudent } from '@/lib/ieltsServer'
import { clearStudentSession } from '@/lib/bilimTestAuth'

// Бірыңғай шығу: жалпы кабинет және Білім тексеру бірге жабылады
export async function POST() {
  clearStudent()
  clearStudentSession()
  return NextResponse.json({ ok: true })
}
