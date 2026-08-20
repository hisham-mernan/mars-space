-- Mars Space — 025 Persist contracts.sent_at and support_tickets.resolution_notes
--
-- FILENAME TIMESTAMP: a wall-clock version (2026-08-20 17:15 UTC), continuing
-- forward from 20260820131700 for the reason that migration's header gives —
-- the remote history already carries later-sorting rows than the
-- 202608190NNN00 sequence, and `supabase db push` refuses an out-of-order file.
--
-- ---------------------------------------------------------------------------
-- WHAT WAS BROKEN
--
-- BaseRepository#update() is a blind single-table patch: the mapping turns the
-- caller's camelCase document into columns and whatever does not map is
-- dropped. Until now the drop was silent, and when EVERY field of a patch
-- dropped, update() returned findById(id) — a full, well-formed document that
-- every caller reads as "the write happened". BaseRepository now throws in that
-- case. The two columns below fix two writes that were losing a field each; the
-- third loss in the family (invoices.paymentMethod) is deliberately NOT fixed
-- with a column, and the last section of this file says why.
--
--   ContractService.sendToCustomer(id)
--       patches { status: 'Sent to Customer', sentAt: <now> }. `status` had a
--       column, `sentAt` did not, so the contract moved to 'sent' and WHEN it
--       was sent was lost. The ERP then cannot answer "how long has this
--       customer been sitting on the signing link", which is the entire reason
--       to record it: a link with no send date cannot be aged out or chased.
--
--   SupportService.resolveTicket(id, resolutionNotes)
--       patches { status: 'Resolved', resolutionNotes, resolvedAt }. Two of the
--       three had columns. The staff member types what they actually did to fix
--       the member's problem, presses Resolve, gets a 200 and a resolved
--       ticket — and the text is discarded between the browser and Postgres.
--       Nothing in the product ever displayed it again, so nobody noticed.
--
-- Both columns are plain and nullable. Neither is backfilled: there is no
-- honest value for "when was this contract sent" or "how was this ticket
-- resolved" on a row written before the column existed, and inventing one
-- (created_at, updated_at, an empty string) would put a fabricated fact in
-- front of staff. NULL means "not recorded", which is the truth.

-- ---------------------------------------------------------------------------
-- 1. contracts.sent_at
-- ---------------------------------------------------------------------------
alter table public.contracts
  add column if not exists sent_at timestamptz;

comment on column public.contracts.sent_at is
  'Server clock when ContractService.sendToCustomer() issued the signing link. Server-asserted, like signed_at and counter_signed_at — not a claim carried in the request. NULL for contracts sent before this column existed and for contracts still in draft; deliberately not backfilled from created_at/updated_at, which would fabricate a send date. Status alone cannot answer "how long has the customer had the link": the contracts mapping folds the ERP status Viewed onto sent and re-issues that patch on every open.';

-- A contract cannot have been sent before it existed. One minute of slack for
-- clock skew between the app server and Postgres.
alter table public.contracts
  drop constraint if exists contracts_sent_after_created;
alter table public.contracts
  add constraint contracts_sent_after_created check (
    sent_at is null or sent_at >= created_at - interval '1 minute'
  );

-- The ERP contracts board ages the "out with the customer" column by this.
-- Partial: only a sent contract has a value.
create index if not exists contracts_sent_at_idx
  on public.contracts (sent_at desc) where sent_at is not null;

-- ---------------------------------------------------------------------------
-- 2. support_tickets.resolution_notes
-- ---------------------------------------------------------------------------
alter table public.support_tickets
  add column if not exists resolution_notes text;

comment on column public.support_tickets.resolution_notes is
  'What the staff member did to resolve the ticket, as typed into the ERP resolve form and passed to SupportService.resolveTicket(id, resolutionNotes). Free text on the ticket, deliberately not a support_messages row: a message is part of the thread the member is having, this is the closing note attached to the ticket itself, and resolveTicket has no message-insert path. READABLE BY THE MEMBER (see the access-control note in this migration) — write it as something the member may read.';

