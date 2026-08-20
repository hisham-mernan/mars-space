-- Mars Space — 012 Row Level Security
--
-- The mobile app talks to PostgREST directly with the anon key, so these
-- policies are not a hardening pass layered on top of a secure API. They ARE
-- the access control. Everything below is written to fail closed.
--
-- ENABLE, not FORCE. `force row level security` would apply policies to the
-- table owner as well, and every helper in migration 010 is SECURITY DEFINER
-- running as that owner. Forcing RLS would put those helpers back under the
-- policies they exist to escape, reintroducing the recursion on
-- company_members. With ENABLE alone the owner bypasses RLS, the helpers work,
-- and anon/authenticated - which is what the clients actually connect as - are
-- still fully governed.
--
-- service_role holds bypassrls and is used only in Next.js server code for the
-- ERP. It is never shipped to a browser or into the mobile bundle.

-- ---------------------------------------------------------------------------
-- One more helper: colleague visibility, kept here because it is only used by
-- the profiles policy. SECURITY DEFINER for the same recursion reason.
-- ---------------------------------------------------------------------------
create or replace function public.shares_company_with(p_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members mine
    join public.company_members theirs on theirs.company_id = mine.company_id
    where mine.profile_id = auth.uid()
      and mine.status = 'active'
      and theirs.profile_id = p_profile
      and theirs.status in ('invited', 'active')
  );
$$;

