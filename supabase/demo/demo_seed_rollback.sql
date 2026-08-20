-- Removes everything demo_seed.sql inserted, and nothing else.
--
-- Every predicate keys on the reserved uuid families, never on a name or a
-- status, so a real company that happens to look like demo data is safe.
-- Deletion order follows the foreign keys inwards.

begin;

delete from public.repair_updates u using public.repair_requests q
  where u.repair_id = q.id and q.id::text like 'e1000000-%';
delete from public.repair_requests where id::text like 'e1000000-%';
delete from public.events where id::text like 'e2000000-%';
delete from public.invoice_line_items l using public.invoices i
  where l.invoice_id = i.id and i.id::text like 'db000000-%';
delete from public.payments p using public.invoices i
  where p.invoice_id = i.id and i.id::text like 'db000000-%';
delete from public.invoices where id::text like 'db000000-%';
delete from public.credit_entries where company_id::text like 'dc000000-%';
delete from public.bookings where company_id::text like 'dc000000-%';
delete from public.company_members where company_id::text like 'dc000000-%';
delete from public.office_assignments where id::text like 'de000000-%';
delete from public.contracts where id::text like 'dd000000-%';
delete from public.companies where id::text like 'dc000000-%';
-- profiles cascade from auth.users, which is where the identity lives.
delete from auth.users where id::text like 'df000000-%';

-- The pre-existing tenant is left in place; only its demo styling is undone.
update public.companies set logo_path = null
 where id = 'd0000000-0000-4000-8000-000000000001';

commit;
