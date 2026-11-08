-- Beles 2.0 · оқушы кабинеті: үй тапсырмасының суреті (дәптер фотосы) және оған арналған жабық қойма.
-- Бар деректерге тимейді, қайта іске қосуға болады.

create table if not exists class_homework_files (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references teacher_classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  lesson_date date not null,                 -- тапсырма берілген сабақ күні
  ref text not null,                         -- storage:homework/<path>
  created_at timestamptz not null default now()
);
create index if not exists class_homework_files_lookup on class_homework_files (class_id, lesson_date);
create index if not exists class_homework_files_student on class_homework_files (student_id, created_at desc);
alter table class_homework_files enable row level security;

-- Балалардың дәптер суреттері — ЖАБЫҚ қойма (тек уақытша сілтемемен ашылады)
insert into storage.buckets (id, name, public)
values ('homework', 'homework', false)
on conflict (id) do update set public = false;
