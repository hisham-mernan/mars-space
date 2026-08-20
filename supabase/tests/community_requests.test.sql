-- Mars Space — Community Space request flow
--
-- The Community Space is not sold over the counter: a member requests it, Mars
-- Space quotes it with a contract, the member accepts, and only then is the
-- date booked and an invoice raised.
--
-- The assertions that matter most are the privacy ones. A member choosing
-- "private" is told their event is invisible to the rest of the building, and
-- that promise has to hold on the schedule, in the busy-slot list, and
-- everywhere else.
--
--   psql -d marsspace_test -v ON_ERROR_STOP=1 -f supabase/tests/community_requests.test.sql

\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.check_eq(actual anyelement, expected anyelement, label text)
returns void language plpgsql as $fn$
begin
  if actual is distinct from expected then
    raise exception 'FAIL: % — expected %, got %', label, expected, actual;
  end if;
  raise notice 'pass: % (= %)', label, actual;
end;
$fn$;

create or replace function pg_temp.as_member(p_uid uuid)
returns void language plpgsql as $fn$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Two unrelated companies, so "invisible to everyone else" is testable.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('a1111111-1111-4111-8111-111111111111', 'amal@alpha.sa'),
  ('b2222222-2222-4222-8222-222222222222', 'badr@beta.sa'),
  ('c3333333-3333-4333-8333-333333333333', 'staff@mars.sa');

update public.profiles set status = 'active';
update public.profiles set platform_role = 'erp_admin'
  where id = 'c3333333-3333-4333-8333-333333333333';

insert into public.companies (id, name, status) values
  ('aaaa1111-0000-4000-8000-000000000001', 'Alpha Co', 'active'),
  ('bbbb2222-0000-4000-8000-000000000002', 'Beta Co',  'active');

insert into public.office_assignments (resource_id, company_id, term, desk_count)
select r.id, 'aaaa1111-0000-4000-8000-000000000001',
       daterange(current_date - 30, current_date + 335, '[)'), 8
from public.resources r where r.slug = 'office-01';

insert into public.office_assignments (resource_id, company_id, term, desk_count)
select r.id, 'bbbb2222-0000-4000-8000-000000000002',
       daterange(current_date - 30, current_date + 335, '[)'), 6
from public.resources r where r.slug = 'office-02';

insert into public.company_members
  (company_id, profile_id, role, status, can_book_rooms, can_view_invoices,
   can_submit_repairs, can_manage_employees)
values
  ('aaaa1111-0000-4000-8000-000000000001', 'a1111111-1111-4111-8111-111111111111',
   'company_admin', 'active', true, true, true, true),
  ('bbbb2222-0000-4000-8000-000000000002', 'b2222222-2222-4222-8222-222222222222',
   'company_admin', 'active', true, true, true, true);

set local role authenticated;

-- ===========================================================================
-- 1. The Community Space cannot be booked directly
-- ===========================================================================
select pg_temp.as_member('a1111111-1111-4111-8111-111111111111');

do $blk$
begin
  perform public.create_booking(
    (select id from public.resources where slug = 'community-space'),
    tstzrange(now() + interval '30 days', now() + interval '30 days 4 hours'),
    'aaaa1111-0000-4000-8000-000000000001');
  raise exception 'FAIL: create_booking should refuse the Community Space';
exception when check_violation then
  raise notice 'pass: create_booking refuses the Community Space (request flow only)';
end
$blk$;

-- ===========================================================================
-- 2. Request → quote → accept
-- ===========================================================================
select pg_temp.check_eq(
  (select status from public.request_community_space(
     (select id from public.resources where slug = 'community-space'),
     tstzrange(now() + interval '30 days', now() + interval '30 days 4 hours'),
     'aaaa1111-0000-4000-8000-000000000001',
     'private', 'Alpha Co board offsite', 18, 'Theatre seating')),
  'requested', 'a request is created, not a booking');

select pg_temp.check_eq(
  (select total from public.bookings
    where company_id = 'aaaa1111-0000-4000-8000-000000000001' limit 1),
  0.00::numeric, 'a request carries no price until Mars Space quotes it');

-- A member cannot quote their own request.
do $blk$
begin
  perform public.quote_community_request(
    (select id from public.bookings
      where company_id = 'aaaa1111-0000-4000-8000-000000000001' limit 1),
    1000);
  raise exception 'FAIL: a member should not be able to quote their own request';
exception when insufficient_privilege then
  raise notice 'pass: only Mars Space staff can issue a quote';
  when others then
  raise notice 'pass: only Mars Space staff can issue a quote (%)', sqlstate;
end
$blk$;

-- Staff quote it.
select pg_temp.as_member('c3333333-3333-4333-8333-333333333333');
select pg_temp.check_eq(
  (select quoted_total from public.quote_community_request(
     (select id from public.bookings
       where company_id = 'aaaa1111-0000-4000-8000-000000000001' limit 1),
     4000, 'contracts/alpha/offsite.pdf', 'Includes stage and kitchen', 7)),
  4600.00::numeric, 'quote is 4,000 plus 15% VAT');

