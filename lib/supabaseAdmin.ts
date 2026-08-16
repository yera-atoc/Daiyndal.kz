import { createClient } from "@supabase/supabase-js";

// Тек серверде (API route) қолданылады! Бұл файлды клиент компоненттерде
// импорттамаңыз — SUPABASE_SERVICE_ROLE_KEY бар, ол RLS-ті айналып өтеді.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export function getSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY немесе NEXT_PUBLIC_SUPABASE_URL орнатылмаған (Vercel env vars)."
    );
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
