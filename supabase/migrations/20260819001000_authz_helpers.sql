-- Mars Space — 010 Authorization helpers
--
-- These live in `public`, not in `auth`. The auth schema is managed by
-- Supabase and its contents can be replaced during a platform upgrade;
-- anything we own belongs in our own schema.
--
-- Every one of them is SECURITY DEFINER, and that is load-bearing rather than
-- incidental. An RLS policy on company_members that queries company_members
-- re-enters the policy and recurses until Postgres gives up with
-- "infinite recursion detected in policy". Routing the lookup through a
-- definer function owned by the table owner bypasses RLS for that lookup and
-- breaks the cycle. This is the single most common way Supabase RLS setups
-- fail, so the pattern is used consistently below.
--
-- All are STABLE, which makes them safe to call from a policy — but STABLE
-- alone does NOT hoist the call. The planner folds only IMMUTABLE expressions;
-- a STABLE function left as a bare call in a qual is executed by the executor
-- once per candidate row. Only an uncorrelated scalar sub-SELECT becomes an
-- InitPlan that runs once per statement.
--
-- So callers must wrap the ZERO-ARGUMENT helpers in a subquery:
--     using ( (select public.is_staff()) or ... )
-- The helpers taking a company_id are correlated to the row and cannot be
-- hoisted; leave those called directly.

-- ---------------------------------------------------------------------------
-- Companies the caller actively belongs to.
-- ---------------------------------------------------------------------------
create or replace function public.current_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select cm.company_id
  from public.company_members cm
  where cm.profile_id = auth.uid()
    and cm.status = 'active';
$$;

comment on function public.current_company_ids is
  'Companies the signed-in profile actively belongs to. SECURITY DEFINER to avoid RLS recursion on company_members.';

-- ---------------------------------------------------------------------------
-- Mars staff. Deliberately separate from any company-level role so a company
-- admin can never reach staff privileges.
-- ---------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.platform_role in ('staff', 'erp_admin')
      and p.status = 'active'
  );
$$;

create or replace function public.is_erp_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.platform_role = 'erp_admin'
      and p.status = 'active'
  );
$$;

-- ---------------------------------------------------------------------------
-- Membership test, used as the base predicate on almost every policy.
-- ---------------------------------------------------------------------------
create or replace function public.is_company_member(p_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_members cm
    where cm.profile_id = auth.uid()
      and cm.company_id = p_company
      and cm.status = 'active'
  );
$$;

create or replace function public.is_company_admin(p_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_members cm
    where cm.profile_id = auth.uid()
      and cm.company_id = p_company
      and cm.status = 'active'
      and cm.role = 'company_admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- The permission gate. A company_admin implicitly holds every permission, so
-- an admin cannot lock themselves out by clearing their own flags.
-- ---------------------------------------------------------------------------
create or replace function public.has_company_perm(p_company uuid, p_perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select cm.role = 'company_admin'
        or case p_perm
             when 'book_rooms'       then cm.can_book_rooms
             when 'view_invoices'    then cm.can_view_invoices
             when 'submit_repairs'   then cm.can_submit_repairs
             when 'manage_employees' then cm.can_manage_employees
             else false
           end
    from public.company_members cm
    where cm.profile_id = auth.uid()
      and cm.company_id = p_company
      and cm.status = 'active'
    limit 1
  ), false);
$$;

comment on function public.has_company_perm is
  'Permission gate for member-side writes. Valid p_perm: book_rooms, view_invoices, submit_repairs, manage_employees. Unknown values return false (fail closed).';

-- ---------------------------------------------------------------------------
-- Seat accounting for the employee-invite flow.
-- ---------------------------------------------------------------------------
create or replace function public.company_seat_limit(p_company uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(oa.desk_count), 0)::integer
  from public.office_assignments oa
  where oa.company_id = p_company
    and oa.term @> (now() at time zone 'Asia/Riyadh')::date;
$$;

create or replace function public.company_seats_used(p_company uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.company_members cm
  where cm.company_id = p_company
    and cm.status in ('invited', 'active');
$$;

-- Revoke the default EXECUTE-to-public on the definer functions, then grant it
-- back only to signed-in roles. Without this, an anonymous caller could probe
-- them directly through PostgREST.
revoke execute on function public.current_company_ids()          from public, anon;
revoke execute on function public.is_company_member(uuid)        from public, anon;
revoke execute on function public.is_company_admin(uuid)         from public, anon;
revoke execute on function public.has_company_perm(uuid, text)   from public, anon;
revoke execute on function public.company_seat_limit(uuid)       from public, anon;
revoke execute on function public.company_seats_used(uuid)       from public, anon;

grant execute on function public.current_company_ids()          to authenticated;
grant execute on function public.is_company_member(uuid)        to authenticated;
grant execute on function public.is_company_admin(uuid)         to authenticated;
grant execute on function public.has_company_perm(uuid, text)   to authenticated;
grant execute on function public.company_seat_limit(uuid)       to authenticated;
grant execute on function public.company_seats_used(uuid)       to authenticated;

-- is_staff/is_erp_admin are safe to expose: they only ever describe the caller.
grant execute on function public.is_staff()     to authenticated, anon;
grant execute on function public.is_erp_admin() to authenticated, anon;
