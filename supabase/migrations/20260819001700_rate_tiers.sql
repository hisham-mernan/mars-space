-- Mars Space — 017 Duration-based rate tiers
--
-- The published price list is not a flat hourly rate:
--
--   Small Meeting Room   250 / hour   750 / 4 hours   1,400 / 8 hours
--   Large Meeting Room   350 / hour   1,300 / 4 hours  2,400 / 8 hours
--
-- price_booking() charged rate x hours, which quotes 1,000 for a 4-hour small
-- room against a published 750, and 2,000 for 8 hours against a published
-- 1,400 — over by 33% and 43%. Spec 8.5 anticipated this and asked for
-- "automatic selection of the cheapest applicable combination".
--
-- Surcharges are also disabled by default now. A published "250 SAR / hour" is
-- a promise; quoting 275 because the booking touches lunchtime contradicts the
-- price list. They stay available per resource for anything Mars Space
-- actually wants to price that way.

-- ---------------------------------------------------------------------------
-- Surcharges become per-resource and opt-in
-- ---------------------------------------------------------------------------
alter table public.resources
  add column if not exists peak_surcharge_pct    numeric(5,4) not null default 0,
  add column if not exists weekend_surcharge_pct numeric(5,4) not null default 0,
  add column if not exists includes              text[] not null default '{}',
  add column if not exists includes_ar           text[] not null default '{}';

comment on column public.resources.peak_surcharge_pct is
  'Fraction added when the booking overlaps 12:00-15:00 Riyadh. 0 = published flat rate applies.';

-- ---------------------------------------------------------------------------
-- Rate tiers
--
-- One row per purchasable block. The 1-hour row IS the hourly rate, so a
-- resource with tiers needs no separate rate column at quote time.
-- ---------------------------------------------------------------------------
create table if not exists public.rate_tiers (
  id          uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  hours       integer not null check (hours > 0),
  price       numeric(10,2) not null check (price >= 0),
  label       text,
  label_ar    text,
  created_at  timestamptz not null default now(),
  constraint rate_tiers_unique unique (resource_id, hours)
);

create index if not exists rate_tiers_resource_idx on public.rate_tiers (resource_id, hours);

alter table public.rate_tiers enable row level security;

drop policy if exists rate_tiers_read on public.rate_tiers;
create policy rate_tiers_read on public.rate_tiers
  for select using (true);
drop policy if exists rate_tiers_staff on public.rate_tiers;
create policy rate_tiers_staff on public.rate_tiers
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

