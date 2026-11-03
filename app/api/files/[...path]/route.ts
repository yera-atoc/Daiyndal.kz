import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { whoIsLoggedIn as who } from '@/lib/anySession'
import { throttleCheck, throttleFail } from '@/lib/security'

export const dynamic = 'force-dynamic'

// Жабық файл: тек кірген адамға, 10 минуттық уақытша сілтемемен. Бір адам тым көп файл ашса — уақытша тоқтатамыз.
export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const actor = await who()
  if (!actor) return new NextResponse('Кіру керек', { status: 401 })
  const path = params.path.map(decodeURIComponent).join('/')
  if (!path || path.includes('..')) return new NextResponse('Қате жол', { status: 400 })

  if (!actor.startsWith('admin') && !actor.startsWith('teacher')) {
    const key = [`files:${actor}`]
    const wait = await throttleCheck(key)
    if (wait) return new NextResponse('Тым көп файл ашылды. Біраз күтіп, қайталаңыз.', { status: 429 })
    await throttleFail(key) // әр ашу санауышқа қосылады
  }

  const { data, error } = await supabaseAdmin.storage.from('materials').createSignedUrl(path, 600)
  if (error || !data?.signedUrl) return new NextResponse('Файл табылмады', { status: 404 })
  return NextResponse.redirect(data.signedUrl, { status: 302, headers: { 'Cache-Control': 'private, max-age=300' } })
}
