#!/usr/bin/env bash
# Teste les migrations, le seed et les politiques RLS sur un PostgreSQL local.
# Usage : bash scripts/test-db.sh   (nécessite les binaires PostgreSQL 15+)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
RUN=()
if [ "$(id -u)" = "0" ]; then
  # initdb refuse root : on utilise l'utilisateur postgres
  chown -R postgres "$TMP"; chmod 755 "$TMP"
  RUN=(runuser -u postgres --)
fi
PORT="${PGPORT_TEST:-54329}"
trap '"${RUN[@]}" "$PGBIN/pg_ctl" -D "$TMP/data" stop -m fast >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT
"${RUN[@]}" "$PGBIN/initdb" -D "$TMP/data" -U postgres --auth=trust >/dev/null
"${RUN[@]}" "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
PSQL=(psql -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -X -t -A)
"${PSQL[@]}" -f "$ROOT/scripts/supabase-shim.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "→ migration $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
echo "→ seed"
"${PSQL[@]}" -f "$ROOT/supabase/seed.sql"
echo "→ tests RLS / logique"
"${PSQL[@]}" -f "$ROOT/tests/db/rls.test.sql"
echo "✔ base de données OK"
