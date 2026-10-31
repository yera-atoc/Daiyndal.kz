-- Сайттың жаңа мүмкіндіктері (2026-11-01). Қайта іске қосуға болады (idempotent). Ештеңе өшірмейді.
--  1) Онлайн жазылу және тегін сынақ — өтінімдер
--  2) Жетістіктер беті — түлектердің нәтижелері (әкімші енгізеді)
--  3) Күннің 5 сұрағы — сұрақтар қоры және оқушылардың жауаптары
-- Барлық кесте тек сервер арқылы (service role) қолданылады: RLS қосулы, саясат жоқ.

-- 1) Өтінімдер
create table if not exists site_leads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  source      text not null default 'form',      -- 'form' — жазылу формасы, 'trial' — тегін сынақ
  child_name  text not null,
  grade       text,
  phone       text not null,
  parent_name text,
  direction   text,                              -- НЗМ, БИЛ, ҰБТ, IELTS …
  comment     text,
  trial       jsonb,                             -- {track, title, correct, total, level, answers}
  status      text not null default 'new',       -- new | called | enrolled | declined
  note        text,
  ip          text
);
create index if not exists site_leads_created on site_leads (created_at desc);
alter table site_leads enable row level security;

-- 2) Жетістіктер
create table if not exists site_achievements (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  year       int not null,
  student    text not null,                      -- ата-ана рұқсатымен: «Әлихан Б.»
  exam       text not null,                      -- НЗМ, БИЛ, РФМШ, ҰБТ, IELTS …
  result     text not null,                      -- «1420 балл, грант», «IELTS 7.0»
  school     text,                               -- «НЗМ Қарағанды», «ҚазҰУ»
  published  boolean not null default true,
  position   int not null default 0
);
create index if not exists site_achievements_year on site_achievements (year desc, position);
alter table site_achievements enable row level security;

-- 3) Күннің 5 сұрағы
create table if not exists bt_daily_pool (
  id       bigserial primary key,
  track    text not null,                        -- 'nzm' | 'ubt-math' | 'ubt-phys'
  text     text not null,
  options  jsonb not null,                       -- ["…", "…", "…", "…"]
  answer   text not null,                        -- 'A' … 'D'
  topic    text,
  explain  text,                                 -- қысқа шешімі
  active   boolean not null default true
);
create index if not exists bt_daily_pool_track on bt_daily_pool (track, id);
alter table bt_daily_pool enable row level security;

create table if not exists bt_daily_answers (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references bt_students(id) on delete cascade,
  day        date not null,                      -- Алматы уақытымен
  track      text not null,
  answers    jsonb not null,
  correct    int not null,
  created_at timestamptz not null default now(),
  unique (student_id, day)
);
create index if not exists bt_daily_answers_day on bt_daily_answers (day);
alter table bt_daily_answers enable row level security;
