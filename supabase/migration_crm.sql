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

-- Төлемдер тарихы (CRM). Ескерту: «payments» атты кесте осы жобадағы басқа жүйеге (онлайн төлем,
-- profiles) тиесілі болуы мүмкін, сондықтан CRM өз кестесін қолданады.
create table if not exists crm_payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete set null,
  student_name text not null,
  amount int,
  paid_on date not null,
  period_end date,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists crm_payments_paid_on on crm_payments (paid_on);
create index if not exists crm_payments_student on crm_payments (student_id);
alter table crm_payments enable row level security;

-- Қатысу (CRM-нің өз кестесі)
create table if not exists crm_attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  date date not null,
  present boolean not null default false,
  excused boolean not null default false,
  created_at timestamptz not null default now(),
  unique (student_id, date)
);
create index if not exists crm_attendance_date on crm_attendance (date);
alter table crm_attendance enable row level security;

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
