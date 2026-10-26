-- Білім тексеру: дайындық сынағы (өткен айдың сынағын оқушы өзі тапсырып, бірден тексереді).
-- Ресми нәтижеге, рейтингке және болжамға кірмейді.
alter table bt_exams add column if not exists practice boolean not null default false;
