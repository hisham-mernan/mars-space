-- Mars Space — link a demo member, and tear the demo tenant down again
--
-- The demo company, contract, Office 17 assignment, credit allowance and one
-- community event are already seeded. What is missing is a PERSON, because an
-- auth account cannot be created from SQL safely — Supabase Auth owns password
-- hashing and the identities table, and hand-inserting into auth.users leaves
-- an account that cannot sign in.
--
-- So: create the account in the dashboard first, then run STEP 2 here.

-- ===========================================================================
-- STEP 1 — create the account (dashboard, not SQL)
--
--   Authentication → Users → Add user → "Send invitation"
--   Enter your email. Supabase emails an invite link.
--
-- Public signup is disabled, which is the point of invite-only membership —
-- this admin path is the only way an account comes into existence.
-- ===========================================================================

-- ===========================================================================
-- STEP 2 — attach that person to the demo company as its admin
--
-- Replace the email below with the one you invited, then run this whole block.
-- The profiles row already exists: the on_auth_user_created trigger mirrors
-- every new auth user into public.profiles automatically.
-- ===========================================================================
do $$
declare
  v_email  text := 'you@example.com';   -- <<< CHANGE THIS
  v_uid    uuid;
begin
  select id into v_uid from public.profiles where email = v_email;

  if v_uid is null then
    raise exception
      'No profile for %. Create the account in Authentication → Users first, then re-run.', v_email;
  end if;

  -- Active, so RLS treats them as a real member rather than a pending invite.
  update public.profiles set status = 'active' where id = v_uid;

  -- company_admin implicitly holds every permission, mirroring
  -- has_company_perm() in the policies — so all four flags are also set true
  -- to keep the row readable at a glance in the table editor.
  insert into public.company_members
    (company_id, profile_id, role, status, job_title,
     can_book_rooms, can_view_invoices, can_submit_repairs, can_manage_employees,
     joined_at)
  values
    ('d0000000-0000-4000-8000-000000000001', v_uid, 'company_admin', 'active',
     'Managing Director', true, true, true, true, now())
  on conflict (company_id, profile_id) do update
    set role = 'company_admin', status = 'active';

  raise notice 'Linked % to DEMO — TechCorp KSA as company_admin', v_email;
end
$$;

-- Confirm what the app will now show for that member.
select p.email,
       c.name                                   as company,
       cm.role,
       public.credit_balance(c.id) || ' hours'  as credits,
       (select r.name from public.my_offices o
          join public.resources r on r.id = o.resource_id
         where o.company_id = c.id and o.is_current limit 1) as office
from public.profiles p
join public.company_members cm on cm.profile_id = p.id
join public.companies c on c.id = cm.company_id
where c.id = 'd0000000-0000-4000-8000-000000000001';

-- ===========================================================================
-- OPTIONAL — make yourself Mars Space staff
--
-- Grants the ERP and read access across every tenant. Only for your own
-- account, and only once you actually want the back office.
-- ===========================================================================
-- update public.profiles set platform_role = 'erp_admin'
--  where email = 'you@example.com';

-- ===========================================================================
-- TEARDOWN — remove the demo tenant
--
-- Children first: the foreign keys are ON DELETE RESTRICT by design, so a
-- straight delete of the company is refused.
-- ===========================================================================
-- begin;
--   delete from public.credit_entries  where company_id = 'd0000000-0000-4000-8000-000000000001';
--   delete from public.invoices        where company_id = 'd0000000-0000-4000-8000-000000000001';
--   delete from public.bookings        where company_id = 'd0000000-0000-4000-8000-000000000001';
--   delete from public.repair_requests where company_id = 'd0000000-0000-4000-8000-000000000001';
--   delete from public.company_members where company_id = 'd0000000-0000-4000-8000-000000000001';
--   delete from public.office_assignments where company_id = 'd0000000-0000-4000-8000-000000000001';
--   delete from public.contracts      where company_id = 'd0000000-0000-4000-8000-000000000001';
--   delete from public.companies      where id         = 'd0000000-0000-4000-8000-000000000001';
--   delete from public.events         where id         = 'd0000000-0000-4000-8000-000000000004';
-- commit;
