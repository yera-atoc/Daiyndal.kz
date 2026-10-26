-- Сабақ журналы: әр мұғалімнің өз топтары, апталық қатысу, өтілген тақырып және үй тапсырмасы.
-- Мұғалім тек өз топтарын көреді; топтарды және оқушыларды әкімші бекітеді.

-- Мұғалімнің сабақ тобы (бір пән, бір мұғалім). CRM тобынан құрылуы мүмкін, бірақ құрамы бөлек.
create table if not exists teacher_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  name text not null,
  subject text,
  group_id uuid references student_groups(id) on delete set null,
  days int[] not null default '{}',             -- сабақ күндері: 1 = дүйсенбі … 7 = жексенбі
  active boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists teacher_classes_teacher on teacher_classes (teacher_id);

create table if not exists teacher_class_students (
  class_id uuid not null references teacher_classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  primary key (class_id, student_id)
);
create index if not exists teacher_class_students_student on teacher_class_students (student_id);

-- Апта бойынша жазба: өтілген тақырыптар, үй тапсырмасы, ескерту
create table if not exists class_weeks (
  class_id uuid not null references teacher_classes(id) on delete cascade,
  week_start date not null,                      -- аптаның дүйсенбісі
  topic text,
  homework text,
  note text,
  updated_at timestamptz not null default now(),
  updated_by text,
  primary key (class_id, week_start)
);

-- Нақты сабақ күні: тақырып пен тапсырма (міндетті емес). cancelled — кестедегі күн бұл аптада болмады;
-- кестеде жоқ күнге cancelled = false жазба — қосымша сабақ.
create table if not exists class_lessons (
  class_id uuid not null references teacher_classes(id) on delete cascade,
  date date not null,
  topic text,
  homework text,
  cancelled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by text,
  primary key (class_id, date)
);

-- Қатысу: келді / келмеді / себепті / кешікті
create table if not exists class_attendance (
  class_id uuid not null references teacher_classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  date date not null,
  status text not null check (status in ('present', 'absent', 'excused', 'late')),
  updated_at timestamptz not null default now(),
  primary key (class_id, student_id, date)
);
create index if not exists class_attendance_student_date on class_attendance (student_id, date);

alter table teacher_classes enable row level security;
alter table teacher_class_students enable row level security;
alter table class_weeks enable row level security;
alter table class_lessons enable row level security;
alter table class_attendance enable row level security;
