import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { currentTeacherId } from '@/lib/requireTeacher'

const MATERIALS_BUCKET = 'materials'

// Issues a short-lived signed upload URL for the materials bucket. The
// actual file bytes are then PUT straight from the browser to Supabase
// Storage (see MaterialsTab in app/teacher/page.tsx) — they never pass
// through this Vercel function, which is what lets teachers upload files
// bigger than the ~4.5MB request-body limit serverless functions have.
export async function POST(req: NextRequest) {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const rawName = typeof body?.fileName === 'string' ? body.fileName : ''
  if (!rawName.trim()) {
    return NextResponse.json({ error: 'Файл аты жіберілмеді' }, { status: 400 })
  }

  const safeName = rawName
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(-120)
  const path = `${teacherId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`

  const { data, error } = await supabaseAdmin.storage
    .from(MATERIALS_BUCKET)
    .createSignedUploadUrl(path)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: pub } = supabaseAdmin.storage.from(MATERIALS_BUCKET).getPublicUrl(path)

  return NextResponse.json({
    path: data.path,
    token: data.token,
    publicUrl: pub.publicUrl,
  })
}
