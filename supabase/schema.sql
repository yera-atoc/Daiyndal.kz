-- Beles platform: teachers, students, attendance
-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor -> New query)

create extension if not exists "pgcrypto";

create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text,
  username text unique,
  password_salt text,
  password_hash text,
  created_at timestamptz not null default now()
);

create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  subject text not null,
  title text not null,
  description text,
  url text,
  created_at timestamptz not null default now()
);

create table if not exists tests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  subject text not null,
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists test_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references tests(id) on delete cascade,
  question_text text not null,
  options jsonb not null,
  correct_index int not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  grade int,
  teacher_id uuid references teachers(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  date date not null,
  present boolean not null default false,
  created_at timestamptz not null default now(),
  unique (student_id, date)
);

-- Row Level Security: all reads/writes go through the app's server-side
-- API routes using the service role key, which bypasses RLS. We enable RLS
-- here and add no public policies, so the tables cannot be read or written
-- directly from the browser with the anon key.
alter table teachers enable row level security;
alter table students enable row level security;
alter table attendance enable row level security;
alter table materials enable row level security;
alter table tests enable row level security;
alter table test_questions enable row level security;
