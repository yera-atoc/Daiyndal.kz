-- CRM ↔ Білім тексеру байланысы, топтың айлық төлемі, мектеп пен мекенжай.
-- Supabase → SQL Editor → New query → толық қойып, Run (бір рет). Бар деректер сақталады.

alter table students add column if not exists school text;
alter table students add column if not exists address text;
alter table students add column if not exists bt_student_id uuid;          -- Білім тексерудегі сол оқушы

alter table student_groups add column if not exists bt_group_id text;      -- Білім тексерудегі сол топ
alter table student_groups add column if not exists monthly_fee int;       -- топтың айлық төлемі

-- Аттары бірдей топтарды байланыстыру
update student_groups sg set bt_group_id = g.id
from bt_groups g
where sg.bt_group_id is null and sg.name = g.name;

-- Аттары бірдей оқушыларды байланыстыру (байланысқан топ ішінде)
update students s set bt_student_id = b.id
from bt_students b, student_groups sg
where s.bt_student_id is null
  and s.group_id = sg.id and sg.bt_group_id = b.group_id
  and s.full_name = b.full_name;
