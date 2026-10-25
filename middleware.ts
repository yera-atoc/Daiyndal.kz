import { NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'
import { ADMIN_COOKIE_NAME } from '@/lib/adminAuth'
import { verifyAdmin } from '@/lib/adminSession'
import { TEACHER_COOKIE_NAME, verifyTeacherSession } from '@/lib/teacherAuth'
import { STUDENT_COOKIE_NAME, verifyStudentSession } from '@/lib/studentAuth'

// Әкімші/мұғалім жасаған әр өзгерісті (POST/PUT/PATCH/DELETE) журналға жазамыз: кім, не, қашан, қай IP.
// Жауапты күттірмейді (waitUntil). audit_log кестесі жоқ болса – үнсіз өтеді.
async function logStaffAction(req: NextRequest) {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  const admin = await verifyAdmin(req.cookies.get(ADMIN_COOKIE_NAME)?.value)
  const teacher = admin ? null : await verifyTeacherSession(req.cookies.get(TEACHER_COOKIE_NAME)?.value)
  const actor = admin ? (admin.kind === 'owner' ? 'admin:owner' : `admin:${admin.id}`) : teacher ? `teacher:${teacher}` : null
  if (!actor) return
  const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || '').trim().slice(0, 64)
  await fetch(`${url}/rest/v1/audit_log`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ actor, action: `${req.method} ${req.nextUrl.pathname}`, ip, detail: req.nextUrl.search ? { query: req.nextUrl.search.slice(0, 300) } : null }),
  }).catch(() => {})
}

const SKIP_LOG = ['/api/admin/login', '/api/teacher/login', '/api/log', '/api/ielts/attempt', '/api/bilim-test/submit']

export async function middleware(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/api/')) {
    if (req.method !== 'GET' && req.method !== 'HEAD' && !SKIP_LOG.some((p) => pathname.startsWith(p))) {
      event.waitUntil(logStaffAction(req))
    }
    return NextResponse.next()
  }

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    // Қолтаңба мен мерзімді тексереміз. Мұғалімнің әкімші құқығын API әр сұрауда базадан тексереді.
    if (!(await verifyAdmin(req.cookies.get(ADMIN_COOKIE_NAME)?.value))) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
  }

  if (pathname.startsWith('/teacher') && pathname !== '/teacher/login') {
    const token = req.cookies.get(TEACHER_COOKIE_NAME)?.value
    const teacherId = await verifyTeacherSession(token)

    if (!teacherId) {
      return NextResponse.redirect(new URL('/teacher/login', req.url))
    }
  }

  if (pathname.startsWith('/student')) {
    const token = req.cookies.get(STUDENT_COOKIE_NAME)?.value
    const studentId = await verifyStudentSession(token)

    if (!studentId) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/teacher/:path*', '/student/:path*', '/api/:path*'],
}
