-- Mars Space — 001 Extensions and shared helpers
--
-- btree_gist is required for the bookings exclusion constraint: gist cannot
-- index plain equality on uuid without it, and the constraint needs
-- `resource_id WITH =` alongside `time_range WITH &&`.

-- Supabase keeps extensions in a dedicated `extensions` schema rather than
-- public, and its linter flags extension_in_public.
--
-- Column definitions below write `extensions.citext` explicitly rather than
-- relying on the search_path. Supabase does put `extensions` on the path for
-- its roles, but migrations and a plain PostgreSQL do not, and an unqualified
-- `citext` fails at DDL time with "type citext does not exist". Qualifying is
-- the only form that works in both.
--
-- Created here too so the migration applies unchanged to a plain PostgreSQL
-- (CI, the throwaway cluster used by scripts/db-test.sh), where the schema
-- does not exist yet.
create schema if not exists extensions;

create extension if not exists pgcrypto   with schema extensions;  -- gen_random_uuid()
create extension if not exists btree_gist with schema extensions;  -- gist on (uuid, tstzrange)
create extension if not exists citext     with schema extensions;  -- case-insensitive email

-- Functions in this schema pin `set search_path = public, pg_temp`, which
-- would otherwise hide gen_random_uuid() and the citext operators from their
-- bodies. Granting usage and adding extensions to the resolution path for the
-- database keeps unqualified references working everywhere.
grant usage on schema extensions to public;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.touch_updated_at is
  'Trigger function: stamps updated_at on every UPDATE. Attach per table.';

-- ---------------------------------------------------------------------------
-- Human-readable reference numbers
--
-- The old JSON store generated these with Math.random() (see the previous
-- InvoiceService), which could collide and produced non-sequential numbers.
-- Sequences are gapless enough for reference purposes and are safe under
-- concurrency.
-- ---------------------------------------------------------------------------
create sequence if not exists public.booking_reference_seq start with 9023;
create sequence if not exists public.invoice_number_seq    start with 3;
create sequence if not exists public.contract_reference_seq start with 102;
create sequence if not exists public.ticket_reference_seq   start with 102;
create sequence if not exists public.repair_reference_seq   start with 1;

create or replace function public.next_booking_reference()
returns text language sql volatile set search_path = public, pg_temp
as $$
  select 'BK-' || nextval('public.booking_reference_seq')::text;
$$;

create or replace function public.next_invoice_number()
returns text language sql volatile set search_path = public, pg_temp
as $$
  select 'INV-' || to_char(now() at time zone 'Asia/Riyadh', 'YYYY')
      || '-' || lpad(nextval('public.invoice_number_seq')::text, 3, '0');
$$;

create or replace function public.next_contract_reference()
returns text language sql volatile set search_path = public, pg_temp
as $$
  select 'CTR-' || nextval('public.contract_reference_seq')::text;
$$;

create or replace function public.next_ticket_reference()
returns text language sql volatile set search_path = public, pg_temp
as $$
  select 'TCK-' || nextval('public.ticket_reference_seq')::text;
$$;

create or replace function public.next_repair_reference()
returns text language sql volatile set search_path = public, pg_temp
as $$
  select 'REP-' || lpad(nextval('public.repair_reference_seq')::text, 4, '0');
$$;

-- ---------------------------------------------------------------------------
-- Riyadh-local helpers. The floor operates on Asia/Riyadh (UTC+3, no DST);
-- all timestamps are stored UTC and converted at the edges.
-- ---------------------------------------------------------------------------
create or replace function public.riyadh_now()
returns timestamptz language sql stable set search_path = public, pg_temp
as $$
  select now();
$$;

-- KSA weekend is Friday + Saturday. isodow: Mon=1 .. Fri=5, Sat=6, Sun=7.
-- The legacy JS pricing code checked getDay() 0/6 (Sunday/Saturday), which
-- surcharged the wrong two days.
create or replace function public.is_ksa_weekend(p_at timestamptz)
returns boolean language sql immutable set search_path = public, pg_temp
as $$
  select extract(isodow from (p_at at time zone 'Asia/Riyadh')) in (5, 6);
$$;

comment on function public.is_ksa_weekend is
  'True for Friday/Saturday in Asia/Riyadh. Replaces the legacy Sun/Sat check.';
