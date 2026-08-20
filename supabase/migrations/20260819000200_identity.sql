-- Mars Space — 002 Identity and organizations
--
-- Two separate authority systems, deliberately not merged:
--   profiles.platform_role  — Mars staff vs member. Only Mars can change it.
--   company_members.role + permission flags — member-side authority, which a
--                            company admin may change for their own people.
-- Keeping them apart is what stops a company admin escalating to Mars staff.

-- ---------------------------------------------------------------------------
-- profiles — 1:1 with auth.users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  email              extensions.citext not null unique,
  full_name          text,
  full_name_ar       text,
  phone              text,
  avatar_url         text,
  preferred_language text not null default 'ar' check (preferred_language in ('ar', 'en')),
  platform_role      text not null default 'member'
                     check (platform_role in ('member', 'staff', 'erp_admin')),
  status             text not null default 'active'
                     check (status in ('invited', 'active', 'suspended')),
  last_seen_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index profiles_platform_role_idx on public.profiles (platform_role)
  where platform_role <> 'member';

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

comment on column public.profiles.platform_role is
  'Mars-side authority. NEVER writable by members - see the RLS WITH CHECK in the policies migration.';

-- Mirror new auth.users rows into profiles. Members are created by an admin
-- (invite-only: public signup is disabled in the Supabase dashboard), so this
-- fires on admin invite rather than on self-registration.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'phone',
    case when new.email_confirmed_at is null then 'invited' else 'active' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- companies — the billing and tenancy unit. Invoices, contracts, offices,
-- credits and repairs all hang off a company, not off an individual, because
-- an employee leaving must not take the invoice history with them.
-- ---------------------------------------------------------------------------
create table public.companies (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  name_ar            text,
  cr_number          text,                       -- Commercial Registration
  vat_number         text,                       -- needed on ZATCA invoices later
  primary_contact_id uuid references public.profiles(id) on delete set null,
  billing_email      extensions.citext,
  phone              text,
  status             text not null default 'active'
                     check (status in ('prospect', 'active', 'suspended', 'churned')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create unique index companies_cr_number_key on public.companies (cr_number)
  where cr_number is not null;

create trigger companies_touch before update on public.companies
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- company_members — employees, with per-person permissions
-- ---------------------------------------------------------------------------
create table public.company_members (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  profile_id          uuid not null references public.profiles(id) on delete cascade,
  role                text not null default 'employee'
                      check (role in ('company_admin', 'employee')),
  status              text not null default 'invited'
                      check (status in ('invited', 'active', 'suspended', 'removed')),
  job_title           text,
  -- Permission flags. All default false: an invited employee can see the
  -- company's office and the community schedule, nothing more, until the
  -- company admin grants more. company_admin implies all four (see has_company_perm).
  can_book_rooms      boolean not null default false,
  can_view_invoices   boolean not null default false,
  can_submit_repairs  boolean not null default false,
  can_manage_employees boolean not null default false,
  invited_by          uuid references public.profiles(id) on delete set null,
  invited_at          timestamptz not null default now(),
  joined_at           timestamptz,
  removed_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint company_members_unique unique (company_id, profile_id)
);

create index company_members_profile_idx on public.company_members (profile_id)
  where status = 'active';
create index company_members_company_idx on public.company_members (company_id);

create trigger company_members_touch before update on public.company_members
  for each row execute function public.touch_updated_at();

comment on table public.company_members is
  'Employee roster. A profile may belong to more than one company; RLS scopes every read to the caller''s active memberships.';
