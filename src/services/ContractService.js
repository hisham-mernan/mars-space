import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  contractRepository,
  contractTemplateRepository,
  contractVersionRepository,
  workspaceRepository,
  userRepository
} from '@/repositories';
import { eventBus, DOMAIN_EVENTS } from '@/core/events/EventBus';
import { auditLogService } from './AuditLogService';
import { workspaceService } from './WorkspaceService';
import { invoiceService } from './InvoiceService';

/**
 * ============================================================================
 * THE SIGNING TOKEN IS A CREDENTIAL.
 * ============================================================================
 *
 * /api/v1/public/contracts/sign/[token] has no session, no cookie and no
 * header behind it — it is reached by a customer who was emailed a link. The
 * token in the URL is the ONLY thing standing between an anonymous request and
 * a contract, and underneath it BaseRepository queries with the service-role
 * client, so RLS will not catch a mistake here.
 *
 * Everything below follows from treating it as a bearer secret rather than an
 * id:
 *   - it is minted from crypto.randomBytes, never Math.random;
 *   - it is compared in constant time, over digests so that length alone leaks
 *     nothing;
 *   - every failure mode — malformed, unknown, or valid-but-already-consumed —
 *     produces the SAME error, so the endpoint is not an oracle that tells an
 *     attacker "this token exists, it has just been used";
 *   - no Supabase/Postgres error text ever reaches the response body.
 */

/** Shape of a signing token. Deliberately permissive enough for legacy tokens. */
const SIGNING_TOKEN_RE = /^[A-Za-z0-9_-]{8,200}$/;

/**
 * Statuses at which a signing link is live.
 *
 * Note what is absent. 'Draft' is absent: a contract nobody has sent must not
 * be readable from a public URL. Everything at or past 'Signed' is absent: once
 * the token has been redeemed it is spent, and a spent token must be
 * indistinguishable from one that never existed.
 *
 * (The contracts mapping folds 'Viewed' onto the `sent` column value, so a
 * viewed contract reads back as 'Sent to Customer'; both are listed so the set
 * stays correct if a real `viewed` status is ever added.)
 */
const SIGNABLE_STATUSES = new Set(['Sent to Customer', 'Viewed']);

/** A decoy of realistic shape, compared against when no row was found. */
const DECOY_TOKEN = 'x'.repeat(43);

/**
 * Constant-time string equality.
 *
 * timingSafeEqual requires equal-length buffers, and bailing out on a length
 * mismatch would leak the length of the real token. Hashing both sides first
 * makes every comparison a fixed 32-byte one.
 */
function constantTimeEquals(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const da = createHash('sha256').update(a, 'utf8').digest();
  const db = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(da, db);
}

/**
 * The single error every signing-token failure raises.
 *
 * One message, one code, no detail — the caller learns only that the link does
 * not work. `logDetail` is for the server log and is never serialised into a
 * response by the routes that own this contract.
 */
function invalidSigningLink(logDetail) {
  const err = new Error('Invalid or expired signing link');
  err.code = 'INVALID_SIGNING_LINK';
  err.publicMessage = 'Invalid or expired signing link';
  err.logDetail = logDetail;
  return err;
}

function contractNotFound(logDetail) {
  const err = new Error('Contract not found');
  err.code = 'CONTRACT_NOT_FOUND';
  err.publicMessage = 'Contract not found';
  err.logDetail = logDetail;
  return err;
}

export class ContractService {
  constructor() {
    this._registerEventHandlers();
  }

  _registerEventHandlers() {
    // Event-driven Downstream Automation upon CONTRACT_ACTIVATED
    eventBus.subscribe(DOMAIN_EVENTS.CONTRACT_ACTIVATED, async (event) => {
      const { contract } = event.payload;

      // 1. Workspace Allocation (Mark workspace occupied if workspaceId provided)
      if (contract.workspaceId) {
        try {
          await workspaceService.updateWorkspace(contract.workspaceId, {
            status: 'Occupied',
            currentTenant: contract.companyName || contract.customerName
          }, 'System CLM Automation');
        } catch (err) {
          console.error('CLM Automation: Failed updating workspace status:', err);
        }
      }

      // 2. Generate First Membership Invoice
      try {
        await invoiceService.createInvoice({
          customerId: contract.customerId,
          customerName: contract.customerName,
          companyName: contract.companyName,
          type: 'Contract Invoice',
          description: `Contract ${contract.contractNumber} - ${contract.planName || 'Workspace Agreement'}`,
          amount: contract.total || contract.monthlyFee,
          dueDate: contract.startDate || new Date().toISOString().split('T')[0],
          status: 'Unpaid'
        });
      } catch (err) {
        console.error('CLM Automation: Failed generating contract invoice:', err);
      }
    });
  }

