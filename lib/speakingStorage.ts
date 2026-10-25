// Speaking жазбалары – балалардың дауысы, сондықтан жабық `speaking` қоймасында сақталады.
// Базада сілтеме емес, `storage:speaking/<path>` белгісі тұрады; мұғалімге 2 сағаттық уақытша сілтеме беріледі.
// Ескі жазбалар (materials қоймасындағы ашық URL) өзгеріссіз ойнай береді.
import { supabaseAdmin } from './supabaseAdmin'

export const PRIVATE_BUCKET = 'speaking'
export const REF_PREFIX = `storage:${PRIVATE_BUCKET}/`

export async function speakingUploadUrl(path: string): Promise<{ bucket: string; path: string; token: string; ref: string }> {
  const priv = await supabaseAdmin.storage.from(PRIVATE_BUCKET).createSignedUploadUrl(path)
  if (!priv.error) return { bucket: PRIVATE_BUCKET, path: priv.data.path, token: priv.data.token, ref: `${REF_PREFIX}${priv.data.path}` }
  // Жабық қойма әлі жасалмаған болса (миграция қолданылмаған) – бұрынғыдай жұмыс істейміз
  const pub = await supabaseAdmin.storage.from('materials').createSignedUploadUrl(path)
  if (pub.error) throw new Error(pub.error.message)
  return { bucket: 'materials', path: pub.data.path, token: pub.data.token, ref: supabaseAdmin.storage.from('materials').getPublicUrl(path).data.publicUrl }
}

/** storage:speaking/... белгілерін уақытша сілтемеге айналдырады. */
export async function resolveSpeaking(map: Record<string, string> | null | undefined): Promise<Record<string, string>> {
  const out: Record<string, string> = { ...(map ?? {}) }
  const refs = Object.entries(out).filter(([, v]) => typeof v === 'string' && v.startsWith(REF_PREFIX))
  if (!refs.length) return out
  const { data } = await supabaseAdmin.storage.from(PRIVATE_BUCKET).createSignedUrls(refs.map(([, v]) => v.slice(REF_PREFIX.length)), 2 * 3600)
  refs.forEach(([k], i) => {
    const u = data?.[i]?.signedUrl
    out[k] = u ?? ''
  })
  return out
}