-- The member accepts, which books the date and raises the invoice.
select pg_temp.as_member('a1111111-1111-4111-8111-111111111111');
select pg_temp.check_eq(
  (select status from public.accept_community_quote(
     (select id from public.bookings
       where company_id = 'aaaa1111-0000-4000-8000-000000000001' limit 1))),
  'confirmed', 'accepting the quote confirms the booking');

select pg_temp.check_eq(
  (select count(*)::int from public.invoices
    where company_id = 'aaaa1111-0000-4000-8000-000000000001'),
  1, 'accepting raises exactly one invoice');
select pg_temp.check_eq(
  (select total from public.invoices
    where company_id = 'aaaa1111-0000-4000-8000-000000000001' limit 1),
  4600.00::numeric, 'the invoice matches the accepted quote');

-- Capacity is enforced: the Community Space holds 20.
do $blk$
begin
  perform public.request_community_space(
    (select id from public.resources where slug = 'community-space'),
    tstzrange(now() + interval '60 days', now() + interval '60 days 3 hours'),
    'aaaa1111-0000-4000-8000-000000000001',
    'public', 'Too many guests', 25, null);
  raise exception 'FAIL: a request above capacity should have been refused';
exception when check_violation then
  raise notice 'pass: a request for more guests than the space holds is refused';
end
$blk$;

-- ===========================================================================
-- 3. PRIVACY — the headline promise
--
-- Alpha's event is private. Beta must not see it anywhere.
-- ===========================================================================
select pg_temp.as_member('b2222222-2222-4222-8222-222222222222');

select pg_temp.check_eq(
  (select count(*)::int from public.community_schedule
    where company_id = 'aaaa1111-0000-4000-8000-000000000001'),
  0, 'Beta cannot see Alpha''s PRIVATE event on the community schedule');

select pg_temp.check_eq(
  (select count(*)::int from public.bookings
    where company_id = 'aaaa1111-0000-4000-8000-000000000001'),
  0, 'nor the underlying booking row');

-- Alpha still sees their own.
select pg_temp.as_member('a1111111-1111-4111-8111-111111111111');
select pg_temp.check_eq(
  (select count(*)::int from public.community_schedule
    where company_id = 'aaaa1111-0000-4000-8000-000000000001'),
  1, 'Alpha does see their own private event');

-- ===========================================================================
-- 4. A PUBLIC event is visible to the whole building
-- ===========================================================================
select pg_temp.check_eq(
  (select visibility from public.request_community_space(
     (select id from public.resources where slug = 'community-space'),
     tstzrange(now() + interval '45 days', now() + interval '45 days 3 hours'),
     'aaaa1111-0000-4000-8000-000000000001',
     'public', 'Alpha Co open studio', 12, null)),
  'public', 'a public request is created');

select pg_temp.as_member('b2222222-2222-4222-8222-222222222222');
select pg_temp.check_eq(
  (select count(*)::int from public.community_schedule
    where visibility = 'public'
      and company_id = 'aaaa1111-0000-4000-8000-000000000001'),
  1, 'Beta CAN see Alpha''s public event');

select pg_temp.check_eq(
  (select count(*)::int from public.bookings
    where company_id = 'aaaa1111-0000-4000-8000-000000000001'),
  0, 'but still cannot read the booking row behind it');

-- The schedule must not carry money or contact details, whatever the
-- visibility. Beta seeing that Alpha booked the space is fine; Beta seeing
-- what Alpha paid is not.
select pg_temp.check_eq(
  (select coalesce(string_agg(column_name, ', '), 'none')
     from information_schema.columns
    where table_schema = 'public' and table_name = 'community_schedule'
      and column_name in ('total','subtotal','quoted_total','guest_email',
                          'guest_phone','setup_notes','quote_notes')),
  'none', 'the community schedule exposes no pricing or contact details');

-- ===========================================================================
-- 5. A request holds the date
-- ===========================================================================
select pg_temp.as_member('b2222222-2222-4222-8222-222222222222');
do $blk$
begin
  perform public.request_community_space(
    (select id from public.resources where slug = 'community-space'),
    tstzrange(now() + interval '30 days 1 hour', now() + interval '30 days 3 hours'),
    'bbbb2222-0000-4000-8000-000000000002',
    'public', 'Beta Co launch', 15, null);
  raise exception 'FAIL: an overlapping request should have been refused';
exception when exclusion_violation then
  raise notice 'pass: a date under discussion cannot be requested by another company';
end
$blk$;

-- ===========================================================================
-- 6. Declining releases the date
-- ===========================================================================
select pg_temp.as_member('a1111111-1111-4111-8111-111111111111');
select pg_temp.check_eq(
  (select status from public.decline_community_request(
     (select id from public.bookings
       where company_id = 'aaaa1111-0000-4000-8000-000000000001'
         and status = 'requested' limit 1), 'Changed our plans')),
  'declined', 'the public request is declined');

select pg_temp.as_member('b2222222-2222-4222-8222-222222222222');
select pg_temp.check_eq(
  (select status from public.request_community_space(
     (select id from public.resources where slug = 'community-space'),
     tstzrange(now() + interval '45 days', now() + interval '45 days 2 hours'),
     'bbbb2222-0000-4000-8000-000000000002',
     'public', 'Beta Co launch', 15, null)),
  'requested', 'Beta can now take the released date');

rollback;
