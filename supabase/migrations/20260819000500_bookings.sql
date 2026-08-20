-- Mars Space — 005 Bookings
--
-- The exclusion constraint below is the single most important line in this
-- schema. The previous implementation checked availability in JavaScript by
-- reading a JSON file, comparing "HH:MM" strings, and then writing — a
-- read-then-write race that double-books under any real concurrency. Spec 8.3
-- calls for a database-level guarantee, and this is it.

create table public.bookings (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique default public.next_booking_reference(),
  resource_id       uuid not null references public.resources(id) on delete restrict,
  branch_id         uuid not null references public.branches(id) on delete restrict,

  -- Member bookings carry company_id + booked_by. Guest bookings (spec 8.1
  -- mandates guest checkout) carry neither and fill the guest_* columns.
  company_id        uuid references public.companies(id) on delete restrict,
  booked_by         uuid references public.profiles(id) on delete set null,
  guest_name        text,
  guest_email       extensions.citext,
  guest_phone       text,

  time_range        tstzrange not null,
  status            text not null default 'confirmed'
                    check (status in ('hold', 'confirmed', 'checked_in',
                                      'cancelled', 'no_show', 'completed')),
  -- Set only while status = 'hold'. Spec 8.3: 10-minute TTL.
  hold_expires_at   timestamptz,
  hold_session_id   text,

  credit_hours_used numeric(5, 2) not null default 0 check (credit_hours_used >= 0),
  billable_hours    numeric(5, 2) not null default 0 check (billable_hours >= 0),
  subtotal          numeric(10, 2) not null default 0,
  vat_amount        numeric(10, 2) not null default 0,
  total             numeric(10, 2) not null default 0,
  price_breakdown   jsonb not null default '{}',   -- audit trail of how the price was reached

  qr_code           text,
  notes             text,
  cancelled_at      timestamptz,
  cancelled_by      uuid references public.profiles(id) on delete set null,
  cancellation_reason text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint bookings_time_valid check (lower(time_range) < upper(time_range)),
  constraint bookings_hold_has_expiry check (
    (status = 'hold' and hold_expires_at is not null)
    or (status <> 'hold' and hold_expires_at is null)
  ),
  -- Either a member booking or a guest booking, never a nameless one.
  constraint bookings_has_owner check (
    company_id is not null or guest_email is not null
  ),

  -- Live bookings (and active holds) block the slot. Cancelled and no-show
  -- bookings do not, which is why this is a partial constraint.
  constraint bookings_no_overlap exclude using gist (
    resource_id with =,
    time_range  with &&
  ) where (status in ('hold', 'confirmed', 'checked_in', 'completed'))
);

create index bookings_company_idx  on public.bookings (company_id, lower(time_range) desc);
create index bookings_booked_by_idx on public.bookings (booked_by);
create index bookings_resource_idx on public.bookings using gist (resource_id, time_range);
create index bookings_upcoming_idx on public.bookings (lower(time_range))
  where status in ('confirmed', 'checked_in');
create index bookings_hold_expiry_idx on public.bookings (hold_expires_at)
  where status = 'hold';

create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();

comment on constraint bookings_no_overlap on public.bookings is
  'Spec 8.3. Raises SQLSTATE 23P01 (exclusion_violation) on a double-book; callers catch it and re-offer the slot.';

-- ---------------------------------------------------------------------------
-- booking_addons — snapshot the price at booking time. Reading it back through
-- a join to addons would silently restate historical bookings whenever the
-- price list changes.
-- ---------------------------------------------------------------------------
create table public.booking_addons (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references public.bookings(id) on delete cascade,
  addon_id      uuid not null references public.addons(id) on delete restrict,
  quantity      integer not null default 1 check (quantity > 0),
  unit_price    numeric(10, 2) not null,
  is_quote_only boolean not null default false,
  created_at    timestamptz not null default now(),
  constraint booking_addons_unique unique (booking_id, addon_id)
);

create index booking_addons_booking_idx on public.booking_addons (booking_id);

-- ---------------------------------------------------------------------------
-- Expire abandoned holds. Scheduled with pg_cron in the functions migration.
-- ---------------------------------------------------------------------------
create or replace function public.expire_stale_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  with expired as (
    delete from public.bookings
     where status = 'hold'
       and hold_expires_at < now()
    returning 1
  )
  select count(*) into n from expired;
  return n;
end;
$$;

comment on function public.expire_stale_holds is
  'Deletes holds past their TTL, freeing the slot. Run every minute via pg_cron.';
