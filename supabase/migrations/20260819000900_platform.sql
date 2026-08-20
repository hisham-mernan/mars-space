-- Mars Space — 009 Platform: notifications, push tokens, audit, leads

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind       text not null
             check (kind in ('booking_confirmed', 'booking_reminder', 'booking_cancelled',
                             'invoice_issued', 'invoice_overdue', 'repair_update',
                             'event_reminder', 'employee_invited', 'contract_expiring',
                             'announcement')),
  title      text not null,
  title_ar   text,
  body       text,
  body_ar    text,
  -- Deep link target in the app, e.g. '/bookings/<uuid>'.
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_unread_idx on public.notifications (profile_id, created_at desc)
  where read_at is null;

-- ---------------------------------------------------------------------------
-- device_push_tokens — one row per device. A profile may have several
-- (phone + tablet), and the same device may change hands, so the token is the
-- unique key rather than the profile.
-- ---------------------------------------------------------------------------
create table public.device_push_tokens (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  expo_token   text not null unique,
  platform     text check (platform in ('ios', 'android')),
  device_name  text,
  app_version  text,
  is_active    boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index device_push_tokens_profile_idx on public.device_push_tokens (profile_id)
  where is_active;

-- ---------------------------------------------------------------------------
-- audit_log — replaces the soft-delete flag the JSON store used for history.
-- Real foreign keys handle integrity; this handles "who changed what".
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid references public.profiles(id) on delete set null,
  action     text not null,
  table_name text not null,
  record_id  text,
  before     jsonb,
  after      jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_table_idx on public.audit_log (table_name, created_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc);

create or replace function public.record_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (actor_id, action, table_name, record_id, before, after)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    coalesce(new.id, old.id)::text,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return null;
end;
$$;

-- Audit the tables that carry money or authority.
create trigger audit_invoices        after insert or update or delete on public.invoices
  for each row execute function public.record_audit();
create trigger audit_payments        after insert or update or delete on public.payments
  for each row execute function public.record_audit();
create trigger audit_contracts       after insert or update or delete on public.contracts
  for each row execute function public.record_audit();
create trigger audit_company_members after insert or update or delete on public.company_members
  for each row execute function public.record_audit();
create trigger audit_credit_entries  after insert or update or delete on public.credit_entries
  for each row execute function public.record_audit();

-- ---------------------------------------------------------------------------
-- leads — the public contact and book-a-tour forms
-- ---------------------------------------------------------------------------
create table public.leads (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  email         extensions.citext not null,
  phone         text,
  company_name  text,
  topic         text,
  message       text,
  source        text not null default 'website',
  preferred_date date,
  preferred_time text,
  workspace_interest text,
  status        text not null default 'new'
                check (status in ('new', 'contacted', 'qualified',
                                  'converted', 'lost')),
  assigned_to   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index leads_status_idx on public.leads (status, created_at desc);

create trigger leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- faqs — public content, kept in the database so staff can edit it in Studio
-- ---------------------------------------------------------------------------
create table public.faqs (
  id          uuid primary key default gen_random_uuid(),
  -- Natural key so the seed can upsert instead of appending duplicates.
  slug        text not null unique,
  category    text not null default 'general',
  question    text not null,
  question_ar text,
  answer      text not null,
  answer_ar   text,
  is_featured boolean not null default false,
  sort_order  integer not null default 0,
  is_published boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index faqs_published_idx on public.faqs (category, sort_order) where is_published;

create trigger faqs_touch before update on public.faqs
  for each row execute function public.touch_updated_at();
