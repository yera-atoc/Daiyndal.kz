
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "Supabase env айнымалылары табылмады. .env.local файлында NEXT_PUBLIC_SUPABASE_URL және NEXT_PUBLIC_SUPABASE_ANON_KEY орнатыңыз."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Material = {
  id: string;
  title: string;
  subject: string;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
};
