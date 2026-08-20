-- Mars Space — meeting-room credits are a contract term
--
-- The rule, as Mars Space stated it: a company admin is given a set number of
-- free meeting-room hours when their company is set up; those hours refresh
-- every month for as long as the company holds a contract; and anything beyond
-- them is paid for at the normal rate.
--
-- Each clause of that is an assertion below, because every one of them is a
-- way to give away rooms by accident.
--
--   psql -d marsspace_test -v ON_ERROR_STOP=1 -f supabase/tests/credits_contract.test.sql

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

-- Two companies: one with a live contract, one whose contract has ended.
insert into auth.users (id, email) values
  ('11110000-0000-4000-8000-000000000001', 'live@co.sa'),
  ('22220000-0000-4000-8000-000000000002', 'lapsed@co.sa');
update public.profiles set status = 'active';

insert into public.companies (id, name, status) values
  ('c0111111-0000-4000-8000-000000000001', 'Live Contract Co',   'active'),
  ('c0222222-0000-4000-8000-000000000002', 'Lapsed Contract Co', 'active');

-- The plan grants 0 hours. The CONTRACT is where the allowance lives, and
-- these two hold different amounts, which is the point: it is negotiated per
-- company rather than inherited from a published tier.
insert into public.contracts (id, company_id, plan_id, branch_id, starts_on, ends_on,
                              monthly_rate, credit_hours_per_period, status)
select 'c0aaaaaa-0000-4000-8000-00000000000a',
       'c0111111-0000-4000-8000-000000000001',
       p.id, b.id, current_date - 60, current_date + 300, 14000, 12, 'active'
from public.membership_plans p, public.branches b
where p.slug = 'private-office' and b.slug = 'jeddah';

-- Same shape, but the term has ended.
insert into public.contracts (id, company_id, plan_id, branch_id, starts_on, ends_on,
                              monthly_rate, credit_hours_per_period, status)
select 'c0bbbbbb-0000-4000-8000-00000000000b',
       'c0222222-0000-4000-8000-000000000002',
       p.id, b.id, current_date - 400, current_date - 30, 14000, 12, 'terminated'
from public.membership_plans p, public.branches b
where p.slug = 'private-office' and b.slug = 'jeddah';

-- ===========================================================================
-- 1. The allowance comes from the CONTRACT, not the plan
-- ===========================================================================
select pg_temp.check_eq(
  (select included_credit_hours from public.membership_plans where slug = 'private-office'),
  0.00::numeric, 'the published plan grants no hours');

select public.allocate_monthly_credits();

select pg_temp.check_eq(
  public.credit_balance('c0111111-0000-4000-8000-000000000001'),
  12.00::numeric, 'the live company receives the 12 hours its CONTRACT specifies');

-- ===========================================================================
-- 2. No contract, no credit
-- ===========================================================================
select pg_temp.check_eq(
  public.credit_balance('c0222222-0000-4000-8000-000000000002'),
  0.00::numeric, 'a company whose contract has ended receives nothing');

-- ===========================================================================
-- 3. Running the job again does not double-grant
--
-- pg_cron runs this daily and it is safe to re-run by hand, so the partial
-- unique index on (contract_id, period) has to hold.
-- ===========================================================================
select public.allocate_monthly_credits();
select public.allocate_monthly_credits();
select pg_temp.check_eq(
  public.credit_balance('c0111111-0000-4000-8000-000000000001'),
  12.00::numeric, 'three runs in one month still grant 12 hours, not 36');

-- ===========================================================================
-- 4. Hours refresh monthly and do NOT roll over
--
-- Balance is scoped to one period, so an unused hour in this month is not
-- available next month. "Refreshes monthly" rather than "accumulates".
-- ===========================================================================
select pg_temp.check_eq(
  (select coalesce(sum(hours), 0)
     from public.credit_entries
    where company_id = 'c0111111-0000-4000-8000-000000000001'
      and period = public.credit_period(now() + interval '35 days')),
  0.00::numeric, 'next month starts empty until its own allocation runs');

select public.allocate_monthly_credits(now() + interval '35 days');

select pg_temp.check_eq(
  (select coalesce(sum(hours), 0)
     from public.credit_entries
    where company_id = 'c0111111-0000-4000-8000-000000000001'
      and period = public.credit_period(now() + interval '35 days')),
  12.00::numeric, 'next month grants 12 afresh');

select pg_temp.check_eq(
  public.credit_balance('c0111111-0000-4000-8000-000000000001'),
  12.00::numeric, 'and this month is still 12 — the two periods are separate');

-- ===========================================================================
-- 5. Beyond the allowance, the member pays
-- ===========================================================================
insert into public.office_assignments (resource_id, company_id, term, desk_count)
select r.id, 'c0111111-0000-4000-8000-000000000001',
       daterange(current_date - 30, current_date + 335, '[)'), 8
from public.resources r where r.slug = 'office-01';

insert into public.company_members
  (company_id, profile_id, role, status, can_book_rooms, can_view_invoices,
   can_submit_repairs, can_manage_employees)
values ('c0111111-0000-4000-8000-000000000001', '11110000-0000-4000-8000-000000000001',
        'company_admin', 'active', true, true, true, true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11110000-0000-4000-8000-000000000001', true);

-- 8 hours against a 12-hour allowance: entirely covered.
select pg_temp.check_eq(
  (select credit_hours_used from public.create_booking(
     (select id from public.resources where slug = 'meeting-room-small'),
     tstzrange('2026-09-01 09:00'::timestamptz, '2026-09-01 17:00'::timestamptz),
     'c0111111-0000-4000-8000-000000000001')),
  8.00::numeric, 'an 8-hour booking draws 8 of the 12 hours');

-- Read as the owner: credit_balance() is deliberately not callable by
-- `authenticated`, since it takes an arbitrary company id. The app reads the
-- RLS-scoped credit_balances view instead.
reset role;
select pg_temp.check_eq(
  public.credit_balance('c0111111-0000-4000-8000-000000000001'),
  4.00::numeric, 'leaving 4');
set local role authenticated;

-- 8 more hours against 4 remaining: half covered, half billed. The billed half
-- is priced from the published tiers, not discounted.
select pg_temp.check_eq(
  (select credit_hours_used from public.create_booking(
     (select id from public.resources where slug = 'meeting-room-small'),
     tstzrange('2026-09-02 09:00'::timestamptz, '2026-09-02 17:00'::timestamptz),
     'c0111111-0000-4000-8000-000000000001')),
  4.00::numeric, 'the next 8-hour booking uses the last 4 hours');

reset role;
select pg_temp.check_eq(
  public.credit_balance('c0111111-0000-4000-8000-000000000001'),
  0.00::numeric, 'the allowance is now spent, and not negative');
set local role authenticated;

-- The 8-hour tier is 1,400. Half the hours were covered, so half is billable:
-- 700 plus 15% VAT.
select pg_temp.check_eq(
  (select total from public.bookings
    where company_id = 'c0111111-0000-4000-8000-000000000001'
    order by created_at desc limit 1),
  805.00::numeric, 'the uncovered half bills at the 8-hour tier: 700 + 15% VAT');

-- And a third booking, with nothing left, is billed in full at the tier price.
select pg_temp.check_eq(
  (select total from public.create_booking(
     (select id from public.resources where slug = 'meeting-room-small'),
     tstzrange('2026-09-03 09:00'::timestamptz, '2026-09-03 13:00'::timestamptz),
     'c0111111-0000-4000-8000-000000000001')),
  862.50::numeric, 'with no allowance left, 4 hours bills the full 750 + VAT');

rollback;