-- Bounded so a pasted mail thread cannot land here unnoticed. The
-- support_tickets mapping clamps to the same width before writing, so this
-- CHECK only ever fires for a writer that bypasses the mapping — which is the
-- point: staff must not be able to lose a resolution by typing a long one.
alter table public.support_tickets
  drop constraint if exists support_tickets_resolution_notes_len;
alter table public.support_tickets
  add constraint support_tickets_resolution_notes_len check (
    resolution_notes is null or char_length(resolution_notes) <= 5000
  );

-- ---------------------------------------------------------------------------
-- 3. NO invoices.payment_method COLUMN. This is a decision, not an omission.
--
-- InvoiceService.payInvoice(id, 'Mada') was losing the tender type the same
-- way: `paymentMethod` had no column, the invoices mapping dropped it, and the
-- route answered 200 with an invoice marked Paid by nothing in particular.
--
-- The obvious repair — add invoices.payment_method text — would be wrong here,
-- because the tender type ALREADY HAS A HOME and it is not on the invoice:
--
--   public.payments (migration 007)
--     amount, currency,
--     method  text not null check (method in ('bank_transfer','mada','visa',
--             'mastercard','apple_pay','stc_pay','cash','other')),
--     status  text not null check (status in ('pending','succeeded','failed',
--             'refunded')),
--     paid_at, provider, provider_reference, recorded_by, note
--
--   trigger payments_sync_invoice -> sync_invoice_payment_state()
--     locks the invoice, re-sums succeeded payments, and sets
--     invoices.amount_paid, invoices.status and invoices.paid_at from that sum.
--
-- An invoice is settled by ONE OR MORE payments — a deposit in cash and the
-- balance by transfer is an ordinary coworking scenario, and a refund is a
-- fourth row. A single invoices.payment_method column can hold exactly one of
-- them, so it would be a lossy denormalisation of a ledger that already exists,
-- and a second source of truth that the trigger does not maintain and no
-- constraint could keep in step. It would also let the ERP mark an invoice Paid
-- with amount_paid still 0 — the status and the money disagreeing, which is
-- precisely what that trigger was written to prevent.
--
-- So the fix for payInvoice is a service change, not a schema change:
-- InvoiceService.payInvoice() now INSERTS a public.payments row (method mapped
-- onto the CHECK vocabulary, the unrecognised label preserved in `note`), lets
-- payments_sync_invoice set status/amount_paid/paid_at, and re-reads the
-- invoice. The invoices mapping embeds payments and derives the document's
-- `paymentMethod` from the newest succeeded one, so the field round-trips
-- without a column.
--
-- If a per-invoice "preferred tender" is ever wanted — a different thing from
-- "what was actually paid with" — that is a nullable column with a name that
-- says so, not this one.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Access control
--
-- Nothing to grant, and that is deliberate. Both tables have RLS enabled and
-- table-level grants from migration 012; a new column is covered by the
-- existing policies with no further action:
--
--   public.contracts        contracts_staff_write (staff, service role) is the
--                           only write path. contracts_read_own lets an
--                           authenticated member of the owning company SELECT
--                           the row, so they can now also read sent_at. That is
--                           the date we told them we sent them their own
--                           contract; there is nothing to hide in it.
--
--   public.support_tickets  the member who raised the ticket (and their company,
--                           per migration 012) can SELECT it, so resolution_notes
--                           is visible to them. That is intended, not tolerated:
--                           a member is entitled to know how their ticket was
--                           resolved, and staff-only remarks belong in a
--                           support_messages row with is_internal = true, which
--                           already exists for exactly that purpose. The column
--                           comment says so at the point of writing.
--
-- Deliberately NOT column-level revokes. While the table-level SELECT grant
-- stands a column subset cannot be revoked, and replacing it with an explicit
-- column list would silently hide every future column from the member apps and
-- from src/lib/supabase/queries.js.
-- ---------------------------------------------------------------------------
