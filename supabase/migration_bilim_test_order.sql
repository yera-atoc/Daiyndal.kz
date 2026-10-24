-- НЗМ тобы: пәндердің реті — Математика, Сандық сипаттама, Жаратылыстану, Қазақ тілі, Орыс тілі, Ағылшын тілі.
-- Supabase → SQL Editor → New query → қойып, Run (бір рет). Деректер өзгермейді, тек реті.

update bt_groups set subjects = (
  select jsonb_agg(e order by array_position(array['math','quant','science','kazakh','russian','english'], e->>'id'))
  from jsonb_array_elements(subjects) e
) where id = 'nzm';

update bt_exams set subjects = (
  select jsonb_agg(e order by array_position(array['math','quant','science','kazakh','russian','english'], e->>'id'))
  from jsonb_array_elements(subjects) e
) where group_id = 'nzm';
