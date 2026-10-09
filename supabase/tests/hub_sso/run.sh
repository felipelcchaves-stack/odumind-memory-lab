#!/usr/bin/env bash
# Applies the project's role base + the hub_sso migrations to a throwaway local PostgreSQL
# (unix socket only, no TCP port) and runs the assertions in test.sql.
#   bash supabase/tests/hub_sso/run.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
TMP="$(mktemp -d)"
cleanup() { pg_ctl -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
initdb -D "$TMP/data" -U postgres -A trust >/dev/null
pg_ctl -D "$TMP/data" -o "-c listen_addresses='' -k $TMP" -l "$TMP/log" -w start >/dev/null
PSQL=(psql -h "$TMP" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -X -o /dev/null)
"${PSQL[@]}" -f "$HERE/supabase_stub.sql"
"${PSQL[@]}" -f "$HERE/project_base.sql"
for m in "$ROOT"/supabase/migrations/*_hub_sso*.sql; do "${PSQL[@]}" -f "$m"; done
"${PSQL[@]}" -f "$HERE/test.sql"
if [ -f "$HERE/project_test.sql" ]; then "${PSQL[@]}" -f "$HERE/project_test.sql"; fi
echo "hub_sso SQL tests: OK"
