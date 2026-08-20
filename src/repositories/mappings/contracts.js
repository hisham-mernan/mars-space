/**
 * MAPPING: collection "contracts"  ->  public.contracts
 *
 * See ./README.md for the module contract.
 *
 * ---------------------------------------------------------------------------
 * THIS IS THE THINNEST TABLE IN THE MIGRATION. READ THE GAP LIST.
 *
 * public.contracts has twenty-six columns:
 *   id, reference, company_id, plan_id, branch_id, starts_on, ends_on,
 *   monthly_rate, credit_hours_per_period, notice_days, auto_renew, status,
 *   signed_at, signed_by, signing_token, document_path, created_at, updated_at,
 *   and, since migration 023, the e-signature evidence bundle:
 *   signatory_name_claimed, signatory_ip_claimed, signatory_user_agent_claimed,
 *   signature_method, signature_data, signature_hash, counter_signed_by_name,
 *   counter_signed_at
 *
 * ContractService writes roughly thirty fields. Everything it writes that has
 * no column is enumerated under KNOWN LOSSES below - nothing is dropped
 * silently, and that list IS the inventory for the follow-up migration.
 *
 * ---------------------------------------------------------------------------
 * NON-OBVIOUS FIELD -> COLUMN PAIRS
 *
 *   contractNumber   -> reference          (default next_contract_reference())
 *   customerId       -> company_id         (a companies FK, NOT a profiles FK)
 *   startDate        -> starts_on
 *   endDate          -> ends_on            (CHECK ends_on > starts_on)
 *   monthlyFee       -> monthly_rate
 *   signingToken     -> signing_token      (UNIQUE)
 *   meetingCredits   -> credit_hours_per_period    <-- see the note below
 *   signatoryName    -> signatory_name_claimed       <-- see THE EVIDENCE
 *   signatoryIp      -> signatory_ip_claimed             BUNDLE below; the
 *   signatoryUserAgent -> signatory_user_agent_claimed   _claimed suffix is
 *   counterSignedBy  -> counter_signed_by_name           deliberate
 *   companyName / customerName -> no column; from the embedded company
 *   planName         -> no column; from the embedded membership_plan
 *   version, content, contentAr, templateId, templateName
 *                    -> no columns; DERIVED from the embedded contract_versions
 *
 * meetingCredits -> credit_hours_per_period is a DELIBERATE DEVIATION from
 * README section 8, which lists meeting_credits among the missing columns. The
 * ERP's meetingCredits is rendered as "{{MeetingCredits}} Hours / Month" and
 * credit_hours_per_period is numeric NOT NULL DEFAULT 0 with exactly that
 * meaning, so they are the same quantity under two names. Mapping it keeps real
 * data instead of discarding it; flagged here because it is not a name a
 * reviewer would guess.
 *
 * ---------------------------------------------------------------------------
 * STATUS VOCABULARY
 *
 * contracts_status_check: draft, sent, signed, active, expiring, terminated,
 * expired. The ERP speaks a slightly different dialect:
 *
 *   'Draft'            <-> draft
 *   'Sent to Customer' <-> sent          (README section 8; toTitleCase alone
 *                                         would give 'Sent')
 *   'Signed'           <-> signed
 *   'Active'           <-> active
 *   'Expiring' / 'Expired' / 'Terminated' <-> the obvious values
 *
 * WARNING - 'Viewed' HAS NO COLUMN VALUE. ContractService.getContractByToken()
 * patches status to 'Viewed' the first time a customer opens a signing link,
 * and the ERP contracts page renders a 'Viewed' filter tab. There is no
 * 'viewed' in the CHECK, so it is written as 'sent' and reads back as
 * 'Sent to Customer'. Consequences, stated rather than hidden:
 *   - the write is a no-op in effect, so getContractByToken re-issues it on
 *     every open. It is idempotent, so this is harmless, just wasteful.
 *   - the ERP's 'Viewed' tab will always be empty.
 * Restoring it needs either a 'viewed' status value or a viewed_at column.
 *
 * ---------------------------------------------------------------------------
 * KNOWN LOSSES - written by ContractService, no column on public.contracts.
 * All are returned as null by toDocument and dropped by toRow.
 *
 *   templateName, customerName*, companyName*, planName*  (* derived on read
 *                  from the embeds, but not persisted on write)
 *   workspaceId, workspaceName, officeNumber   the allocated office; the
 *                  CONTRACT_ACTIVATED handler reads contract.workspaceId to
 *                  flip a resource to Occupied, so that automation is now inert
 *                  until a contracts.resource_id column exists.
 *   vat, total     no columns. ContractService wrote monthlyFee * 0.15 and
 *                  * 1.15. Returned as null rather than recomputed here: the
 *                  VAT rate is a finance rule (invoices carries its own
 *                  vat_rate column) and duplicating a hardcoded 0.15 in a
 *                  mapper is how two sources of truth start. CONSEQUENCE: the
 *                  CONTRACT_ACTIVATED handler does `contract.total ||
 *                  contract.monthlyFee`, so the auto-generated first invoice is
 *                  now raised at the NET monthly rate, not the gross.
 *   parkingSpaces, lockerUnit
 *   sentAt         sendToCustomer() only moves status to 'sent'. Still lost:
 *                  it is not part of the signature bundle and was left to
 *                  whoever revisits that method.
 *
 * The e-signature bundle used to head this list. It no longer does - migration
 * 023 added the eight columns and they are mapped below. Read the next section
 * before citing any of them.
 *
 * ---------------------------------------------------------------------------
 * THE EVIDENCE BUNDLE - WHAT IT PROVES, AND WHAT IT ONLY CLAIMS
 *
 * customerSign() patches eight fields (status, signedAt, signatoryName,
 * signatoryIp, signatoryUserAgent, signatureMethod, signatureData,
 * signatureHash); counterSign() patches three (status, counterSignedBy,
 * counterSignedAt). Until migration 023 this mapper emitted two of the first
 * eight and one of the last three, so getAuditCertificate() - a legal artefact
 * - rendered nulls for every signatory field of every signed contract. All
 * eleven are now round-tripped.
 *
 * TWO of them are asserted by this system:
 *   signedAt / counterSignedAt  the server clock at the moment of the write.
 *   signatureHash               sha256 computed server-side over the contract
 *                  id, reference, version, body text, signatory name, method
 *                  and timestamp. A holder can re-hash their copy of the
 *                  document and compare, which is a real check - but it binds
 *                  the DOCUMENT, not the SIGNER.
 *
 * THE REST ARE SELF-ASSERTED BY WHOEVER HELD THE SIGNING LINK:
 *   signatoryName        typed into the request body.
 *   signatoryIp          read from the X-Forwarded-For header, which is set by
 *                        the client and rewritten by every proxy in front of
 *                        it. A caller can put any string in it.
 *   signatoryUserAgent   read from the User-Agent header. Same.
 *   signatureMethod, signatureData   posted in the request body.
 *   counterSignedBy      a label the ERP caller passes, defaulted to
 *                        'CEO / Operations Manager' by the service.
 *
 * The signing link is a bearer token: possession of the URL is the whole
 * authentication story. So these columns record what the holder of that URL
 * SAID, not what anyone verified - which is why the columns carry a _claimed
 * suffix and this mapper does not quietly rename it away. An audit certificate
 * that prints "signed from 185.192.44.10" is printing a claim, and a field
 * called signatoryIp invites a reader to mistake it for a measurement.
 *
 * NOT FIXED HERE, deliberately. Turning a claim into evidence needs a
 * different authentication story for the signing flow (an identity-verified
 * signer, or a signature provider that issues its own certificate), not a
 * rename and not a mapper change. Recording the claim under an honest name is
 * strictly better than recording nothing, and better still than the state
 * before that, where the service defaulted the IP to a hardcoded
 * '185.192.44.10' and the user agent to 'Mozilla/5.0 Web browser' - fabricated
 * evidence in the one place that must not carry any.
 *
 * BOUNDS, not validation: signatoryIp and signatoryUserAgent come straight off
 * headers this mapper does not control, and signatureData can be a megabyte of
 * base64. Each is truncated to the width its column allows (100 / 500 /
 * 1000000) before the write. The matching CHECK constraints therefore only
 * ever fire for a writer that bypasses this mapper - which is the point: a
 * caller must not be able to abort a customer's signature by sending a long
 * header.
 *
 * TWO CONSEQUENCES OF STORING THE BUNDLE, BOTH REAL, NEITHER FIXED HERE:
 *   1. public.contracts carries an AFTER trigger, audit_contracts ->
 *      record_audit(), which writes to_jsonb(new) of the WHOLE row into
 *      audit_log. Every contract update therefore copies signature_data and
 *      the claimed IP into an audit row (as it already copied signing_token).
 *      Nothing here can narrow that: the trigger takes the whole row.
 *   2. contracts_read_own (migration 012) plus a TABLE-level
 *      `grant select on public.contracts to authenticated` means any member of
 *      the owning company can read these columns over PostgREST - signature
 *      image included. Anonymous callers cannot: anon holds no grant at all.
 *      Both are argued in the header of migration 023, which also explains why
 *      a column-list grant would be a worse cure than the disease.
 *
 * ---------------------------------------------------------------------------
 * NOT NULL COLUMNS WITH NO DEFAULT: company_id, branch_id, monthly_rate
 * (starts_on too, defaulted here to today in Riyadh). toRow throws a message
 * naming the DOCUMENT field when one is missing or unusable on create, rather
 * than letting Postgres emit a null-constraint violation naming a column the
 * services have never heard of. ContractService currently passes
 * customerId: 'usr-01' and no branchId at all, so createContract() fails loudly
 * until the caller supplies real uuids - which is the correct outcome, not a
 * regression to paper over.
 *
 * isDeleted is derived from status === 'terminated' (the softDelete target).
 * No activeFilter: terminated contracts stay in the ERP list (README section 8).
 */

