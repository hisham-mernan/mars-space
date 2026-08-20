-- Mars Space — 024 Pin company_members.role against privilege escalation
--
-- FILENAME TIMESTAMP: a wall-clock version (2026-08-20 14:01 UTC), matching
-- migration 023 rather than the 202608190NNN00 sequence the earlier files use.
--
-- THE HOLE. company_members.role was writable by anyone the UPDATE policy let
-- through, and that policy lets through a delegate rather than an admin:
--
--   create policy company_members_admin_update on public.company_members
--     for update using  (public.has_company_perm(company_id, 'manage_employees'))
--          with check   (public.has_company_perm(company_id, 'manage_employees'));
--
-- has_company_perm() is true for a plain employee whose can_manage_employees
-- flag is set — that is the whole point of the flag. The row-level guard added
-- alongside it, guard_company_member_changes(), pinned company_id and
-- profile_id and refused to demote the last admin, but said nothing about
-- promotion. Nothing anywhere pinned `role`.
--
-- So an employee holding only manage_employees could send one PATCH at
-- PostgREST —
--
--   PATCH /rest/v1/company_members?id=eq.<their own row>   {"role":"company_admin"}
--
-- — and become a company_admin, above the admin who delegated the permission
-- to them and able to withdraw it. company_admin is not a cosmetic label: it
-- implies all four permissions in has_company_perm(), and is_company_admin()
-- separately gates companies_admin_update (the tenant's own company profile)
-- and the company-logos storage policies in migration 016. The mobile app
-- already ships the wire — updateTeamMember() in src/lib/queries.ts types its
-- changes as { role?: 'company_admin' | 'employee', ... } and PATCHes them
-- straight through. Verified against the live database before this migration:
-- the promotion succeeded.
--
-- company_members_admin_insert had the mirror of it. Its WITH CHECK is only
-- the company id, so the same delegate could invite an accomplice directly as
-- role='company_admin' instead of promoting themselves.
--
-- THE DECISION: role changes are allowed, but only from a caller who is
-- ALREADY a company_admin of that same company.
--
-- The alternative — staff-only role changes — was rejected. Promoting a
-- colleague is a legitimate, routine act of a company admin (someone has to
-- cover annual leave), and routing it through Mars Space support would either
-- stall the tenant or push staff into rubber-stamping the request, which is
-- worse security than a rule the database actually enforces. What must not
-- survive is escalation ACROSS the delegation boundary: manage_employees is
-- the authority to administer people the admin has already placed, not the
-- authority to mint peers of the person who granted it. So the test is
-- is_company_admin(), never has_company_perm(..., 'manage_employees') — the
-- delegate is refused, the admin is not, and a delegate cannot grant itself
-- the ability by any route it can reach, because reaching company_admin is
-- exactly what is blocked.
--
-- Note is_company_admin() requires the caller's OWN membership to be
-- status='active'. An admin still sitting at 'invited' cannot promote anyone
-- until they have accepted; that is deliberate.
--
-- WHY A TRIGGER AND NOT THE POLICY. RLS cannot express "this column may not
-- change": WITH CHECK sees only the NEW row, so it cannot tell a promotion
-- from a row that was already company_admin. Nor can the grant be narrowed —
-- `revoke update (role)` would lock admins out of the legitimate case too.
-- Comparing OLD to NEW needs a BEFORE trigger, which is where the sibling
-- guard on profiles.platform_role already lives (migration 012).
--
-- THE service_role SHORT-CIRCUIT IS KEPT, DELIBERATELY. The first line stays
--
--   if public.is_staff() or auth.uid() is null then return new; end if;
--
-- RLS is bypassed for service_role but triggers are NOT, so without that line
-- every server-side writer would be held to member rules. The invite-employee
-- Edge Function depends on it: it runs on the service-role key with no
-- end-user JWT, so auth.uid() is null there, and it upserts memberships (and,
-- on its revert path, restores an existing row field-for-field including
-- `role`) after doing its OWN caller entitlement check through a
-- caller-scoped client. That check is what stands in for this one. It also
-- pins role to a literal 'employee' and never reads a role from the request
-- body, so the bypass grants the function nothing it asks for. Migrations,
-- seeds and cron reach the same branch. An anonymous PostgREST caller also
-- has a null auth.uid(), but anon holds no INSERT/UPDATE grant on this table
-- (migration 012 revokes all and re-grants to authenticated only), so anon
-- never reaches a guard at all.
--
-- Everything else in the function is unchanged: identity pinning, the
-- last-admin rule, and the seat cap are reproduced verbatim because
-- `create or replace function` rewrites the whole body.

create or replace function public.guard_company_member_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_used  integer;
begin
  -- Staff, or any server-side context with no end-user JWT (service_role,
  -- migrations, seeds, cron). RLS is bypassed for service_role but triggers
  -- are not, so this check has to live here too. Anonymous PostgREST callers
  -- also have a null auth.uid(), but they hold no UPDATE grant on these
  -- tables, so they never reach a guard. The invite-employee Edge Function
  -- relies on this branch — see the header.
  if public.is_staff() or auth.uid() is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    -- Pin the identity columns. Changing either would let an admin reassign a
    -- row out of their own company or attach it to a different person.
    if new.company_id is distinct from old.company_id then
      raise exception 'company_id cannot be changed'
        using errcode = 'insufficient_privilege';
    end if;
    if new.profile_id is distinct from old.profile_id then
      raise exception 'profile_id cannot be changed'
        using errcode = 'insufficient_privilege';
    end if;
    -- Pin the role for anyone who is not already an admin of THIS company.
    -- has_company_perm(company_id, 'manage_employees') is what the UPDATE
    -- policy asks and it is true for a delegate, so the policy alone would
    -- let that delegate write role='company_admin' onto their own row.
    -- company_id is pinned two lines above, so old and new name the same
    -- company here; old is used to say plainly that the authority is over the
    -- company the row already belongs to.
    if new.role is distinct from old.role
       and not public.is_company_admin(old.company_id) then
      raise exception 'Only a company admin can change a member''s role'
        using errcode = 'insufficient_privilege', hint = 'role_change_forbidden';
    end if;
    -- A company admin cannot demote themselves and strand the company with no
    -- admin; and cannot demote the last remaining admin.
    if old.role = 'company_admin' and new.role <> 'company_admin'
       and (select count(*) from public.company_members
            where company_id = old.company_id
              and role = 'company_admin'
              and status = 'active') <= 1
    then
      raise exception 'A company must keep at least one admin'
        using errcode = 'check_violation';
    end if;
  end if;

  if tg_op = 'INSERT' then
    -- The insert mirror of the rule above: company_members_admin_insert's
    -- WITH CHECK is only the company id, so without this a delegate could
    -- skip the promotion and simply add an accomplice as an admin outright.
    -- Written as "anything that is not a plain employee" rather than
    -- "= 'company_admin'" so that a privileged role added to the CHECK
    -- constraint later is refused by default instead of slipping through.
    if new.role is distinct from 'employee'
       and not public.is_company_admin(new.company_id) then
      raise exception 'Only a company admin can add a member as an admin'
        using errcode = 'insufficient_privilege', hint = 'role_change_forbidden';
    end if;

    v_limit := public.company_seat_limit(new.company_id);
    v_used  := public.company_seats_used(new.company_id);
    -- A company with no current office assignment has no contracted seats;
    -- only Mars staff can add people in that case.
    if v_limit = 0 then
      raise exception 'This company has no contracted seats. Contact Mars Space.'
        using errcode = 'check_violation';
    end if;
    if v_used >= v_limit then
      raise exception 'All % contracted seats are in use. Contact Mars Space to add more.', v_limit
        using errcode = 'check_violation', hint = 'seat_limit_reached';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.guard_company_member_changes is
  'Column guards RLS cannot express, plus the seat cap. Pins company_id, profile_id and role: only a caller who is already a company_admin of that company may set or change a role, so a manage_employees delegate cannot promote itself past the admin who delegated to it. Keeps at least one active admin per company. Staff and JWT-less server contexts (service_role, migrations, seeds, cron, the invite-employee Edge Function) skip it by design.';

comment on policy company_members_admin_update on public.company_members is
  'manage_employees may edit a colleague''s permissions, job title and status. It may NOT change role: guard_company_member_changes() requires the caller to already be a company_admin of that company for that.';

comment on policy company_members_admin_insert on public.company_members is
  'manage_employees may add a member. Adding one as company_admin requires the caller to already be a company_admin of that company - enforced by guard_company_member_changes(), since WITH CHECK cannot see the caller''s own role.';
