-- Mars Space — 016 Company directory, company profiles, and payment proofs
--
-- Three additions:
--   1. A company profile members can edit (logo, description, industry).
--   2. A directory of the other companies on the floor. Companies and their
--      offices are visible to any member; INDIVIDUAL PEOPLE are opt-in.
--   3. Bank-transfer payment with a receipt upload, since there is no gateway
--      yet. The payments table is left gateway-shaped so Moyasar drops in.

-- ---------------------------------------------------------------------------
-- 1. Company profile
-- ---------------------------------------------------------------------------
alter table public.companies
  add column if not exists description       text,
  add column if not exists description_ar    text,
  add column if not exists industry          text,
  add column if not exists website           text,
  add column if not exists logo_path         text,   -- Storage: company-logos/<company_id>/…
  -- A company can withdraw from the directory entirely. Default true: being
  -- listed is the point of a shared building, and the sensitive half is the
  -- people, which is opt-in below.
  add column if not exists is_listed         boolean not null default true;

-- ---------------------------------------------------------------------------
-- 2. Per-person directory consent
--
-- Opt-IN, defaulting to false. Publishing a member's name and job title to
-- every other tenant in the building is personal-data processing, and under
-- Saudi PDPL that wants consent rather than a default. A member switches this
-- on themselves; a company admin cannot switch it on for them, which is
-- enforced by the guard trigger further down.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists show_in_directory boolean not null default false,
  add column if not exists job_title         text,
  add column if not exists bio               text;

-- ---------------------------------------------------------------------------
-- 3. Payment proofs
--
-- Phase 1 is bank transfer: the member uploads a receipt, staff verify it and
-- the invoice settles. Modelled as a real payments row in 'pending' rather
-- than a separate table, so the existing sync_invoice_payment_state trigger
-- keeps working and only counts 'succeeded' rows toward the balance.
-- ---------------------------------------------------------------------------
alter table public.payments
  add column if not exists proof_path       text,   -- Storage: payment-proofs/<company_id>/…
  add column if not exists submitted_by     uuid references public.profiles(id) on delete set null,
  add column if not exists submitted_at     timestamptz,
  add column if not exists verified_by      uuid references public.profiles(id) on delete set null,
  add column if not exists verified_at      timestamptz,
  add column if not exists rejection_reason text;

create index if not exists payments_pending_idx on public.payments (status, submitted_at)
  where status = 'pending';
create index if not exists payments_submitted_by_idx on public.payments (submitted_by);
create index if not exists payments_verified_by_idx  on public.payments (verified_by);

