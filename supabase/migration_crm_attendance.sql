-- CRM қатысуы: өз кестесі. Ескерту: «attendance» атты кесте осы жобадағы басқа жүйеге тиесілі болуы мүмкін.
-- Supabase → SQL Editor → New query → қойып, Run (бір рет).

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
