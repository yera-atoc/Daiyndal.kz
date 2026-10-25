// Сервердегі күтпеген қателерді error_log-қа жазу (әкімші «Журнал» бетінде көреді)
import { supabaseAdmin } from './supabaseAdmin'

export async function logServerError(where: string, e: unknown) {
  const err = e as { message?: string; stack?: string }
  console.error(`[${where}]`, e)
  await supabaseAdmin
    .from('error_log')
    .insert({ source: 'server', message: `${where}: ${err?.message ?? String(e)}`.slice(0, 1000), stack: err?.stack?.slice(0, 4000) ?? null, url: where })
    .then(() => {}, () => {})
}
