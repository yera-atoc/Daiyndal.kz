-- TOEFL mock: тесттер кестесіне түрін қосу (IELTS тесттері өзгермейді).
-- Supabase → SQL Editor → қойып, Run (бір рет).
alter table ielts_tests add column if not exists exam text not null default 'ielts';
