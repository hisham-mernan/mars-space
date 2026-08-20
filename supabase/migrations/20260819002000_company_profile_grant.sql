-- Let a company admin actually save their profile.
--
-- Migration 016 built the company-profile feature in three parts and shipped
-- two of them: the RLS policy `companies_admin_update` (restricting the write
-- to is_company_admin(id)) and the trigger guard_company_profile_changes
-- (pinning name, CR/VAT number, status, billing_email and primary_contact_id
-- so a tenant cannot rewrite their own billing identity).
--
-- The third part was never written. PostgREST needs BOTH a SQL grant and a
-- permissive policy; a policy on its own is unreachable. `authenticated` had
-- no UPDATE privilege on public.companies at all, so every save from the app's
-- company screen would have failed with 42501 before RLS was ever consulted —
-- the policy and the guard have been guarding a door nobody could open.
--
-- Granted per-column rather than table-wide. The guard already rejects changes
-- to the protected columns, but a column grant refuses them one step earlier,
-- and it states the editable surface in a form \dp will show. These six are
-- exactly the fields updateCompanyProfile() sends.
grant update (
  description,
  description_ar,
  industry,
  website,
  logo_path,
  is_listed
) on public.companies to authenticated;

comment on policy companies_admin_update on public.companies is
  'Company admins edit presentation only. The editable columns are fixed by a column-level UPDATE grant, and guard_company_profile_changes() rejects any attempt to alter company identity or billing details.';
