#!/usr/bin/env bash
# Базаның толық сақтық көшірмесі (өз компьютеріңізде іске қосыңыз).
#   DATABASE_URL=postgres://... ./scripts/backup.sh
# Нәтиже: backups/beles-ЖЖЖЖ-АА-КК-ССММ.dump (git-ке түспейді – ішінде балалардың деректері бар!)
# Қалпына келтіру (тек БОС тест базаға!): pg_restore --no-owner -d "$TEST_DATABASE_URL" backups/<файл>.dump
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL орнатылмаған}"
mkdir -p backups
out="backups/beles-$(date +%Y-%m-%d-%H%M).dump"
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges --schema=public --file="$out"
echo "Сақталды: $out ($(du -h "$out" | cut -f1))"
# Ескі көшірмелер: соңғы 14-і қалады
ls -1t backups/*.dump | tail -n +15 | xargs -r rm --
