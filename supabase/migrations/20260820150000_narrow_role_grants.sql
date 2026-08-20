-- Mars Space — 025 Narrow the role grants back to what each role uses
--
-- WHY THERE IS ANYTHING TO REVOKE
-- ===============================
-- Supabase ships a project with
--
--     alter default privileges in schema public
--       grant all on tables to postgres, anon, authenticated, service_role;
--
-- (scripts/db-test.sh reproduces it in its shim, which is why the local
-- database agrees with the real one). Every `create table` in this repo
-- therefore lands with SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES
-- and TRIGGER already held by `anon` and `authenticated`, before a single
-- `grant` statement in these migrations runs. The explicit grants that follow
-- a `create table` — `grant select on public.rate_tiers to anon, authenticated`
-- in migration 017, `grant select on public.bank_accounts to authenticated` in
-- migration 016 — read like the access policy for those tables and are in fact
-- no-ops: the privilege was already there, and six more with it.
--
-- has_table_privilege confirmed it. Before this migration:
--
--     anon          bank_accounts   DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE
--     authenticated bank_accounts   DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE
--     anon          rate_tiers      DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE
--     authenticated rate_tiers      DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE
--
-- The `anon` key ships inside the browser bundle and inside the Expo app, so
-- "anon holds DELETE" means the whole internet holds DELETE, and PostgREST
-- publishes it at `DELETE /rest/v1/rate_tiers` without any code of ours being
-- involved.
--
-- THIS IS DEFENCE IN DEPTH, NOT A LIVE HOLE. RLS is enabled on both tables and
-- stops all of it today:
--   - rate_tiers has `rate_tiers_read` (select, using true) and
--     `rate_tiers_staff` (all, is_staff()), so a write by anon matches no
--     permissive policy and is rejected;
--   - bank_accounts has `bank_accounts_read` (select TO authenticated, using
--     is_active) and `bank_accounts_staff`, so anon matches nothing at all.
-- The grants are the layer that has to still be standing on the day a policy
-- is edited wrong, and a grant nobody uses is a free one to give up. The IBANs
-- in bank_accounts are what members transfer money to; a row whose `iban` an
-- anonymous caller could UPDATE is a payment-redirection bug waiting for one
-- bad policy change.
--
-- WHAT EACH ROLE ACTUALLY NEEDS
-- -----------------------------
-- rate_tiers    anon + authenticated: SELECT.
--               The website never reads the table directly — it quotes through
--               price_booking()/price_duration(), which are SECURITY DEFINER
--               and so read the tiers as the owner regardless of the caller's
--               grants. The Expo app does read it directly, embedded off
--               resources (`.select('*, rate_tiers(*)')` in the mobile
--               src/lib/queries.ts, listBookableRooms + getResource), and an
--               embed IS a direct read of the embedded table, so SELECT has to
--               stay for both roles. This is the published price list; it is
--               public by intent.
-- bank_accounts authenticated: SELECT. anon: nothing.
--               `bank_accounts_read` is already declared `to authenticated`,
--               so anon's grant never bought a readable row — only the write
--               verbs it should never have had.
-- service_role  everything, unchanged. It is the ERP's client and bypasses
--               RLS by design.
--
-- NOT CHANGED HERE: the ALTER DEFAULT PRIVILEGES itself. Narrowing it would
-- silently change the posture of every table created after this migration,
-- including ones other work in flight is adding, and a table that quietly
-- loses a grant it was written to rely on fails at runtime rather than at
-- migration time. The default is a platform convention; the answer to it is an
-- explicit revoke next to each table, which is what this file is.

-- ---------------------------------------------------------------------------
-- rate_tiers — the published price list. Readable, not writable.
-- ---------------------------------------------------------------------------
revoke all on public.rate_tiers from anon, authenticated;
grant select on public.rate_tiers to anon, authenticated;

comment on table public.rate_tiers is
  'Duration blocks for a resource; the 1-hour row is the hourly rate. SELECT only for anon and authenticated (migration 025) — this is the published price list, so it is deliberately world-readable, but writes are staff-only through the service role. price_duration() is SECURITY DEFINER and does not depend on the caller holding this grant.';

