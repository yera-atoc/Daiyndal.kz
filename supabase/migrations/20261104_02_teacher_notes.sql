-- Мұғалімнің оқушы туралы пікірі (Білім тексеру сынағы бойынша). Ата-анаға жіберілетін PDF есепке шығады.
-- Бір мұғалім — бір оқушыға — бір сынаққа бір пікір. Қайта іске қосуға болады.
create table if not exists bt_teacher_notes (
  id uuid primary key default gen_random_uuid(),
  exam_id text not null,
  student_id uuid not null,
  teacher_id uuid not null,
  teacher_name text not null,
  subject text,
  text text not null,
  updated_at timestamptz not null default now(),
  unique (exam_id, student_id, teacher_id)
);
create index if not exists bt_teacher_notes_exam on bt_teacher_notes (exam_id);
alter table bt_teacher_notes enable row level security;