grant select on public.rate_tiers to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Cheapest combination of blocks covering a duration.
--
-- Exact rather than greedy: greedy gets 5 hours on the small room wrong.
-- Greedy would take the 4-hour block then another 4-hour block (1,500);
-- the cheapest cover is the 4-hour block plus one hour (1,000).
--
-- Duration is rounded UP to the whole hour, which is how the price list reads
-- ("/ hour") and how room bookings are conventionally billed. The DP is over
-- at most a day of hours against a handful of tiers, so it is trivially cheap.
-- ---------------------------------------------------------------------------
create or replace function public.price_duration(
  p_resource_id uuid,
  p_hours       numeric
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_res    public.resources%rowtype;
  v_n      integer;
  v_dp     numeric[];      -- v_dp[i+1] = cheapest cost to cover i hours
  v_pick   integer[];      -- tier hours chosen at each step, for the breakdown
  v_tier   record;
  i        integer;
  v_cand   numeric;
  v_parts  jsonb := '[]'::jsonb;
  v_left   integer;
  v_flat   numeric;
begin
  select * into v_res from public.resources where id = p_resource_id;
  if not found then
    raise exception 'Resource % not found', p_resource_id using errcode = 'no_data_found';
  end if;

  -- Day-rate resources bill per started day and ignore tiers entirely.
  if v_res.rate_unit = 'day' then
    return jsonb_build_object(
      'base', round(v_res.rate * ceil(p_hours / 24.0), 2),
      'basis', 'day_rate',
      'parts', jsonb_build_array(jsonb_build_object(
        'label', 'Day rate', 'hours', 24, 'price', v_res.rate)),
      'list_price', round(v_res.rate * ceil(p_hours / 24.0), 2),
      'saving', 0
    );
  end if;

  v_n := greatest(1, ceil(p_hours)::integer);

  -- No tiers configured: fall back to the flat hourly rate.
  if not exists (select 1 from public.rate_tiers where resource_id = p_resource_id) then
    return jsonb_build_object(
      'base', round(v_res.rate * v_n, 2),
      'basis', 'hourly',
      'parts', jsonb_build_array(jsonb_build_object(
        'label', 'Hourly', 'hours', v_n, 'price', round(v_res.rate * v_n, 2))),
      'list_price', round(v_res.rate * v_n, 2),
      'saving', 0
    );
  end if;

  -- dp[0] = 0; everything else starts unreachable.
  v_dp   := array_fill(NULL::numeric, ARRAY[v_n + 1]);
  v_pick := array_fill(NULL::integer, ARRAY[v_n + 1]);
  v_dp[1] := 0;

  for i in 1..v_n loop
    for v_tier in
      select hours, price from public.rate_tiers where resource_id = p_resource_id
    loop
      -- A block larger than what is left still covers it, at its own price.
      v_cand := v_dp[greatest(0, i - v_tier.hours) + 1];
      if v_cand is not null then
        v_cand := v_cand + v_tier.price;
        if v_dp[i + 1] is null or v_cand < v_dp[i + 1] then
          v_dp[i + 1]   := v_cand;
          v_pick[i + 1] := v_tier.hours;
        end if;
      end if;
    end loop;
  end loop;

  -- Walk the choices back out so the UI can show what was applied.
  v_left := v_n;
  while v_left > 0 and v_pick[v_left + 1] is not null loop
    select jsonb_build_object(
             'label', coalesce(t.label, t.hours || ' hour'),
             'label_ar', t.label_ar,
             'hours', t.hours,
             'price', t.price)
      into v_tier
      from public.rate_tiers t
     where t.resource_id = p_resource_id and t.hours = v_pick[v_left + 1];
    v_parts := v_parts || to_jsonb(v_tier);
    v_left  := greatest(0, v_left - v_pick[v_left + 1]);
  end loop;

  -- What the same booking would have cost at the plain hourly rate, so the
  -- quote can say "4-hour rate applied - you saved SAR 250" (spec 8.5).
  select coalesce(min(price), v_res.rate) into v_flat
    from public.rate_tiers where resource_id = p_resource_id and hours = 1;
  v_flat := round(v_flat * v_n, 2);

  return jsonb_build_object(
    'base',       round(v_dp[v_n + 1], 2),
    'basis',      'tiered',
    'parts',      v_parts,
    'list_price', v_flat,
    'saving',     greatest(0, round(v_flat - v_dp[v_n + 1], 2))
  );
end;
$$;

grant execute on function public.price_duration(uuid, numeric) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- price_booking now delegates the room charge to price_duration and applies
-- surcharges only where a resource actually configures them.
-- ---------------------------------------------------------------------------
create or replace function public.price_booking(
  p_resource_id uuid,
  p_time_range  tstzrange,
  p_company_id  uuid default null,
  p_addons      jsonb default '[]'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_resource      public.resources%rowtype;
  v_hours         numeric(6, 2);
  v_duration      jsonb;
  v_base          numeric(10, 2);
  v_peak          numeric(10, 2) := 0;
  v_weekend       numeric(10, 2) := 0;
  v_gross         numeric(10, 2);
  v_credit_avail  numeric(6, 2) := 0;
  v_credit_used   numeric(6, 2) := 0;
  v_billable_hrs  numeric(6, 2);
  v_covered_ratio numeric(10, 6) := 0;
  v_addons_total  numeric(10, 2) := 0;
  v_quote_only    boolean := false;
  v_subtotal      numeric(10, 2);
  v_vat           numeric(10, 2);
  v_start         timestamptz := lower(p_time_range);
  v_end           timestamptz := upper(p_time_range);
begin
  select * into v_resource from public.resources where id = p_resource_id;
  if not found then
    raise exception 'Resource % not found', p_resource_id using errcode = 'no_data_found';
  end if;

  -- Reachable by anon for guest checkout, and it returns credit_available, so
  -- a company id the caller does not belong to must be refused.
  if p_company_id is not null
     and not (public.is_staff() or public.is_company_member(p_company_id)) then
    raise exception 'You do not have access to that company'
      using errcode = 'insufficient_privilege';
  end if;

  v_hours := round(extract(epoch from (v_end - v_start)) / 3600.0, 2);
  if v_hours <= 0 then
    raise exception 'Booking must end after it starts' using errcode = 'check_violation';
  end if;

  if v_resource.rate_unit = 'month' then
    raise exception 'Resource % is assigned by contract, not booked', v_resource.slug
      using errcode = 'check_violation';
  end if;

  v_duration := public.price_duration(p_resource_id, v_hours);
  v_base := (v_duration ->> 'base')::numeric;

  -- Surcharges apply only where the resource configures them. Default 0 keeps
  -- the quote equal to the published price list.
  if v_resource.peak_surcharge_pct > 0
     and tstzrange(
           (date_trunc('day', v_start at time zone 'Asia/Riyadh') + interval '12 hours')
             at time zone 'Asia/Riyadh',
           (date_trunc('day', v_start at time zone 'Asia/Riyadh') + interval '15 hours')
             at time zone 'Asia/Riyadh'
         ) && p_time_range
  then
    v_peak := round(v_base * v_resource.peak_surcharge_pct, 2);
  end if;

  if v_resource.weekend_surcharge_pct > 0 and public.is_ksa_weekend(v_start) then
    v_weekend := round(v_base * v_resource.weekend_surcharge_pct, 2);
  end if;

  v_gross := v_base + v_peak + v_weekend;

  -- Meeting-room credits, where a plan grants them.
  if p_company_id is not null
     and v_resource.category in ('meeting_room', 'focus_pod')
  then
    v_credit_avail := greatest(public.credit_balance(p_company_id), 0);
    v_credit_used  := least(v_credit_avail, v_hours);
  end if;

  v_billable_hrs := v_hours - v_credit_used;
  if v_hours > 0 then
    v_covered_ratio := v_credit_used / v_hours;
  end if;
  v_subtotal := round(v_gross * (1 - v_covered_ratio), 2);

  select coalesce(sum(
           case when a.is_quote_only then 0
                else a.price * coalesce((item ->> 'quantity')::int, 1) end), 0),
         coalesce(bool_or(a.is_quote_only), false)
    into v_addons_total, v_quote_only
  from jsonb_array_elements(coalesce(p_addons, '[]')) as item
  join public.addons a on a.id = (item ->> 'addon_id')::uuid
  where a.is_active;

  v_subtotal := v_subtotal + v_addons_total;
  v_vat      := round(v_subtotal * 0.15, 2);

  return jsonb_build_object(
    'resource_id',       p_resource_id,
    'resource_name',     v_resource.name,
    'rate',              v_resource.rate,
    'rate_unit',         v_resource.rate_unit,
    'hours',             v_hours,
    'base',              v_base,
    'pricing_basis',     v_duration ->> 'basis',
    'rate_parts',        v_duration -> 'parts',
    'list_price',        (v_duration ->> 'list_price')::numeric,
    'saving',            (v_duration ->> 'saving')::numeric,
    'peak_surcharge',    v_peak,
    'weekend_surcharge', v_weekend,
    'gross',             v_gross,
    'credit_available',  v_credit_avail,
    'credit_hours_used', v_credit_used,
    'billable_hours',    v_billable_hrs,
    'addons_total',      v_addons_total,
    'has_quote_only_addon', v_quote_only,
    'subtotal',          v_subtotal,
    'vat_rate',          0.15,
    'vat_amount',        v_vat,
    'total',             round(v_subtotal + v_vat, 2),
    'currency',          'SAR'
  );
end;
$$;

grant execute on function public.price_booking(uuid, tstzrange, uuid, jsonb)
  to authenticated, anon;