-- ---------------------------------------------------------------------------
-- bank_accounts — the IBANs members transfer to. Members read, nobody else.
-- ---------------------------------------------------------------------------
revoke all on public.bank_accounts from anon, authenticated;
grant select on public.bank_accounts to authenticated;

comment on table public.bank_accounts is
  'Branch bank details shown to a member about to pay an invoice. SELECT for authenticated only (migration 025); anon holds nothing, matching bank_accounts_read, which is already declared TO authenticated. Writes are staff-only through the service role: an anon-writable IBAN is a payment-redirection bug.';

-- ---------------------------------------------------------------------------
-- contracts.signing_token — a bearer credential that members could read
-- ===========================================================================
-- `signing_token` is the ONLY credential guarding /api/v1/public/contracts/
-- sign/[token], an unauthenticated route that reads and then WRITES the
-- contract under the service role. Whoever holds the string can sign.
--
-- `contracts_read_own` (migration 012) lets any authenticated member of the
-- owning company SELECT their company's contract rows, and
-- `grant select on public.contracts to authenticated` (also migration 012) is
-- a TABLE-level grant, so it covers every column including that one. The
-- consequence: an ordinary employee could
--
--     GET /rest/v1/contracts?select=signing_token
--
-- with the anon key and their own session, read the live signing link for a
-- contract their company had not signed yet, and redeem it — signing on behalf
-- of the company as somebody who was never sent the link. The signature
-- evidence columns added in migration 024 are all self-asserted
-- (signatory_name_claimed, signatory_ip_claimed), so nothing downstream would
-- contradict them.
--
-- Nothing is exposed today: no contract in the database holds a non-null
-- signing_token, so there is currently no live token to read. That makes this
-- the moment to close it — the revoke costs nothing to verify against real
-- data, and the first token minted after it lands is already protected.
--
-- WHY A COLUMN GRANT AND NOT SOMETHING ELSE
-- -----------------------------------------
-- Migration 024 recorded that "revoking a column subset is not possible while
-- the table-level SELECT grant stands". That is true and it is the mechanism,
-- not an obstacle: Postgres has no way to subtract one column from a table
-- grant, so the table grant is dropped and replaced by a grant over the
-- remaining columns. `revoke select (signing_token)` on its own is a silent
-- no-op while the table grant exists, which is exactly the trap to avoid.
--
-- The list is built from the catalogue rather than typed out, so this file
-- cannot drift from the table it was written against and does not have to be
-- edited when an unrelated column is added — but it is a SNAPSHOT: a column
-- added by a LATER migration is not covered by it and will not be readable by
-- `authenticated` until it is granted. That is the cost of the fix, and it is
-- the reason for the assertion at the foot of this file and for the comment
-- left on the table. It fails loudly (42501 permission denied) rather than
-- quietly returning nulls, which is the better half of the trade.
--
-- Considered and rejected:
--   - Leaving it and relying on the ERP being the only reader. Grants are the
--     backstop; "no client happens to ask for that column" is not one.
--   - A security_invoker view over the non-token columns. Same snapshot
--     problem, plus a second object to keep in step with the table and a
--     second grant surface. No gain.
--   - Storing a hash of the token instead of the token. This is the real fix,
--     since it makes the database stop holding the credential at all, and it
--     should be done: mint the token, email it, store only
--     encode(digest(token,'sha256'),'hex'), and have the sign route look up by
--     the hash of what it was handed. It is out of scope here because it
--     changes ContractService#_resolveSigningToken and the ERP write path, not
--     just a grant, and this migration must not depend on application code
--     shipping in the same breath. The column grant below is correct on its
--     own and stays correct after that change.
--
-- WHO IS UNAFFECTED
--   - anon: holds no grant on contracts at all, before or after.
--   - service_role: untouched. Every reader of signing_token in the codebase
--     is the ERP repository layer or the public sign route, both service-role.
--   - members: keep SELECT on every other column, so their own contracts are
--     as readable as they were. No view over contracts exists, and nothing in
--     the website or the Expo app selects from contracts under a member
--     session today.
-- ---------------------------------------------------------------------------
do $$
declare
  v_cols text;