  /**
   * Placeholder Interpolation Engine
   */
  interpolate(templateText, data) {
    if (!templateText) return '';
    let text = templateText;
    const placeholders = {
      '{{CustomerName}}': data.customerName || 'Valued Customer',
      '{{Company}}': data.companyName || 'Individual Member',
      '{{OfficeNumber}}': data.officeNumber || 'Suite A-101',
      '{{Workspace}}': data.workspaceName || 'Private Office',
      '{{ContractStart}}': data.startDate || new Date().toISOString().split('T')[0],
      '{{ContractEnd}}': data.endDate || '2026-12-31',
      '{{MonthlyPrice}}': data.monthlyFee || 4800,
      '{{VAT}}': Math.round((data.monthlyFee || 4800) * 0.15),
      '{{Total}}': Math.round((data.monthlyFee || 4800) * 1.15),
      '{{MemberBenefits}}': data.benefits || 'High-Speed Wi-Fi, 24/7 Access, Coffee Lounge',
      '{{Parking}}': data.parkingSpaces ? `${data.parkingSpaces} Reserved Slots` : 'Standard Parking',
      '{{Locker}}': data.lockerUnit || 'Locker #14',
      '{{MeetingCredits}}': data.meetingCredits ? `${data.meetingCredits} Hours / Month` : '15 Hours / Month',
      '{{AuthorizedSignatory}}': data.signatory || data.customerName || 'Authorized Executive'
    };

    Object.keys(placeholders).forEach(key => {
      const re = new RegExp(key, 'g');
      text = text.replace(re, placeholders[key]);
    });

    return text;
  }

  /**
   * NO SEED FALLBACK. An empty contracts table returns an empty list.
   *
   * This method used to fabricate a contract ('con-5001', signing token
   * 'st-seed-5001') whenever the table came back empty — a leftover from the
   * db.json era. Two things were wrong with it. It handed out a signing token
   * that anybody could type, on a route where that token IS the credential; and
   * it meant a migration that had silently written zero rows still rendered a
   * plausible-looking contract, so the failure was invisible. An empty table
   * must read as empty: that is how a broken migration announces itself.
   */
  async getContracts(filters = {}) {
    let list = await contractRepository.findAll();

    // Filtered in memory rather than pushed down: `status` arrives from an ERP
    // query string, and the mapping's status translator THROWS on a value
    // outside contracts_status_check, which would turn a stray query parameter
    // into a 500. Case-insensitive comparison, as before.
    if (filters.status) {
      const wanted = String(filters.status).toLowerCase();
      list = list.filter(c => String(c.status || '').toLowerCase() === wanted);
    }
    if (filters.customerId) {
      list = list.filter(c => c.customerId === filters.customerId);
    }
    return list;
  }

  /**
   * One contract by primary key, or null.
   *
   * Goes straight to the row rather than fetching every contract and finding it
   * in memory: at this layer the service-role client would otherwise pull every
   * tenant's contract across the wire to answer a question about one of them.
   *
   * findById returns null both for an id that matches nothing and for a
   * malformed one (Postgres 22P02), which is what makes "unknown id" and
   * "garbage id" indistinguishable to a caller.
   */
  async getContractById(id) {
    if (typeof id !== 'string' || id === '') return null;
    return contractRepository.findById(id);
  }

