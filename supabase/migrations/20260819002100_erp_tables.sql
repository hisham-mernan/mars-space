-- Mars Space — 021 ERP back-office tables: contract templates, contract
-- versions, inventory
--
-- The website's ERP still keeps its data in src/data/db.json, written with
-- fs.writeFileSync. That cannot run on Vercel, so the ERP is moving onto this
-- database. Eleven of its fourteen repositories already have a table here.
-- These are the three that have nowhere to land:
--
--   contractTemplateRepository('contract_templates') -> contract_templates
--   contractVersionRepository ('contract_versions')  -> contract_versions
--   inventoryRepository       ('inventory')          -> inventory
--
-- Columns are derived from what the ERP actually reads — ContractService.js,
-- InventoryService.js, src/app/erp/inventory/page.js and
-- src/app/erp/contracts/page.js — then reshaped to the conventions the rest of
-- this schema already uses: snake_case, parallel name/name_ar columns wherever
-- content is user-facing, text + CHECK instead of native enums,
-- numeric(10, 2) for money, real foreign keys in place of the loose string ids
-- db.json carried, and the shared touch trigger on updated_at.
--
-- NO isDeleted COLUMN. db.json soft-deletes by flipping a boolean; this schema
-- dropped that in favour of real FKs and a status column, so the repository's
-- softDelete() maps onto inventory.status = 'retired' and
-- contract_templates.is_active = false. contract_versions is an append-only
-- audit trail and is never deleted at all.
--
-- All three are back office: no anonymous visitor and no member ever reads
-- them. Staff only, enforced twice — the SQL grant first, then the policy.
--
-- No new functions are defined here, so there is no EXECUTE-to-PUBLIC default
-- to revoke; the only function referenced is the existing shared
-- touch_updated_at() trigger.

