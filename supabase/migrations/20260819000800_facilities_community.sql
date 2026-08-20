-- Mars Space — 008 Facilities, community schedule, support

-- ---------------------------------------------------------------------------
-- repair_requests — the mobile app's maintenance flow. Scoped to a company
-- rather than a person so a colleague can follow up when the reporter is away.
-- ---------------------------------------------------------------------------
create table public.repair_requests (
  id          uuid primary key default gen_random_uuid(),
  reference   text not null unique default public.next_repair_reference(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  -- Nullable + SET NULL, not NOT NULL + RESTRICT. profiles.id cascades from
  -- auth.users, so a RESTRICT here made deleting a member impossible: the
  -- cascade hit this constraint and aborted. That blocks ordinary account
  -- cleanup and any PDPL/GDPR erasure request outright. Nulling the reporter
  -- keeps the maintenance history (which the facilities team needs) while
  -- removing the personal link, which is what erasure means.
  reported_by uuid references public.profiles(id) on delete set null,
  branch_id   uuid not null references public.branches(id) on delete restrict,
  -- Which office or room the fault is in. Nullable: faults in shared areas
  -- (the café, a corridor, the prayer room) belong to no single resource.
  resource_id uuid references public.resources(id) on delete set null,
  location_note text,
  category    text not null
              check (category in ('hvac', 'electrical', 'plumbing', 'furniture',
                                  'it_network', 'cleaning', 'access_security', 'other')),
  priority    text not null default 'normal'
              check (priority in ('low', 'normal', 'high', 'urgent')),
  status      text not null default 'submitted'
              check (status in ('submitted', 'acknowledged', 'in_progress',
                                'on_hold', 'resolved', 'closed', 'cancelled')),
  title       text not null,
  description text,
  assigned_to uuid references public.profiles(id) on delete set null,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  closed_at   timestamptz,
  resolution_note text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index repair_requests_company_idx on public.repair_requests (company_id, created_at desc);
create index repair_requests_open_idx on public.repair_requests (status, priority)
  where status in ('submitted', 'acknowledged', 'in_progress', 'on_hold');
create index repair_requests_assignee_idx on public.repair_requests (assigned_to)
  where assigned_to is not null;

create trigger repair_requests_touch before update on public.repair_requests
  for each row execute function public.touch_updated_at();

-- Photos of the fault, uploaded from the app's camera into Supabase Storage.
create table public.repair_attachments (
  id          uuid primary key default gen_random_uuid(),
  repair_id   uuid not null references public.repair_requests(id) on delete cascade,
  storage_path text not null,              -- bucket: repair-attachments
  mime_type   text,
  size_bytes  integer,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index repair_attachments_repair_idx on public.repair_attachments (repair_id);

-- Status history, so a member can see progress without staff writing an essay.
create table public.repair_updates (
  id         uuid primary key default gen_random_uuid(),
  repair_id  uuid not null references public.repair_requests(id) on delete cascade,
  from_status text,
  to_status  text not null,
  note       text,
  author_id  uuid references public.profiles(id) on delete set null,
  is_visible_to_member boolean not null default true,
  created_at timestamptz not null default now()
);

create index repair_updates_repair_idx on public.repair_updates (repair_id, created_at);

create or replace function public.log_repair_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.repair_updates (repair_id, from_status, to_status, author_id)
    values (new.id, old.status, new.status, auth.uid());
  elsif tg_op = 'INSERT' then
    insert into public.repair_updates (repair_id, from_status, to_status, author_id)
    values (new.id, null, new.status, new.reported_by);
  end if;
  return null;
end;
$$;

create trigger repair_requests_log_status
  after insert or update on public.repair_requests
  for each row execute function public.log_repair_status_change();

-- ---------------------------------------------------------------------------
-- events — the community space schedule
-- ---------------------------------------------------------------------------
create table public.events (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique,
  branch_id    uuid not null references public.branches(id) on delete restrict,
  resource_id  uuid references public.resources(id) on delete set null,
  title        text not null,
  title_ar     text,
  description  text,
  description_ar text,
  time_range   tstzrange not null,
  speakers     text,
  speakers_ar  text,
  capacity     integer check (capacity > 0),
  hero_image   text,
  status       text not null default 'scheduled'
               check (status in ('draft', 'scheduled', 'in_progress',
                                 'completed', 'cancelled')),
  -- Public events show on the marketing site; members-only events appear in
  -- the app but not to anonymous visitors.
  is_public         boolean not null default true,
  is_members_only   boolean not null default false,
  requires_registration boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint events_time_valid check (lower(time_range) < upper(time_range))
);

create index events_upcoming_idx on public.events (lower(time_range))
  where status = 'scheduled';
create index events_range_idx on public.events using gist (time_range);

create trigger events_touch before update on public.events
  for each row execute function public.touch_updated_at();

create table public.event_registrations (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  profile_id  uuid references public.profiles(id) on delete cascade,
  guest_name  text,
  guest_email extensions.citext,
  status      text not null default 'registered'
              check (status in ('registered', 'waitlisted', 'attended', 'cancelled')),
  registered_at timestamptz not null default now(),
  constraint event_registrations_has_person check (
    profile_id is not null or guest_email is not null
  )
);

create unique index event_registrations_unique_member
  on public.event_registrations (event_id, profile_id)
  where profile_id is not null;
create unique index event_registrations_unique_guest
  on public.event_registrations (event_id, guest_email)
  where profile_id is null;

-- ---------------------------------------------------------------------------
-- Registration capacity and status.
--
-- events.capacity was recorded but never enforced, so a member could register
-- for a sold-out event indefinitely. The RLS insert policy also only checks
-- that profile_id is the caller, which left `status` free — a member could
-- self-register straight to 'attended' and inflate the attendance figures the
-- community reporting relies on.
--
-- Counting inside a trigger races with itself, so the event row is locked
-- first: two people taking the last seat serialize, and the second is either
-- waitlisted or rejected.
-- ---------------------------------------------------------------------------
create or replace function public.guard_event_registration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_taken integer;
begin
  -- Staff and server-side callers set whatever they need.
  if public.is_staff() or auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' and new.status not in ('registered', 'waitlisted') then
    raise exception 'Registration status is set by Mars Space staff'
      using errcode = 'insufficient_privilege';
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status
     and new.status <> 'cancelled' then
    raise exception 'Only Mars Space staff can set a registration to %', new.status
      using errcode = 'insufficient_privilege';
  end if;

  if tg_op = 'INSERT' then
    select * into v_event from public.events where id = new.event_id for update;
    if not found then
      raise exception 'Event not found' using errcode = 'no_data_found';
    end if;

    if v_event.status <> 'scheduled' then
      raise exception 'This event is not open for registration'
        using errcode = 'check_violation';
    end if;

    if v_event.capacity is not null then
      select count(*) into v_taken
        from public.event_registrations
       where event_id = new.event_id
         and status in ('registered', 'attended');

      if v_taken >= v_event.capacity then
        -- Full: accept the person onto the waitlist rather than rejecting
        -- them outright, which is what the capacity number is for.
        new.status := 'waitlisted';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger event_registrations_guard
  before insert or update on public.event_registrations
  for each row execute function public.guard_event_registration();

-- ---------------------------------------------------------------------------
-- support_tickets — keeps the existing /member/support flow working
-- ---------------------------------------------------------------------------
create table public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  reference   text not null unique default public.next_ticket_reference(),
  company_id  uuid references public.companies(id) on delete set null,
  -- Same reasoning as repair_requests.reported_by: NOT NULL + RESTRICT here
  -- made member deletion impossible. An orphaned ticket keeps its history and
  -- becomes staff-only, because every member policy keys off profile_id.
  profile_id  uuid references public.profiles(id) on delete set null,
  category    text not null default 'other'
              check (category in ('facilities', 'it_network', 'billing',
                                  'membership', 'booking', 'other')),
  priority    text not null default 'normal'
              check (priority in ('low', 'normal', 'high', 'urgent')),
  status      text not null default 'open'
              check (status in ('open', 'in_progress', 'waiting_on_member',
                                'resolved', 'closed')),
  subject     text not null,
  description text,
  assigned_to uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index support_tickets_profile_idx on public.support_tickets (profile_id, created_at desc);
create index support_tickets_open_idx on public.support_tickets (status)
  where status in ('open', 'in_progress', 'waiting_on_member');

create trigger support_tickets_touch before update on public.support_tickets
  for each row execute function public.touch_updated_at();

create table public.support_messages (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references public.support_tickets(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete set null,
  body       text not null,
  is_internal boolean not null default false,   -- staff-only notes
  created_at timestamptz not null default now()
);

create index support_messages_ticket_idx on public.support_messages (ticket_id, created_at);