  /**
   * Resolve a signing token to a contract, or throw the one generic error.
   *
   * Every rejection path — bad shape, no such token, a row whose token somehow
   * does not survive the constant-time re-check, a contract that is not
   * currently signable — raises the SAME error. An attacker probing tokens
   * learns nothing beyond "not a working link".
   *
   * The constant-time comparison is belt-and-braces: the lookup itself is a
   * Postgres equality on a UNIQUE index, which is not constant time. Re-checking
   * the returned value in constant time means the decision this code makes is
   * not itself a timing side channel, and the decoy comparison on the miss path
   * keeps the found/not-found branches doing the same work.
   */
  async _resolveSigningToken(token) {
    if (typeof token !== 'string' || !SIGNING_TOKEN_RE.test(token)) {
      constantTimeEquals(DECOY_TOKEN, DECOY_TOKEN);
      throw invalidSigningLink(`malformed signing token (length=${typeof token === 'string' ? token.length : 'n/a'})`);
    }

    let contract = null;
    try {
      contract = await contractRepository.findByToken(token);
    } catch (error) {
      // Never let a Supabase message ("column ... does not exist", a table
      // name, a constraint) reach the customer. Log it, raise the generic one.
      console.error('[ContractService] signing-token lookup failed:', error);
      throw invalidSigningLink('repository error during token lookup');
    }

    const stored = contract?.signingToken;
    const matches = constantTimeEquals(stored ?? DECOY_TOKEN, token);

    if (!contract || !stored || !matches) {
      throw invalidSigningLink('no contract matches this signing token');
    }
    if (!SIGNABLE_STATUSES.has(contract.status)) {
      // Deliberately the same error as "no such token": a consumed link and a
      // fictional one must look identical from outside.
      throw invalidSigningLink(`contract ${contract.id} is not signable (status=${contract.status})`);
    }
    return contract;
  }

  /**
   * The customer's view of their own signing link.
   *
   * Throws the generic signing-link error for every failure; the route turns it
   * into a single 404 body.
   */
  async getContractByToken(token) {
    const contract = await this._resolveSigningToken(token);

    if (contract.status === 'Sent to Customer') {
      // Best-effort "the customer has opened it" transition. Wrapped because
      // this is a WRITE triggered by an anonymous GET: a failure here must not
      // stop the customer reading their contract, and must not surface a
      // database message. (The contracts mapping folds 'Viewed' onto `sent`, so
      // in practice this is currently a no-op re-issued on every open.)
      try {
        await contractRepository.update(contract.id, { status: 'Viewed' });
        await eventBus.publish(DOMAIN_EVENTS.CONTRACT_VIEWED, { contract });
        contract.status = 'Viewed';
      } catch (error) {
        console.error('[ContractService] failed marking contract viewed:', error);
      }
    }
    return contract;
  }

  /**
   * What a signing page is allowed to see, given only the token.
   *
   * The holder of the link needs the document and the commercial terms they are
   * agreeing to — and nothing else. EXCLUDED ON PURPOSE:
   *   signingToken   the caller already has it; echoing a credential back into
   *                  a response body only widens where it can be logged or
   *                  cached.
   *   customerEmail  the company's billing address. Not needed to sign, and it
   *                  would make a leaked link a contact-details disclosure too.
   *   customerId / companyId / branchId / planId / signedBy
   *                  internal primary keys of other tables.
   */
  toSigningView(contract) {
    if (!contract) return null;
    return {
      id: contract.id,
      contractNumber: contract.contractNumber,
      status: contract.status,
      customerName: contract.customerName,
      companyName: contract.companyName,
      planName: contract.planName,
      startDate: contract.startDate,
      endDate: contract.endDate,
      monthlyFee: contract.monthlyFee,
      meetingCredits: contract.meetingCredits,
      noticeDays: contract.noticeDays,
      version: contract.version,
      content: contract.content,
      contentAr: contract.contentAr
    };
  }

  /**
   * NO SEED FALLBACK — same reasoning as getContracts().
   *
   * This used to return two hard-coded agreement bodies ('tpl-office',
   * 'tpl-coworking') whenever contract_templates was empty. Those bodies then
   * flowed into createContract(), were interpolated, and were written into
   * contract_versions as the text a customer signs. A legal document assembled
   * from a fallback that exists only because a table was empty is exactly the
   * outcome to refuse. An empty table now returns [], and createContract()
   * refuses to build a contract at all.
   */
  async getTemplates() {
    return contractTemplateRepository.findAll();
  }

