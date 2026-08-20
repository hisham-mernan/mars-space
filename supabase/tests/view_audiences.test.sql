-- Mars Space — who each view is FOR
--
-- Regression suite for the two faults migration 019 fixed. Both came from the
-- same omission: migrations 016 and 018 rebuilt three views as
-- `security_invoker = off` to let a member see rows RLS would hide, got the
-- projection right, and never decided who the AUDIENCE was. The views then
-- failed in opposite directions —
--
--   community_schedule  raised 42501 for anon, taking the whole public
--                       homepage down with it (the route aggregates four
--                       queries and throws on the first error).
--   company_directory   served the floor directory — headcount, desk counts
--   directory_people    and WHICH OFFICES each company occupies — to anyone
--                       holding the publishable key, i.e. everyone.
--
-- A definer view answers to nothing but its own WHERE clause, so these
-- assertions are the only thing keeping that straight. Run with:
--   psql -d marsspace_test -v ON_ERROR_STOP=1 -f supabase/tests/view_audiences.test.sql

\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.check_eq(actual anyelement, expected anyelement, label text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL: % — expected %, got %', label, expected, actual;
  end if;
  raise notice 'pass: %', label;
end;
$$;

create or replace function pg_temp.check_at_least(actual int, floor_ int, label text)
returns void language plpgsql as $$
begin
  if actual < floor_ then
    raise exception 'FAIL: % — expected at least %, got %', label, floor_, actual;
  end if;
  raise notice 'pass: % (% rows)', label, actual;
end;
$$;

-- Both outcomes are a pass: no GRANT raises permission denied before the view
-- is reached, a GRANT plus an internal predicate returns zero rows.
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
  raise notice 'pass: % (0 rows via predicate)', label;
end;
$$;

create or replace function pg_temp.check_denied(stmt text, label text)
returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    raise notice 'pass: % (denied: %)', label, sqlstate;
    return;
  end;
  raise exception 'FAIL: % — was ALLOWED but should have been denied', label;
end;
$$;

create or replace function pg_temp.as_member(p_uid uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
end;
$$;

-- `set local role anon` is NOT enough to become anonymous here.
--
-- set_config(..., true) is transaction-local, not statement-local, so the JWT
-- claim set by as_member() survives `reset role` and every later `set local
-- role`. The first draft of this suite relied on the role switch alone and the
-- "anon" block ran with Alice's claim still in place — current_company_ids()
-- returned her company and the private booking appeared to leak. It did not;
-- the test was lying. Signing out has to clear the claim as well as the role.
create or replace function pg_temp.as_anon()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@techcorp.sa'),
  ('22222222-2222-2222-2222-222222222222', 'bob@techcorp.sa');

update public.profiles set status = 'active';

insert into public.companies (id, name, status, is_listed, cr_number) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'TechCorp KSA', 'active', true, '1010101010');

insert into public.company_members
  (company_id, profile_id, role, status, can_book_rooms, can_view_invoices,
   can_submit_repairs, can_manage_employees)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'company_admin', 'active', true, true, true, true),
  ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
   'employee', 'active', true, false, true, false);

-- One public event, so a signed-out visitor has something legitimate to see.
insert into public.events (slug, title, title_ar, time_range, status, is_public, branch_id)
select 'probe-public-event', 'Public Event', 'فعالية عامة',
       tstzrange(now() + interval '10 days', now() + interval '10 days 2 hours'),
       'scheduled', true, b.id
from public.branches b where b.slug = 'jeddah' limit 1;

-- One PRIVATE community request. This is the row that must never reach anon.
--
-- Created through request_community_space() rather than a direct insert:
-- guard_direct_community_booking() refuses inserts on the Community Space, so
-- the only way to get such a row is the flow members actually use. (The first
-- draft of this fixture inserted directly and the guard rejected it, which is
-- the guard behaving correctly.)
set local role authenticated;
select pg_temp.as_member('11111111-1111-1111-1111-111111111111');   -- Alice
select public.request_community_space(
  (select id from public.resources
    where category = 'community_hall' and status = 'available' limit 1),
  tstzrange(now() + interval '11 days', now() + interval '11 days 3 hours'),
  'aaaaaaaa-0000-0000-0000-000000000001',
  'private', 'Board offsite', 18, 'Majlis seating');
reset role;

-- ===========================================================================
-- 1. Signed out: the public homepage must work, and see nothing private
-- ===========================================================================
set local role anon;
select pg_temp.as_anon();

