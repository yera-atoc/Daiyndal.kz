import { NextResponse } from 'next/server'
import { clearStudentSession } from '@/lib/bilimTestAuth'
import { clearStudent } from '@/lib/ieltsServer'

// Бірыңғай шығу: Білім тексеру және жалпы кабинет бірге жабылады (ортақ планшетте келесі оқушыға қауіпсіз)
export async function POST() {
  clearStudentSession()
  clearStudent()
  return NextResponse.json({ ok: true })
}
