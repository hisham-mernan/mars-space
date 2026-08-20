-- Mars Space — 006 Meeting-room credit ledger
--
-- Append-only, not a mutable balance column. Three reasons:
--   1. Concurrency. Two employees booking at once against a `balance` column
--      is a lost-update waiting to happen; inserting two rows is not.
--   2. Explicability. The only back office right now is the Supabase table
--      editor, so staff need to see *why* a balance is what it is.
--   3. Correction. A wrong balance is fixed by appending an adjustment, which
--      leaves the mistake and its fix both visible.
--
-- Balance for a period = sum(hours) over that period. Allocations are positive,
-- consumption negative.

create table public.credit_entries (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  -- NULL means the credit is pooled across the whole company. Set it to
  -- allocate per-employee instead; both models are supported by the schema.
  profile_id  uuid references public.profiles(id) on delete set null,
  contract_id uuid references public.contracts(id) on delete set null,
  period      daterange not null,
  hours       numeric(5, 2) not null,
  reason      text not null
              check (reason in ('plan_allocation', 'booking', 'booking_refund',
                                'adjustment', 'expiry')),
  booking_id  uuid references public.bookings(id) on delete set null,
  note        text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),

  -- Allocations must be positive, consumption negative. Catches a sign error
  -- before it silently grants credit.
  constraint credit_entries_sign check (
    (reason in ('plan_allocation', 'booking_refund') and hours > 0)
    or (reason in ('booking', 'expiry') and hours < 0)
    or (reason = 'adjustment')
  )
);

create index credit_entries_company_period_idx on public.credit_entries (company_id, period);
create index credit_entries_booking_idx on public.credit_entries (booking_id)
  where booking_id is not null;

-- One allocation per contract per period, so a re-run of the monthly job
-- cannot double-grant.
create unique index credit_entries_one_allocation_per_period
  on public.credit_entries (contract_id, period)
  where reason = 'plan_allocation';

comment on table public.credit_entries is
  'Append-only credit ledger. Members must never hold INSERT on this table - see the RLS migration.';

-- ---------------------------------------------------------------------------
-- Current period = the calendar month in Asia/Riyadh containing the timestamp.
-- ---------------------------------------------------------------------------
create or replace function public.credit_period(p_at timestamptz default now())
returns daterange
language sql
immutable
set search_path = public, pg_temp
as $$
  select daterange(
    date_trunc('month', p_at at time zone 'Asia/Riyadh')::date,
    (date_trunc('month', p_at at time zone 'Asia/Riyadh') + interval '1 month')::date,
    '[)'
  );
$$;

create or replace function public.credit_balance(
  p_company uuid,
  p_at      timestamptz default now()
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(hours), 0)::numeric(6, 2)
  from public.credit_entries
  where company_id = p_company
    and period = public.credit_period(p_at);
$$;

comment on function public.credit_balance is
  'Remaining meeting-room hours for a company in the period containing p_at.';

-- ---------------------------------------------------------------------------
-- Monthly allocation. Idempotent: the partial unique index above makes a
-- second run in the same period a no-op rather than a double grant.
-- ---------------------------------------------------------------------------
create or replace function public.allocate_monthly_credits(p_at timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  insert into public.credit_entries
    (company_id, contract_id, period, hours, reason, note)
  select c.company_id,
         c.id,
         public.credit_period(p_at),
         c.credit_hours_per_period,
         'plan_allocation',
         'Automatic monthly allocation'
    from public.contracts c
   where c.status = 'active'
     and c.credit_hours_per_period > 0
     and c.starts_on <= (p_at at time zone 'Asia/Riyadh')::date
     and (c.ends_on is null or c.ends_on >= (p_at at time zone 'Asia/Riyadh')::date)
  on conflict do nothing;

  get diagnostics n = row_count;
  return n;
end;
$$;
