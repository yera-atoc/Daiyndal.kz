-- Пән тесттері: мұғалімнің өз тесттерінің баллдары (мысалы, 11 сынып физика 1–5 тест).
-- Оқушы ҰБТ кабинетінде (/ubt) өз PIN-імен кіріп, нәтижесін және PDF есебін көреді.
create table if not exists subject_sheets (
  id uuid primary key default gen_random_uuid(),
  subject text not null,                       -- 'Физика'
  name text not null,                          -- '11 сынып · 2-топ'
  grade int,
  teacher_id uuid references teachers(id) on delete set null,
  tests jsonb not null default '[]',           -- [{"title":"1-тест","max":30}, ...]
  position int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists subject_rows (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid not null references subject_sheets(id) on delete cascade,
  student_id uuid references students(id) on delete set null,  -- бос болса — кабинетке әлі байланбаған
  student_name text not null,
  scores jsonb not null default '[]',          -- [14, 24, null, ...]
  position int not null default 0,
  unique (sheet_id, student_name)
);
create index if not exists subject_rows_student on subject_rows (student_id);
alter table subject_sheets enable row level security;
alter table subject_rows enable row level security;
