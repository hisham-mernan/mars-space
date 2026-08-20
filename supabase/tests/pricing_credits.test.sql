-- Mars Space — pricing and credit-ledger test suite
--
-- Pins the PUBLISHED price list, so a change to the pricing engine that would
-- overcharge a member fails here rather than on their invoice:
--
--   Small Meeting Room   250 / hour   750 / 4 hours    1,400 / 8 hours
--   Large Meeting Room   350 / hour   1,300 / 4 hours  2,400 / 8 hours
--   Co-working           100 / day
--
-- It also pins the two rules that changed with the real price list: duration
-- tiers are chosen as the cheapest COMBINATION, and peak/weekend surcharges
-- stay off unless a resource opts in, because a published flat rate is a
-- promise to the customer.
--
-- Run against a migrated + seeded database:
--   psql -d marsspace_test -v ON_ERROR_STOP=1 -f supabase/tests/pricing_credits.test.sql

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

-- Quote N whole hours from a fixed weekday start (2026-09-01 is a Tuesday).
create or replace function pg_temp.quote_hours(p_slug text, p_hours int,
                                               p_company uuid default null)
returns jsonb language sql as $fn$
  select public.price_booking(
    (select id from public.resources where slug = p_slug),
    tstzrange('2026-09-01 09:00'::timestamptz,
              ('2026-09-01 09:00'::timestamptz + (p_hours || ' hours')::interval)),
    p_company
  );
$fn$;

set timezone = 'Asia/Riyadh';

-- ===========================================================================
-- 1. Small Meeting Room — 250 / hour, 750 / 4h, 1,400 / 8h
-- ===========================================================================
select pg_temp.check_eq((pg_temp.quote_hours('meeting-room-small', 1) ->> 'base')::numeric,
  250.00::numeric, 'small room 1h = 250');
select pg_temp.check_eq((pg_temp.quote_hours('meeting-room-small', 2) ->> 'base')::numeric,
  500.00::numeric, 'small room 2h = 500 (two hourly blocks)');
select pg_temp.check_eq((pg_temp.quote_hours('meeting-room-small', 4) ->> 'base')::numeric,
  750.00::numeric, 'small room 4h = 750, the 4-hour rate rather than 4 x 250');
select pg_temp.check_eq((pg_temp.quote_hours('meeting-room-small', 8) ->> 'base')::numeric,
  1400.00::numeric, 'small room 8h = 1400, the 8-hour rate rather than 8 x 250');

-- The case a greedy algorithm gets wrong: two 4-hour blocks would be 1500 and
-- a single 8-hour block 1400, but the cheapest cover is 4h + 1h = 1000.
select pg_temp.check_eq((pg_temp.quote_hours('meeting-room-small', 5) ->> 'base')::numeric,
  1000.00::numeric, 'small room 5h = 1000 (4-hour block plus one hour)');

select pg_temp.check_eq((pg_temp.quote_hours('meeting-room-small', 4) ->> 'saving')::numeric,
  250.00::numeric, 'small room 4h reports a 250 saving against the hourly rate');
select pg_temp.check_eq((pg_temp.quote_hours('meeting-room-small', 8) ->> 'saving')::numeric,
  600.00::numeric, 'small room 8h reports a 600 saving');

-- ===========================================================================
-- 2. Large Meeting Room — 350 / hour, 1,300 / 4h, 2,400 / 8h
-- ===========================================================================
select pg_temp.check_eq((pg_temp.quote_hours('meeting-room-large', 1) ->> 'base')::numeric,
  350.00::numeric, 'large room 1h = 350');
select pg_temp.check_eq((pg_temp.quote_hours('meeting-room-large', 4) ->> 'base')::numeric,
  1300.00::numeric, 'large room 4h = 1300');
select pg_temp.check_eq((pg_temp.quote_hours('meeting-room-large', 8) ->> 'base')::numeric,
  2400.00::numeric, 'large room 8h = 2400');

-- ===========================================================================
-- 3. VAT and totals
-- ===========================================================================
select pg_temp.check_eq((pg_temp.quote_hours('meeting-room-small', 4) ->> 'vat_amount')::numeric,
  112.50::numeric, 'VAT is 15% of the tiered subtotal');
select pg_temp.check_eq((pg_temp.quote_hours('meeting-room-small', 4) ->> 'total')::numeric,
  862.50::numeric, 'small room 4h total = 750 plus 15% VAT');

