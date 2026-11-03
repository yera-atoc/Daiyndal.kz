import { NextRequest, NextResponse } from 'next/server'
import { currentAdmin } from '@/lib/requireAdmin'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// «materials» қоймасы ашық па, жабық па. Жабық болса — файлдар тек /api/files арқылы (кірген адамға, уақытша сілтемемен).
export async function GET() {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  const { data, error } = await supabaseAdmin.storage.getBucket('materials')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ public: !!data?.public })
}

export async function POST(req: NextRequest) {
  const me = await currentAdmin()
  if (!me || me.kind !== 'owner') return NextResponse.json({ error: 'Тек орталық иесі өзгерте алады' }, { status: 403 })
  const b = await req.json().catch(() => null)
  const makePublic = b?.public === true
  const { error } = await supabaseAdmin.storage.updateBucket('materials', { public: makePublic })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ public: makePublic })
}