import { put, num, toSnakeCase, toDateOnly, isUuid } from './_helpers';

/** contracts_status_check */
const CONTRACT_STATUSES = [
  'draft', 'sent', 'signed', 'active', 'expiring', 'terminated', 'expired',
];

/** column value -> the Title Case status the ERP pages compare against. */
const STATUS_TO_DOCUMENT = {
  draft: 'Draft',
  sent: 'Sent to Customer',
  signed: 'Signed',
  active: 'Active',
  expiring: 'Expiring',
  terminated: 'Terminated',
  expired: 'Expired',
};

/** snake-cased document status -> column value. See the header on 'Viewed'. */
const STATUS_TO_COLUMN = {
  draft: 'draft',
  sent: 'sent',
  sent_to_customer: 'sent',
  viewed: 'sent',
  signed: 'signed',
  active: 'active',
  expiring: 'expiring',
  terminated: 'terminated',
  expired: 'expired',
  cancelled: 'terminated',
  canceled: 'terminated',
};

function statusToColumn(value) {
  const snake = toSnakeCase(value);
  const column = STATUS_TO_COLUMN[snake];
  if (!column) {
    throw new Error(
      `[contracts -> public.contracts] unknown status ${JSON.stringify(value)} ` +
        `(mapped to "${snake}"). contracts_status_check accepts: ${CONTRACT_STATUSES.join(', ')}. ` +
        `Known document statuses: ${Object.keys(STATUS_TO_COLUMN).join(', ')}.`
    );
  }
  return column;
}

