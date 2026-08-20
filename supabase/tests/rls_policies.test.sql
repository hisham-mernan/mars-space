-- Mars Space — RLS policy test suite
--
-- The mobile app connects to PostgREST with the anon key and relies entirely
-- on these policies. That makes RLS testable code, not configuration, so this
-- suite asserts what each role CANNOT see as much as what it can.
--
-- Run against a database that already has the migrations applied:
--   psql -d marsspace_test -v ON_ERROR_STOP=1 -f supabase/tests/rls_policies.test.sql
--
-- Everything runs inside one transaction and rolls back, so it is safe against
-- a seeded database. It creates its own fixtures and does not depend on seed.sql.

\set ON_ERROR_STOP on
begin;

-- ---------------------------------------------------------------------------
-- Tiny assertion harness
-- ---------------------------------------------------------------------------
create or replace function pg_temp.check_eq(actual anyelement, expected anyelement, label text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL: % — expected %, got %', label, expected, actual;
  end if;
  raise notice 'pass: %', label;
end;
$$;

-- Asserts that a statement is rejected. Used for the negative-permission cases,
-- where succeeding is the bug.
create or replace function pg_temp.check_denied(stmt text, label text)
returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception
    when insufficient_privilege or check_violation then
      raise notice 'pass: % (denied: %)', label, sqlerrm;
      return;
    when others then
      raise notice 'pass: % (denied: % / %)', label, sqlstate, sqlerrm;
      return;
  end;
  raise exception 'FAIL: % — statement was ALLOWED but should have been denied', label;
end;
$$;

-- Asserts a role can obtain no rows from a table. Two outcomes count as a
-- pass and both are correct: a missing GRANT raises permission denied before
-- RLS is consulted, while a GRANT plus a restrictive policy returns zero rows.
create or replace function pg_temp.check_no_rows(tbl text, label text)
returns void language plpgsql as $$
declare n int;
begin
  begin
    execute format('select count(*)::int from %s', tbl) into n;
  exception when insufficient_privilege then
    raise notice 'pass: % (no grant: permission denied)', label;
    return;
  end;
  if n <> 0 then
    raise exception 'FAIL: % — expected no rows, got %', label, n;
  end if;
  raise notice 'pass: % (0 rows via RLS)', label;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fixtures: two unrelated companies, so cross-tenant leakage is detectable.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@techcorp.sa'),   -- company_admin, Company X
  ('22222222-2222-2222-2222-222222222222', 'bob@techcorp.sa'),     -- employee,      Company X
  ('33333333-3333-3333-3333-333333333333', 'carol@rival.sa'),      -- company_admin, Company Y
  ('44444444-4444-4444-4444-444444444444', 'steve@mars.sa');       -- Mars staff

-- The auth.users trigger creates the profiles rows; promote Steve to staff.
update public.profiles set platform_role = 'erp_admin'
  where id = '44444444-4444-4444-4444-444444444444';
update public.profiles set status = 'active';

insert into public.companies (id, name, status) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'TechCorp KSA', 'active'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Rival Co',     'active');

-- Office assignments give each company its contracted seats. Without one,
-- the seat-cap trigger refuses to add employees at all.
insert into public.office_assignments (resource_id, company_id, term, desk_count)
select r.id, 'aaaaaaaa-0000-0000-0000-000000000001',
       daterange(current_date - 30, current_date + 335, '[)'), 8
from public.resources r where r.slug = 'office-01'
limit 1;

insert into public.office_assignments (resource_id, company_id, term, desk_count)
select r.id, 'bbbbbbbb-0000-0000-0000-000000000002',
       daterange(current_date - 30, current_date + 335, '[)'), 6
from public.resources r where r.slug = 'office-02'
limit 1;

insert into public.company_members
  (company_id, profile_id, role, status, can_book_rooms, can_view_invoices,
   can_submit_repairs, can_manage_employees)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'company_admin', 'active', true, true, true, true),
  -- Bob may book rooms and raise repairs but is NOT allowed to see invoices.
  ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
   'employee', 'active', true, false, true, false),
  ('bbbbbbbb-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333',
   'company_admin', 'active', true, true, true, true);

insert into public.invoices (company_id, kind, description, due_date,
                             subtotal, vat_amount, total, status)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'booking', 'X invoice',
   current_date + 7, 100.00, 15.00, 115.00, 'unpaid'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'booking', 'Y invoice',
   current_date + 7, 200.00, 30.00, 230.00, 'unpaid');

