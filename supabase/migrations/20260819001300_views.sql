-- Mars Space — 013 Read views
--
-- tstzrange is the right storage type for bookings (it is what makes the
-- exclusion constraint possible) but it is awkward for clients: PostgREST
-- returns it as the literal string '["2026-09-01 10:00:00+03","...")', which
-- every caller would then have to parse. These views expose starts_at and
-- ends_at as plain timestamptz so the website and the mobile app can read them
-- directly.
--
-- SECURITY INVOKER IS LOAD-BEARING. A Postgres view runs with the privileges
-- of its OWNER by default, which would bypass RLS on the underlying tables and
-- turn every view here into a tenant-wide data leak. `security_invoker = on`
-- (PG15+) makes the view run as the CALLER, so the same policies apply. Never
-- remove it, and never add a view here without it.

-- ---------------------------------------------------------------------------
-- booking_details — a booking with its resource and branch resolved
-- ---------------------------------------------------------------------------
create view public.booking_details
with (security_invoker = on) as
select
  b.id,
  b.reference,
  b.status,
  b.company_id,
  b.booked_by,
  b.resource_id,
  b.branch_id,
  lower(b.time_range)                                   as starts_at,
  upper(b.time_range)                                   as ends_at,
  round(extract(epoch from (upper(b.time_range) - lower(b.time_range))) / 3600.0, 2)
                                                        as hours,
  -- Riyadh-local parts, so clients do not each re-derive the timezone.
  (lower(b.time_range) at time zone 'Asia/Riyadh')::date as booking_date,
  to_char(lower(b.time_range) at time zone 'Asia/Riyadh', 'HH24:MI') as start_time,
  to_char(upper(b.time_range) at time zone 'Asia/Riyadh', 'HH24:MI') as end_time,
  r.name                                                as resource_name,
  r.name_ar                                             as resource_name_ar,
  r.slug                                                as resource_slug,
  r.category                                            as resource_category,
  r.hero_image                                          as resource_image,
  r.floor                                               as resource_floor,
  r.capacity                                            as resource_capacity,
  br.name                                               as branch_name,
  br.name_ar                                            as branch_name_ar,
  b.credit_hours_used,
  b.billable_hours,
  b.subtotal,
  b.vat_amount,
  b.total,
  b.qr_code,
  b.notes,
  b.guest_name,
  b.guest_email,
  b.hold_expires_at,
  b.cancelled_at,
  b.created_at
from public.bookings b
join public.resources r on r.id = b.resource_id
join public.branches  br on br.id = b.branch_id;

-- ---------------------------------------------------------------------------
-- my_offices — the private office(s) a company currently occupies.
-- Powers the mobile app's "My Office" screen.
-- ---------------------------------------------------------------------------
create view public.my_offices
with (security_invoker = on) as
select
  oa.id                     as assignment_id,
  oa.company_id,
  oa.contract_id,
  oa.desk_count,
  oa.door_keycode,
  lower(oa.term)            as starts_on,
  upper(oa.term)            as ends_on,
  oa.term @> (now() at time zone 'Asia/Riyadh')::date as is_current,
  r.id                      as resource_id,
  r.slug                    as resource_slug,
  r.name                    as name,
  r.name_ar                 as name_ar,
  r.floor,
  r.location,
  r.location_ar,
  r.capacity,
  r.size_sqm,
  r.rate                    as monthly_rate,
  r.features,
  r.features_ar,
  r.amenities,
  r.amenities_ar,
  r.hero_image,
  br.name                   as branch_name,
  br.name_ar                as branch_name_ar,
  br.address,
  br.address_ar
from public.office_assignments oa
join public.resources r  on r.id = oa.resource_id
join public.branches  br on br.id = r.branch_id;