-- ===========================================================================
-- 4. Surcharges are OFF by default
--
-- A published "250 SAR / hour" must not become 275 because the booking happens
-- to touch lunchtime. The columns remain so a room can opt in.
-- ===========================================================================
select pg_temp.check_eq(
  (public.price_booking(
     (select id from public.resources where slug = 'meeting-room-small'),
     tstzrange('2026-09-01 12:00'::timestamptz, '2026-09-01 14:00'::timestamptz)
   ) ->> 'peak_surcharge')::numeric,
  0.00::numeric, 'a midday booking carries no peak surcharge');

select pg_temp.check_eq(
  (public.price_booking(
     (select id from public.resources where slug = 'meeting-room-small'),
     tstzrange('2026-09-04 10:00'::timestamptz, '2026-09-04 12:00'::timestamptz)
   ) ->> 'weekend_surcharge')::numeric,
  0.00::numeric, 'a Friday booking carries no weekend surcharge');

-- The helper itself stays correct, for rooms that do opt in later.
select pg_temp.check_eq(public.is_ksa_weekend('2026-09-04 10:00'::timestamptz),
  true, 'Friday is a KSA weekend day');
select pg_temp.check_eq(public.is_ksa_weekend('2026-09-06 10:00'::timestamptz),
  false, 'Sunday is a working day in KSA');

-- ===========================================================================
-- 5a. Co-working bills a flat day rate
-- ===========================================================================
select pg_temp.check_eq((pg_temp.quote_hours('co-working', 4) ->> 'base')::numeric,
  100.00::numeric, 'co-working 4h = one 100 SAR day pass');
select pg_temp.check_eq((pg_temp.quote_hours('co-working', 8) ->> 'base')::numeric,
  100.00::numeric, 'co-working 8h = still one day pass');

-- Private offices are contracted, never booked.
do $blk$
begin
  perform pg_temp.quote_hours('office-01', 8);
  raise exception 'FAIL: pricing a private office should have been rejected';
exception when check_violation then
  raise notice 'pass: private offices cannot be priced as a booking';
end
$blk$;

-- ===========================================================================
-- 5. Credits: consumed first, overage at the FULL public rate
-- ===========================================================================
insert into auth.users (id, email)
  values ('99999999-9999-9999-9999-999999999999', 'credit-test@techcorp.sa');
update public.profiles set status = 'active'
  where id = '99999999-9999-9999-9999-999999999999';

insert into public.companies (id, name, status)
  values ('eeeeeeee-0000-0000-0000-0000000000e1', 'Credit Test Co', 'active');

insert into public.office_assignments (resource_id, company_id, term, desk_count)
select r.id, 'eeeeeeee-0000-0000-0000-0000000000e1',
       daterange(current_date - 10, current_date + 350, '[)'), 5
from public.resources r where r.slug = 'office-02';

insert into public.company_members
  (company_id, profile_id, role, status, can_book_rooms, can_view_invoices,
   can_submit_repairs, can_manage_employees)
values ('eeeeeeee-0000-0000-0000-0000000000e1', '99999999-9999-9999-9999-999999999999',
        'company_admin', 'active', true, true, true, true);

-- Grant the Open Desk allowance: 5 hours for the current period.
insert into public.credit_entries (company_id, period, hours, reason, note)
values ('eeeeeeee-0000-0000-0000-0000000000e1', public.credit_period(), 5,
        'plan_allocation', 'Test allocation');

-- Adopt the member's identity before any priced call. price_booking now
-- refuses a company the caller does not belong to, so quoting as an
-- unidentified caller is correctly rejected from here on.
select set_config('request.jwt.claim.sub', '99999999-9999-9999-9999-999999999999', true);

select pg_temp.check_eq(public.credit_balance('eeeeeeee-0000-0000-0000-0000000000e1'),
  5.00::numeric, 'opening credit balance is the plan allowance');

-- A 2-hour booking sits entirely inside the allowance: nothing to pay.
select pg_temp.check_eq(
  (public.price_booking((select id from public.resources where slug = 'meeting-room-small'),
    tstzrange(now() + interval '10 days', now() + interval '10 days 2 hours'),
    'eeeeeeee-0000-0000-0000-0000000000e1') ->> 'credit_hours_used')::numeric,
  2.00::numeric, '2h booking consumes 2 credit hours');