  /**
   * Contract Builder: Builds and generates a new contract from templates & parameters
   */
  async createContract(builderData, actor = 'Sales Executive') {
    const templates = await this.getTemplates();
    if (templates.length === 0) {
      // Was: fall through to a hard-coded template body. See getTemplates().
      throw new Error(
        'Cannot build a contract: public.contract_templates is empty. Load the ' +
          'agreement templates before generating a contract — a legal document ' +
          'must not be assembled from a fallback body.'
      );
    }
    const tpl = templates.find(t => t.id === builderData.templateId) || templates[0];

    const count = (await contractRepository.findAll()).length + 5002;
    const contractNumber = `MS-CON-2026-${count}`;

    // The signing token is a bearer credential for an unauthenticated route, so
    // it is 256 bits from the CSPRNG. It was `st-${Date.now()}-${Math.random()
    // .toString(36).substr(2, 6)}`: a timestamp an attacker can bracket plus
    // about 31 bits from Math.random, which is not a CSPRNG and whose internal
    // state is recoverable from previous outputs. base64url keeps it URL-safe
    // and inside SIGNING_TOKEN_RE.
    const token = randomBytes(32).toString('base64url');

    const interpolatedBody = this.interpolate(tpl.body, builderData);
    const interpolatedBodyAr = this.interpolate(tpl.bodyAr, builderData);

    const newContract = await contractRepository.create({
      contractNumber,
      templateId: tpl.id,
      templateName: tpl.name,
      customerId: builderData.customerId || 'usr-01',
      customerName: builderData.customerName || 'Ahmed Alharbi',
      companyName: builderData.companyName || 'Mars Technologies',
      workspaceId: builderData.workspaceId || 'office-a101',
      workspaceName: builderData.workspaceName || 'Private Office A-101',
      officeNumber: builderData.officeNumber || 'Suite A-101',
      planName: builderData.planName || tpl.category,
      startDate: builderData.startDate || new Date().toISOString().split('T')[0],
      endDate: builderData.endDate || '2026-12-31',
      monthlyFee: Number(builderData.monthlyFee || 4800),
      vat: Math.round(Number(builderData.monthlyFee || 4800) * 0.15),
      total: Math.round(Number(builderData.monthlyFee || 4800) * 1.15),
      parkingSpaces: builderData.parkingSpaces || 1,
      lockerUnit: builderData.lockerUnit || 'Locker #14',
      meetingCredits: builderData.meetingCredits || 20,
      content: interpolatedBody,
      contentAr: interpolatedBodyAr,
      status: 'Draft',
      version: 1,
      signingToken: token
    });

    // Create initial Version 1
    await contractVersionRepository.create({
      contractId: newContract.id,
      version: 1,
      content: interpolatedBody,
      createdBy: actor,
      reason: 'Initial Contract Draft Generation'
    });

    await auditLogService.recordAudit({
      actor,
      action: 'CREATE_CONTRACT_DRAFT',
      module: 'CLM',
      entityId: newContract.id,
      afterState: newContract
    });

    return newContract;
  }

  /**
   * Send Contract to Customer -> Generates Token Signing Link
   */
  async sendToCustomer(id, actor = 'Sales Executive') {
    const contract = await contractRepository.findById(id);
    if (!contract) throw new Error('Contract not found');

    const updated = await contractRepository.update(id, {
      status: 'Sent to Customer',
      sentAt: new Date().toISOString()
    });

    await eventBus.publish(DOMAIN_EVENTS.CONTRACT_SENT, { contract: updated });
    return updated;
  }

