-- Білім тексеру сынағы (НЗМ дайындық тобы): ай сайынғы сынақтар мен жауап парақтары.
-- Supabase → SQL Editor → New query → осы файлды қойып, Run басыңыз (бір рет).

create extension if not exists "pgcrypto";

-- Бір ай = бір сынақ. id: '2026-10'
create table if not exists bt_exams (
  id text primary key,
  title text not null,
  subjects jsonb not null,                    -- пәндер: сұрақ саны, нұсқа саны, максимал балл
  open_subjects jsonb not null default '[]',  -- қазір жауап қабылданатын пәндер
  answer_key jsonb not null default '{}',     -- дұрыс жауаптар: {"math": ["A","C",...]}
  created_at timestamptz not null default now()
);

-- Оқушының бір пән бойынша жауап парағы
create table if not exists bt_submissions (
  id uuid primary key default gen_random_uuid(),
  exam_id text not null references bt_exams(id) on delete cascade,
  student_name text not null,
  subject text not null,
  answers jsonb not null,                     -- ["A","","D",...] ("" — бос)
  submitted_at timestamptz not null default now(),
  unique (exam_id, student_name, subject)
);

-- Браузерден тікелей қолжетімсіз: барлық сұраныс сервердің API-і арқылы (service role).
alter table bt_exams enable row level security;
alter table bt_submissions enable row level security;