select pg_temp.check_eq(
  (public.price_booking((select id from public.resources where slug = 'meeting-room-small'),
    tstzrange(now() + interval '10 days', now() + interval '10 days 2 hours'),
    'eeeeeeee-0000-0000-0000-0000000000e1') ->> 'total')::numeric,
  0.00::numeric, 'a fully credit-covered booking costs nothing');

-- An 8-hour booking exceeds the 5-hour allowance by 3 hours. Those 3 hours
-- bill at the FULL rate: 220 x 8 = 1760 gross, 5/8 covered, 660 remaining.
select pg_temp.check_eq(
  (public.price_booking((select id from public.resources where slug = 'meeting-room-small'),
    tstzrange('2026-09-01 07:00'::timestamptz, '2026-09-01 15:00'::timestamptz),
    'eeeeeeee-0000-0000-0000-0000000000e1') ->> 'credit_hours_used')::numeric,
  5.00::numeric, '8h booking consumes the whole 5h allowance');
select pg_temp.check_eq(
  (public.price_booking((select id from public.resources where slug = 'meeting-room-small'),
    tstzrange('2026-09-01 07:00'::timestamptz, '2026-09-01 15:00'::timestamptz),
    'eeeeeeee-0000-0000-0000-0000000000e1') ->> 'billable_hours')::numeric,
  3.00::numeric, 'the 3 hours beyond the allowance stay billable');

-- Same booking without a company: the full public rate, no discount. The
-- covered portion is the only difference, which is what "credits only, no
-- member discount" means.
select pg_temp.check_eq(
  (pg_temp.quote_hours('meeting-room-small', 8) ->> 'gross')::numeric,
  (public.price_booking((select id from public.resources where slug = 'meeting-room-small'),
    tstzrange('2026-09-01 07:00'::timestamptz, '2026-09-01 15:00'::timestamptz),
    'eeeeeeee-0000-0000-0000-0000000000e1') ->> 'gross')::numeric,
  'members and guests see the same gross rate — no member discount');

-- The community hall is outside the meeting-room allowance.
select pg_temp.check_eq(
  (public.price_booking((select id from public.resources where slug = 'community-space'),
    tstzrange(now() + interval '11 days', now() + interval '11 days 4 hours'),
    'eeeeeeee-0000-0000-0000-0000000000e1') ->> 'credit_hours_used')::numeric,
  0.00::numeric, 'community hall does not draw on meeting-room credits');

-- ===========================================================================
-- 6. The ledger balances, and cancelling returns the credit
-- ===========================================================================

select pg_temp.check_eq(
  (select credit_hours_used from public.create_booking(
     (select id from public.resources where slug = 'meeting-room-large'),
     tstzrange(now() + interval '12 days', now() + interval '12 days 3 hours'),
     'eeeeeeee-0000-0000-0000-0000000000e1')),
  3.00::numeric, 'create_booking consumes 3 of the 5 credit hours');

select pg_temp.check_eq(public.credit_balance('eeeeeeee-0000-0000-0000-0000000000e1'),
  2.00::numeric, 'balance falls to 2 hours after the booking');

select pg_temp.check_eq(
  (select status from public.cancel_booking(
     (select id from public.bookings
      where company_id = 'eeeeeeee-0000-0000-0000-0000000000e1'
      order by created_at desc limit 1), 'test cancel')),
  'cancelled', 'booking cancels');

select pg_temp.check_eq(public.credit_balance('eeeeeeee-0000-0000-0000-0000000000e1'),
  5.00::numeric, 'cancelling returns the consumed credit to the ledger');

-- The cancelled slot must be free again for someone else.
select pg_temp.check_eq(
  (select count(*)::int from public.bookings
    where company_id = 'eeeeeeee-0000-0000-0000-0000000000e1'
      and status in ('hold','confirmed','checked_in','completed')),
  0, 'a cancelled booking no longer blocks the slot');

-- ===========================================================================
-- 7. A hold must not mint credit  (regression)
--
-- create_booking used to persist the PRICED credit_hours_used on the hold row
-- even though a hold debits nothing, and cancel_booking refunded off that
-- column. Holding a room and cancelling it therefore created credit out of
-- nothing, and the loop was unbounded. Both halves are asserted here: the hold
-- must record no debit, and the cancel must refund nothing.
-- ===========================================================================
select pg_temp.check_eq(public.credit_balance('eeeeeeee-0000-0000-0000-0000000000e1'),
  5.00::numeric, 'balance is 5 before the hold/cancel cycle');

