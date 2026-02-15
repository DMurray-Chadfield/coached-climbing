#!/usr/bin/env sh
set -eu

echo "== Prisma migration status =="
pnpm prisma:migrate:status

echo ""
echo "== Recent entries from _prisma_migrations (requires running db container) =="
docker compose exec -T db psql -U postgres -d climbing_coach \
  -c "SELECT migration_name, finished_at, rolled_back_at FROM \"_prisma_migrations\" ORDER BY finished_at DESC NULLS LAST LIMIT 20;"