-- ---------------------------------------------------------------------------
-- contract_templates — the boilerplate a contract is generated from.
--
-- body holds {{Placeholder}} tokens ({{Company}}, {{ContractStart}},
-- {{MonthlyPrice}}, {{VAT}}, {{Total}} …) that ContractService.interpolate()
-- substitutes at generation time. This column stores the UNFILLED template;
-- the interpolated result is written to contract_versions.content, which is
-- why the same text appears in two tables and only one of them is a document.
--
-- category doubles as the default plan name on a generated contract
-- (createContract falls back to tpl.category for planName), so the vocabulary
-- deliberately echoes resources.category rather than inventing a second one.
-- ---------------------------------------------------------------------------
create table if not exists public.contract_templates (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,            -- 'private-office-suite'
  name        text not null,
  name_ar     text,
  category    text not null default 'private_office'
              check (category in ('private_office', 'dedicated_desk', 'hot_desk',
                                  'coworking', 'meeting_room', 'virtual_office',
                                  'custom')),
  body        text not null,
  body_ar     text,
  -- The retirement switch. A template that has generated contracts must stay
  -- readable for the audit certificate, so it is deactivated, never deleted.
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists contract_templates_active_idx
  on public.contract_templates (category, sort_order)
  where is_active;

drop trigger if exists contract_templates_touch on public.contract_templates;
create trigger contract_templates_touch before update on public.contract_templates
  for each row execute function public.touch_updated_at();

comment on table public.contract_templates is
  'Reusable contract boilerplate for the ERP contract builder. body/body_ar carry {{Placeholder}} tokens that ContractService.interpolate() substitutes when a contract is generated; the filled-in text is stored on contract_versions, never back onto the template.';

comment on column public.contract_templates.is_active is
  'False retires the template from the builder. Templates are never deleted: getAuditCertificate() must still be able to name the template a signed contract came from.';

-- ---------------------------------------------------------------------------
-- contract_versions — append-only amendment history for one contract.
--
-- Every amendment bumps the contract version and writes a row here holding the
-- full document text as it stood at that version, plus the reason. This is
-- what getAuditCertificate() renders as versionsHistory, so rows are written
-- once and never edited: correcting a signed document means a NEW version.
--
-- ON DELETE CASCADE, unlike the ON DELETE RESTRICT used on the contract's own
-- company and branch references: a version has no meaning without its
-- contract, and orphaned document text is worse than no document text.
-- ---------------------------------------------------------------------------
create table if not exists public.contract_versions (
  id              uuid primary key default gen_random_uuid(),
  contract_id     uuid not null references public.contracts(id) on delete cascade,
  version         integer not null check (version > 0),
  content         text not null,
  content_ar      text,
  -- Rendered PDF of this exact version, when one has been generated. Mirrors
  -- contracts.document_path. Storage: contracts/<contract_id>/v<n>.pdf
  document_path   text,
  reason          text,                        -- 'Initial Contract Draft Generation'
  reason_ar       text,
  template_id     uuid references public.contract_templates(id) on delete set null,
  created_by      uuid references public.profiles(id) on delete set null,
  -- The ERP records an actor label ('Sales Executive', 'System CLM
  -- Automation') that often names a role rather than a person, and automation
  -- writes versions with no signed-in user at all. created_by holds the real
  -- profile when there is one; this holds the label either way, so the history
  -- never reads as anonymous.
  created_by_name text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint contract_versions_number unique (contract_id, version)
);

-- contract_id needs no index of its own: contract_versions_number leads with
-- it. These two cover the remaining foreign keys.
create index if not exists contract_versions_template_idx   on public.contract_versions (template_id);
create index if not exists contract_versions_created_by_idx on public.contract_versions (created_by);

drop trigger if exists contract_versions_touch on public.contract_versions;
create trigger contract_versions_touch before update on public.contract_versions
  for each row execute function public.touch_updated_at();

comment on table public.contract_versions is
  'Append-only amendment history for a contract. One row per version, carrying the document text as it stood at that version and why it changed. Read back by ContractService.getAuditCertificate() as the evidence trail behind a signature.';

comment on column public.contract_versions.version is
  'Matches the contract version this document belongs to. Starts at 1 with the initial draft and is bumped by each amendment; unique per contract.';

-- ---------------------------------------------------------------------------
-- inventory — the stock room, not the floor.
--
-- Distinct from migration 003, which is also called "inventory" but describes
-- bookable SPACE (branches, resources, plans). This is consumables and
-- equipment: laptops, chairs, coffee, A4 paper. The ERP page renders name,
-- category, branch, unit cost and stock level, and colours a row red when
-- quantity has fallen to min_stock.
-- ---------------------------------------------------------------------------
create table if not exists public.inventory (
  id           uuid primary key default gen_random_uuid(),
  branch_id    uuid not null references public.branches(id) on delete restrict,
  sku          text unique,
  name         text not null,
  name_ar      text,
  category     text not null default 'electronics'
               check (category in ('electronics', 'furniture', 'pantry',
                                   'office_supplies', 'maintenance', 'other')),
  quantity     integer not null default 0 check (quantity >= 0),
  -- The reorder threshold behind the "Low Stock Alerts" tile.
  min_stock    integer not null default 0 check (min_stock >= 0),
  unit         text not null default 'unit'
               check (unit in ('unit', 'box', 'pack', 'set', 'kg', 'litre')),
  unit_cost    numeric(10, 2) not null default 0 check (unit_cost >= 0),
  -- Where in the branch it physically sits: 'Storage Room B', 'Pantry'.
  location     text,
  location_ar  text,
  -- Lifecycle, NOT stock level — stock level is quantity, and low stock is
  -- derived below. 'retired' is where the repository's softDelete() lands.
  status       text not null default 'active'
               check (status in ('active', 'on_order', 'discontinued', 'retired')),
  notes        text,
  -- Generated, so the alert cannot drift from the numbers it describes and
  -- InventoryRepository.findLowStock() is one indexed predicate rather than a
  -- full scan filtered in JavaScript.
  --
  -- READ-ONLY: an INSERT or UPDATE that names this column fails with 428C9.
  -- Writers set quantity and min_stock; Postgres maintains this.
  is_low_stock boolean generated always as (quantity <= min_stock) stored,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists inventory_branch_idx on public.inventory (branch_id, category);
create index if not exists inventory_low_stock_idx on public.inventory (branch_id)
  where is_low_stock;

drop trigger if exists inventory_touch on public.inventory;
create trigger inventory_touch before update on public.inventory
  for each row execute function public.touch_updated_at();

comment on table public.inventory is
  'Stock room and asset register for the ERP: consumables, furniture and equipment held at a branch. Not to be confused with migration 003, which names the bookable space. quantity is the count on hand and min_stock the reorder threshold.';

comment on column public.inventory.status is
  'Item lifecycle, not stock level. Stock level is quantity, and low stock is the generated is_low_stock. "retired" is what a delete from the ERP becomes: this schema has no isDeleted column.';

comment on column public.inventory.is_low_stock is
  'Generated (quantity <= min_stock) and stored. Never write to it — an INSERT or UPDATE naming this column fails with 428C9.';

-- ---------------------------------------------------------------------------
-- RLS
--
-- ENABLE, not FORCE, for the reason set out at the top of migration 012:
-- force applies policies to the table owner, and every authz helper in
-- migration 010 is SECURITY DEFINER running as that owner. is_staff() is one
-- of them, so forcing RLS here would put the policies' own predicate back
-- under the policies.
-- ---------------------------------------------------------------------------
alter table public.contract_templates enable row level security;
alter table public.contract_versions  enable row level security;
alter table public.inventory          enable row level security;

-- Supabase's default privileges hand anon and authenticated FULL rights on
-- every newly created table in public. Migration 012's blanket revoke ran
-- before these three existed, so it does not cover them; without this line the
-- tables ship with anon holding INSERT, UPDATE and DELETE, saved only by RLS.
-- Strip it back, then grant the one verb that is actually needed.
revoke all on public.contract_templates, public.contract_versions, public.inventory
  from anon, authenticated;

-- SELECT only, and only for signed-in users — the policies below then narrow
-- that to staff. Writes are deliberately absent: the ERP writes these tables
-- from Next.js server code with the service-role key (requireStaffClient()),
-- which holds bypassrls and never reaches a browser. anon gets nothing at all
-- and is stopped by the grant, one step before RLS is consulted.
grant select on public.contract_templates, public.contract_versions, public.inventory
  to authenticated;

drop policy if exists contract_templates_staff on public.contract_templates;
create policy contract_templates_staff on public.contract_templates
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy if exists contract_versions_staff on public.contract_versions;
create policy contract_versions_staff on public.contract_versions
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy if exists inventory_staff on public.inventory;
create policy inventory_staff on public.inventory
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

comment on policy inventory_staff on public.inventory is
  'Back office. A member who reaches this table over PostgREST holds SELECT but matches no row, and an anonymous caller is refused by the grant before RLS is ever reached.';
