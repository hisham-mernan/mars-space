-- Mars Space — 003 Inventory: branches, resources, add-ons, plans
--
-- Bilingual content uses parallel columns (name / name_ar) rather than a jsonb
-- i18n blob. Staff edit this inventory in the Supabase table editor, and Studio
-- renders text columns as plain editable fields while a jsonb blob would force
-- them to hand-write JSON.

create table public.branches (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,               -- 'jeddah', 'riyadh'
  code        text not null unique,               -- 'JED-01'
  name        text not null,
  name_ar     text,
  address     text,
  address_ar  text,
  latitude    numeric(9, 6),
  longitude   numeric(9, 6),
  time_zone   text not null default 'Asia/Riyadh',
  currency    text not null default 'SAR',
  status      text not null default 'active'
              check (status in ('active', 'coming_soon', 'closed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger branches_touch before update on public.branches
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- resources — every bookable or assignable thing on the floor
-- ---------------------------------------------------------------------------
create table public.resources (
  id            uuid primary key default gen_random_uuid(),
  branch_id     uuid not null references public.branches(id) on delete restrict,
  slug          text not null,
  name          text not null,
  name_ar       text,
  category      text not null
                check (category in ('meeting_room', 'community_hall', 'private_office',
                                    'focus_pod', 'hot_desk', 'dedicated_desk')),
  floor         text,
  location      text,
  location_ar   text,
  capacity      integer check (capacity > 0),
  size_sqm      numeric(6, 2),
  rate          numeric(10, 2) not null check (rate >= 0),
  -- Meeting rooms and pods bill hourly, the community hall by the day,
  -- private offices by the month. The unit drives the pricing function.
  rate_unit     text not null default 'hour'
                check (rate_unit in ('hour', 'day', 'month')),
  status        text not null default 'available'
                check (status in ('available', 'occupied', 'maintenance', 'retired')),
  -- Only resources flagged bookable appear in the booking flow. Private
  -- offices are assigned by contract, never self-booked.
  is_bookable   boolean not null default true,
  teaser        text,
  teaser_ar     text,
  features      text[] not null default '{}',
  features_ar   text[] not null default '{}',
  amenities     text[] not null default '{}',
  amenities_ar  text[] not null default '{}',
  hero_image    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint resources_slug_per_branch unique (branch_id, slug)
);

create index resources_category_idx on public.resources (category, status);
create index resources_bookable_idx  on public.resources (branch_id)
  where is_bookable and status = 'available';

create trigger resources_touch before update on public.resources
  for each row execute function public.touch_updated_at();

create table public.resource_photos (
  id          uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  url         text not null,
  alt         text,
  alt_ar      text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index resource_photos_resource_idx on public.resource_photos (resource_id, sort_order);

-- ---------------------------------------------------------------------------
-- addons — booking extras
-- ---------------------------------------------------------------------------
create table public.addons (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  name_ar       text,
  price         numeric(10, 2) not null default 0 check (price >= 0),
  -- Catering is priced on enquiry: price 0 + quote_only, so the booking total
  -- excludes it and the team follows up with a quote.
  is_quote_only boolean not null default false,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger addons_touch before update on public.addons
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- membership_plans
-- ---------------------------------------------------------------------------
create table public.membership_plans (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  name                  text not null,
  name_ar               text,
  rate                  numeric(10, 2) not null check (rate >= 0),
  billing_cycle         text not null default 'monthly'
                        check (billing_cycle in ('daily', 'monthly', 'annual')),
  -- The meeting-room allowance granted each period. Drives credit_entries.
  included_credit_hours numeric(5, 2) not null default 0 check (included_credit_hours >= 0),
  features              text[] not null default '{}',
  features_ar           text[] not null default '{}',
  is_active             boolean not null default true,
  sort_order            integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger membership_plans_touch before update on public.membership_plans
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- availability_rules — spec 8.4 requires these be configurable per resource,
-- not hard-coded. weekday is isodow (1=Mon .. 7=Sun); a null weekday row is
-- the default applied to any day without a specific row.
-- ---------------------------------------------------------------------------
create table public.availability_rules (
  id                   uuid primary key default gen_random_uuid(),
  resource_id          uuid not null references public.resources(id) on delete cascade,
  weekday              integer check (weekday between 1 and 7),
  opens_at             time not null default '07:00',
  closes_at            time not null default '23:00',
  slot_minutes         integer not null default 30 check (slot_minutes > 0),
  min_duration_minutes integer not null default 60,
  max_duration_minutes integer not null default 480,
  buffer_minutes       integer not null default 0,
  min_notice_minutes   integer not null default 30,
  max_advance_days     integer not null default 90,
  is_closed            boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint availability_rules_window check (opens_at < closes_at)
);

-- Two partial uniques rather than one: a plain unique(resource_id, weekday)
-- would let several NULL-weekday default rows coexist, since NULLs are
-- distinct in a unique index.
create unique index availability_rules_weekday_key on public.availability_rules (resource_id, weekday)
  where weekday is not null;
create unique index availability_rules_default_key on public.availability_rules (resource_id)
  where weekday is null;

create trigger availability_rules_touch before update on public.availability_rules
  for each row execute function public.touch_updated_at();

-- Blackout dates: maintenance, private hire, public holidays.
create table public.resource_blackouts (
  id          uuid primary key default gen_random_uuid(),
  resource_id uuid references public.resources(id) on delete cascade,
  branch_id   uuid references public.branches(id) on delete cascade,
  time_range  tstzrange not null,
  reason      text,
  reason_ar   text,
  created_at  timestamptz not null default now(),
  constraint resource_blackouts_scope check (num_nonnulls(resource_id, branch_id) = 1)
);

create index resource_blackouts_range_idx on public.resource_blackouts using gist (time_range);
