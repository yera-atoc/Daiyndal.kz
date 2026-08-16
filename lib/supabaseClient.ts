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
  structured_content: StructuredLesson | null;
  structuring_status: "none" | "processing" | "done" | "error";
  structuring_error: string | null;
};

export type LessonTask = {
  question: string;
  type: "choice" | "open";
  options?: string[];
  answer: string;
  image_url?: string;
};

export type LessonSection = {
  heading: string;
  content: string;
};

export type StructuredLesson = {
  summary: string;
  sections: LessonSection[];
  tasks: LessonTask[];
};

export type LessonProgress = {
  id: string;
  student_id: string;
  material_id: string;
  correct_count: number;
  total_count: number;
  xp: number;
  completed: boolean;
  updated_at: string;
};

export type Role = "student" | "teacher";

export type Profile = {
  id: string;
  full_name: string | null;
  role: Role;
  grade: string | null;
  program: string | null;
  subject: string | null;
  email: string | null;
  created_at: string;
};
