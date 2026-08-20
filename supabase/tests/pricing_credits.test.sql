-- Mars Space — pricing and credit-ledger test suite
--
-- Pins the behaviour that changed during the migration off db.json:
--   * The KSA weekend is Friday/Saturday. The legacy JS checked getDay() 0 and
--     6, i.e. Sunday and Saturday, so it surcharged the wrong two days and
--     missed Friday entirely.
--   * The 20% member discount is gone. Members get their plan's credit hours
--     free; hours beyond the allowance bill at the full public rate.
--   * VAT is 15% on the post-credit subtotal.
--
-- Reference dates (verified): 2026-09-01 Tue, 2026-09-04 Fri, 2026-09-05 Sat.
--
-- Run against a migrated + seeded database:
--   psql -d marsspace_test -v ON_ERROR_STOP=1 -f supabase/tests/pricing_credits.test.sql

\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.check_eq(actual anyelement, expected anyelement, label text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL: % — expected %, got %', label, expected, actual;
  end if;
  raise notice 'pass: % (= %)', label, actual;
end;
$$;

create or replace function pg_temp.quote(p_slug text, p_from text, p_to text,
                                         p_company uuid default null)
returns jsonb language sql as $$
  select public.price_booking(
    (select id from public.resources where slug = p_slug),
    tstzrange(p_from::timestamptz, p_to::timestamptz),
    p_company
  );
$$;

set timezone = 'Asia/Riyadh';

-- ===========================================================================
-- 1. Base hourly pricing
--
-- Ventures Room at SAR 220/hr for two hours on a Tuesday, outside the
-- 12:00-15:00 peak window. This reproduces seed booking BK-9021 from the old
-- db.json exactly: subtotal 440, VAT 66, total 506.
-- ===========================================================================
select pg_temp.check_eq((pg_temp.quote('ventures','2026-09-01 10:00','2026-09-01 12:00') ->> 'base')::numeric,
  440.00::numeric, 'Ventures 2h base = rate x hours');
select pg_temp.check_eq((pg_temp.quote('ventures','2026-09-01 10:00','2026-09-01 12:00') ->> 'peak_surcharge')::numeric,
  0.00::numeric, 'no peak surcharge before 12:00');
select pg_temp.check_eq((pg_temp.quote('ventures','2026-09-01 10:00','2026-09-01 12:00') ->> 'weekend_surcharge')::numeric,
  0.00::numeric, 'Tuesday is not a KSA weekend');
select pg_temp.check_eq((pg_temp.quote('ventures','2026-09-01 10:00','2026-09-01 12:00') ->> 'vat_amount')::numeric,
  66.00::numeric, 'VAT is 15% of subtotal');
select pg_temp.check_eq((pg_temp.quote('ventures','2026-09-01 10:00','2026-09-01 12:00') ->> 'total')::numeric,
  506.00::numeric, 'total matches legacy booking BK-9021');

-- ===========================================================================
-- 2. Peak-hour surcharge: +10% when the booking overlaps 12:00-15:00
-- ===========================================================================
select pg_temp.check_eq((pg_temp.quote('ventures','2026-09-01 12:00','2026-09-01 14:00') ->> 'peak_surcharge')::numeric,
  44.00::numeric, 'peak surcharge is 10% of base');
select pg_temp.check_eq((pg_temp.quote('ventures','2026-09-01 12:00','2026-09-01 14:00') ->> 'total')::numeric,
  556.60::numeric, 'peak booking total = (440 + 44) x 1.15');

-- Touching the boundary from outside must not trigger it.
select pg_temp.check_eq((pg_temp.quote('ventures','2026-09-01 09:00','2026-09-01 12:00') ->> 'peak_surcharge')::numeric,
  0.00::numeric, 'a booking ending exactly at 12:00 is not peak');
select pg_temp.check_eq((pg_temp.quote('ventures','2026-09-01 15:00','2026-09-01 17:00') ->> 'peak_surcharge')::numeric,
  0.00::numeric, 'a booking starting exactly at 15:00 is not peak');
select pg_temp.check_eq((pg_temp.quote('ventures','2026-09-01 14:00','2026-09-01 16:00') ->> 'peak_surcharge')::numeric,
  44.00::numeric, 'a booking straddling 15:00 is peak');

-- ===========================================================================
-- 3. KSA weekend: Friday and Saturday, NOT Sunday
-- ===========================================================================
select pg_temp.check_eq((pg_temp.quote('ventures','2026-09-04 10:00','2026-09-04 12:00') ->> 'weekend_surcharge')::numeric,
  66.00::numeric, 'Friday carries the 15% weekend surcharge');
select pg_temp.check_eq((pg_temp.quote('ventures','2026-09-05 10:00','2026-09-05 12:00') ->> 'weekend_surcharge')::numeric,
  66.00::numeric, 'Saturday carries the 15% weekend surcharge');
select pg_temp.check_eq((pg_temp.quote('ventures','2026-09-06 10:00','2026-09-06 12:00') ->> 'weekend_surcharge')::numeric,
  0.00::numeric, 'Sunday is a working day in KSA and carries no surcharge');
select pg_temp.check_eq(public.is_ksa_weekend('2026-09-06 10:00'::timestamptz),
  false, 'is_ksa_weekend(Sunday) is false — the legacy Sun/Sat check was wrong');

-- ===========================================================================
-- 4. Community hall bills a flat day rate, not by the hour
-- ===========================================================================
select pg_temp.check_eq((pg_temp.quote('community-hall','2026-09-01 09:00','2026-09-01 13:00') ->> 'base')::numeric,
  400.00::numeric, 'community hall 4h = one flat day rate');
select pg_temp.check_eq((pg_temp.quote('community-hall','2026-09-01 09:00','2026-09-01 17:00') ->> 'base')::numeric,
  400.00::numeric, 'community hall 8h = still one day rate');

-- Private offices are contracted, never booked.
do $$
begin
  perform pg_temp.quote('office-04','2026-09-01 09:00','2026-09-01 17:00');
  raise exception 'FAIL: pricing a private office should have been rejected';
exception when check_violation then
  raise notice 'pass: private offices cannot be priced as a booking';
end
$$;

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
from public.resources r where r.slug = 'office-04';

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
  (public.price_booking((select id from public.resources where slug = 'ventures'),
    tstzrange(now() + interval '10 days', now() + interval '10 days 2 hours'),
    'eeeeeeee-0000-0000-0000-0000000000e1') ->> 'credit_hours_used')::numeric,
  2.00::numeric, '2h booking consumes 2 credit hours');