revoke execute on function public.shares_company_with(uuid) from public, anon;
grant execute on function public.shares_company_with(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere. A table added later without this line is wide open,
-- so keep the list exhaustive.
-- ---------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.companies           enable row level security;
alter table public.company_members     enable row level security;
alter table public.branches            enable row level security;
alter table public.resources           enable row level security;
alter table public.resource_photos     enable row level security;
alter table public.addons              enable row level security;
alter table public.membership_plans    enable row level security;
alter table public.availability_rules  enable row level security;
alter table public.resource_blackouts  enable row level security;
alter table public.contracts           enable row level security;
alter table public.office_assignments  enable row level security;
alter table public.bookings            enable row level security;
alter table public.booking_addons      enable row level security;
alter table public.credit_entries      enable row level security;
alter table public.invoices            enable row level security;
alter table public.invoice_line_items  enable row level security;
alter table public.payments            enable row level security;
alter table public.repair_requests     enable row level security;
alter table public.repair_attachments  enable row level security;
alter table public.repair_updates      enable row level security;
alter table public.events              enable row level security;
alter table public.event_registrations enable row level security;
alter table public.support_tickets     enable row level security;
alter table public.support_messages    enable row level security;
alter table public.notifications       enable row level security;
alter table public.device_push_tokens  enable row level security;
alter table public.audit_log           enable row level security;
alter table public.leads               enable row level security;
alter table public.faqs                enable row level security;

-- ---------------------------------------------------------------------------
-- Table privileges. Supabase's default privileges grant broadly to anon and
-- authenticated; strip that back and re-grant only what each role needs.
-- Defence in depth: RLS filters rows, grants gate the verb.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

-- Public catalogue: readable by everyone, writable by no one but staff.
grant select on public.branches, public.resources, public.resource_photos,
                public.addons, public.membership_plans, public.availability_rules,
                public.faqs, public.events
  to anon, authenticated;

-- Member-readable operational data.
grant select on public.profiles, public.companies, public.company_members,
                public.contracts, public.office_assignments,
                public.bookings, public.booking_addons, public.credit_entries,
                public.invoices, public.invoice_line_items, public.payments,
                public.repair_requests, public.repair_attachments, public.repair_updates,
                public.event_registrations, public.support_tickets, public.support_messages,
                public.notifications, public.device_push_tokens
  to authenticated;

-- Member-writable surfaces. Bookings, credits and invoices are deliberately
-- absent: those are written only by create_booking/cancel_booking.
grant insert, update on public.repair_requests        to authenticated;
grant insert         on public.repair_attachments     to authenticated;
grant insert, update on public.company_members        to authenticated;
grant insert, update, delete on public.event_registrations to authenticated;
grant insert, update on public.support_tickets        to authenticated;
grant insert         on public.support_messages       to authenticated;
grant update         on public.profiles               to authenticated;
grant update         on public.notifications          to authenticated;
grant insert, update, delete on public.device_push_tokens to authenticated;

-- The public contact / book-a-tour form.
grant insert on public.leads to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public catalogue policies
-- ---------------------------------------------------------------------------
create policy branches_read on public.branches
  for select using (true);
create policy branches_staff_write on public.branches
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

create policy resources_read on public.resources
  for select using (status <> 'retired' or (select public.is_staff()));
create policy resources_staff_write on public.resources
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

create policy resource_photos_read on public.resource_photos
  for select using (true);
create policy resource_photos_staff_write on public.resource_photos
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

create policy addons_read on public.addons
  for select using (is_active or (select public.is_staff()));
create policy addons_staff_write on public.addons
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

create policy membership_plans_read on public.membership_plans
  for select using (is_active or (select public.is_staff()));
create policy membership_plans_staff_write on public.membership_plans
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

create policy availability_rules_read on public.availability_rules
  for select using (true);
create policy availability_rules_staff_write on public.availability_rules
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

create policy resource_blackouts_staff on public.resource_blackouts
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

create policy faqs_read on public.faqs
  for select using (is_published or (select public.is_staff()));
create policy faqs_staff_write on public.faqs
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy profiles_read_self_and_colleagues on public.profiles
  for select using (
    id = (select auth.uid())
    or public.shares_company_with(id)
    or (select public.is_staff())
  );

-- A member may edit their own row. The WITH CHECK re-asserts id = auth.uid()
-- so the update cannot be redirected at another row.
create policy profiles_update_self on public.profiles
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy profiles_staff_write on public.profiles
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

-- Privilege escalation guard. RLS alone cannot pin a single column, so a
-- trigger enforces that only staff may change platform_role or status.
-- Without this, `update profiles set platform_role='erp_admin' where id=me`
-- passes the policy above and hands the caller the whole ERP.
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Staff, or any server-side context with no end-user JWT (service_role,
  -- migrations, seeds, cron). RLS is bypassed for service_role but triggers
  -- are not, so this check has to live here too. Anonymous PostgREST callers
  -- also have a null auth.uid(), but they hold no UPDATE grant on these
  -- tables, so they never reach a guard.
  if public.is_staff() or auth.uid() is null then
    return new;
  end if;
  if new.platform_role is distinct from old.platform_role then
    raise exception 'platform_role cannot be changed'
      using errcode = 'insufficient_privilege';
  end if;
  if new.status is distinct from old.status then
    raise exception 'status cannot be changed'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_privileges before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------
create policy companies_read_own on public.companies
  for select using (
    id in (select public.current_company_ids()) or (select public.is_staff())
  );
create policy companies_staff_write on public.companies
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- company_members — employee management
--
-- Every predicate routes through a SECURITY DEFINER helper. Referencing
-- company_members directly here is what causes "infinite recursion detected
-- in policy for relation company_members".
-- ---------------------------------------------------------------------------
create policy company_members_read on public.company_members
  for select using (
    profile_id = (select auth.uid())
    or public.is_company_member(company_id)
    or (select public.is_staff())
  );

create policy company_members_admin_insert on public.company_members
  for insert with check (
    public.has_company_perm(company_id, 'manage_employees')
  );

create policy company_members_admin_update on public.company_members
  for update using (
    public.has_company_perm(company_id, 'manage_employees')
  ) with check (
    -- Re-checked against the NEW row: without this a company admin could move
    -- a member into a company they do not administer.
    public.has_company_perm(company_id, 'manage_employees')
  );

create policy company_members_staff_write on public.company_members
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

-- Column-level guards that RLS cannot express, plus the seat cap.
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
  -- tables, so they never reach a guard.
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

create trigger company_members_guard before insert or update on public.company_members
  for each row execute function public.guard_company_member_changes();

-- ---------------------------------------------------------------------------
-- contracts and office assignments — read-only to members
-- ---------------------------------------------------------------------------
create policy contracts_read_own on public.contracts
  for select using (
    company_id in (select public.current_company_ids()) or (select public.is_staff())
  );
create policy contracts_staff_write on public.contracts
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

create policy office_assignments_read_own on public.office_assignments
  for select using (
    company_id in (select public.current_company_ids()) or (select public.is_staff())
  );
create policy office_assignments_staff_write on public.office_assignments
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- bookings — reads via RLS, writes only through the RPCs
-- ---------------------------------------------------------------------------
create policy bookings_read_own on public.bookings
  for select using (
    (company_id is not null and company_id in (select public.current_company_ids()))
    or booked_by = (select auth.uid())
    or (select public.is_staff())
  );
create policy bookings_staff_write on public.bookings
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

create policy booking_addons_read on public.booking_addons
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and ((b.company_id is not null
              and b.company_id in (select public.current_company_ids()))
             or b.booked_by = (select auth.uid()))
    )
    or (select public.is_staff())
  );
