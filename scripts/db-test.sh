#!/usr/bin/env bash
#
# Mars Space — rebuild a throwaway database and run the full schema test suite.
#
# The mobile app talks to PostgREST directly under the anon key, so RLS is the
# access-control layer rather than a hardening pass. These tests are therefore
# not optional: run them on every schema change and in CI.
#
# Requires a reachable PostgreSQL 17 server. Two ways to point it at one:
#
#   1. Supabase CLI (needs Docker):
#        supabase start
#        DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
#          bash scripts/db-test.sh
#
#   2. Any local PostgreSQL, including a throwaway cluster:
#        initdb -D /tmp/pgtest -U postgres -A trust
#        pg_ctl -D /tmp/pgtest -o "-p 55432" start
#        PGPORT=55432 PGHOST=localhost PGUSER=postgres bash scripts/db-test.sh
#
# Against a plain PostgreSQL the script installs a small shim reproducing the
# parts of Supabase the schema depends on (the auth schema, auth.uid(), and the
# anon / authenticated / service_role roles).

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TESTDB="${TESTDB:-marsspace_test}"

export PGHOST="${PGHOST:-localhost}"
export PGPORT="${PGPORT:-55432}"
export PGUSER="${PGUSER:-postgres}"
export PGCLIENTENCODING=UTF8

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found on PATH." >&2
  echo "On Windows try: export PATH=\"/c/Program Files/PostgreSQL/17/bin:\$PATH\"" >&2
  exit 2
fi

if ! pg_isready -q; then
  echo "No PostgreSQL server at ${PGHOST}:${PGPORT}. See the header of this script." >&2
  exit 2
fi

SHIM="$(mktemp -t marsshim.XXXXXX.sql)"
trap 'rm -f "$SHIM"' EXIT

cat > "$SHIM" <<'SHIMEOF'
-- Local-only: the parts of Supabase this schema depends on. Not applied to a
-- real Supabase project, which provides all of it already.
do $shim$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$shim$;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  encrypted_password text,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb default '{}',
  created_at timestamptz default now()
);

-- PostgREST puts the JWT claims in GUCs; auth.uid() reads the subject.
create or replace function auth.uid() returns uuid
language sql stable as $fn$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$fn$;

create or replace function auth.role() returns text
language sql stable as $fn$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon');
$fn$;
SHIMEOF

echo "==> Rebuilding ${TESTDB} on ${PGHOST}:${PGPORT}"
dropdb --if-exists "$TESTDB"
createdb "$TESTDB"

# The shim's gen_random_uuid() default needs pgcrypto up front. Create it in
# `extensions`, matching Supabase, where it ships pre-installed there. Creating
# it in public instead would leave 36 pgcrypto functions in the public schema
# and make the local database disagree with the real one.
psql -d "$TESTDB" -v ON_ERROR_STOP=1 -q -c "create schema if not exists extensions;"
psql -d "$TESTDB" -v ON_ERROR_STOP=1 -q -c "create extension if not exists pgcrypto with schema extensions;"
psql -d "$TESTDB" -v ON_ERROR_STOP=1 -q -f "$SHIM"

echo "==> Applying migrations"
for f in "$REPO"/supabase/migrations/*.sql; do
  printf '    %s\n' "$(basename "$f")"
  psql -d "$TESTDB" -v ON_ERROR_STOP=1 -q -f "$f"
done

echo "==> Seeding reference data"
psql -d "$TESTDB" -v ON_ERROR_STOP=1 -q -f "$REPO/supabase/seed.sql"

echo "==> Verifying the seed is idempotent"
psql -d "$TESTDB" -v ON_ERROR_STOP=1 -q -f "$REPO/supabase/seed.sql"
psql -d "$TESTDB" -At -c "
  select '    branches='||(select count(*) from branches)
      || ' resources='||(select count(*) from resources)
      || ' addons='||(select count(*) from addons)
      || ' plans='||(select count(*) from membership_plans)
      || ' faqs='||(select count(*) from faqs);"

fail=0
for suite in rls_policies pricing_credits; do
  echo "==> ${suite}"
  if psql -d "$TESTDB" -v ON_ERROR_STOP=1 -f "$REPO/supabase/tests/${suite}.test.sql" 2>&1 \
       | grep -E "pass:|FAIL|ERROR" | sed 's/^psql:[^ ]* //;s/^NOTICE:  /    /'; then :; fi
  # grep swallows the psql status, so re-run quietly for the exit code.
  psql -d "$TESTDB" -v ON_ERROR_STOP=1 -q -f "$REPO/supabase/tests/${suite}.test.sql" >/dev/null 2>&1 \
    || { echo "    ${suite} FAILED"; fail=1; }
done

echo "==> concurrency (double-booking race)"
if node "$REPO/supabase/tests/concurrency.test.mjs" \
     "postgres://${PGUSER}@${PGHOST}:${PGPORT}/${TESTDB}" 2>&1 | sed 's/^/    /'; then :; else fail=1; fi

if [ "$fail" -ne 0 ]; then
  echo
  echo "SCHEMA TESTS FAILED"
  exit 1
fi

echo
echo "All schema tests passed."
