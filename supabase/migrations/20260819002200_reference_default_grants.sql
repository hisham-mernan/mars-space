-- Let a member actually create the rows their RLS policies already permit.
--
-- Same class of defect as migration 020 (company_profile_grant): a permissive
-- policy guarding a door nobody could open.
--
-- public.support_tickets.reference and public.repair_requests.reference are
-- NOT NULL with a DEFAULT of next_ticket_reference() / next_repair_reference().
-- A column DEFAULT is evaluated as the INSERTING role, and both functions are
-- SECURITY INVOKER with EXECUTE granted only to postgres and service_role
-- (migration 001 created them; migration 012's blanket
-- `grant execute on all functions in schema public to service_role` covered
-- service_role and nothing else). So `authenticated` could not evaluate the
-- default, and every member insert failed with
--
--     42501: permission denied for function next_ticket_reference
--
-- before RLS was ever consulted -- even though support_tickets_insert_self
-- (WITH CHECK profile_id = auth.uid()) and repair_requests_insert
-- (WITH CHECK has_company_perm(company_id,'submit_repairs') AND
--  reported_by = auth.uid()) exist precisely to allow it.
--
-- This is why it matters now: /api/v1/member/support was rewritten to insert
-- with the caller's ANON client so RLS applies, instead of the service-role
-- client (which would have made the route the only thing standing between a
-- forged body and the tickets table). src/lib/supabase/queries.js
-- createRepairRequest() already took the anon path and was failing the same
-- way. Granting EXECUTE is what makes the RLS-respecting path usable, so the
-- member routes never need the service role.
--
-- The underlying sequences (ticket_reference_seq, repair_reference_seq) are
-- already granted to authenticated; only the wrapper functions were missed.
--
-- Deliberately NOT granted here: next_booking_reference(),
-- next_contract_reference() and next_invoice_number(). No member-facing INSERT
-- policy exists on bookings, contracts or invoices -- bookings are created
-- through the create_booking() function and the other two are staff-only, so
-- `authenticated` has no legitimate reason to burn those sequences.
--
-- Nothing is exposed by this: both functions take no arguments, read no table,
-- and return the next value of a sequence.

grant execute on function public.next_ticket_reference() to authenticated;
grant execute on function public.next_repair_reference() to authenticated;

comment on function public.next_ticket_reference() is
  'Ticket reference generator used as the DEFAULT for support_tickets.reference. Executable by authenticated because a column DEFAULT runs as the inserting role and support_tickets_insert_self lets a member insert their own ticket.';

comment on function public.next_repair_reference() is
  'Repair reference generator used as the DEFAULT for repair_requests.reference. Executable by authenticated because a column DEFAULT runs as the inserting role and repair_requests_insert lets a member with submit_repairs raise a request.';