create policy booking_addons_staff_write on public.booking_addons
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- credit_entries — READ ONLY for members, always.
--
-- No insert/update/delete policy exists for authenticated, and no INSERT grant
-- was issued above. Credit is written exclusively by create_booking,
-- cancel_booking and allocate_monthly_credits, all SECURITY DEFINER. Any
-- member-writable path here is a member granting themselves free hours.
-- ---------------------------------------------------------------------------
create policy credit_entries_read_own on public.credit_entries
  for select using (
    company_id in (select public.current_company_ids()) or (select public.is_staff())
  );
create policy credit_entries_staff_write on public.credit_entries
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- invoices — gated on the view_invoices permission, not just membership
-- ---------------------------------------------------------------------------
create policy invoices_read_permitted on public.invoices
  for select using (
    public.has_company_perm(company_id, 'view_invoices') or (select public.is_staff())
  );
create policy invoices_staff_write on public.invoices
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

create policy invoice_line_items_read on public.invoice_line_items
  for select using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_id
        and public.has_company_perm(i.company_id, 'view_invoices')
    )
    or (select public.is_staff())
  );
create policy invoice_line_items_staff_write on public.invoice_line_items
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

create policy payments_read on public.payments
  for select using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_id
        and public.has_company_perm(i.company_id, 'view_invoices')
    )
    or (select public.is_staff())
  );
create policy payments_staff_write on public.payments
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- repair requests
-- ---------------------------------------------------------------------------
create policy repair_requests_read_own on public.repair_requests
  for select using (
    company_id in (select public.current_company_ids()) or (select public.is_staff())
  );

create policy repair_requests_insert on public.repair_requests
  for insert with check (
    public.has_company_perm(company_id, 'submit_repairs')
    and reported_by = (select auth.uid())
  );

-- Members may edit their own open request or cancel it; they may not move it
-- to 'resolved' (guarded by the trigger below).
create policy repair_requests_update_own on public.repair_requests
  for update using (
    public.has_company_perm(company_id, 'submit_repairs')
    and status in ('submitted', 'acknowledged')
  ) with check (
    public.has_company_perm(company_id, 'submit_repairs')
  );

create policy repair_requests_staff_write on public.repair_requests
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

