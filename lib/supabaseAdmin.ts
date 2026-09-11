import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  // Doesn't throw at import time so the site still builds without env vars
  // set; API routes that use this will fail loudly at request time instead.
  console.warn(
    'Supabase env айнымалылары табылмады: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. .env.local файлын тексеріңіз.'
  )
}

// Server-only client. Uses the service role key, which bypasses Row Level
// Security — that's intentional here, since access control is enforced by
// our own admin-password check in lib/adminAuth.ts before any query runs.
// Never import this file from a Client Component or expose the key to the browser.
export const supabaseAdmin = createClient(supabaseUrl ?? '', serviceRoleKey ?? '', {
  auth: { persistSession: false },
})