  /**
   * Public e-Signature Execution
   */
  async customerSign(token, signaturePayload, metadata = {}) {
    // Same resolution as the GET: malformed, unknown and already-signed tokens
    // are one indistinguishable failure. Because SIGNABLE_STATUSES stops at
    // 'Sent to Customer'/'Viewed', this is also what makes the token single-use
    // — a second POST with a redeemed token cannot re-sign the contract.
    const contract = await this._resolveSigningToken(token);

    const payload = signaturePayload && typeof signaturePayload === 'object' ? signaturePayload : {};
    const signatureMethod = ['Draw', 'Type', 'Upload'].includes(payload.signatureMethod)
      ? payload.signatureMethod
      : 'Draw';
    const signatureData = typeof payload.signatureData === 'string'
      ? payload.signatureData.slice(0, 1_000_000)
      : 'DATA_URL_SIGNATURE';
    const signatoryName = typeof payload.signatoryName === 'string' && payload.signatoryName.trim()
      ? payload.signatoryName.trim().slice(0, 200)
      : null;

    const timestamp = new Date().toISOString();

    // A real digest over what was actually agreed, replacing
    // `hash-${Date.now()}-${Math.random()...}` — which was labelled a SHA-256
    // signature hash in the UI and was neither a hash nor of the document. It
    // binds the contract, the version, the body text, the signatory and the
    // moment, so a later copy of the document can be checked against it.
    // NOTE: public.contracts has no signature_hash column (see the KNOWN LOSSES
    // list in mappings/contracts.js), so this is returned to the signer and
    // then lost until that column exists. Computing it correctly now means the
    // migration only has to add a column, not redo the evidence.
    const signatureHash = createHash('sha256')
      .update([
        contract.id,
        contract.contractNumber ?? '',
        String(contract.version ?? 1),
        contract.content ?? '',
        signatoryName ?? contract.customerName ?? '',
        signatureMethod,
        timestamp
      ].join('\n'), 'utf8')
      .digest('hex');

    const updated = await contractRepository.update(contract.id, {
      status: 'Signed',
      signatoryName: signatoryName || contract.customerName,
      signedAt: timestamp,
      signatureMethod,
      signatureData,
      // Recorded as unknown when the platform did not supply them. They used to
      // default to a literal '185.192.44.10' and 'Mozilla/5.0 Web browser',
      // which is fabricated evidence in the one place that must not carry any:
      // the certificate renders these as the signatory's IP and device.
      signatoryIp: metadata.ip ?? null,
      signatoryUserAgent: metadata.userAgent ?? null,
      signatureHash
    });

    if (!updated) {
      // The row vanished between resolving the token and writing to it.
      throw invalidSigningLink(`contract ${contract.id} disappeared during signing`);
    }

    await auditLogService.recordAudit({
      actor: signatoryName || contract.customerName,
      action: 'CUSTOMER_E_SIGNATURE',
      module: 'CLM',
      entityId: contract.id,
      // The signing token is stripped before the state snapshot is stored. An
      // audit row is read by staff and by the (now scoped) certificate; a live
      // bearer credential has no business sitting in either.
      afterState: { ...updated, signingToken: undefined, signatureData: undefined }
    });

    await eventBus.publish(DOMAIN_EVENTS.CONTRACT_SIGNED, { contract: updated });
    return updated;
  }

  /**
   * Counter-Sign by Company Executive -> Activates Contract & Downstream Automation
   */
  async counterSign(id, managerName = 'CEO / Operations Manager', actor = 'Executive Manager') {
    const contract = await contractRepository.findById(id);
    if (!contract) throw new Error('Contract not found');

    const timestamp = new Date().toISOString();
    const updated = await contractRepository.update(id, {
      status: 'Active',
      counterSignedBy: managerName,
      counterSignedAt: timestamp
    });

    await eventBus.publish(DOMAIN_EVENTS.CONTRACT_COUNTERSIGNED, { contract: updated });
    await eventBus.publish(DOMAIN_EVENTS.CONTRACT_ACTIVATED, { contract: updated });

    await auditLogService.recordAudit({
      actor,
      action: 'COUNTER_SIGN_ACTIVATED',
      module: 'CLM',
      entityId: id,
      afterState: updated
    });

    return updated;
  }

  /**
   * Contract Amendment
   */
  async amendContract(id, amendmentData, actor = 'Sales Executive') {
    const contract = await contractRepository.findById(id);
    if (!contract) throw new Error('Contract not found');

    const nextVersion = (contract.version || 1) + 1;
    const updatedContent = `${contract.content}\n\n[AMENDMENT v${nextVersion}]: ${amendmentData.reason || 'Added Services'}`;

    const updated = await contractRepository.update(id, {
      version: nextVersion,
      monthlyFee: amendmentData.newMonthlyFee || contract.monthlyFee,
      total: Math.round((amendmentData.newMonthlyFee || contract.monthlyFee) * 1.15),
      status: 'Draft', // Resets to Draft for new review & signing
      content: updatedContent
    });

    await contractVersionRepository.create({
      contractId: id,
      version: nextVersion,
      content: updatedContent,
      createdBy: actor,
      reason: amendmentData.reason || 'Contract Amendment'
    });

    await eventBus.publish(DOMAIN_EVENTS.CONTRACT_AMENDED, { contract: updated, version: nextVersion });
    return updated;
  }

