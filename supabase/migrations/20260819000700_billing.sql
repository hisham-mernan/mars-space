-- Mars Space — 007 Billing
--
-- Phase 1 is view-only: members read invoices and download PDFs, staff mark
-- them paid in the Supabase table editor when a transfer lands. The payments
-- table and the ZATCA columns exist now so adding Moyasar later is an
-- integration, not a migration.
--
-- VAT note: totals are stored, not derived. The legacy code computed
-- `vat = amount * 0.15` on a VAT-inclusive total, which understates VAT — the
-- correct extraction from an inclusive total is amount * 15/115. Here subtotal
-- is the exclusive base and total = subtotal + vat_amount, so the ambiguity
-- does not arise.

create table public.invoices (
  id             uuid primary key default gen_random_uuid(),
  invoice_number text not null unique default public.next_invoice_number(),
  -- Nullable: spec 8.1 mandates guest checkout, and a guest booking has no
  -- company to bill. Guest invoices carry the contact details from the booking
  -- instead. The RLS policy keys off company_id, so a null one is visible to
  -- staff only, which is correct for a guest.
  company_id     uuid references public.companies(id) on delete restrict,
  contract_id    uuid references public.contracts(id) on delete set null,
  booking_id     uuid references public.bookings(id) on delete set null,
  kind           text not null default 'booking'
                 check (kind in ('booking', 'membership', 'addon', 'deposit', 'other')),
  description    text,
  description_ar text,
  issue_date     date not null default (now() at time zone 'Asia/Riyadh')::date,
  due_date       date not null,
  subtotal       numeric(10, 2) not null default 0 check (subtotal >= 0),
  vat_rate       numeric(5, 4) not null default 0.15,
  vat_amount     numeric(10, 2) not null default 0 check (vat_amount >= 0),
  total          numeric(10, 2) not null default 0 check (total >= 0),
  amount_paid    numeric(10, 2) not null default 0 check (amount_paid >= 0),
  currency       text not null default 'SAR',
  status         text not null default 'unpaid'
                 check (status in ('draft', 'unpaid', 'partially_paid',
                                   'paid', 'overdue', 'void')),
  pdf_path       text,                    -- Supabase Storage: invoices/<id>.pdf
  -- ZATCA / Fatoora Phase 2. Null until e-invoicing is implemented.
  zatca_uuid     text,
  zatca_qr       text,
  zatca_hash     text,
  paid_at        timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint invoices_total_consistent check (total = subtotal + vat_amount),
  constraint invoices_due_after_issue check (due_date >= issue_date)
);

create index invoices_company_idx on public.invoices (company_id, issue_date desc);
create index invoices_outstanding_idx on public.invoices (due_date)
  where status in ('unpaid', 'partially_paid', 'overdue');

create trigger invoices_touch before update on public.invoices
  for each row execute function public.touch_updated_at();

create table public.invoice_line_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  description_ar text,
  quantity    numeric(8, 2) not null default 1 check (quantity > 0),
  unit_price  numeric(10, 2) not null,
  line_total  numeric(10, 2) not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index invoice_line_items_invoice_idx on public.invoice_line_items (invoice_id, sort_order);

-- ---------------------------------------------------------------------------
-- payments — Phase 1 rows are entered by staff against bank transfers.
-- provider/provider_reference stay null until a gateway is wired up.
-- ---------------------------------------------------------------------------
create table public.payments (
  id                 uuid primary key default gen_random_uuid(),
  invoice_id         uuid not null references public.invoices(id) on delete restrict,
  amount             numeric(10, 2) not null check (amount > 0),
  currency           text not null default 'SAR',
  method             text not null default 'bank_transfer'
                     check (method in ('bank_transfer', 'mada', 'visa', 'mastercard',
                                       'apple_pay', 'stc_pay', 'cash', 'other')),
  provider           text,                -- 'moyasar' | 'tap' | null
  provider_reference text,
  status             text not null default 'succeeded'
                     check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  paid_at            timestamptz not null default now(),
  recorded_by        uuid references public.profiles(id) on delete set null,
  note               text,
  created_at         timestamptz not null default now()
);

create index payments_invoice_idx on public.payments (invoice_id);
create unique index payments_provider_ref_key on public.payments (provider, provider_reference)
  where provider_reference is not null;

-- ---------------------------------------------------------------------------
-- Keep invoice.amount_paid and status in step with the payments recorded
-- against it, so staff only ever touch one table.
-- ---------------------------------------------------------------------------
create or replace function public.sync_invoice_payment_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice uuid := coalesce(new.invoice_id, old.invoice_id);
  v_paid    numeric(10, 2);
  v_row     public.invoices%rowtype;
begin
  -- Lock the invoice first. Without it two payments landing at once each read
  -- the same amount_paid, and the second UPDATE overwrites the first: money
  -- recorded, but the invoice still showing a balance.
  select * into v_row from public.invoices where id = v_invoice for update;
  if not found then
    return null;
  end if;

  select coalesce(sum(amount), 0) into v_paid
    from public.payments
   where invoice_id = v_invoice and status = 'succeeded';

  update public.invoices
     set amount_paid = v_paid,
         status = case
           -- 'draft' and 'void' are editorial states, not payment states. The
           -- previous version rewrote a draft to 'unpaid' the moment any
           -- payment row was touched, silently issuing it.
           when v_row.status in ('void', 'draft') then v_row.status
           when v_paid >= v_row.total and v_row.total > 0 then 'paid'
           when v_paid > 0 then 'partially_paid'
           when v_row.due_date < (now() at time zone 'Asia/Riyadh')::date then 'overdue'
           else 'unpaid'
         end,
         -- Stamped once, when the invoice is first settled. The previous
         -- version re-stamped now() on every payment touch and nulled it again
         -- whenever a refund dipped the balance, so it never recorded when the
         -- invoice was actually paid.
         paid_at = case
           when v_paid >= v_row.total and v_row.total > 0
             then coalesce(v_row.paid_at, now())
           else null
         end
   where id = v_invoice;

  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Invoices falling due.
--
-- 'overdue' is a function of the calendar, not of an event, so nothing in the
-- payment path can ever set it on its own: an invoice that is simply never
-- paid receives no trigger and sits at 'unpaid' forever. This is run daily by
-- pg_cron (see the schedules migration).
-- ---------------------------------------------------------------------------
create or replace function public.mark_overdue_invoices()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  update public.invoices
     set status = 'overdue'
   where status in ('unpaid', 'partially_paid')
     and due_date < (now() at time zone 'Asia/Riyadh')::date;
  get diagnostics n = row_count;
  return n;
end;
$$;

create trigger payments_sync_invoice
  after insert or update or delete on public.payments
  for each row execute function public.sync_invoice_payment_state();
