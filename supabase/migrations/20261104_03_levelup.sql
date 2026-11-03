-- НИШ «Деңгей»: оқушы соңғы көрген деңгей/ранг (жүйе хабарламасы үшін) және стат ұпайлары. Қайта іске қосуға болады.
create table if not exists bt_levelup (
  student_id uuid primary key,
  seen_level int not null default 0,
  seen_rank text not null default '',
  points jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table bt_levelup enable row level security;
