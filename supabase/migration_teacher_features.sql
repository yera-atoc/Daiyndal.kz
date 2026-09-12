-- Beles platform: teacher logins, materials, tests
-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor -> New query).
-- Safe to run even though `teachers`/`students`/`attendance` already exist —
-- everything below only adds what's missing.

alter table teachers add column if not exists username text unique;
alter table teachers add column if not exists password_salt text;
alter table teachers add column if not exists password_hash text;

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

-- Same model as the rest of the app: RLS is on with no public policies, so
-- these tables are only reachable through server-side API routes using the
-- service role key (which bypasses RLS). Access control is enforced in
-- app code (lib/requireTeacher.ts, lib/requireAdmin.ts), not in Postgres.
alter table materials enable row level security;
alter table tests enable row level security;
alter table test_questions enable row level security;