-- ---------------------------------------------------------------------------
-- credit_balances — the current period's meeting-room allowance per company.
--
-- Reads credit_entries, which members can SELECT for their own company, so the
-- invoker's policies still scope this correctly.
-- ---------------------------------------------------------------------------
create view public.credit_balances
with (security_invoker = on) as
select
  ce.company_id,
  ce.period,
  sum(ce.hours) filter (where ce.reason = 'plan_allocation')          as allocated_hours,
  -sum(ce.hours) filter (where ce.reason = 'booking')                 as used_hours,
  sum(ce.hours)                                                       as remaining_hours
from public.credit_entries ce
group by ce.company_id, ce.period;

-- ---------------------------------------------------------------------------
-- How many people are registered for an event.
--
-- This CANNOT be a subquery inside community_schedule. That view is
-- security_invoker (it must be, or it would leak), so a subquery over
-- event_registrations is filtered by that table's RLS — which shows a member
-- only their OWN registration. The "42 of 80 registered" counter would then
-- read 0 or 1 for everyone, and for an anonymous visitor it would fail
-- outright, because anon holds no grant on event_registrations at all.
--
-- An aggregate count discloses nothing about who registered, so a definer
-- function is the right tool: it sees every row, returns only a number.
-- ---------------------------------------------------------------------------
create or replace function public.event_registration_count(p_event uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.event_registrations er
  where er.event_id = p_event
    and er.status in ('registered', 'attended');
$$;

-- ---------------------------------------------------------------------------
-- community_schedule — upcoming events with their registration counts.
--
-- The count is a scalar subquery rather than a join so an event with no
-- registrations still appears, and so RLS on event_registrations (which hides
-- other people's rows) cannot silently drop events from the schedule.
-- ---------------------------------------------------------------------------
create view public.community_schedule
with (security_invoker = on) as
select
  e.id,
  e.slug,
  e.title,
  e.title_ar,
  e.description,
  e.description_ar,
  lower(e.time_range)                                   as starts_at,
  upper(e.time_range)                                   as ends_at,
  (lower(e.time_range) at time zone 'Asia/Riyadh')::date as event_date,
  to_char(lower(e.time_range) at time zone 'Asia/Riyadh', 'HH24:MI') as start_time,
  to_char(upper(e.time_range) at time zone 'Asia/Riyadh', 'HH24:MI') as end_time,
  e.speakers,
  e.speakers_ar,
  e.capacity,
  e.hero_image,
  e.status,
  e.is_public,
  e.is_members_only,
  e.requires_registration,
  e.resource_id,
  r.name    as venue_name,
  r.name_ar as venue_name_ar,
  e.branch_id,
  public.event_registration_count(e.id) as registered_count
from public.events e
left join public.resources r on r.id = e.resource_id;

-- ---------------------------------------------------------------------------
-- team_members — the employee roster with profile details attached.
-- Powers the app's employee-management screen.
-- ---------------------------------------------------------------------------
create view public.team_members
with (security_invoker = on) as
select
  cm.id,
  cm.company_id,
  cm.profile_id,
  cm.role,
  cm.status,
  cm.job_title,
  cm.can_book_rooms,
  cm.can_view_invoices,
  cm.can_submit_repairs,
  cm.can_manage_employees,
  cm.invited_at,
  cm.joined_at,
  p.full_name,
  p.full_name_ar,
  p.email,
  p.phone,
  p.avatar_url,
  p.preferred_language
from public.company_members cm
join public.profiles p on p.id = cm.profile_id;

-- Views are not covered by the earlier blanket revoke, so grant explicitly.
-- Deliberately NOT granted to anon: the view reads public.bookings, which anon
-- holds no grant on, so an anonymous select would raise "permission denied for
-- table bookings" rather than returning zero rows. Anonymous visitors have no
-- bookings to read in any case.
grant select on public.booking_details    to authenticated;
grant select on public.my_offices         to authenticated;
grant select on public.credit_balances    to authenticated;
grant select on public.community_schedule to anon, authenticated;
grant select on public.team_members       to authenticated;

-- The counter is called by community_schedule, which anon may read.
grant execute on function public.event_registration_count(uuid) to anon, authenticated;