begin
  select string_agg(quote_ident(attname), ', ' order by attnum)
    into v_cols
    from pg_attribute
   where attrelid = 'public.contracts'::regclass
     and attnum > 0
     and not attisdropped
     and attname <> 'signing_token';

  if v_cols is null then
    raise exception 'contracts: no grantable columns found — refusing to revoke';
  end if;

  -- Order matters: the table-level grant has to go first, or the column grant
  -- is subsumed by it and signing_token stays readable.
  execute 'revoke select on public.contracts from authenticated';
  execute format('grant select (%s) on public.contracts to authenticated', v_cols);
end
$$;

comment on column public.contracts.signing_token is
  'Single-use bearer credential for the unauthenticated signing route /api/v1/public/contracts/sign/[token]. Whoever holds the string can sign the contract, so it is NOT covered by the column-level SELECT grant that `authenticated` holds on this table (migration 025) — only service_role and postgres can read it. CONSEQUENCE FOR LATER MIGRATIONS: because that grant is a column list, a new column on public.contracts must be granted explicitly (grant select (new_col) on public.contracts to authenticated) or member reads of it fail with 42501.';

-- ---------------------------------------------------------------------------
-- Assertions. A grant migration that is not verified is a comment.
--
-- These run every time the migration does, including in scripts/db-test.sh,
-- so a future `grant all` that undoes any of this fails the build here rather
-- than in an audit six months later.
-- ---------------------------------------------------------------------------
do $$
declare
  v_priv text;
  v_role text;
  v_tbl  text;
begin
  -- No write verb survives for either public-facing role on either table.
  foreach v_tbl in array array['public.rate_tiers', 'public.bank_accounts'] loop
    foreach v_role in array array['anon', 'authenticated'] loop
      foreach v_priv in array array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
        if has_table_privilege(v_role, v_tbl, v_priv) then
          raise exception 'FAIL: % still holds % on %', v_role, v_priv, v_tbl;
        end if;
      end loop;
    end loop;
  end loop;

  -- The reads each role legitimately needs still work.
  if not has_table_privilege('anon', 'public.rate_tiers', 'SELECT') then
    raise exception 'FAIL: anon lost SELECT on rate_tiers — public pricing would break';
  end if;
  if not has_table_privilege('authenticated', 'public.rate_tiers', 'SELECT') then
    raise exception 'FAIL: authenticated lost SELECT on rate_tiers';
  end if;
  if not has_table_privilege('authenticated', 'public.bank_accounts', 'SELECT') then
    raise exception 'FAIL: authenticated lost SELECT on bank_accounts — invoice payment would break';
  end if;

  -- anon reads nothing it was never meant to.
  if has_table_privilege('anon', 'public.bank_accounts', 'SELECT') then
    raise exception 'FAIL: anon still holds SELECT on bank_accounts';
  end if;

  -- The signing token is unreadable by members; the rest of the row is not.
  if has_column_privilege('authenticated', 'public.contracts', 'signing_token', 'SELECT') then
    raise exception 'FAIL: authenticated can still read contracts.signing_token';
  end if;
  if not has_column_privilege('authenticated', 'public.contracts', 'id', 'SELECT') then
    raise exception 'FAIL: authenticated lost SELECT on contracts.id';
  end if;
  if not has_column_privilege('authenticated', 'public.contracts', 'reference', 'SELECT') then
    raise exception 'FAIL: authenticated lost SELECT on contracts.reference';
  end if;
  if not has_column_privilege('service_role', 'public.contracts', 'signing_token', 'SELECT') then
    raise exception 'FAIL: service_role lost SELECT on contracts.signing_token — the sign route would break';
  end if;

  raise notice 'pass: 025 grants narrowed (rate_tiers, bank_accounts, contracts.signing_token)';
end
$$;
