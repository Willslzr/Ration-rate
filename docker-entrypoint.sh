#!/bin/sh
set -e

# Migrations run on every container start (idempotent — already-applied
# migrations are skipped) against whichever PostgreSQL DATABASE_URL is
# configured. Run from packages/api so the config's relative paths resolve
# (see prisma/postgresql/schema.prisma for why this schema is separate from
# the SQLite one used in local dev/tests).
(cd packages/api && node_modules/.bin/prisma migrate deploy --config=prisma.postgresql.config.ts)

exec node packages/api/dist/main.js
