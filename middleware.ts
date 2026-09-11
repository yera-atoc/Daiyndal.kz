import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ADMIN_COOKIE_NAME, hashPassword } from '@/lib/adminAuth'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!token || !adminPassword) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }

    const expected = await hashPassword(adminPassword)
    if (token !== expected) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
