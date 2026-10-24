-- Білім тексеру: оқушылар тізімі (админ бетінен қосылады / өзгертіледі).
-- Supabase → SQL Editor → New query → қойып, Run (бір рет).
-- Кесте бос болса, сайт оны бастапқы 22 оқушы мен қыркүйек нәтижелерімен өзі толтырады.

create table if not exists bt_students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null unique,
  position int not null default 0,
  legacy_scores jsonb not null default '{}',   -- сайтқа дейінгі айлар: {"2026-09": {"math": 370, ...}}
  created_at timestamptz not null default now()
);

alter table bt_students enable row level security;
