import { NextResponse } from 'next/server'
import { clearStudent } from '@/lib/ieltsServer'
import { clearStudentSession } from '@/lib/bilimTestAuth'

// Бірыңғай шығу: кабинет, ҰБТ/IELTS және Білім тексеру сессиялары бірге жабылады (ортақ планшет үшін маңызды)
export async function POST() {
  clearStudent()
  clearStudentSession()
  return NextResponse.json({ ok: true })
}
