-- Топ журналы: сабақтағы баға (әр оқушыға, әр сабаққа) және топтың баға шкаласы.
-- Бар деректерге тимейді, қайта іске қосуға болады.
create table if not exists class_marks (
  class_id uuid not null references teacher_classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  date date not null,
  score numeric(5, 1) not null,
  max smallint not null default 10,
  comment text,
  updated_at timestamptz not null default now(),
  primary key (class_id, student_id, date)
);
create index if not exists class_marks_student on class_marks (student_id, date);
alter table class_marks enable row level security;

-- Топтың баға шкаласы: 5, 10 немесе 100 балл
alter table teacher_classes add column if not exists mark_scale smallint not null default 10;
