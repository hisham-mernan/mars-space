-- Mars Space — 014 Index coverage
--
-- Two problems, both found by querying the live catalogue rather than reading
-- the DDL by eye.
--
-- 1. UNINDEXED FOREIGN KEYS. Postgres does not index the referencing side of a
--    foreign key for you. Every DELETE or key UPDATE on the parent then has to
--    scan the child table end to end to enforce the constraint — RESTRICT,
--    CASCADE and SET NULL alike. Because auth.users cascades into profiles,
--    deleting a single member would sequentially scan bookings, notifications,
--    credit_entries and every other child. Supabase's database linter reports
--    these as `unindexed_foreign_keys`.
--
--    An index only serves a foreign key when the FK columns are a LEADING
--    prefix of it, and a partial index never serves one at all. That is why
--    several columns which look covered are not: notifications.profile_id and
--    device_push_tokens.profile_id have only partial indexes, and
--    credit_entries.contract_id is covered only by an index restricted to
--    plan_allocation rows.
--
-- 2. REDUNDANT AND MISORDERED INDEXES, dropped at the end with reasons.

-- ---------------------------------------------------------------------------
-- Foreign-key coverage
-- ---------------------------------------------------------------------------
-- identity and tenancy
create index if not exists companies_primary_contact_id_idx
  on public.companies (primary_contact_id);
create index if not exists company_members_invited_by_idx
  on public.company_members (invited_by);
create index if not exists company_members_profile_id_idx
  on public.company_members (profile_id);

-- bookings
create index if not exists availability_rules_resource_id_idx
  on public.availability_rules (resource_id);
create index if not exists booking_addons_addon_id_idx
  on public.booking_addons (addon_id);
create index if not exists bookings_branch_id_idx
  on public.bookings (branch_id);
create index if not exists bookings_cancelled_by_idx
  on public.bookings (cancelled_by);
create index if not exists resource_blackouts_branch_id_idx
  on public.resource_blackouts (branch_id);
create index if not exists resource_blackouts_resource_id_idx
  on public.resource_blackouts (resource_id);

-- contracts and occupancy
create index if not exists contracts_branch_id_idx
  on public.contracts (branch_id);
create index if not exists contracts_plan_id_idx
  on public.contracts (plan_id);
create index if not exists contracts_signed_by_idx
  on public.contracts (signed_by);
create index if not exists office_assignments_contract_id_idx
  on public.office_assignments (contract_id);

-- credits and billing
create index if not exists credit_entries_booking_id_idx
  on public.credit_entries (booking_id);
create index if not exists credit_entries_contract_id_idx
  on public.credit_entries (contract_id);
create index if not exists credit_entries_created_by_idx
  on public.credit_entries (created_by);
create index if not exists credit_entries_profile_id_idx
  on public.credit_entries (profile_id);
create index if not exists invoices_booking_id_idx
  on public.invoices (booking_id);
create index if not exists invoices_contract_id_idx
  on public.invoices (contract_id);
create index if not exists payments_recorded_by_idx
  on public.payments (recorded_by);

-- facilities, community and support
create index if not exists event_registrations_event_id_idx
  on public.event_registrations (event_id);
create index if not exists event_registrations_profile_id_idx
  on public.event_registrations (profile_id);
create index if not exists events_branch_id_idx
  on public.events (branch_id);
create index if not exists events_resource_id_idx
  on public.events (resource_id);
create index if not exists repair_attachments_uploaded_by_idx
  on public.repair_attachments (uploaded_by);
create index if not exists repair_requests_assigned_to_idx
  on public.repair_requests (assigned_to);
create index if not exists repair_requests_branch_id_idx
  on public.repair_requests (branch_id);
create index if not exists repair_requests_reported_by_idx
  on public.repair_requests (reported_by);
create index if not exists repair_requests_resource_id_idx
  on public.repair_requests (resource_id);
create index if not exists repair_updates_author_id_idx
  on public.repair_updates (author_id);
create index if not exists support_messages_author_id_idx
  on public.support_messages (author_id);
create index if not exists support_tickets_assigned_to_idx
  on public.support_tickets (assigned_to);
create index if not exists support_tickets_company_id_idx
  on public.support_tickets (company_id);

-- platform
create index if not exists device_push_tokens_profile_id_idx
  on public.device_push_tokens (profile_id);
create index if not exists leads_assigned_to_idx
  on public.leads (assigned_to);
create index if not exists notifications_profile_id_idx
  on public.notifications (profile_id);

-- ---------------------------------------------------------------------------
-- Redundant and misordered indexes
-- ---------------------------------------------------------------------------

-- (booking_id) is a strict prefix of booking_addons_unique
-- (booking_id, addon_id), so the composite already serves every lookup this
-- one would. Pure write overhead.
drop index if exists public.booking_addons_booking_idx;

-- Was a FULL gist on (resource_id, time_range), duplicating the gist that the
-- bookings_no_overlap exclusion constraint already maintains over exactly the
-- statuses that matter. GiST is expensive to maintain on every write, and the
-- overlap queries are served by the constraint's own index. A plain btree is
-- what the resource_id foreign key and the "bookings for this room" lookups
-- actually want.
drop index if exists public.bookings_resource_idx;
create index if not exists bookings_resource_id_idx
  on public.bookings (resource_id);

-- Was a gist on (term) alone. Nothing queries occupancy without first naming a
-- company or a resource, and both are indexed already
-- (office_assignments_company_idx, and the exclusion constraint's gist on
-- (resource_id, term)), so the planner never chose it.
drop index if exists public.office_assignments_current_idx;

-- Led with branch_id, but listResources() in src/lib/supabase/queries.js
-- filters on category and orders by rate; it resolves the branch through a
-- join and filters it in JavaScript. Re-led so the partial index is usable.
drop index if exists public.resources_bookable_idx;
create index if not exists resources_bookable_idx
  on public.resources (category, rate)
  where is_bookable and status = 'available';
