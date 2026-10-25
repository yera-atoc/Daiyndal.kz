import { NextResponse } from 'next/server'
import { currentAdmin } from '@/lib/requireAdmin'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// Әкімшіге: кім не өзгертті (audit_log) және сайттағы қателер (error_log)
export async function GET() {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Рұқсат жоқ' }, { status: 401 })
  const [audit, errors, teachers] = await Promise.all([
    supabaseAdmin.from('audit_log').select('id, at, actor, action, ip, detail').order('at', { ascending: false }).limit(300),
    supabaseAdmin.from('error_log').select('id, at, source, message, url, ip').order('at', { ascending: false }).limit(100),
    supabaseAdmin.from('teachers').select('id, name'),
  ])
  if (audit.error) return NextResponse.json({ missing: true, audit: [], errors: [], names: {} })
  const names: Record<string, string> = { owner: 'Иесі' }
  for (const t of teachers.data ?? []) names[t.id] = t.name
  return NextResponse.json({ audit: audit.data, errors: errors.data ?? [], names })
}