-- Bank details members transfer to. One row per branch, edited in Studio.
create table if not exists public.bank_accounts (
  id           uuid primary key default gen_random_uuid(),
  branch_id    uuid references public.branches(id) on delete cascade,
  bank_name    text not null,
  bank_name_ar text,
  account_name text not null,
  iban         text not null,
  swift        text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists bank_accounts_branch_idx on public.bank_accounts (branch_id);

drop trigger if exists bank_accounts_touch on public.bank_accounts;
create trigger bank_accounts_touch before update on public.bank_accounts
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Submitting a transfer.
--
-- SECURITY DEFINER because members hold no INSERT on payments — letting them
-- write that table directly would let anyone mark their own invoice paid.
-- This records an unverified 'pending' row, which contributes nothing to
-- amount_paid until staff move it to 'succeeded'.
-- ---------------------------------------------------------------------------
create or replace function public.submit_payment_proof(
  p_invoice_id uuid,
  p_amount     numeric,
  p_proof_path text,
  p_note       text default null
)
returns public.payments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invoice public.invoices;
  v_payment public.payments;
begin
  select * into v_invoice from public.invoices where id = p_invoice_id;
  if not found then
    raise exception 'Invoice not found' using errcode = 'no_data_found';
  end if;

  if v_invoice.company_id is null
     or not (public.is_staff() or public.has_company_perm(v_invoice.company_id, 'view_invoices')) then
    raise exception 'You do not have permission to pay this invoice'
      using errcode = 'insufficient_privilege';
  end if;

  if v_invoice.status in ('paid', 'void') then
    raise exception 'This invoice is already %', v_invoice.status
      using errcode = 'check_violation';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero' using errcode = 'check_violation';
  end if;

  -- One outstanding submission at a time, so a member cannot flood staff with
  -- duplicate receipts for the same invoice.
  if exists (select 1 from public.payments
              where invoice_id = p_invoice_id and status = 'pending') then
    raise exception 'A transfer for this invoice is already awaiting verification'
      using errcode = 'check_violation', hint = 'already_pending';
  end if;

  insert into public.payments
    (invoice_id, amount, method, status, proof_path, submitted_by, submitted_at, note, paid_at)
  values
    (p_invoice_id, p_amount, 'bank_transfer', 'pending', p_proof_path,
     auth.uid(), now(), p_note, now())
  returning * into v_payment;

  -- Tell the member it is with the team, so the screen has something true to
  -- show while it waits.
  if auth.uid() is not null then
    insert into public.notifications (profile_id, kind, title, title_ar, body, body_ar, link)
    values (
      auth.uid(), 'invoice_issued',
      'Transfer submitted — ' || v_invoice.invoice_number,
      'تم إرسال إشعار التحويل — ' || v_invoice.invoice_number,
      'Mars Space will confirm receipt shortly.',
      'سيؤكد فريق مارس سبيس الاستلام قريباً.',
      '/invoices/' || v_invoice.id
    );
  end if;

  return v_payment;
end;
$$;

-- ---------------------------------------------------------------------------
-- Directory view.
--
-- security_invoker, like every other view here, so the companies policy below
-- decides what is visible rather than the view bypassing it.
--
-- headcount counts ACTIVE members and is computed by a definer function: it is
-- an aggregate, so it discloses no individual, and computing it inline would
-- be filtered by company_members RLS to the caller's own company and read 0
-- for everyone else.
-- ---------------------------------------------------------------------------
create or replace function public.company_headcount(p_company uuid)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer
  from public.company_members cm
  where cm.company_id = p_company and cm.status = 'active';
$$;

-- WHY THESE TWO VIEWS ARE security_invoker = off
--
-- Every other view in this schema is security_invoker, so the caller's own RLS
-- decides what they see. These two are deliberately the opposite, and the
-- reason matters.
--
-- The obvious alternative was a permissive SELECT policy on companies,
-- profiles and office_assignments so an invoker view could read them. But RLS
-- grants or denies a WHOLE ROW: allowing a member to see another tenant's
-- company row would hand them cr_number, vat_number and billing_email;
-- allowing them to see another member's profile would hand them that person's
-- email and phone; and allowing them to see another company's office
-- assignment would hand them its door_keycode.
--
-- So the disclosure is defined by the COLUMN LIST here instead. These views
-- run as the owner, select only what a directory is meant to publish, and
-- filter to companies that are listed and people who have opted in. Nothing
-- sensitive is in scope to leak, and the base tables keep their original
-- tenant-scoped policies untouched.
--
-- Consequence: never add a column to these views without asking whether every
-- member in the building should see it.
create or replace view public.company_directory
with (security_invoker = off) as
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
  and c.status = 'active';

-- Opted-in people only. No email, no phone: a member who wants to be
-- contactable can say so in their bio.
create or replace view public.directory_people
with (security_invoker = off) as
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
join public.company_members cm on cm.profile_id = p.id and cm.status = 'active'
join public.companies c on c.id = cm.company_id
where p.show_in_directory
  and p.status = 'active'
  and c.is_listed
  and c.status = 'active';

-- ---------------------------------------------------------------------------
-- RLS for the directory
--
-- Note what is NOT here: there is no permissive SELECT policy on companies,
-- profiles or office_assignments for other tenants. Those tables keep their
-- original company-scoped policies, and cross-tenant visibility happens only
-- through the two narrow definer views above.
-- ---------------------------------------------------------------------------
alter table public.bank_accounts enable row level security;

-- A company admin may edit their own company's profile. The guard trigger
-- below pins the columns they may touch.
drop policy if exists companies_admin_update on public.companies;
create policy companies_admin_update on public.companies
  for update to authenticated
  using (public.is_company_admin(id))
  with check (public.is_company_admin(id));

-- Bank details are needed by anyone about to pay an invoice.
drop policy if exists bank_accounts_read on public.bank_accounts;
create policy bank_accounts_read on public.bank_accounts
  for select to authenticated using (is_active);
drop policy if exists bank_accounts_staff on public.bank_accounts;
create policy bank_accounts_staff on public.bank_accounts
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

grant select on public.bank_accounts      to authenticated;
grant select on public.company_directory  to authenticated;
grant select on public.directory_people   to authenticated;

grant execute on function public.company_headcount(uuid)                    to authenticated;
grant execute on function public.submit_payment_proof(uuid, numeric, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Column guards
--
-- RLS grants or denies a whole row, so the columns a member may change are
-- pinned in triggers instead.
-- ---------------------------------------------------------------------------
create or replace function public.guard_company_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_staff() or auth.uid() is null then
    return new;
  end if;

  -- A company admin edits presentation only. Everything commercial or
  -- identifying stays with Mars Space: renaming the company, changing the CR
  -- or VAT number, or flipping status would let a tenant rewrite their own
  -- billing identity.
  if (new.name, new.name_ar, new.cr_number, new.vat_number, new.status,
      new.billing_email, new.primary_contact_id)
     is distinct from
     (old.name, old.name_ar, old.cr_number, old.vat_number, old.status,
      old.billing_email, old.primary_contact_id)
  then
    raise exception 'Only Mars Space staff can change company identity or billing details'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists companies_guard_profile on public.companies;
create trigger companies_guard_profile before update on public.companies
  for each row execute function public.guard_company_profile_changes();

-- Directory consent belongs to the person. The existing profiles_update_self
-- policy already limits updates to the caller's own row, so a company admin
-- cannot reach another member's profile at all; this makes the intent explicit
-- and survives any future widening of that policy.
create or replace function public.guard_directory_consent()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_staff() or auth.uid() is null then
    return new;
  end if;
  if new.show_in_directory is distinct from old.show_in_directory
     and new.id <> auth.uid() then
    raise exception 'Directory visibility can only be changed by the member themselves'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_directory on public.profiles;
create trigger profiles_guard_directory before update on public.profiles
  for each row execute function public.guard_directory_consent();

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from information_schema.tables
                 where table_schema = 'storage' and table_name = 'buckets') then
    raise notice 'storage schema absent — skipping buckets (expected outside Supabase)';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values
    -- Logos are shown in the directory to every member, and a signed URL per
    -- logo per render is wasteful for something a tenant is publishing on
    -- purpose. Still only writable by that company's admin.
    ('company-logos', 'company-logos', true, 2097152,
     array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
    -- Transfer receipts show bank details and are private.
    ('payment-proofs', 'payment-proofs', false, 10485760,
     array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
  on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
end
$$;

do $$
begin
  if not exists (select 1 from information_schema.tables
                 where table_schema = 'storage' and table_name = 'objects') then
    return;
  end if;

  execute $ddl$
    -- Logos: world-readable bucket, but only the owning company's admin writes,
    -- and only under their own company-id folder.
    drop policy if exists mars_company_logo_write on storage.objects;
    create policy mars_company_logo_write on storage.objects
      for all to authenticated
      using (
        bucket_id = 'company-logos'
        and public.is_company_admin(((storage.foldername(name))[1])::uuid)
      )
      with check (
        bucket_id = 'company-logos'
        and public.is_company_admin(((storage.foldername(name))[1])::uuid)
      );

    drop policy if exists mars_payment_proof_write on storage.objects;
    create policy mars_payment_proof_write on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'payment-proofs'
        and public.has_company_perm(((storage.foldername(name))[1])::uuid, 'view_invoices')
      );

    drop policy if exists mars_payment_proof_read on storage.objects;
    create policy mars_payment_proof_read on storage.objects
      for select to authenticated
      using (
        bucket_id = 'payment-proofs'
        and (
          (select public.is_staff())
          or (storage.foldername(name))[1] in (select public.current_company_ids()::text)
        )
      );
  $ddl$;
end
$$;
