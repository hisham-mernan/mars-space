-- Mars Space — 023 Contract e-signature evidence bundle
--
-- FILENAME TIMESTAMP: this one is a wall-clock version (2026-08-20 13:17 UTC)
-- rather than the 202608190NNN00 sequence the rest of the directory uses. The
-- remote migration history already carries a row at 20260820102553
-- (reference_default_grants, applied through the MCP server, which stamps its
-- own version), so anything numbered 20260819002300 would sort BEFORE the last
-- applied migration and `supabase db push` would refuse it as out of order.
-- Later migrations should keep going forward from here.
--
-- ---------------------------------------------------------------------------
-- WHAT WAS BROKEN
--
-- ContractService.customerSign() patches eight fields onto the contract:
--
--   status, signedAt, signatoryName, signatoryIp, signatoryUserAgent,
--   signatureMethod, signatureData, signatureHash
--
-- and counterSign() patches three:
--
--   status, counterSignedBy, counterSignedAt
--
-- public.contracts had columns for exactly two of the first set (status,
-- signed_at) and one of the second (status). The mapping module
-- src/repositories/mappings/contracts.js was honest about it — every unmapped
-- field was enumerated under KNOWN LOSSES and returned as null — but honest
-- data loss is still data loss: getAuditCertificate() is a legal artefact and
-- it was rendering nulls for every signatory field of every signed contract.
--
-- This migration adds the missing columns. The mapper is updated in the same
-- change to read and write them.
--
-- ---------------------------------------------------------------------------
-- THESE COLUMNS ARE NOT TAMPER-EVIDENCE. READ THIS BEFORE CITING THEM.
--
-- Only two things in the bundle are asserted by this system:
--
--   signed_at        the server clock at the moment the write happened
--   signature_hash   computed server-side by ContractService over the contract
--                    id, reference, version, body text, signatory name, method
--                    and timestamp. It binds a later copy of the document to
--                    what was signed. It does NOT bind an identity.
--
-- EVERYTHING ELSE IS SELF-ASSERTED BY WHOEVER HELD THE SIGNING LINK:
--
--   signatory_name_claimed        typed into the request body
--   signatory_ip_claimed          read from the X-Forwarded-For header
--   signatory_user_agent_claimed  read from the User-Agent header
--   signature_method / signature_data   posted in the request body
--   counter_signed_by_name        a label passed by the ERP caller
--
-- The signing link is a bearer token: possession of the URL is the whole
-- authentication story, and the columns above record what the holder of that
-- URL SAID, not what anyone verified. X-Forwarded-For in particular is set by
-- the client and rewritten by proxies; a caller can put any string in it. The
-- `_claimed` suffix is deliberate and load-bearing — an audit certificate that
-- prints "signed from 185.192.44.10" is printing a claim, and a column called
-- signatory_ip invites a reader (or a court) to mistake it for a measurement.
--
-- NOT FIXED HERE, on purpose. Making these into evidence needs a different
-- authentication story for the signing flow (an identity-verified signer, or a
-- signature provider that issues its own certificate), not a column rename.
-- Recording the claim under an honest name is strictly better than the status
-- quo, which recorded nothing at all — and better than the state before that,
-- where the service defaulted the IP to a hardcoded '185.192.44.10' and the
-- user agent to 'Mozilla/5.0 Web browser', i.e. fabricated the evidence.
--
-- ---------------------------------------------------------------------------
-- WHY signature_data IS A text COLUMN AND NOT A STORAGE PATH
--
-- Every other image in this schema is a Storage object behind a path or a URL
-- (document_path, proof_path, logo_path, avatar_url). A signature image ought
-- to be one too. It is a text column here because the only writer is
-- BaseRepository.update() — a single-statement row patch — and the payload
-- arrives as a data: URL inside that patch. There is no upload step in the
-- write path to hook, and ContractService is owned elsewhere and not being
-- edited. Storing the data URL keeps the evidence; a future change that moves
-- signing through Storage should add signature_path and backfill from here.
--
-- The column is bounded (see the CHECKs) so one signature cannot make a row
-- unbounded, and the mapper truncates to the same limits before writing, so
-- the constraints below can only ever fire for a writer that bypasses it —
-- Studio, a seed script, raw SQL. That is deliberate: a header long enough to
-- trip a CHECK must not be able to abort a customer's signature.
--
-- ---------------------------------------------------------------------------
-- WHAT IS STILL MISSING AFTER THIS (unchanged, still in KNOWN LOSSES)
--
--   sent_at        sendToCustomer() still only moves status to 'sent'. Left
--                  alone: it is not part of the signature evidence bundle and
--                  belongs with whoever revisits that method.
--   workspaceId, vat, total, parkingSpaces, lockerUnit, 'Viewed' status
--                  see the header of mappings/contracts.js.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
alter table public.contracts
  -- The customer side of the signature. signed_by (uuid, migration 004) is the
  -- profile when a signed-in user signs; this is the name typed into the form,
  -- which is usually the only thing there is, because the signing link does
  -- not require a session. Same pairing as contract_versions.created_by /
  -- created_by_name.
  add column if not exists signatory_name_claimed       text,
  add column if not exists signatory_ip_claimed         text,
  add column if not exists signatory_user_agent_claimed text,

  -- 'draw' | 'type' | 'upload' — the ERP dialect is Title Case ('Draw'); the
  -- mapper translates, as it already does for status.
  add column if not exists signature_method             text,

  -- data: URL of the drawn/typed/uploaded signature image.
  add column if not exists signature_data               text,

  -- Lowercase sha256 hex, 64 chars. The one genuinely server-derived field.
  add column if not exists signature_hash               text,

  -- The counter-signature. Text, not a profiles FK: counterSign() is called
  -- with a role label ('CEO / Operations Manager') and often by automation
  -- with no signed-in user, exactly like contract_versions.created_by_name.
  add column if not exists counter_signed_by_name       text,
  add column if not exists counter_signed_at            timestamptz;

