-- IELTS mock: тесттер, оқушыларға рұқсат, тапсыру әрекеттері.
-- Supabase → SQL Editor → New query → толық қойып, Run (бір рет). Бар деректерге тимейді.

create extension if not exists "pgcrypto";

-- Оқушының IELTS-ке кіру коды (CRM оқушысы)
alter table students add column if not exists ielts_pin text;
alter table students add column if not exists ielts_pin_fails int not null default 0;
alter table students add column if not exists ielts_locked_until timestamptz;

-- Тест: мазмұны (Listening/Reading/Writing/Speaking) jsonb ішінде, жауаптарымен бірге
create table if not exists ielts_tests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references teachers(id) on delete set null,
  title text not null,
  variant text not null default 'academic',      -- academic | general
  mode text not null default 'exam',             -- exam (уақытпен) | practice
  content jsonb not null default '{}',
  published boolean not null default false,      -- оқушыларға көріне ме
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table ielts_tests enable row level security;

-- Қай оқушы қай тестті тапсыра алады
create table if not exists ielts_access (
  test_id uuid not null references ielts_tests(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  attempts_allowed int not null default 1,
  created_at timestamptz not null default now(),
  primary key (test_id, student_id)
);
alter table ielts_access enable row level security;

-- Тапсыру: жауаптар, бөлімдердің уақыты, баллдар
create table if not exists ielts_attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references ielts_tests(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status text not null default 'in_progress',    -- in_progress | submitted | graded
  state jsonb not null default '{}',             -- ағымдағы бөлім, әр бөлімнің басталған уақыты
  answers jsonb not null default '{}',           -- {"listening": {"1": "..."}, "reading": {...}}
  writing jsonb not null default '{}',           -- {"task1": "...", "task2": "..."}
  speaking jsonb not null default '{}',          -- {"p1q0": "https://...webm", ...}
  scores jsonb not null default '{}',            -- L/R автоматты, W/S мұғалімнен, overall
  feedback jsonb not null default '{}',          -- мұғалімнің пікірі
  published boolean not null default false,      -- толық нәтиже оқушыға көрсетілді ме
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  graded_at timestamptz
);
create index if not exists ielts_attempts_student on ielts_attempts (student_id);
create index if not exists ielts_attempts_test on ielts_attempts (test_id);
alter table ielts_attempts enable row level security;

-- TOEFL (кейін қосылды): тест түрі
alter table ielts_tests add column if not exists exam text not null default 'ielts';
