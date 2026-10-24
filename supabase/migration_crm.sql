-- Beles CRM: оқушылар, топтар, төлемдер, қатысу, кесте.
-- Supabase → SQL Editor → New query → толық қойып, Run (бір рет).
-- Қауіпсіз: бар кестелер мен деректерге тимейді, тек жоғын қосады.

create extension if not exists "pgcrypto";

-- Оқу топтары (CRM)
create table if not exists student_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
alter table student_groups enable row level security;

-- Оқушы карточкасының өрістері
alter table students add column if not exists group_id uuid references student_groups(id) on delete set null;
alter table students add column if not exists phone text;
alter table students add column if not exists parent_name text;
alter table students add column if not exists parent_phone text;
alter table students add column if not exists status text not null default 'active';   -- active | paused | left
alter table students add column if not exists start_date date;
alter table students add column if not exists payment_date date;
alter table students add column if not exists payment_deadline date;
alter table students add column if not exists payment_amount int;
alter table students add column if not exists comment text;

-- Төлемдер тарихы
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete set null,
  student_name text not null,
  amount int,
  paid_on date not null,
  period_end date,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists payments_paid_on on payments (paid_on);
alter table payments enable row level security;

-- Қатысу: «себепті» белгісі
alter table attendance add column if not exists excused boolean not null default false;

-- Сабақ кестесі
create table if not exists schedule_slots (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  group_id uuid references student_groups(id) on delete set null,
  day_of_week int not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  title text,
  note text,
  created_at timestamptz not null default now()
);
alter table schedule_slots add column if not exists room text;
alter table schedule_slots enable row level security;