/** contracts_signature_method_check. Same lowercase dialect as status. */
const SIGNATURE_METHODS = ['draw', 'type', 'upload'];

/** column value -> the Title Case method the ERP and the certificate render. */
const METHOD_TO_DOCUMENT = { draw: 'Draw', type: 'Type', upload: 'Upload' };

/** snake-cased document method -> column value. */
const METHOD_TO_COLUMN = {
  draw: 'draw',
  drawn: 'draw',
  type: 'type',
  typed: 'type',
  upload: 'upload',
  uploaded: 'upload',
};

function signatureMethodToColumn(value) {
  const snake = toSnakeCase(value);
  const column = METHOD_TO_COLUMN[snake];
  if (!column) {
    throw new Error(
      `[contracts -> public.contracts] unknown signatureMethod ${JSON.stringify(value)} ` +
        `(mapped to "${snake}"). contracts_signature_method_check accepts: ` +
        `${SIGNATURE_METHODS.join(', ')}. ContractService.customerSign() only ever ` +
        `produces Draw, Type or Upload.`
    );
  }
  return column;
}

const SHA256_HEX = /^[0-9a-f]{64}$/;

/**
 * The only field in the bundle that is evidence rather than a claim, so its
 * shape is checked here as well as by contracts_signature_hash_check. Rejecting
 * in the mapper names the DOCUMENT field; letting Postgres do it would raise a
 * 23514 naming a constraint the services have never heard of.
 */
function signatureHashToColumn(value) {
  const hex = String(value).trim().toLowerCase();
  if (!SHA256_HEX.test(hex)) {
    throw new Error(
      `[contracts -> public.contracts] signatureHash must be 64 lowercase hex ` +
        `characters (a sha256 digest); received ${JSON.stringify(value)}. ` +
        `ContractService.customerSign() computes it with createHash('sha256'). ` +
        `The pre-Supabase placeholder format \`hash-<millis>-<random>\` is not a ` +
        `digest and is not accepted.`
    );
  }
  return hex;
}

/**
 * Truncate to a column's width. See BOUNDS, not validation in the header:
 * these values arrive from headers and request bodies, and a signature must
 * not fail because one of them was long.
 */