select pg_temp.check_eq(
  (public.price_booking((select id from public.resources where slug = 'ventures'),
    tstzrange(now() + interval '10 days', now() + interval '10 days 2 hours'),
    'eeeeeeee-0000-0000-0000-0000000000e1') ->> 'total')::numeric,
  0.00::numeric, 'a fully credit-covered booking costs nothing');

-- An 8-hour booking exceeds the 5-hour allowance by 3 hours. Those 3 hours
-- bill at the FULL rate: 220 x 8 = 1760 gross, 5/8 covered, 660 remaining.
select pg_temp.check_eq(
  (public.price_booking((select id from public.resources where slug = 'ventures'),
    tstzrange('2026-09-01 07:00'::timestamptz, '2026-09-01 15:00'::timestamptz),
    'eeeeeeee-0000-0000-0000-0000000000e1') ->> 'credit_hours_used')::numeric,
  5.00::numeric, '8h booking consumes the whole 5h allowance');
select pg_temp.check_eq(
  (public.price_booking((select id from public.resources where slug = 'ventures'),
    tstzrange('2026-09-01 07:00'::timestamptz, '2026-09-01 15:00'::timestamptz),
    'eeeeeeee-0000-0000-0000-0000000000e1') ->> 'billable_hours')::numeric,
  3.00::numeric, 'the 3 hours beyond the allowance stay billable');

-- Same booking without a company: the full public rate, no discount. The
-- covered portion is the only difference, which is what "credits only, no
-- member discount" means.
select pg_temp.check_eq(
  (pg_temp.quote('ventures','2026-09-01 07:00','2026-09-01 15:00') ->> 'gross')::numeric,
  (public.price_booking((select id from public.resources where slug = 'ventures'),
    tstzrange('2026-09-01 07:00'::timestamptz, '2026-09-01 15:00'::timestamptz),
    'eeeeeeee-0000-0000-0000-0000000000e1') ->> 'gross')::numeric,
  'members and guests see the same gross rate — no member discount');

-- The community hall is outside the meeting-room allowance.
select pg_temp.check_eq(
  (public.price_booking((select id from public.resources where slug = 'community-hall'),
    tstzrange(now() + interval '11 days', now() + interval '11 days 4 hours'),
    'eeeeeeee-0000-0000-0000-0000000000e1') ->> 'credit_hours_used')::numeric,
  0.00::numeric, 'community hall does not draw on meeting-room credits');

-- ===========================================================================
-- 6. The ledger balances, and cancelling returns the credit
-- ===========================================================================

select pg_temp.check_eq(
  (select credit_hours_used from public.create_booking(
     (select id from public.resources where slug = 'lab'),
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
     (select id from public.resources where slug = 'vc'),
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
     (select id from public.resources where slug = 'vc'),
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
    (select id from public.resources where slug = 'ventures'),
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
