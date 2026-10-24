-- Білім тексеру v2: топтар (НЗМ, 3–11 сыныптар), оқушы PIN-і, нәтижені жариялау, сұрақтар.
-- Supabase → SQL Editor → New query → осы файлды толық қойып, Run (бір рет).
-- Бұрынғы деректер (қазан сынағы, жауап парақтары, оқушылар) сақталады — бәрі «НЗМ» тобына жатады.

-- 1. Топтар
create table if not exists bt_groups (
  id text primary key,                    -- 'nzm', 'g5', ...
  name text not null,
  position int not null default 0,
  subjects jsonb not null default '[]',   -- жаңа айдың сынағына пәндер үлгісі
  created_at timestamptz not null default now()
);
alter table bt_groups enable row level security;

insert into bt_groups (id, name, position, subjects) values (
  'nzm', 'НЗМ дайындық тобы', 0,
  '[{"id":"quant","name":"Сандық сипаттама","short":"Сандық сип.","max":300,"questions":60,"options":4},
    {"id":"math","name":"Математика","short":"Математика","max":400,"questions":40,"options":4},
    {"id":"science","name":"Жаратылыстану","short":"Жаратылыстану","max":200,"questions":20,"options":4},
    {"id":"english","name":"Ағылшын тілі","short":"Ағылшын т.","max":200,"questions":20,"options":4},
    {"id":"kazakh","name":"Қазақ тілі","short":"Қазақ т.","max":200,"questions":20,"options":4},
    {"id":"russian","name":"Орыс тілі","short":"Орыс т.","max":200,"questions":20,"options":4}]'
) on conflict (id) do nothing;

-- 2. Сынақтар: топ, ай, жариялау, сұрақтар
alter table bt_exams add column if not exists group_id text not null default 'nzm';
alter table bt_exams add column if not exists month text;
alter table bt_exams add column if not exists published boolean not null default false;
alter table bt_exams add column if not exists questions jsonb not null default '{}';
update bt_exams set month = id where month is null;

-- 3. Оқушылар: топ, PIN (кіру коды), қате енгізу саны
alter table bt_students add column if not exists group_id text not null default 'nzm';
alter table bt_students add column if not exists pin text;
alter table bt_students add column if not exists pin_fails int not null default 0;
alter table bt_students add column if not exists locked_until timestamptz;

-- Аты-жөні енді топ ішінде бірегей (екі топта аттас бала болуы мүмкін)
alter table bt_students drop constraint if exists bt_students_full_name_key;
create unique index if not exists bt_students_group_name on bt_students (group_id, full_name);

-- PIN-і жоқ оқушыларға 4 таңбалы код беру
update bt_students set pin = lpad((floor(random() * 10000))::int::text, 4, '0') where pin is null;