function clampTo(max) {
  return (value) => {
    const text = String(value).trim();
    if (!text) return null;
    return text.length > max ? text.slice(0, max) : text;
  };
}

function uuidOrNull(value) {
  return isUuid(value) ? value : null;
}

/**
 * The newest embedded contract_versions row, or null.
 * `version`, `content`, `contentAr` and `templateId` on the document are all
 * projections of it; public.contracts stores none of them.
 */
function latestVersion(row) {
  const versions = Array.isArray(row?.versions) ? row.versions.filter(Boolean) : [];
  if (versions.length === 0) return null;
  return versions.reduce((best, v) =>
    (Number(v?.version) || 0) > (Number(best?.version) || 0) ? v : best
  );
}

const mapping = {
  table: 'contracts',

  /**
   * The embeds carry every name the old flat document had. `versions` is the
   * whole amendment history because `version` is max(version) and `content` is
   * the newest body - PostgREST cannot limit an embedded set from the select
   * list, and the volumes here are a handful of rows per contract.
   */
  selectColumns: [
    '*',
    'company:companies(id,name,name_ar,billing_email)',
    'branch:branches(id,slug,name,name_ar)',
    'plan:membership_plans(id,slug,name,name_ar,rate)',
    'signer:profiles!contracts_signed_by_fkey(id,full_name,full_name_ar,email)',
    'versions:contract_versions(id,version,content,content_ar,document_path,reason,created_at,template_id,template:contract_templates(id,slug,name))',
  ].join(','),

  idColumn: 'id',
  defaultOrder: { column: 'created_at', ascending: false },

  // No activeFilter: terminated contracts stay in the ERP list (README section 8).

  filters: {
    customerId: 'company_id',
    companyId: 'company_id',
    branchId: 'branch_id',
    planId: 'plan_id',
    contractNumber: 'reference',
    reference: 'reference',
    signingToken: 'signing_token',
    autoRenew: 'auto_renew',
    startDate: 'starts_on',
    endDate: 'ends_on',
    status: { column: 'status', toColumn: statusToColumn },
  },

  softDelete: { column: 'status', value: 'terminated' },

  toDocument(row) {
    if (!row) return null;

    const companyName = row.company?.name ?? null;
    const latest = latestVersion(row);
    const monthlyFee = num(row.monthly_rate) ?? 0;

    return {
      id: row.id,
      contractNumber: row.reference ?? null,

      customerId: row.company_id ?? null,
      // contracts has no per-person link other than signed_by, so the customer
      // name is the company's, with the signer's name preferred when known.
      customerName: row.signer?.full_name ?? companyName,
      companyName,
      customerEmail: row.company?.billing_email ?? null,

      branchId: row.branch_id ?? null,
      branchSlug: row.branch?.slug ?? null,
      branchName: row.branch?.name ?? null,

      planId: row.plan_id ?? null,
      planName: row.plan?.name ?? null,

      startDate: row.starts_on ?? null,
      endDate: row.ends_on ?? null,

      monthlyFee,
      // No vat/total columns - see KNOWN LOSSES. Not recomputed on purpose.
      vat: null,
      total: null,

      // The ERP's "meeting credits, hours per month".
      meetingCredits: num(row.credit_hours_per_period) ?? 0,
      noticeDays: row.notice_days ?? null,
      autoRenew: row.auto_renew ?? null,

      status: STATUS_TO_DOCUMENT[row.status] ?? 'Draft',

      // Projections of contract_versions; public.contracts stores none of them.
      version: latest ? Number(latest.version) || 1 : 1,
      content: latest?.content ?? null,
      contentAr: latest?.content_ar ?? null,
      templateId: latest?.template_id ?? null,
      templateName: latest?.template?.name ?? null,

      signingToken: row.signing_token ?? null,
      signedAt: row.signed_at ?? null,
      signedBy: row.signed_by ?? null,
      documentPath: row.document_path ?? latest?.document_path ?? null,

      // The e-signature evidence bundle. READ THE EVIDENCE BUNDLE SECTION IN
      // THE HEADER: everything on this side of the pairs except signedAt,
      // counterSignedAt and signatureHash is what the holder of the signing
      // link claimed, not something this system verified. The document field
      // names are fixed by ContractService and getAuditCertificate(), which is
      // why the caveat lives in the column names and in these comments rather
      // than in the keys.
      signatoryName: row.signatory_name_claimed ?? null,
      signatoryIp: row.signatory_ip_claimed ?? null,                 // X-Forwarded-For, unverified
      signatoryUserAgent: row.signatory_user_agent_claimed ?? null,  // User-Agent, unverified
      signatureMethod: METHOD_TO_DOCUMENT[row.signature_method] ?? null,
      signatureData: row.signature_data ?? null,
      signatureHash: row.signature_hash ?? null,                     // server-computed; binds the document
      counterSignedBy: row.counter_signed_by_name ?? null,           // a role label, not a profile
      counterSignedAt: row.counter_signed_at ?? null,

      // No columns; see KNOWN LOSSES in the header.
      workspaceId: null,
      workspaceName: null,
      officeNumber: null,
      parkingSpaces: null,
      lockerUnit: null,
      sentAt: null,

      isDeleted: row.status === 'terminated',
      createdAt: row.created_at ?? null,
      updatedAt: row.updated_at ?? null,
    };
  },

  toRow(doc, mode) {
    const row = {};
    if (!doc) return row;

    // reference has a next_contract_reference() default; an explicitly supplied
    // ERP contract number is written instead (it is UNIQUE, and the ERP shows it).
    put(row, 'reference', doc.contractNumber);

    put(row, 'company_id', doc.customerId !== undefined ? doc.customerId : doc.companyId, uuidOrNull);
    put(row, 'branch_id', doc.branchId, uuidOrNull);
    put(row, 'plan_id', doc.planId, uuidOrNull);

    put(row, 'starts_on', doc.startDate, toDateOnly);
    put(row, 'ends_on', doc.endDate, toDateOnly);

    put(row, 'monthly_rate', doc.monthlyFee, Number);
    put(row, 'credit_hours_per_period', doc.meetingCredits, Number);
    put(row, 'notice_days', doc.noticeDays, Number);
    put(row, 'auto_renew', doc.autoRenew, Boolean);

    put(row, 'status', doc.status, statusToColumn);

    put(row, 'signed_at', doc.signedAt);
    put(row, 'signed_by', doc.signedBy, uuidOrNull);
    put(row, 'signing_token', doc.signingToken);
    put(row, 'document_path', doc.documentPath);

    // The e-signature evidence bundle, all eight fields customerSign() and
    // counterSign() patch beyond status and signed_at. put() only assigns
    // defined values, so a status-only update still touches nothing here, and
    // an explicit null (customerSign passes metadata.ip ?? null) is written as
    // null rather than skipped - "the platform supplied no address" is a fact
    // worth recording, and is not the same as never having asked.
    put(row, 'signatory_name_claimed', doc.signatoryName, clampTo(200));
    put(row, 'signatory_ip_claimed', doc.signatoryIp, clampTo(100));
    put(row, 'signatory_user_agent_claimed', doc.signatoryUserAgent, clampTo(500));
    put(row, 'signature_method', doc.signatureMethod, signatureMethodToColumn);
    put(row, 'signature_data', doc.signatureData, clampTo(1_000_000));
    put(row, 'signature_hash', doc.signatureHash, signatureHashToColumn);
    put(row, 'counter_signed_by_name', doc.counterSignedBy, clampTo(200));
    put(row, 'counter_signed_at', doc.counterSignedAt);

    if (mode === 'create') {
      // A contract starting today is the only defensible default; the other
      // three NOT NULL columns have no sane one and are demanded instead.
      row.starts_on ??= toDateOnly(new Date());

      const missing = [];
      if (!row.company_id) missing.push('customerId -> company_id (a public.companies uuid)');
      if (!row.branch_id) missing.push('branchId -> branch_id (a public.branches uuid)');
      if (row.monthly_rate === undefined || row.monthly_rate === null) {
        missing.push('monthlyFee -> monthly_rate');
      }
      if (missing.length) {
        throw new Error(
          '[contracts -> public.contracts] cannot create a contract: ' +
            `${missing.join('; ')} ${missing.length === 1 ? 'is' : 'are'} required ` +
            '(NOT NULL with no default). ' +
            'ContractService still passes legacy db.json ids such as ' +
            `customerId: 'usr-01' and no branchId at all; those cannot become uuids here. ` +
            `Received: customerId=${JSON.stringify(doc.customerId ?? doc.companyId ?? null)}, ` +
            `branchId=${JSON.stringify(doc.branchId ?? null)}, ` +
            `monthlyFee=${JSON.stringify(doc.monthlyFee ?? null)}.`
        );
      }
    }

    // Dropped here because no column exists - see KNOWN LOSSES in the header:
    // templateId, templateName, customerName, companyName, planName,
    // workspaceId, workspaceName, officeNumber, vat, total, parkingSpaces,
    // lockerUnit, version, content, contentAr, sentAt.
    return row;
  },
};

export default mapping;