create or replace function public.guard_repair_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Staff, or any server-side context with no end-user JWT (service_role,
  -- migrations, seeds, cron). RLS is bypassed for service_role but triggers
  -- are not, so this check has to live here too. Anonymous PostgREST callers
  -- also have a null auth.uid(), but they hold no UPDATE grant on these
  -- tables, so they never reach a guard.
  if public.is_staff() or auth.uid() is null then
    return new;
  end if;
  if new.status is distinct from old.status
     and new.status not in ('cancelled', 'submitted', 'acknowledged')
  then
    raise exception 'Only Mars Space staff can set a request to %', new.status
      using errcode = 'insufficient_privilege';
  end if;
  if new.assigned_to is distinct from old.assigned_to then
    raise exception 'assigned_to is managed by Mars Space staff'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger repair_requests_guard_status before update on public.repair_requests
  for each row execute function public.guard_repair_status();

create policy repair_attachments_read on public.repair_attachments
  for select using (
    exists (
      select 1 from public.repair_requests r
      where r.id = repair_id
        and r.company_id in (select public.current_company_ids())
    )
    or (select public.is_staff())
  );
create policy repair_attachments_insert on public.repair_attachments
  for insert with check (
    exists (
      select 1 from public.repair_requests r
      where r.id = repair_id
        and public.has_company_perm(r.company_id, 'submit_repairs')
    )
  );
create policy repair_attachments_staff_write on public.repair_attachments
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

create policy repair_updates_read on public.repair_updates
  for select using (
    (is_visible_to_member and exists (
      select 1 from public.repair_requests r
      where r.id = repair_id
        and r.company_id in (select public.current_company_ids())
    ))
    or (select public.is_staff())
  );
create policy repair_updates_staff_write on public.repair_updates
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- community events
-- ---------------------------------------------------------------------------
create policy events_read on public.events
  for select using (
    (select public.is_staff())
    or (status <> 'draft' and (
          is_public
          or (is_members_only and (select auth.uid()) is not null)
       ))
  );
create policy events_staff_write on public.events
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

create policy event_registrations_read_own on public.event_registrations
  for select using (profile_id = (select auth.uid()) or (select public.is_staff()));
create policy event_registrations_insert_self on public.event_registrations
  for insert with check (profile_id = (select auth.uid()));
create policy event_registrations_update_own on public.event_registrations
  for update using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy event_registrations_delete_own on public.event_registrations
  for delete using (profile_id = (select auth.uid()));
create policy event_registrations_staff_write on public.event_registrations
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- support
-- ---------------------------------------------------------------------------
create policy support_tickets_read_own on public.support_tickets
  for select using (profile_id = (select auth.uid()) or (select public.is_staff()));
create policy support_tickets_insert_self on public.support_tickets
  for insert with check (profile_id = (select auth.uid()));
create policy support_tickets_update_own on public.support_tickets
  for update using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy support_tickets_staff_write on public.support_tickets
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

create policy support_messages_read on public.support_messages
  for select using (
    (not is_internal and exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and t.profile_id = (select auth.uid())
    ))
    or (select public.is_staff())
  );
create policy support_messages_insert on public.support_messages
  for insert with check (
    author_id = (select auth.uid())
    and not is_internal
    and exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and t.profile_id = (select auth.uid())
    )
  );
create policy support_messages_staff_write on public.support_messages
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- notifications and push tokens — strictly personal
-- ---------------------------------------------------------------------------
create policy notifications_read_own on public.notifications
  for select using (profile_id = (select auth.uid()));
-- Update is for marking read. The trigger below stops it being used to rewrite
-- the notification body.
create policy notifications_update_own on public.notifications
  for update using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy notifications_staff_write on public.notifications
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

create or replace function public.guard_notification_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Staff, or any server-side context with no end-user JWT (service_role,
  -- migrations, seeds, cron). RLS is bypassed for service_role but triggers
  -- are not, so this check has to live here too. Anonymous PostgREST callers
  -- also have a null auth.uid(), but they hold no UPDATE grant on these
  -- tables, so they never reach a guard.
  if public.is_staff() or auth.uid() is null then
    return new;
  end if;
  if (new.kind, new.title, new.body, new.link, new.profile_id)
     is distinct from (old.kind, old.title, old.body, old.link, old.profile_id)
  then
    raise exception 'Only read_at can be changed'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger notifications_guard before update on public.notifications
  for each row execute function public.guard_notification_update();

