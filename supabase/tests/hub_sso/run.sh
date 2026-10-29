#!/usr/bin/env bash
# Throwaway local PostgreSQL (unix socket only, no TCP port), stub auth schema, then:
#   1. the project's role base + the hub_sso migrations (the access token hook included) and the
#      assertions in test.sql / project_test.sql;
#   2. hook_test.sql: the Custom Access Token Hook and the session gate it drives;
#   3. security fixes: security_base.sql (the project's real tables and policies), security_before.sql
#      (the attack WORKS), every *_security_*.sql migration applied TWICE (idempotent), then
#      security_after.sql (the attack is blocked, the legitimate paths still work).
#   bash supabase/tests/hub_sso/run.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
TMP="$(mktemp -d)"
cleanup() { pg_ctl -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
initdb -D "$TMP/data" -U postgres -A trust >/dev/null
pg_ctl -D "$TMP/data" -o "-c listen_addresses='' -k $TMP" -l "$TMP/log" -w start >/dev/null
PSQL=(env PGOPTIONS="-c client_min_messages=warning" psql -h "$TMP" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -X -o /dev/null)
"${PSQL[@]}" -f "$HERE/supabase_stub.sql"
"${PSQL[@]}" -f "$HERE/project_base.sql"
for m in "$ROOT"/supabase/migrations/*_hub_sso*.sql; do "${PSQL[@]}" -f "$m"; done
"${PSQL[@]}" -f "$HERE/test.sql"
if [ -f "$HERE/project_test.sql" ]; then "${PSQL[@]}" -f "$HERE/project_test.sql"; fi
echo "hub_sso SQL tests: OK"
if [ -f "$HERE/hook_test.sql" ]; then
  "${PSQL[@]}" -f "$HERE/hook_test.sql"
  echo "access token hook SQL tests: OK"
fi
if [ -f "$HERE/security_base.sql" ]; then
  "${PSQL[@]}" -f "$HERE/security_base.sql"
  "${PSQL[@]}" -f "$HERE/security_before.sql"
  for pass in 1 2; do
    for m in "$ROOT"/supabase/migrations/*_security_*.sql; do "${PSQL[@]}" -f "$m"; done
  done
  "${PSQL[@]}" -f "$HERE/security_after.sql"
  echo "security fix SQL tests: OK"
fi
