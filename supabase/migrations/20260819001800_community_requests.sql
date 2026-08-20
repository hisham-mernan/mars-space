-- Mars Space — 018 Community Space requests
--
-- The Community Space is not sold over the counter. A member SUBMITS A
-- REQUEST; Mars Space reviews it, prices it and sends a contract; the member
-- accepts and pays; only then is the space actually booked. Spec 8.6 called
-- this the hybrid model and it is how a 50 m stage and an event kitchen
-- actually get let.
--
-- The request holds the slot from the moment it is made. A date being quoted
-- to one company must not be sold to another, and showing it as taken while
-- it is under discussion is honest rather than optimistic.
--
-- Requests also carry a visibility choice. A private event is invisible to
-- every other company in the building - it does not appear on the community
-- schedule, and nothing outside the owning company can see it exists.

-- ---------------------------------------------------------------------------
-- New booking lifecycle
--
--   requested -> quoted -> confirmed        (member accepts, invoice raised)
--             -> declined                   (either side walks away)
--             -> expired                    (quote lapsed)
-- ---------------------------------------------------------------------------
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings
  add constraint bookings_status_check check (status in (
    'hold', 'requested', 'quoted', 'confirmed', 'checked_in',
    'cancelled', 'declined', 'expired', 'no_show', 'completed'));

alter table public.bookings
  add column if not exists visibility        text not null default 'private'
    check (visibility in ('private', 'public')),
  add column if not exists event_title       text,
  add column if not exists event_title_ar    text,
  add column if not exists expected_guests   integer check (expected_guests > 0),
  add column if not exists setup_notes       text,
  -- Quote issued by Mars Space.
  add column if not exists quoted_subtotal   numeric(10, 2),
  add column if not exists quoted_vat        numeric(10, 2),
  add column if not exists quoted_total      numeric(10, 2),
  add column if not exists quote_notes       text,
  add column if not exists quote_expires_at  timestamptz,
  add column if not exists quoted_by         uuid references public.profiles(id) on delete set null,
  add column if not exists quoted_at         timestamptz,
  add column if not exists contract_path     text,   -- Storage: contracts/<company>/…
  add column if not exists accepted_at       timestamptz,
  add column if not exists accepted_by       uuid references public.profiles(id) on delete set null,
  add column if not exists decline_reason    text;

comment on column public.bookings.visibility is
  'private = invisible to every other company, including on the community schedule.';

create index if not exists bookings_quoted_by_idx   on public.bookings (quoted_by);
create index if not exists bookings_accepted_by_idx on public.bookings (accepted_by);
create index if not exists bookings_pending_requests_idx
  on public.bookings (status, created_at)
  where status in ('requested', 'quoted');

-- ---------------------------------------------------------------------------
-- The slot must be held while a request is open.
--
-- Rebuilding the exclusion constraint to include 'requested' and 'quoted', so
-- a date under discussion cannot be sold twice. 'declined' and 'expired' are
-- deliberately excluded - a dead request releases the date immediately.
-- ---------------------------------------------------------------------------
alter table public.bookings drop constraint if exists bookings_no_overlap;
alter table public.bookings
  add constraint bookings_no_overlap exclude using gist (
    resource_id with =,
    time_range  with &&
  ) where (status in ('hold', 'requested', 'quoted', 'confirmed', 'checked_in', 'completed'));