-- ---------------------------------------------------------------------------
-- Constraints
--
-- Added as separate statements because Postgres has no
-- `add constraint if not exists`; the drop-then-add pair is what the rest of
-- this directory does (see migration 018 on bookings_status_check) and keeps
-- the migration re-runnable. All existing rows have NULL in every new column,
-- so validation is a no-op scan.
-- ---------------------------------------------------------------------------
alter table public.contracts drop constraint if exists contracts_signature_method_check;
alter table public.contracts
  add constraint contracts_signature_method_check
  check (signature_method is null or signature_method in ('draw', 'type', 'upload'));

alter table public.contracts drop constraint if exists contracts_signature_hash_check;
alter table public.contracts
  add constraint contracts_signature_hash_check
  check (signature_hash is null or signature_hash ~ '^[0-9a-f]{64}$');

alter table public.contracts drop constraint if exists contracts_signature_bounds_check;
alter table public.contracts
  add constraint contracts_signature_bounds_check
  check (
        length(signatory_name_claimed)       <= 200
    and length(signatory_ip_claimed)         <= 100
    and length(signatory_user_agent_claimed) <= 500
    and length(counter_signed_by_name)       <= 200
    and length(signature_data)               <= 1000000
  );

-- No index on any of these. Nothing looks a contract up by signature: the
-- certificate is fetched by id and the signing flow by signing_token, which is
-- already unique. An index here would be write cost for no read.

-- ---------------------------------------------------------------------------
-- RLS, grants, trigger
--
-- public.contracts already has all three from migrations 004 and 012, and new
-- columns inherit every one of them. Re-asserted below rather than assumed,
-- because a reader of this file should be able to see the posture without
-- opening two others — and because `enable`, `drop policy if exists` and
-- `drop trigger if exists` are all idempotent.
--
-- ENABLE, not FORCE: force applies policies to the table owner, and the authz
-- helpers in migration 010 are SECURITY DEFINER running as that owner, so
-- is_staff() would end up filtered by the policy whose predicate it is.
--
-- No functions are created here, so there is no EXECUTE-to-PUBLIC default to
-- revoke — the same situation as migration 021. The touch trigger is the
-- existing shared public.touch_updated_at(), which is why a signature write
-- moves updated_at without the mapper touching it.
-- ---------------------------------------------------------------------------
alter table public.contracts enable row level security;

drop policy if exists contracts_staff_write on public.contracts;
create policy contracts_staff_write on public.contracts
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

drop trigger if exists contracts_touch on public.contracts;
create trigger contracts_touch before update on public.contracts
  for each row execute function public.touch_updated_at();

-- EXPOSURE, stated rather than hidden: contracts_read_own (migration 012) lets
-- any authenticated member of the owning company SELECT their company's
-- contracts, and `grant select on public.contracts to authenticated` is a
-- TABLE-level grant, so these columns are readable by every colleague in that
-- company — signature image, claimed IP and user agent included. That is a
-- widening, however small: before this migration there was nothing to read.
--
-- It is left as is because the alternatives are worse in this migration.
-- Revoking a column subset is not possible while the table-level SELECT grant
-- stands; replacing it with an explicit column list would silently hide any
-- column a later migration adds from the member apps. The real fix, if the
-- exposure matters, is a staff-only contract_signatures table with the bundle
-- moved into it — which the ERP's single-row repository write path cannot
-- reach today. Anonymous callers are unaffected: anon holds no grant on
-- contracts at all and is refused before RLS is consulted.

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------
comment on column public.contracts.signatory_name_claimed is
  'Name typed into the public signing form. SELF-ASSERTED by whoever held the signing link — never verified against an identity. Use signed_by for the authenticated profile, when there is one.';

comment on column public.contracts.signatory_ip_claimed is
  'Client address as read from the X-Forwarded-For header at signing time. SELF-ASSERTED: that header is set by the caller and rewritten by every proxy in front of it, so this is evidence of what was claimed, not a measurement. NULL when the platform supplied nothing — it is never defaulted to a plausible-looking address.';

comment on column public.contracts.signatory_user_agent_claimed is
  'User-Agent header at signing time. SELF-ASSERTED, same caveat as signatory_ip_claimed. Truncated to 500 characters by the mapper.';

comment on column public.contracts.signature_method is
  'How the signature was produced: draw | type | upload. Posted by the client, so it describes the widget used, not a verified act. Rendered in the ERP as Draw/Type/Upload.';

comment on column public.contracts.signature_data is
  'data: URL of the signature image, up to 1 MB. Held inline rather than in Storage because the write path is a single-row repository patch with no upload step; see the header of this migration. Excluded from nothing at the API layer — treat it as personal data.';

comment on column public.contracts.signature_hash is
  'Lowercase sha256 hex over contract id, reference, version, body text, signatory name, method and timestamp, computed server-side by ContractService.customerSign(). The one field here that is genuine evidence: a holder can re-hash their copy of the document and compare. It binds the DOCUMENT, not the SIGNER.';

comment on column public.contracts.counter_signed_by_name is
  'Label of the Mars Space executive who counter-signed, e.g. "CEO / Operations Manager". A label, not a profiles FK: counterSign() is routinely called by automation with no signed-in user. Mirrors contract_versions.created_by_name.';

comment on column public.contracts.counter_signed_at is
  'Server clock when the contract was counter-signed and moved to active. Server-side, like signed_at.';
