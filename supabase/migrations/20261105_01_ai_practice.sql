-- ИИ-тренажёр (IELTS/TOEFL Writing және Speaking): оқушының жаттығулары мен ИИ бағасы.
-- Қайта іске қосуға болады. Тек сервер арқылы қолданылады (RLS қосулы, саясат жоқ).
create table if not exists ai_practice (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  student_id  uuid not null references students(id) on delete cascade,
  exam        text not null,              -- 'ielts' | 'toefl'
  kind        text not null,              -- 'writing' | 'speaking'
  task        text not null,              -- task1 | task2 | email | discussion | part1 | part2 | part3 | interview | repeat
  prompt      text not null,
  answer      text not null,              -- эссе мәтіні не сөйлеудің транскрипті
  seconds     int,
  band        numeric,
  result      jsonb not null
);
create index if not exists ai_practice_student on ai_practice (student_id, created_at desc);
alter table ai_practice enable row level security;
