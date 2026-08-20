-- Mars Space — 023 Invoice reminder state
--
-- InvoiceService.sendReminder(id, reminderType) has been a no-op since the ERP
-- moved off db.json. The document carries
--
--   remindersSent: { advance7d: boolean, post48h: boolean }
--
-- and public.invoices had nowhere to put it, so the invoices mapping listed it
-- as a known loss and dropped it on write. That turned the whole call into a
-- lie: toRow emitted no column, BaseRepository#update saw a zero-key patch and
-- returned findById() unchanged, and the route answered 200 with an invoice
-- whose remindersSent was still the synthesised { false, false }. Staff press
-- "Send 7-day reminder", the row does not move, and the button can be pressed
-- again forever.
--
-- This adds the column. One jsonb holding the same two booleans the document
-- already has, rather than a pair of timestamps or a separate
-- invoice_reminders table, for a reason worth writing down:
--
--   BaseRepository#update is a blind single-table patch. It does not read the
--   row first and it cannot write a second table, so whatever shape lands here
--   has to be derivable from the patch ALONE. sendReminder sends the entire
--   map ({ advance7d: true, post48h: false }), so a jsonb map round-trips
--   exactly. Timestamp columns would not: marking post48h sent would rewrite
--   advance7d's timestamp to now() and destroy the date the first reminder
--   actually went out. A history table would need a write path this repository
--   layer does not have. If reminder history is wanted later — when, by whom,
--   to which address — that is an invoice_reminders table plus a service that
--   writes it directly, not a widening of this column.
--
-- The shape is pinned by a CHECK rather than left as free-form jsonb, so a
-- typo'd reminder kind is rejected here as well as in the mapping.

alter table public.invoices
  add column if not exists reminders_sent jsonb not null
    default '{"advance7d": false, "post48h": false}'::jsonb;

-- Exactly the two known kinds, both boolean, nothing else. `?&` asserts both
-- keys are present (a CHECK whose expression is NULL passes, so
-- jsonb_typeof(x -> 'missing') = 'boolean' would not catch an absent key on its
-- own), and the subtraction asserts there are no others. Adding a third kind
-- means editing this constraint and REMINDER_KINDS in
-- src/repositories/mappings/invoices.js together.
alter table public.invoices
  drop constraint if exists invoices_reminders_sent_shape;
alter table public.invoices
  add constraint invoices_reminders_sent_shape check (
    jsonb_typeof(reminders_sent) = 'object'
    and reminders_sent ?& array['advance7d', 'post48h']
    and jsonb_typeof(reminders_sent -> 'advance7d') = 'boolean'
    and jsonb_typeof(reminders_sent -> 'post48h') = 'boolean'
    and reminders_sent - 'advance7d' - 'post48h' = '{}'::jsonb
  );

comment on column public.invoices.reminders_sent is
  'Which dunning reminders have been sent for this invoice: {"advance7d": bool, "post48h": bool}. Written by InvoiceService.sendReminder() through the invoices mapping, which is why it is one jsonb map and not two timestamps — BaseRepository#update patches blind, and a per-kind timestamp would be rewritten to now() every time a different kind was sent. Not a history: when/by whom would be an invoice_reminders table.';

-- ---------------------------------------------------------------------------
-- Access control.
--
-- Nothing to do, and that is a decision rather than an omission:
--
--   RLS is already ENABLED (not forced — migration 012's reason still holds:
--   the authz helpers are SECURITY DEFINER and run as the table owner) on
--   public.invoices, and a new column is covered by the existing policies. The
--   staff-only write path is invoices_staff_write; members reach the row only
--   through invoices_read_permitted, which requires the view_invoices company
--   permission.
--
--   Grants are table-level and already correct: migration 012 revoked
--   everything from anon and authenticated, then re-granted SELECT on
--   public.invoices to authenticated only. anon cannot see the column at all;
--   authenticated can read it on invoices RLS already lets them see, which is
--   their own company's, and cannot write it. The ERP writes with the
--   service-role client behind requireStaff().
--
--   Deliberately NOT a column-level revoke. Revoking select(reminders_sent)
--   from authenticated would break every `select *` the member app and
--   src/lib/supabase/queries.js issue against invoices with a permission-denied
--   error, to hide the fact that we emailed the member a reminder we also
--   emailed them.
-- ---------------------------------------------------------------------------

-- Backfill is the column default; every existing row gets
-- {"advance7d": false, "post48h": false}, which is exactly what the mapping was
-- already synthesising on read, so no invoice changes meaning.
