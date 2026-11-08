// Жабық қоймадағы файлдар (балалардың дәптер суреттері т.б.). Базада `storage:<bucket>/<path>` белгісі сақталады,
// ашу — тек уақытша қолтаңбалы сілтемемен. Ашық `materials` қоймасы бұл үшін қолданылмайды.
import { supabaseAdmin } from './supabaseAdmin'

/** Жүктеуге рұқсат: алдымен `prefer` қоймасы, ол жоқ болса — `speaking` (бұрыннан бар жабық қойма) */
export async function privateUploadUrl(prefer: string, path: string): Promise<{ bucket: string; path: string; token: string; ref: string }> {
  for (const bucket of [prefer, 'speaking']) {
    const r = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path)
    if (!r.error) return { bucket, path: r.data.path, token: r.data.token, ref: `storage:${bucket}/${r.data.path}` }
  }
  throw new Error('Жабық қойма табылмады — 20261110_01_student_cabinet.sql миграциясын іске қосыңыз')
}

/** storage:<bucket>/<path> белгілерін уақытша сілтемеге айналдыру (ret — сол ретпен) */
export async function signRefs(refs: string[], seconds = 3600): Promise<string[]> {
  const out = refs.map(() => '')
  const byBucket = new Map<string, { i: number; path: string }[]>()
  refs.forEach((r, i) => {
    const m = /^storage:([^/]+)\/(.+)$/.exec(r)
    if (!m) return
    if (!byBucket.has(m[1])) byBucket.set(m[1], [])
    byBucket.get(m[1])!.push({ i, path: m[2] })
  })
  for (const [bucket, items] of Array.from(byBucket.entries())) {
    const { data } = await supabaseAdmin.storage.from(bucket).createSignedUrls(items.map((x) => x.path), seconds)
    items.forEach((x, k) => {
      const u = data?.[k]?.signedUrl
      if (u) out[x.i] = u.startsWith('http') ? u : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1${u}`
    })
  }
  return out
}