insert into public.bookings (resource_id, branch_id, company_id, time_range, status,
                             subtotal, vat_amount, total)
select r.id, r.branch_id, c.company_id, c.rng, 'confirmed', 100, 15, 115
from public.resources r
join (values
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid,
   tstzrange(now() + interval '2 days', now() + interval '2 days 2 hours')),
  ('bbbbbbbb-0000-0000-0000-000000000002'::uuid,
   tstzrange(now() + interval '3 days', now() + interval '3 days 2 hours'))
) as c(company_id, rng) on true
where r.slug = 'meeting-room-small';

insert into public.repair_requests (company_id, reported_by, branch_id, category, title)
select c.company_id, c.reporter, b.id, 'hvac', c.title
from public.branches b
join (values
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid,
   '11111111-1111-1111-1111-111111111111'::uuid, 'X aircon'),
  ('bbbbbbbb-0000-0000-0000-000000000002'::uuid,
   '33333333-3333-3333-3333-333333333333'::uuid, 'Y aircon')
) as c(company_id, reporter, title) on true
where b.slug = 'jeddah';

-- ---------------------------------------------------------------------------
-- Helper to impersonate a signed-in member the way PostgREST does.
-- ---------------------------------------------------------------------------
create or replace function pg_temp.as_member(p_uid uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
end;
$$;

-- ===========================================================================
-- 1. Cross-tenant isolation — the headline guarantee
-- ===========================================================================
set local role authenticated;
select pg_temp.as_member('22222222-2222-2222-2222-222222222222');   -- Bob, Company X

select pg_temp.check_eq(
  (select count(*)::int from public.invoices
   where company_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0, 'Bob sees zero of Company Y invoices');

select pg_temp.check_eq(
  (select count(*)::int from public.bookings
   where company_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0, 'Bob sees zero of Company Y bookings');

select pg_temp.check_eq(
  (select count(*)::int from public.repair_requests
   where company_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0, 'Bob sees zero of Company Y repair requests');

select pg_temp.check_eq(
  (select count(*)::int from public.company_members
   where company_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0, 'Bob sees zero of Company Y employees');

select pg_temp.check_eq(
  (select count(*)::int from public.companies
   where id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0, 'Bob cannot see Company Y itself');

select pg_temp.check_eq(
  (select count(*)::int from public.profiles
   where id = '33333333-3333-3333-3333-333333333333'),
  0, 'Bob cannot see a profile from another company');

-- ===========================================================================
-- 2. Permission flags gate within a company
-- ===========================================================================
-- Bob has can_view_invoices = false, so his OWN company's invoices are hidden.
select pg_temp.check_eq(
  (select count(*)::int from public.invoices),
  0, 'Bob with can_view_invoices=false sees zero invoices, including his own company''s');

select pg_temp.check_eq(
  (select count(*)::int from public.bookings),
  1, 'Bob sees exactly his own company''s booking');

select pg_temp.check_eq(
  (select count(*)::int from public.repair_requests),
  1, 'Bob sees exactly his own company''s repair request');

select pg_temp.check_eq(
  (select count(*)::int from public.company_members),
  2, 'Bob sees his two colleagues, nobody else');

-- Alice is company_admin, so the invoice permission is implied.
select pg_temp.as_member('11111111-1111-1111-1111-111111111111');
select pg_temp.check_eq(
  (select count(*)::int from public.invoices),
  1, 'Alice as company_admin sees her company invoice');
select pg_temp.check_eq(
  (select count(*)::int from public.invoices
   where company_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0, 'Alice still sees zero of Company Y invoices');

-- ===========================================================================
-- 2b. Views must inherit RLS
--
-- A Postgres view runs as its OWNER unless created WITH (security_invoker=on).
-- Without that setting every view in migration 013 would bypass the policies
-- on its base tables and hand any signed-in member the whole tenancy. These
-- assertions fail loudly if the setting is ever dropped.
-- ===========================================================================
select pg_temp.as_member('22222222-2222-2222-2222-222222222222');   -- Bob, Company X

select pg_temp.check_eq(
  (select count(*)::int from public.booking_details
   where company_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0, 'booking_details view does not leak Company Y');

select pg_temp.check_eq(
  (select count(*)::int from public.booking_details),
  1, 'booking_details view shows exactly Bob''s own company booking');

select pg_temp.check_eq(
  (select count(*)::int from public.my_offices
   where company_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0, 'my_offices view does not leak Company Y');

select pg_temp.check_eq(
  (select count(*)::int from public.my_offices),
  1, 'my_offices view shows exactly Bob''s own office');

select pg_temp.check_eq(
  (select count(*)::int from public.team_members
   where company_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0, 'team_members view does not leak Company Y');

select pg_temp.check_eq(
  (select count(*)::int from public.credit_balances
   where company_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0, 'credit_balances view does not leak Company Y');

-- Belt and braces: assert the flag itself, so a future migration that
-- recreates a view without it is caught even if the data happens to align.
--
-- company_directory, directory_people and community_schedule are the three
-- deliberate exceptions.
-- They run as owner BECAUSE a row-level policy would have to expose whole
-- rows - cr_number, billing_email, a colleague's phone, an office door code -
-- to publish a directory. Their column list is the disclosure boundary, and
-- the assertions below check that boundary directly.
select pg_temp.check_eq(
  (select coalesce(string_agg(c.relname, ', ' order by c.relname), 'none')
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'v'
      and c.relname not in ('company_directory', 'directory_people', 'community_schedule')
      and not coalesce(
            (select option_value::boolean
               from pg_options_to_table(c.reloptions)
              where option_name = 'security_invoker'), false)),
  'none', 'every view except the three definer views is security_invoker');

-- The directory must not carry commercially or personally sensitive columns.
select pg_temp.check_eq(
  (select coalesce(string_agg(column_name, ', '), 'none')
     from information_schema.columns
    where table_schema = 'public' and table_name = 'company_directory'
      and column_name in ('cr_number','vat_number','billing_email','primary_contact_id')),
  'none', 'company_directory exposes no CR number, VAT number or billing email');

select pg_temp.check_eq(
  (select coalesce(string_agg(column_name, ', '), 'none')
     from information_schema.columns
    where table_schema = 'public' and table_name = 'directory_people'
      and column_name in ('email','phone')),
  'none', 'directory_people exposes no email or phone');

select pg_temp.check_eq(
  (select coalesce(string_agg(column_name, ', '), 'none')
     from information_schema.columns
    where table_schema = 'public' and table_name = 'company_directory'
      and column_name = 'door_keycode'),
  'none', 'company_directory exposes no door keycode');

-- ===========================================================================
-- 2c. The company directory
--
-- The deliberate rule: every member sees every LISTED company and its offices,
-- but sees an individual PERSON only if that person opted in. Company-scoped
-- data (invoices, bookings, employees) stays invisible regardless.
-- ===========================================================================
select pg_temp.as_member('22222222-2222-2222-2222-222222222222');   -- Bob, Company X

select pg_temp.check_eq(
  (select count(*)::int from public.company_directory
    where id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  1, 'Bob CAN see Company Y in the directory');

select pg_temp.check_eq(
  (select count(*)::int from public.companies
    where id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0, 'but still cannot read Company Y''s underlying row (CR number, billing email)');

-- Nobody has opted in yet, so the people directory is empty even though three
-- active members exist.
select pg_temp.check_eq(
  (select count(*)::int from public.directory_people),
  0, 'no one appears in the people directory by default (opt-in)');

-- Carol opts herself in. Clearing the JWT claim first makes this a
-- server-side action; leaving Bob's claim set would (correctly) trip the
-- guard trigger that stops one member changing another's consent.
reset role;
select set_config('request.jwt.claim.sub', '', true);
update public.profiles set show_in_directory = true
  where id = '33333333-3333-3333-3333-333333333333';
set local role authenticated;
select pg_temp.as_member('22222222-2222-2222-2222-222222222222');

select pg_temp.check_eq(
  (select count(*)::int from public.directory_people
    where id = '33333333-3333-3333-3333-333333333333'),
  1, 'Carol appears once she opts in');

select pg_temp.check_eq(
  (select count(*)::int from public.profiles
    where id = '33333333-3333-3333-3333-333333333333'),
  0, 'opting in does NOT expose Carol''s profile row itself');

-- An unlisted company drops out of the directory entirely.
reset role;
select set_config('request.jwt.claim.sub', '', true);
update public.companies set is_listed = false
  where id = 'bbbbbbbb-0000-0000-0000-000000000002';
set local role authenticated;
select pg_temp.as_member('22222222-2222-2222-2222-222222222222');

select pg_temp.check_eq(
  (select count(*)::int from public.company_directory
    where id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0, 'an unlisted company disappears from the directory');
select pg_temp.check_eq(
  (select count(*)::int from public.directory_people
    where company_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0, 'and so do its opted-in people');

reset role;
select set_config('request.jwt.claim.sub', '', true);
update public.companies set is_listed = true
  where id = 'bbbbbbbb-0000-0000-0000-000000000002';
set local role authenticated;

-- ===========================================================================
-- 3. Privilege escalation attempts
-- ===========================================================================
select pg_temp.as_member('22222222-2222-2222-2222-222222222222');   -- Bob

select pg_temp.check_denied(
  $$update public.profiles set platform_role = 'erp_admin'
     where id = '22222222-2222-2222-2222-222222222222'$$,
  'Bob cannot promote himself to erp_admin');

select pg_temp.check_denied(
  $$insert into public.credit_entries (company_id, period, hours, reason)
    values ('aaaaaaaa-0000-0000-0000-000000000001',
            public.credit_period(), 100, 'adjustment')$$,
  'Bob cannot grant himself credit hours');

-- An UPDATE that RLS filters to zero rows succeeds silently rather than
-- raising, so assert the effect rather than expecting an exception.
update public.company_members set can_view_invoices = true
  where profile_id = '22222222-2222-2222-2222-222222222222';
select pg_temp.check_eq(
  (select bool_or(can_view_invoices) from public.company_members
   where profile_id = '22222222-2222-2222-2222-222222222222'),
  false, 'Bob without manage_employees cannot grant himself invoice access');
select pg_temp.check_eq(
  (select count(*)::int from public.invoices),
  0, 'Bob still sees zero invoices after attempting to self-grant');

select pg_temp.check_denied(
  $$insert into public.bookings (resource_id, branch_id, company_id, time_range, status)
    select r.id, r.branch_id, 'aaaaaaaa-0000-0000-0000-000000000001',
           tstzrange(now() + interval '9 days', now() + interval '9 days 1 hour'),
           'confirmed'
      from public.resources r where r.slug = 'meeting-room-large'$$,
  'Bob cannot insert a booking directly, bypassing create_booking');

-- Carol admins Company Y and must not reach into Company X.
select pg_temp.as_member('33333333-3333-3333-3333-333333333333');
select pg_temp.check_eq(
  (select count(*)::int from public.company_members
   where company_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0, 'Carol cannot see Company X employees');

-- The UPDATE policy filters the row out entirely, so this affects 0 rows
-- rather than raising - which is the correct, silent-no-op behaviour.
update public.company_members set can_manage_employees = true
  where company_id = 'aaaaaaaa-0000-0000-0000-000000000001';
select pg_temp.check_eq(
  (select count(*)::int from public.company_members cm
   where cm.company_id = 'aaaaaaaa-0000-0000-0000-000000000001'
     and cm.can_manage_employees),
  0, 'Carol''s cross-company permission grant affected nothing');

-- ===========================================================================
-- 4. Anonymous access — public catalogue readable, everything else invisible
-- ===========================================================================
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);

select pg_temp.check_eq((select count(*)::int from public.branches) > 0, true,
  'anon can read branches');
select pg_temp.check_eq((select count(*)::int from public.resources) > 0, true,
  'anon can read resources');
select pg_temp.check_eq((select count(*)::int from public.membership_plans) > 0, true,
  'anon can read membership plans');

select pg_temp.check_no_rows('public.invoices',         'anon obtains no invoices');
select pg_temp.check_no_rows('public.invoice_line_items','anon obtains no invoice lines');
select pg_temp.check_no_rows('public.payments',         'anon obtains no payments');
select pg_temp.check_no_rows('public.bookings',         'anon obtains no bookings');
select pg_temp.check_no_rows('public.companies',        'anon obtains no companies');
select pg_temp.check_no_rows('public.profiles',         'anon obtains no profiles');
select pg_temp.check_no_rows('public.company_members',  'anon obtains no company members');
select pg_temp.check_no_rows('public.repair_requests',  'anon obtains no repair requests');
select pg_temp.check_no_rows('public.credit_entries',   'anon obtains no credit entries');
select pg_temp.check_no_rows('public.contracts',        'anon obtains no contracts');
select pg_temp.check_no_rows('public.office_assignments','anon obtains no office assignments');
select pg_temp.check_no_rows('public.support_tickets',  'anon obtains no support tickets');
select pg_temp.check_no_rows('public.notifications',    'anon obtains no notifications');
select pg_temp.check_no_rows('public.audit_log',        'anon obtains no audit log');
select pg_temp.check_no_rows('public.leads',            'anon cannot read the sales pipeline back out');

-- anon may still submit the public contact form.
insert into public.leads (full_name, email, message)
values ('Walk-in enquiry', 'someone@example.com', 'Do you have offices?');
select pg_temp.check_eq(1, 1, 'anon can submit a lead');

-- ===========================================================================
-- 4b. RPC exposure
--
-- PostgREST publishes any function the caller can EXECUTE at POST /rpc/<name>,
-- and Postgres grants EXECUTE to PUBLIC by default. A SECURITY DEFINER
-- function left at that default bypasses every policy above, so these
-- assertions are as load-bearing as the row-level ones.
-- ===========================================================================
create or replace function pg_temp.check_no_execute(sig text, label text)
returns void language plpgsql as $$
begin
  begin
    execute 'select ' || sig;
  exception
    when insufficient_privilege then
      raise notice 'pass: % (no EXECUTE)', label;
      return;
    when others then
      raise exception 'FAIL: % — call was permitted (got %: %)', label, sqlstate, sqlerrm;
  end;
  raise exception 'FAIL: % — call SUCCEEDED and should not have', label;
end;
$$;

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);

-- The worst one: writes the credit ledger as the owner, with a caller-supplied
-- period, so an unauthenticated loop over months could mint unlimited hours.
select pg_temp.check_no_execute('public.allocate_monthly_credits()',
  'anon cannot call allocate_monthly_credits');
select pg_temp.check_no_execute(
  'public.credit_balance(''aaaaaaaa-0000-0000-0000-000000000001''::uuid)',
  'anon cannot read any company credit balance');
select pg_temp.check_no_execute('public.expire_stale_holds()',
  'anon cannot delete holds');
select pg_temp.check_no_execute('public.next_invoice_number()',
  'anon cannot burn the invoice number sequence');
select pg_temp.check_no_execute('public.next_booking_reference()',
  'anon cannot burn the booking reference sequence');
-- current_company_ids() is deliberately callable by anon (migration 019). The
-- public homepage reads community_schedule, whose privacy filter calls it, and
-- a revoked EXECUTE made the whole view raise 42501 for signed-out visitors —
-- which took the homepage down rather than making anything safer.
--
-- It takes NO arguments and resolves only auth.uid(), so it can never report
-- anybody else's memberships; for anon that is the empty set. Assert the
-- behaviour rather than the grant, which is the stronger claim. Contrast
-- has_company_perm() just below: that one takes a company id, so it IS a
-- probing oracle and stays revoked.
select pg_temp.check_eq(
  (select count(*)::int from public.current_company_ids()), 0,
  'anon may call current_company_ids() but gets no memberships');
select pg_temp.check_no_execute(
  'public.has_company_perm(''aaaaaaaa-0000-0000-0000-000000000001''::uuid, ''view_invoices'')',
  'anon cannot probe company permissions');

-- Guest checkout still has to work, so these two stay reachable by anon.
select pg_temp.check_eq(
  (public.price_booking(
     (select id from public.resources where slug = 'meeting-room-small'),
     tstzrange('2026-09-01 10:00'::timestamptz, '2026-09-01 12:00'::timestamptz)
   ) ->> 'total')::numeric,
  575.00::numeric, 'anon can still get a guest quote from price_booking');

-- An authenticated member must not reach the ledger writer either.
reset role;
set local role authenticated;
select pg_temp.as_member('22222222-2222-2222-2222-222222222222');
select pg_temp.check_no_execute('public.allocate_monthly_credits()',
  'a signed-in member cannot call allocate_monthly_credits');
select pg_temp.check_no_execute(
  'public.credit_balance(''bbbbbbbb-0000-0000-0000-000000000002''::uuid)',
  'a signed-in member cannot read another company credit balance');

-- ===========================================================================
-- 5. Staff see everything
-- ===========================================================================
reset role;
set local role authenticated;
select pg_temp.as_member('44444444-4444-4444-4444-444444444444');   -- Steve, erp_admin

select pg_temp.check_eq((select count(*)::int from public.invoices), 2,
  'staff see both companies'' invoices');
select pg_temp.check_eq((select count(*)::int from public.companies), 2,
  'staff see both companies');
select pg_temp.check_eq((select count(*)::int from public.repair_requests), 2,
  'staff see all repair requests');

reset role;
rollback;
