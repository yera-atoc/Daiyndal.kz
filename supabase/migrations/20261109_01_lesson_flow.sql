-- «Бір экран — бір сабақ»: КТП (тақырыптық жоспар), үй тапсырмасын тексеру, сабақ тесттері,
-- мұғалім қабылдаған төлемдер. Бар деректерге тимейді, қайта іске қосуға болады.

-- КТП: топтың тақырыптары ретімен (бір жол — бір сабақ)
create table if not exists class_plan (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references teacher_classes(id) on delete cascade,
  position int not null default 0,
  topic text not null,
  homework text,
  created_at timestamptz not null default now()
);
create index if not exists class_plan_class on class_plan (class_id, position);

-- Сабақта КТП-ның қай тақырыбы өтілді
alter table class_lessons add column if not exists plan_id uuid references class_plan(id) on delete set null;

-- Үй тапсырмасын тексеру: date — тексерілген сабақ күні; done / partial / none
create table if not exists class_homework (
  class_id uuid not null references teacher_classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  date date not null,
  mark text not null check (mark in ('done', 'partial', 'none')),
  updated_at timestamptz not null default now(),
  primary key (class_id, student_id, date)
);
create index if not exists class_homework_student on class_homework (student_id, date);

-- Сабақ тесті: тақырып бойынша (ИИ құрастырады), оқушы өз кабинетінде тапсырады
create table if not exists class_quizzes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references teacher_classes(id) on delete cascade,
  date date not null,
  topic text not null,
  questions jsonb not null default '[]',      -- [{"q":"...","options":["..","..","..",".."],"correct":0}]
  open boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists class_quizzes_class on class_quizzes (class_id, date);

create table if not exists class_quiz_answers (
  quiz_id uuid not null references class_quizzes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  answers jsonb not null default '[]',
  score int not null default 0,
  total int not null default 0,
  created_at timestamptz not null default now(),
  primary key (quiz_id, student_id)
);
create index if not exists class_quiz_answers_student on class_quiz_answers (student_id);

-- Төлем: қалай төленді (Kaspi / қолма-қол / аударым) және кім қабылдады (әкімші немесе мұғалім)
alter table crm_payments add column if not exists method text;
alter table crm_payments add column if not exists recorded_by text;
alter table crm_payments add column if not exists created_at timestamptz default now();

alter table class_plan enable row level security;
alter table class_homework enable row level security;
alter table class_quizzes enable row level security;
alter table class_quiz_answers enable row level security;
