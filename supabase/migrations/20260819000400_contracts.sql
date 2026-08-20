-- Mars Space — 004 Contracts and office occupancy

create table public.contracts (
  id             uuid primary key default gen_random_uuid(),
  reference      text not null unique default public.next_contract_reference(),
  company_id     uuid not null references public.companies(id) on delete restrict,
  plan_id        uuid references public.membership_plans(id) on delete restrict,
  branch_id      uuid not null references public.branches(id) on delete restrict,
  starts_on      date not null,
  ends_on        date,
  monthly_rate   numeric(10, 2) not null check (monthly_rate >= 0),
  -- Meeting-room allowance for this contract. Defaults from the plan on insert
  -- (see the trigger below) but stays overridable: negotiated contracts often
  -- carry a different allowance from the published plan.
  credit_hours_per_period numeric(5, 2) not null default 0,
  notice_days    integer not null default 30,
  auto_renew     boolean not null default true,
  status         text not null default 'draft'
                 check (status in ('draft', 'sent', 'signed', 'active',
                                   'expiring', 'terminated', 'expired')),
  signed_at      timestamptz,
  signed_by      uuid references public.profiles(id) on delete set null,
  signing_token  text unique,
  document_path  text,                     -- Supabase Storage: contracts/<id>.pdf
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint contracts_term check (ends_on is null or ends_on > starts_on)
);

create index contracts_company_idx on public.contracts (company_id, status);
create index contracts_active_idx  on public.contracts (status) where status = 'active';

create trigger contracts_touch before update on public.contracts
  for each row execute function public.touch_updated_at();

-- Inherit the plan's allowance unless the contract sets its own.
create or replace function public.contracts_default_credit_hours()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.credit_hours_per_period = 0 and new.plan_id is not null then
    select included_credit_hours into new.credit_hours_per_period
    from public.membership_plans where id = new.plan_id;
  end if;
  return new;
end;
$$;

create trigger contracts_default_credits before insert on public.contracts
  for each row execute function public.contracts_default_credit_hours();

-- ---------------------------------------------------------------------------
-- office_assignments — which company occupies which private office, and when.
--
-- This is what the mobile app's "My Office" screen reads. desk_count is the
-- contracted seat count and caps how many employees a company admin may invite.
--
-- The exclusion constraint prevents assigning one office to two companies over
-- overlapping terms — the same class of bug as double-booking a meeting room,
-- and just as easy to hit when staff work directly in the table editor.
-- ---------------------------------------------------------------------------
create table public.office_assignments (
  id           uuid primary key default gen_random_uuid(),
  resource_id  uuid not null references public.resources(id) on delete restrict,
  company_id   uuid not null references public.companies(id) on delete restrict,
  contract_id  uuid references public.contracts(id) on delete set null,
  term         daterange not null,
  desk_count   integer not null default 1 check (desk_count > 0),
  door_keycode text,                       -- shown in-app as the access credential
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  exclude using gist (
    resource_id with =,
    term        with &&
  )
);

create index office_assignments_company_idx on public.office_assignments (company_id);
create index office_assignments_current_idx on public.office_assignments using gist (term);

create trigger office_assignments_touch before update on public.office_assignments
  for each row execute function public.touch_updated_at();

comment on column public.office_assignments.desk_count is
  'Contracted seats. The employee-invite flow checks the active roster against this.';
