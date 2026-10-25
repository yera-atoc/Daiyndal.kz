-- Қауіпсіздік және сенімділік (2026-10-26)
-- Қайта іске қосуға болады (idempotent). Ештеңе өшірмейді.

-- 1) Кіру әрекеттерін шектеу (PIN/құпия сөз перебор қорғанысы)
create table if not exists auth_throttle (
  key          text primary key,           -- 'ip:1.2.3.4', 'teacher:login', 'admin:owner'
  fails        int not null default 0,
  first_at     timestamptz not null default now(),
  locked_until timestamptz
);

-- 2) Әкімші/мұғалім әрекеттерінің журналы
create table if not exists audit_log (
  id     bigserial primary key,
  at     timestamptz not null default now(),
  actor  text not null,                    -- 'admin:owner', 'admin:<teacher id>', 'teacher:<id>'
  action text not null,                    -- 'POST /api/students', 'admin.login', ...
  ip     text,
  detail jsonb
);
create index if not exists audit_log_at_idx on audit_log (at desc);

-- 3) Сайт қателері (браузер және сервер)
create table if not exists error_log (
  id      bigserial primary key,
  at      timestamptz not null default now(),
  source  text not null,
  message text not null,
  stack   text,
  url     text,
  ua      text,
  ip      text
);
create index if not exists error_log_at_idx on error_log (at desc);
create index if not exists error_log_ip_at_idx on error_log (ip, at desc);

-- 4) Әкімші құқығы бар мұғалімдер (әр адамның өз логині)
alter table teachers add column if not exists is_admin boolean not null default false;

-- 5) Speaking жазбаларына арналған ЖАБЫҚ қойма
insert into storage.buckets (id, name, public)
values ('speaking', 'speaking', false)
on conflict (id) do update set public = false;

-- 6) RLS: браузердегі anon кілтпен ешбір кестені оқу/жазу мүмкін болмасын.
--    Сайт серверде service role арқылы жұмыс істейді, оған RLS кедергі емес.
--    Басқа жүйенің payments және attendance кестелеріне тиіспейміз.
do $$
declare t text;
begin
  foreach t in array array[
    'students','teachers','student_groups','materials','tests','test_questions','schedule_slots',
    'bt_exams','bt_groups','bt_students','bt_submissions','crm_attendance','crm_payments',
    'ielts_tests','ielts_access','ielts_attempts','auth_throttle','audit_log','error_log'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end $$;

-- 7) Ескі журнал жазбаларын тазалау (180 күннен асқан). Қолмен немесе cron арқылы шақыруға болады.
create or replace function prune_logs() returns void language sql as $$
  delete from audit_log where at < now() - interval '180 days';
  delete from error_log where at < now() - interval '90 days';
  delete from auth_throttle where coalesce(locked_until, first_at) < now() - interval '1 day';
$$;
revoke execute on function prune_logs() from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke execute on function prune_logs() from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke execute on function prune_logs() from authenticated; end if;
end $$;

-- Тексеру: төмендегі сұрау RLS ӨШІРУЛІ кестелерді көрсетеді (бос болуы керек, payments/attendance-тан басқа)
-- select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
--  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
