-- Who each view is FOR.
--
-- Migrations 016 and 018 rebuilt the directory and the schedule as
-- `security_invoker = off` views so a member could see rows RLS would
-- otherwise hide (other companies, other companies' public events). That got
-- the PROJECTION right — only safe columns are selected, never keycodes or
-- CR numbers — but nobody decided who the AUDIENCE was, and the two views
-- ended up wrong in opposite directions:
--
--   community_schedule  errored for anon, because it calls
--                       current_company_ids() and anon has no EXECUTE on it.
--                       The public homepage aggregates four queries and
--                       throws on the first error, so /api/v1/public/homepage
--                       returned 500 to every signed-out visitor.
--
--   company_directory   returned rows to anon. A definer view granted to
--   directory_people    anon bypasses RLS entirely, so anyone holding the
--                       publishable key — which ships in the mobile bundle
--                       and the website's client JS, i.e. everyone — could
--                       read every listed company's name, headcount, desk
--                       count and WHICH OFFICES THEY OCCUPY, without signing
--                       in. directory_people read zero rows only because
--                       show_in_directory defaults false; the first employee
--                       to opt in would have been published to the open
--                       internet.
--
-- The second one matters beyond the data: consent to appear in a floor
-- directory is consent to be seen BY THE FLOOR. Publishing that to anonymous
-- callers is not what anyone agreed to, and under PDPL it is a different
-- purpose than the one consented to.

-- ---------------------------------------------------------------------------
-- 1. community_schedule: readable by everyone, still private where it must be
-- ---------------------------------------------------------------------------
-- The view's privacy rule is already correct:
--   visibility = 'public' or company_id in (current_company_ids()) or is_staff()
-- For an anonymous caller auth.uid() is null, so current_company_ids() returns
-- the empty set and is_staff() returns false — anon matches only the public
-- rows. Granting EXECUTE therefore discloses nothing; it just stops the view
-- from erroring before it can apply its own filter.
grant execute on function public.current_company_ids() to anon;

-- Called in the view's select list, so the events half needs it for the
-- public homepage. It returns a bare integer for an event id the caller must
-- already know, which is why this one stays public while company_headcount
-- (below) does not.
grant execute on function public.event_registration_count(uuid) to anon;

-- ---------------------------------------------------------------------------
-- 2. The directory is a members' amenity
-- ---------------------------------------------------------------------------
-- A predicate anon may EXECUTE, so a signed-out caller gets an empty result
-- rather than a permission error. Using current_company_ids() directly inside
-- the views would work too, but every anonymous hit would raise 42501 — and a
-- view that errors is a view someone eventually "fixes" with a grant.
create or replace function public.is_floor_member()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.company_members
    where profile_id = auth.uid() and status = 'active'
  ) or public.is_staff();
$$;

comment on function public.is_floor_member() is
  'True for any signed-in active member of any company on the floor, and for Mars staff. Gates the cross-company directory views, which bypass RLS by design.';

revoke execute on function public.is_floor_member() from public;
grant execute on function public.is_floor_member() to anon, authenticated;

create or replace view public.company_directory as
  select
    c.id,
    c.name,
    c.name_ar,
    c.description,
    c.description_ar,
    c.industry,
    c.website,
    c.logo_path,
    public.company_headcount(c.id) as headcount,
    (select string_agg(r.name, ', ' order by r.name)
       from public.office_assignments oa
       join public.resources r on r.id = oa.resource_id
      where oa.company_id = c.id
        and oa.term @> (now() at time zone 'Asia/Riyadh')::date) as offices,
    (select coalesce(sum(oa.desk_count), 0)
       from public.office_assignments oa
      where oa.company_id = c.id
        and oa.term @> (now() at time zone 'Asia/Riyadh')::date) as desks
  from public.companies c
  where c.is_listed
    and c.status = 'active'
    -- The company consented to being listed. is_floor_member() decides who
    -- "listed" is shown to.
    and public.is_floor_member();

create or replace view public.directory_people as
  select
    p.id,
    p.full_name,
    p.full_name_ar,
    p.job_title,
    p.bio,
    p.avatar_url,
    cm.company_id,
    c.name    as company_name,
    c.name_ar as company_name_ar
  from public.profiles p
  join public.company_members cm
    on cm.profile_id = p.id and cm.status = 'active'
  join public.companies c
    on c.id = cm.company_id
  where p.show_in_directory
    and p.status = 'active'
    and c.is_listed
    and c.status = 'active'
    and public.is_floor_member();

-- Belt and braces. The predicate above is the real gate; this makes the
-- intent legible in \dp and survives someone reinstating the predicate-free
-- view without re-reading this comment.
revoke select on public.company_directory  from anon;
revoke select on public.directory_people   from anon;
grant  select on public.company_directory  to authenticated;
grant  select on public.directory_people   to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Close the anon RPC surface that migrations 016-018 opened
-- ---------------------------------------------------------------------------
-- Migration 010 revoked EXECUTE from public/anon/authenticated wholesale and
-- granted back a deliberate surface. Every function created AFTER it defaulted
-- to EXECUTE for PUBLIC again, so these have been anon-callable since.
--
-- Of them only company_headcount actually leaked: it has no internal auth
-- check and returned a real headcount for any company uuid to a caller who is
-- denied the companies table outright. The rest each re-check the caller
-- (is_staff / has_company_perm) and refuse anon on their own, so this is
-- defence in depth rather than a fix — but a member-only action has no
-- business sitting on the anonymous REST surface.
revoke execute on function public.company_headcount(uuid)                        from public, anon;
revoke execute on function public.submit_payment_proof(uuid, numeric, text, text) from public, anon;
revoke execute on function public.accept_community_quote(uuid)                    from public, anon;
revoke execute on function public.decline_community_request(uuid, text)           from public, anon;
revoke execute on function public.request_community_space(
  uuid, tstzrange, uuid, text, text, integer, text)                               from public, anon;

-- Trigger functions. A function returning `trigger` cannot be invoked over
-- PostgREST at all, so nothing was exposed — but they should not carry a
-- public EXECUTE bit. Triggers fire as part of the DML itself and do not
-- consult the invoking role's EXECUTE privilege, so the guards keep working;
-- the accompanying test asserts that rather than assuming it.
revoke execute on function public.guard_company_profile_changes()  from public, anon, authenticated;
revoke execute on function public.guard_direct_community_booking() from public, anon, authenticated;
revoke execute on function public.guard_directory_consent()        from public, anon, authenticated;
