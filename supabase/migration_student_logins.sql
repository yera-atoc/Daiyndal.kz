-- Beles platform: student logins (admin-assigned, same model as teacher logins)
-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor -> New query).

alter table students add column if not exists username text unique;
alter table students add column if not exists password_salt text;
alter table students add column if not exists password_hash text;
