#!/usr/bin/env node
// Бір реттік: ескі Speaking жазбаларын ашық `materials` қоймасынан жабық `speaking` қоймасына көшіру.
//   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node scripts/move-speaking.mjs          – тек тізім
//   ... node scripts/move-speaking.mjs --apply                                                                – көшіру
// Әр жазба: жүктеп алу → speaking-ке жүктеу → базадағы сілтемені storage:speaking/... етіп ауыстыру → ашық көшірмені өшіру.
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('SUPABASE_URL және SUPABASE_SERVICE_ROLE_KEY керек')
  process.exit(1)
}
const apply = process.argv.includes('--apply')
const sb = createClient(url, key, { auth: { persistSession: false } })
const MARK = '/storage/v1/object/public/materials/'

const { data: rows, error } = await sb.from('ielts_attempts').select('id, speaking')
if (error) throw new Error(error.message)
let moved = 0
let total = 0
for (const r of rows ?? []) {
  const sp = { ...(r.speaking ?? {}) }
  let changed = false
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v !== 'string' || !v.includes(MARK)) continue
    total++
    const path = decodeURIComponent(v.split(MARK)[1].split('?')[0])
    console.log(`${apply ? '→' : '·'} ${r.id} ${k}: ${path}`)
    if (!apply) continue
    const dl = await sb.storage.from('materials').download(path)
    if (dl.error) { console.error('  жүктелмеді:', dl.error.message); continue }
    const up = await sb.storage.from('speaking').upload(path, dl.data, { upsert: true, contentType: dl.data.type || 'audio/webm' })
    if (up.error) { console.error('  көшірілмеді:', up.error.message); continue }
    sp[k] = `storage:speaking/${path}`
    changed = true
  }
  if (apply && changed) {
    const { error: e } = await sb.from('ielts_attempts').update({ speaking: sp }).eq('id', r.id)
    if (e) { console.error('  база жаңармады:', e.message); continue }
    const old = Object.entries(r.speaking).filter(([k2, v2]) => typeof v2 === 'string' && v2.includes(MARK) && sp[k2] !== v2).map(([, v2]) => decodeURIComponent(v2.split(MARK)[1].split('?')[0]))
    if (old.length) await sb.storage.from('materials').remove(old)
    moved += old.length
  }
}
console.log(apply ? `Көшірілді: ${moved} / ${total}` : `Ашық жазбалар: ${total}. Көшіру үшін --apply қосыңыз.`)
