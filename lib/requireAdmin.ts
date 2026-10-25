import { cookies } from 'next/headers'
import { ADMIN_COOKIE_NAME } from './adminAuth'
import { verifyAdmin } from './adminSession'
import { supabaseAdmin } from './supabaseAdmin'

export type CurrentAdmin = { kind: 'owner'; actor: 'admin:owner'; name: string } | { kind: 'teacher'; id: string; actor: string; name: string }

/** Кім әкімші ретінде кірген. Мұғалімнің әкімші құқығы алынып тасталса – бірден жабылады. */
export async function currentAdmin(): Promise<CurrentAdmin | null> {
  const who = await verifyAdmin(cookies().get(ADMIN_COOKIE_NAME)?.value)
  if (!who) return null
  if (who.kind === 'owner') return { kind: 'owner', actor: 'admin:owner', name: 'Иесі' }
  const { data, error } = await supabaseAdmin.from('teachers').select('id, name, is_admin').eq('id', who.id).maybeSingle()
  if (error || !data?.is_admin) return null
  return { kind: 'teacher', id: data.id, actor: `admin:${data.id}`, name: data.name }
}

export async function isAdmin(): Promise<boolean> {
  return !!(await currentAdmin())
}

export async function isOwner(): Promise<boolean> {
  return (await currentAdmin())?.kind === 'owner'
}