create policy device_push_tokens_own on public.device_push_tokens
  for all using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy device_push_tokens_staff_read on public.device_push_tokens
  for select using ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- audit_log — staff read only. No one writes directly; the triggers do.
-- ---------------------------------------------------------------------------
create policy audit_log_staff_read on public.audit_log
  for select using ((select public.is_staff()));

grant select on public.audit_log to authenticated;

-- ---------------------------------------------------------------------------
-- leads — write-only for the public. Anonymous visitors submit the contact
-- form but must never be able to read the pipeline back out.
-- ---------------------------------------------------------------------------
create policy leads_public_insert on public.leads
  for insert with check (true);
create policy leads_staff_read on public.leads
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- FUNCTION EXECUTE PRIVILEGES — fail closed, then grant back the API surface.
--
-- Postgres grants EXECUTE on every new function to PUBLIC by default, and
-- PostgREST exposes anything the anon role can execute at POST /rpc/<name>.
-- Combined with SECURITY DEFINER that is a direct bypass of everything above:
-- allocate_monthly_credits() writes credit_entries as the owner and takes a
-- caller-supplied timestamp, so left at the default it let anyone holding the
-- anon key mint unlimited meeting-room hours by looping over months. Likewise
-- credit_balance() reads any company's allowance by uuid with no membership
-- check.
--
-- Revoking the whole schema and granting back a short list is deliberate: an
-- enumerated revoke list silently misses whatever is added next, and the
-- failure mode is an exposed RPC rather than a broken one.
--
-- Trigger functions are covered by the revoke and keep working: Postgres does
-- not check EXECUTE on a trigger function against the triggering role.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

-- service_role is granted explicitly rather than via PUBLIC, so it survives
-- the revoke on Supabase. Restated here so a plain PostgreSQL (CI, local
-- throwaway cluster) behaves identically.
grant execute on all functions in schema public to service_role;

-- The client-callable surface. Everything omitted here is internal and
-- reachable only from SECURITY DEFINER callers or triggers.

-- Quoting and booking. Guest checkout is supported (spec 8.1), so anon needs
-- both; price_booking authorizes p_company_id internally, create_booking
-- authorizes via has_company_perm.
grant execute on function public.price_booking(uuid, tstzrange, uuid, jsonb) to authenticated, anon;
grant execute on function public.create_booking(
  uuid, tstzrange, uuid, jsonb, text, text, text, text, boolean, text
) to authenticated, anon;
grant execute on function public.cancel_booking(uuid, text) to authenticated;

-- Identity predicates. These only ever describe the caller.
grant execute on function public.is_staff()     to authenticated, anon;
grant execute on function public.is_erp_admin() to authenticated, anon;

-- Membership and permission lookups, used by the clients to decide what to show.
grant execute on function public.current_company_ids()        to authenticated;
grant execute on function public.is_company_member(uuid)      to authenticated;
grant execute on function public.is_company_admin(uuid)       to authenticated;
grant execute on function public.has_company_perm(uuid, text) to authenticated;
grant execute on function public.shares_company_with(uuid)    to authenticated;
grant execute on function public.company_seat_limit(uuid)     to authenticated;
grant execute on function public.company_seats_used(uuid)     to authenticated;

-- Pure date helpers, safe to expose and useful for client-side display.
grant execute on function public.credit_period(timestamptz)  to authenticated, anon;
grant execute on function public.is_ksa_weekend(timestamptz) to authenticated, anon;

-- Deliberately NOT granted to any client role:
--   allocate_monthly_credits()  writes the credit ledger        (cron only)
--   credit_balance()            reads any company's allowance   (definer callers only)
--   expire_stale_holds()        deletes rows                    (cron only)
--   next_*_reference()          burns sequences                 (defaults only)
--   every trigger and guard function