-- ---------------------------------------------------------------------------
-- Submitting a request
-- ---------------------------------------------------------------------------
create or replace function public.request_community_space(
  p_resource_id     uuid,
  p_time_range      tstzrange,
  p_company_id      uuid,
  p_visibility      text,
  p_event_title     text,
  p_expected_guests integer default null,
  p_setup_notes     text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_resource public.resources%rowtype;
  v_booking  public.bookings;
begin
  select * into v_resource from public.resources where id = p_resource_id;
  if not found then
    raise exception 'Resource not found' using errcode = 'no_data_found';
  end if;

  if v_resource.category <> 'community_hall' then
    raise exception 'Only the Community Space is booked by request'
      using errcode = 'check_violation';
  end if;

  if not (public.is_staff() or public.has_company_perm(p_company_id, 'book_rooms')) then
    raise exception 'You do not have permission to request space for this company'
      using errcode = 'insufficient_privilege';
  end if;

  if p_visibility not in ('private', 'public') then
    raise exception 'Visibility must be private or public' using errcode = 'check_violation';
  end if;

  if coalesce(trim(p_event_title), '') = '' then
    raise exception 'Tell us what the event is' using errcode = 'check_violation';
  end if;

  if v_resource.capacity is not null
     and p_expected_guests is not null
     and p_expected_guests > v_resource.capacity then
    raise exception 'The Community Space holds % guests', v_resource.capacity
      using errcode = 'check_violation';
  end if;

  -- Free any dead hold on this slot before contending for it.
  delete from public.bookings
   where resource_id = p_resource_id
     and status = 'hold'
     and hold_expires_at < now()
     and time_range && p_time_range;

  begin
    insert into public.bookings (
      resource_id, branch_id, company_id, booked_by, time_range, status,
      visibility, event_title, expected_guests, setup_notes,
      -- Nothing is priced yet. Mars Space quotes it.
      credit_hours_used, billable_hours, subtotal, vat_amount, total
    ) values (
      p_resource_id, v_resource.branch_id, p_company_id, auth.uid(), p_time_range,
      'requested', p_visibility, p_event_title, p_expected_guests, p_setup_notes,
      0, 0, 0, 0, 0
    )
    returning * into v_booking;
  exception
    when exclusion_violation then
      raise exception 'That date is already taken or under discussion. Please choose another.'
        using errcode = '23P01', hint = 'slot_taken';
  end;

  if auth.uid() is not null then
    insert into public.notifications (profile_id, kind, title, title_ar, body, body_ar, link)
    values (
      auth.uid(), 'booking_confirmed',
      'Request received — ' || v_booking.reference,
      'تم استلام الطلب — ' || v_booking.reference,
      'Mars Space will review your event and send a contract.',
      'سيراجع فريق مارس سبيس فعاليتك وسيرسل العقد.',
      '/bookings/' || v_booking.id
    );
  end if;

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- Mars Space prices it and attaches a contract. Staff only.
-- ---------------------------------------------------------------------------
create or replace function public.quote_community_request(
  p_booking_id    uuid,
  p_subtotal      numeric,
  p_contract_path text default null,
  p_notes         text default null,
  p_valid_days    integer default 7
)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking public.bookings;
  v_vat     numeric(10, 2);
begin
  if not public.is_staff() then
    raise exception 'Only Mars Space staff can quote a request'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Request not found' using errcode = 'no_data_found';
  end if;
  if v_booking.status <> 'requested' then
    raise exception 'This request is %, not awaiting a quote', v_booking.status
      using errcode = 'check_violation';
  end if;

  v_vat := round(p_subtotal * 0.15, 2);

  update public.bookings
     set status           = 'quoted',
         quoted_subtotal  = p_subtotal,
         quoted_vat       = v_vat,
         quoted_total     = p_subtotal + v_vat,
         quote_notes      = p_notes,
         contract_path    = p_contract_path,
         quote_expires_at = now() + make_interval(days => greatest(1, p_valid_days)),
         quoted_by        = auth.uid(),
         quoted_at        = now()
   where id = p_booking_id
   returning * into v_booking;

  insert into public.notifications (profile_id, kind, title, title_ar, body, body_ar, link)
  select b.booked_by, 'booking_confirmed',
         'Your contract is ready — ' || b.reference,
         'عقدك جاهز — ' || b.reference,
         'Review and accept to confirm your event.',
         'راجع العقد ووافق عليه لتأكيد فعاليتك.',
         '/bookings/' || b.id
    from public.bookings b
   where b.id = p_booking_id and b.booked_by is not null;

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- The member accepts. This is the point the space is actually booked and the
-- invoice is raised; payment then runs through submit_payment_proof.
-- ---------------------------------------------------------------------------
create or replace function public.accept_community_quote(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking public.bookings;
  v_res     public.resources%rowtype;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Request not found' using errcode = 'no_data_found';
  end if;

  if not (public.is_staff()
          or (v_booking.company_id is not null
              and public.has_company_perm(v_booking.company_id, 'book_rooms'))) then
    raise exception 'You do not have permission to accept this quote'
      using errcode = 'insufficient_privilege';
  end if;

  if v_booking.status <> 'quoted' then
    raise exception 'This request is %, not awaiting acceptance', v_booking.status
      using errcode = 'check_violation';
  end if;

  if v_booking.quote_expires_at is not null and v_booking.quote_expires_at < now() then
    update public.bookings set status = 'expired' where id = p_booking_id;
    raise exception 'This quote has expired. Please ask for a new one.'
      using errcode = 'check_violation', hint = 'quote_expired';
  end if;

  select * into v_res from public.resources where id = v_booking.resource_id;

  update public.bookings
     set status      = 'confirmed',
         subtotal    = v_booking.quoted_subtotal,
         vat_amount  = v_booking.quoted_vat,
         total       = v_booking.quoted_total,
         accepted_at = now(),
         accepted_by = auth.uid()
   where id = p_booking_id
   returning * into v_booking;

  insert into public.invoices (
    company_id, booking_id, kind, description, description_ar,
    due_date, subtotal, vat_amount, total, status
  ) values (
    v_booking.company_id, v_booking.id, 'booking',
    coalesce(v_booking.event_title, v_res.name) || ' — ' ||
      to_char(lower(v_booking.time_range) at time zone 'Asia/Riyadh', 'DD Mon YYYY'),
    coalesce(v_booking.event_title_ar, v_res.name_ar, v_res.name),
    (lower(v_booking.time_range) at time zone 'Asia/Riyadh')::date - 3,
    v_booking.quoted_subtotal, v_booking.quoted_vat, v_booking.quoted_total, 'unpaid'
  );

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- Either side can walk away.
-- ---------------------------------------------------------------------------
create or replace function public.decline_community_request(
  p_booking_id uuid,
  p_reason     text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Request not found' using errcode = 'no_data_found';
  end if;

  if not (public.is_staff()
          or (v_booking.company_id is not null
              and public.has_company_perm(v_booking.company_id, 'book_rooms'))) then
    raise exception 'You do not have permission to decline this request'
      using errcode = 'insufficient_privilege';
  end if;

  if v_booking.status not in ('requested', 'quoted') then
    raise exception 'This request is % and cannot be declined', v_booking.status
      using errcode = 'check_violation';
  end if;

  update public.bookings
     set status = 'declined', decline_reason = p_reason, cancelled_at = now(),
         cancelled_by = auth.uid()
   where id = p_booking_id
   returning * into v_booking;

  return v_booking;
end;
$$;

-- Quotes that lapse release the date. Run alongside the hold sweeper.
create or replace function public.expire_stale_quotes()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare n integer;
begin
  update public.bookings
     set status = 'expired'
   where status = 'quoted'
     and quote_expires_at is not null
     and quote_expires_at < now();
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- The Community Space cannot be booked directly any more.
-- ---------------------------------------------------------------------------
create or replace function public.guard_direct_community_booking()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_category text;
begin
  if public.is_staff() then
    return new;
  end if;
  select category into v_category from public.resources where id = new.resource_id;
  if v_category = 'community_hall'
     and new.status not in ('requested', 'quoted', 'declined', 'expired') then
    raise exception 'The Community Space is booked by request. Submit a request instead.'
      using errcode = 'check_violation', hint = 'use_request_flow';
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_guard_community on public.bookings;
create trigger bookings_guard_community before insert on public.bookings
  for each row execute function public.guard_direct_community_booking();

-- ---------------------------------------------------------------------------
-- The community schedule, with privacy
--
-- security_invoker = OFF, and deliberately so. The schedule has to show public
-- events from OTHER companies, which an invoker view cannot do without a
-- policy on bookings that would expose whole rows - totals, guest contact
-- details, quote figures. Instead this view implements the visibility rule
-- itself and publishes only what a schedule needs.
--
-- A private booking is visible ONLY to the company that made it. It appears
-- nowhere else: not on the schedule, not as a busy slot, not at all.
-- ---------------------------------------------------------------------------
-- The column list changes (kind, company_id, visibility are new), and
-- CREATE OR REPLACE VIEW cannot drop or reorder columns, so it is replaced.
drop view if exists public.community_schedule;
create view public.community_schedule
with (security_invoker = off) as
-- Mars Space's own programmed events.
select
  e.id,
  'event'::text                                          as kind,
  e.slug,
  e.title,
  e.title_ar,
  e.description,
  e.description_ar,
  lower(e.time_range)                                    as starts_at,
  upper(e.time_range)                                    as ends_at,
  (lower(e.time_range) at time zone 'Asia/Riyadh')::date  as event_date,
  to_char(lower(e.time_range) at time zone 'Asia/Riyadh', 'HH24:MI') as start_time,
  to_char(upper(e.time_range) at time zone 'Asia/Riyadh', 'HH24:MI') as end_time,
  e.speakers,
  e.capacity,
  e.hero_image,
  e.status,
  e.requires_registration,
  e.resource_id,
  e.branch_id,
  null::uuid                                             as company_id,
  null::text                                             as company_name,
  'public'::text                                         as visibility,
  public.event_registration_count(e.id)                  as registered_count
from public.events e
where e.status <> 'draft'
  and (e.is_public or (e.is_members_only and auth.uid() is not null))

union all

-- Member events in the Community Space. Public ones are visible to everyone;
-- private ones only to the company that booked them.
select
  b.id,
  'booking'::text,
  null,
  coalesce(b.event_title, r.name),
  coalesce(b.event_title_ar, r.name_ar),
  null, null,
  lower(b.time_range),
  upper(b.time_range),
  (lower(b.time_range) at time zone 'Asia/Riyadh')::date,
  to_char(lower(b.time_range) at time zone 'Asia/Riyadh', 'HH24:MI'),
  to_char(upper(b.time_range) at time zone 'Asia/Riyadh', 'HH24:MI'),
  null,
  b.expected_guests,
  null,
  b.status,
  false,
  b.resource_id,
  b.branch_id,
  b.company_id,
  -- Even for a public event, the company name is only shown when that company
  -- is listed in the directory.
  (select c.name from public.companies c
    where c.id = b.company_id and c.is_listed),
  b.visibility,
  0
from public.bookings b
join public.resources r on r.id = b.resource_id
where r.category = 'community_hall'
  and b.status in ('requested', 'quoted', 'confirmed', 'checked_in', 'completed')
  and (
    b.visibility = 'public'
    or b.company_id in (select public.current_company_ids())
    or public.is_staff()
  );

grant select on public.community_schedule to anon, authenticated;
grant execute on function public.request_community_space(uuid, tstzrange, uuid, text, text, integer, text) to authenticated;
grant execute on function public.accept_community_quote(uuid)          to authenticated;
grant execute on function public.decline_community_request(uuid, text) to authenticated;
-- Quoting is staff-only, but staff sign in as `authenticated` like everyone
-- else - the distinction is platform_role, not a database role. So the grant
-- goes to authenticated and the is_staff() check INSIDE the function is the
-- gate. Revoking from authenticated here would lock staff out too.
grant execute on function public.quote_community_request(uuid, numeric, text, text, integer) to authenticated;
revoke execute on function public.quote_community_request(uuid, numeric, text, text, integer) from public, anon;

-- Genuinely nobody's to call: this one runs from cron.
revoke execute on function public.expire_stale_quotes() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Sweep lapsed quotes alongside the existing jobs.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    return;
  end if;
  perform cron.schedule(
    'mars-expire-stale-quotes',
    '*/15 * * * *',
    $job$select public.expire_stale_quotes()$job$
  );
end
$$;

-- ---------------------------------------------------------------------------
-- Meeting-room credits are a CONTRACT term
--
-- Already the case structurally: allocate_monthly_credits() reads
-- contracts.credit_hours_per_period, grants it only while the contract is
-- active and in term, and credit_balance() scopes to the current period so
-- unused hours do not roll over. Recorded here so the intent is not
-- accidentally moved back onto the plan.
-- ---------------------------------------------------------------------------
comment on column public.contracts.credit_hours_per_period is
  'Free meeting-room hours granted each month while this contract is active. Set per company when the contract is created; it defaults from the plan only when left at 0. Does not roll over - credit_balance() is scoped to one period.';