select pg_temp.check_eq(
  (select status from public.create_booking(
     (select id from public.resources where slug = 'meeting-room-small'),
     tstzrange(now() + interval '20 days', now() + interval '20 days 3 hours'),
     'eeeeeeee-0000-0000-0000-0000000000e1',
     '[]'::jsonb, null, null, null, null,
     true)),                                   -- p_hold_only
  'hold', 'a hold is created');

select pg_temp.check_eq(
  (select credit_hours_used from public.bookings
    where company_id = 'eeeeeeee-0000-0000-0000-0000000000e1' and status = 'hold'),
  0.00::numeric, 'a hold records zero credit consumed');

select pg_temp.check_eq(
  (select total from public.bookings
    where company_id = 'eeeeeeee-0000-0000-0000-0000000000e1' and status = 'hold'),
  0.00::numeric, 'a hold is not billed');

select pg_temp.check_eq(public.credit_balance('eeeeeeee-0000-0000-0000-0000000000e1'),
  5.00::numeric, 'holding a room debits no credit');

select pg_temp.check_eq(
  (select status from public.cancel_booking(
     (select id from public.bookings
       where company_id = 'eeeeeeee-0000-0000-0000-0000000000e1'
         and status = 'hold' limit 1), 'abandoned')),
  'cancelled', 'the hold cancels');

select pg_temp.check_eq(public.credit_balance('eeeeeeee-0000-0000-0000-0000000000e1'),
  5.00::numeric, 'cancelling a hold mints NO credit — balance still 5');

-- ===========================================================================
-- 8. Cancelling twice must not refund twice  (regression)
-- ===========================================================================
select pg_temp.check_eq(
  (select credit_hours_used from public.create_booking(
     (select id from public.resources where slug = 'meeting-room-small'),
     tstzrange(now() + interval '21 days', now() + interval '21 days 2 hours'),
     'eeeeeeee-0000-0000-0000-0000000000e1')),
  2.00::numeric, 'a confirmed booking debits 2 hours');
select pg_temp.check_eq(public.credit_balance('eeeeeeee-0000-0000-0000-0000000000e1'),
  3.00::numeric, 'balance falls to 3');

select pg_temp.check_eq(
  (select status from public.cancel_booking(
     (select id from public.bookings
       where company_id = 'eeeeeeee-0000-0000-0000-0000000000e1'
         and status = 'confirmed'
       order by created_at desc limit 1), 'first cancel')),
  'cancelled', 'first cancel succeeds');
select pg_temp.check_eq(public.credit_balance('eeeeeeee-0000-0000-0000-0000000000e1'),
  5.00::numeric, 'the 2 hours come back exactly once');

-- A second cancel is rejected outright, and even if the guard were bypassed
-- the ledger-derived refund is a no-op once a refund row exists.
do $$
begin
  perform public.cancel_booking(
    (select id from public.bookings
      where company_id = 'eeeeeeee-0000-0000-0000-0000000000e1'
        and status = 'cancelled'
      order by created_at desc limit 1), 'second cancel');
  raise exception 'FAIL: cancelling an already-cancelled booking should be rejected';
exception when check_violation then
  raise notice 'pass: a second cancel is rejected';
end
$$;

select pg_temp.check_eq(public.credit_balance('eeeeeeee-0000-0000-0000-0000000000e1'),
  5.00::numeric, 'balance is unchanged after the rejected second cancel');

-- ===========================================================================
-- 9. price_booking must not disclose another company's balance  (regression)
-- ===========================================================================
do $$
begin
  perform public.price_booking(
    (select id from public.resources where slug = 'meeting-room-small'),
    tstzrange(now() + interval '30 days', now() + interval '30 days 1 hour'),
    'aaaaaaaa-0000-0000-0000-000000000001');   -- a company the caller is not in
  raise exception 'FAIL: quoting for a foreign company should be rejected';
exception when insufficient_privilege then
  raise notice 'pass: price_booking refuses a company the caller does not belong to';
  when no_data_found then
  raise notice 'pass: price_booking refuses a company the caller does not belong to';
end
$$;

rollback;
