-- Мұғалімдер: телефон (WhatsApp ескертулері мен есептер үшін), бір сабақтың ақысы (еңбекақы есебі),
-- Telegram чат id (кешкі автоматты ескерту, міндетті емес). Қайта іске қосуға болады.
alter table teachers add column if not exists phone text;
alter table teachers add column if not exists lesson_rate int;          -- бір сабақ үшін, теңге
alter table teachers add column if not exists telegram_chat_id text;