  /**
   * ==========================================================================
   * PUBLIC CONTRACT VERIFICATION CERTIFICATE
   * ==========================================================================
   *
   * Served unauthenticated from /api/v1/public/contracts/verify/[id]. It exists
   * for one purpose: somebody holding a copy of a contract wants to confirm
   * that this system really did record it as signed. Everything the payload
   * carries has to earn its place against that single question, because the
   * only thing a caller needs in order to ask it is a contract id.
   *
   * WHAT THIS USED TO RETURN, and why it was a breach rather than a bug:
   *
   *   auditTrail      auditLogService.getAuditLogs({ entityId: id }) — where
   *                   `entityId` was accepted and silently DROPPED. It returned
   *                   every row of public.audit_log: 22 entries across CRM,
   *                   BOOKINGS, invoices, contracts, credit_entries and
   *                   company_members, for every tenant, each carrying the full
   *                   before/after JSONB row snapshot — 25.7 KB including two
   *                   email addresses and a phone number, to an anonymous
   *                   caller. AuditLogService now refuses to drop a filter, and
   *                   this call site is scoped to the one contract.
   *   versionsHistory the entire amendment history, each row carrying the FULL
   *                   interpolated contract body. Gone: see contentDigest.
   *
   * DELIBERATELY EXCLUDED, and why:
   *   before/after state snapshots  the certificate attests that events
   *                   happened, not what any row contained. Snapshots are the
   *                   payload that made the leak severe, and they answer no
   *                   verification question.
   *   the audit `actor` and `ip`     internal staff names (or a profiles uuid)
   *                   and network addresses. Who inside Mars Space touched a
   *                   record is an internal matter.
   *   rows for any other entity      scoped by entityId, which is the fix.
   *   the contract body (content/contentAr)   the holder already has the
   *                   document; publishing it would turn a contract id into a
   *                   copy of somebody's commercial terms. `contentDigest`
   *                   below lets a holder verify their copy is the one on
   *                   record — the verification use case — while disclosing
   *                   nothing to anyone who does not already have the text.
   *   monthlyFee, planName, dates    the commercial terms. Not needed to
   *                   confirm a signature; disclosing pricing per contract id
   *                   is a competitive-intelligence feed.
   *   customerEmail, customerId, companyId, branchId, planId, signingToken
   *                   contact details and internal keys. The signing token in
   *                   particular is a live credential (see the header).
   *
   * KEPT, because verification genuinely needs it: the contract reference and
   * status, the parties as NAMED ON THE DOCUMENT, the signing timestamps, the
   * version, the signature hash, and a bare action/timestamp audit line.
   */
  async getAuditCertificate(id) {
    const contract = await this.getContractById(id);
    if (!contract) {
      // One error for "no such contract" and for a malformed id alike —
      // getContractById maps Postgres 22P02 to null — so the endpoint cannot be
      // used to tell a real contract id from a typo.
      throw contractNotFound(`no contract for id=${JSON.stringify(id)}`);
    }

    const auditLogs = await auditLogService.getAuditLogs({ entityId: id });

    return {
      contractNumber: contract.contractNumber,
      status: contract.status,

      // The parties. Both are names printed on the contract itself, so they
      // disclose nothing a holder does not already have; no contact details.
      customerName: contract.customerName,
      companyName: contract.companyName,
      signatoryName: contract.signatoryName,

      // The assertions being verified.
      signedAt: contract.signedAt,
      counterSignedAt: contract.counterSignedAt,
      version: contract.version,
      signatureHash: contract.signatureHash,

      // Proof-of-content without disclosure of content: a holder hashes their
      // copy of the body and compares. Null when no version text is on record.
      contentDigest: contract.content
        ? createHash('sha256').update(contract.content, 'utf8').digest('hex')
        : null,

      // Scoped to THIS contract, and projected down to "something happened, at
      // this time". No actor, no ip, no state snapshot.
      auditTrail: auditLogs.map(entry => ({
        action: entry.action,
        module: entry.module,
        timestamp: entry.timestamp
      })),

      verifiedAt: new Date().toISOString()
    };
  }
}

export const contractService = new ContractService();