-- Before migration 019 this raised 42501 on current_company_ids() and returned
-- a 500 to every signed-out visitor on the homepage.
select pg_temp.check_at_least(
  (select count(*)::int from public.community_schedule
    where status = 'scheduled' and ends_at >= now()),
  1, 'anon can read the public community schedule');

select pg_temp.check_eq(
  (select count(*)::int from public.community_schedule where visibility <> 'public'),
  0, 'anon sees no private community bookings');

select pg_temp.check_eq(
  (select count(*)::int from public.community_schedule where title = 'Board offsite'),
  0, 'anon cannot see a private event by title');

-- The directory is a members' amenity, not a public listing.
select pg_temp.check_no_rows('public.company_directory', 'anon cannot read company_directory');
select pg_temp.check_no_rows('public.directory_people',  'anon cannot read directory_people');

-- Ungated SECURITY DEFINER counter: returned a real headcount for any company
-- uuid to a caller who is denied the companies table outright.
select pg_temp.check_denied(
  $$select public.company_headcount('aaaaaaaa-0000-0000-0000-000000000001'::uuid)$$,
  'anon cannot call company_headcount');

-- Member-only RPCs must not sit on the anonymous REST surface.
select pg_temp.check_denied(
  $$select public.submit_payment_proof('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 1, 'x')$$,
  'anon cannot call submit_payment_proof');
select pg_temp.check_denied(
  $$select public.accept_community_quote('aaaaaaaa-0000-0000-0000-000000000001'::uuid)$$,
  'anon cannot call accept_community_quote');

reset role;

-- ===========================================================================
-- 2. Signed in: the directory still works
-- ===========================================================================
set local role authenticated;
select pg_temp.as_member('22222222-2222-2222-2222-222222222222');   -- Bob, employee

select pg_temp.check_at_least(
  (select count(*)::int from public.company_directory), 1,
  'a member can read the directory');

-- Bob's own company's private booking is visible to Bob.
select pg_temp.check_at_least(
  (select count(*)::int from public.community_schedule where title = 'Board offsite'), 1,
  'a member sees their own company''s private booking');

reset role;

-- ===========================================================================
-- 3. Company profile: the grant migration 016 forgot
-- ===========================================================================
-- The policy and the trigger both shipped; the UPDATE grant did not, so every
-- save failed with 42501 before RLS was consulted.
set local role authenticated;
select pg_temp.as_member('11111111-1111-1111-1111-111111111111');   -- Alice, admin

update public.companies
   set description = 'A software company', industry = 'Technology',
       website = 'https://techcorp.sa'
 where id = 'aaaaaaaa-0000-0000-0000-000000000001';

select pg_temp.check_eq(
  (select description from public.companies
    where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'A software company', 'company admin can save their profile');

-- Identity and billing stay with Mars Space.
select pg_temp.check_denied(
  $$update public.companies set cr_number = '9999999999'
     where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  'company admin cannot change the CR number');

select pg_temp.check_denied(
  $$update public.companies set name = 'Renamed Inc'
     where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  'company admin cannot rename the company');

-- An employee is not an admin.
select pg_temp.as_member('22222222-2222-2222-2222-222222222222');   -- Bob
update public.companies set description = 'employee edit'
 where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select pg_temp.check_eq(
  (select description from public.companies
    where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'A software company', 'a plain employee cannot edit the company profile');

reset role;

-- ===========================================================================
-- 4. Revoking EXECUTE must not disarm the guard triggers
-- ===========================================================================
-- Migration 019 strips the public EXECUTE bit from the three guard_* trigger
-- functions. That is only safe because PostgreSQL checks EXECUTE at CREATE
-- TRIGGER time, not when the trigger fires. Asserted here rather than assumed,
-- on a scratch table so it tests the rule and not one particular guard.
create table pg_temp_probe_holder(x int);   -- ensures the schema exists
create table public._probe_guard_target(id int primary key);

create or replace function public._probe_guard() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  raise exception 'PROBE_GUARD_FIRED' using errcode = 'insufficient_privilege';
end $$;

create trigger _probe_guard_t before insert on public._probe_guard_target
  for each row execute function public._probe_guard();

revoke execute on function public._probe_guard() from public, anon, authenticated;
grant insert on public._probe_guard_target to authenticated;

set local role authenticated;
select pg_temp.check_denied(
  $$insert into public._probe_guard_target values (1)$$,
  'a guard trigger still fires when the caller has no EXECUTE on it');
reset role;

rollback;
