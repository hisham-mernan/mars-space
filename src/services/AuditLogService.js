import { auditRepository } from '@/repositories';

/**
 * ============================================================================
 * THE AUDIT LOG IS THE MOST SENSITIVE TABLE IN THE DATABASE.
 * ============================================================================
 *
 * public.audit_log holds, for every entity of every tenant, the full before/
 * after JSONB row snapshots — invoice totals, member records, credit ledgers,
 * contract terms, emails and phone numbers. auditRepository reads it with the
 * SERVICE-ROLE client, so RLS is not consulted (see BaseRepository.js).
 *
 * getAuditLogs() therefore has exactly one safe default: return NOTHING wider
 * than the caller asked for. The bug this file was rewritten to close was the
 * opposite — getAuditLogs({ entityId }) accepted `entityId`, filtered on module
 * and actor only, and returned EVERY row in the table. ContractService's public
 * verification certificate passed { entityId } and dumped the whole ledger to
 * unauthenticated callers.
 *
 * The class of bug is "a filter that is accepted and silently ignored", and the
 * fix is structural, not a one-line addition: SUPPORTED_FILTERS below is the
 * complete, closed vocabulary, and anything outside it — a typo, a filter added
 * to a call site before it was added here — THROWS. A filter that does nothing
 * always fails open, which for this table means disclosing everything, so
 * failing loudly is the only correct behaviour.
 */

/**
 * The complete filter vocabulary. Every key is either:
 *
 *   'column' — pushed down to Postgres via BaseRepository#findWhere, which
 *              itself throws for any field the audit_logs mapping does not map
 *              to a column (a second, independent check on the same class of
 *              bug).
 *   'memory' — no column exists, so it is matched on the mapped document. Today
 *              only `actor`, which AuditLogService writes into the `after` jsonb
 *              envelope rather than a column (see mappings/audit_logs.js).
 */
const SUPPORTED_FILTERS = Object.freeze({
  module: 'column', // -> audit_log.table_name (the ERP's module name)
  action: 'column', // -> audit_log.action
  entityId: 'column', // -> audit_log.record_id
  actorId: 'column', // -> audit_log.actor_id (a profiles uuid)
  actor: 'memory', // free-text actor label, lives in the `after` envelope
});

const COLUMN_FILTERS = Object.keys(SUPPORTED_FILTERS).filter(
  (k) => SUPPORTED_FILTERS[k] === 'column'
);

export class AuditLogService {
  async recordAudit(params) {
    const { actor, action, module, entityId, beforeState = null, afterState = null, ip = '127.0.0.1' } = params;
    return auditRepository.create({
      actor,
      action,
      module,
      entityId,
      beforeState,
      afterState,
      ip,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Audit rows matching every supplied filter.
   *
   * @param {{ module?: string, action?: string, entityId?: string,
   *           actorId?: string, actor?: string }} filter
   *   An EMPTY object means "the entire audit log", which is a legitimate
   *   request from a staff-gated ERP route and a catastrophic one from anywhere
   *   else. It must be written explicitly — it is never what a dropped filter
   *   degrades into, because a dropped filter throws.
   *
   * @throws if a key is not in SUPPORTED_FILTERS, or is present but carries no
   *   usable value. Both would otherwise widen the result set silently:
   *   `getAuditLogs({ entityId: contract.id })` where `contract.id` is undefined
   *   must not quietly become `getAuditLogs({})`.
   */
  async getAuditLogs(filter = {}) {
    if (filter === null || typeof filter !== 'object' || Array.isArray(filter)) {
      throw new Error(
        `AuditLogService.getAuditLogs: filter must be a plain object, received ${
          Array.isArray(filter) ? 'an array' : typeof filter
        }.`
      );
    }

    const supported = Object.keys(SUPPORTED_FILTERS).join(', ');

    for (const [key, value] of Object.entries(filter)) {
      if (!(key in SUPPORTED_FILTERS)) {
        throw new Error(
          `AuditLogService.getAuditLogs: unsupported filter "${key}". ` +
            `Supported: ${supported}. A filter that is accepted and ignored ` +
            `returns the WHOLE audit log across every tenant, so unknown keys ` +
            `are refused rather than dropped. Add it to SUPPORTED_FILTERS (and ` +
            `to filters in src/repositories/mappings/audit_logs.js if it is a ` +
            `column) if it is genuinely needed.`
        );
      }
      if (value === undefined || value === null || value === '') {
        throw new Error(
          `AuditLogService.getAuditLogs: filter "${key}" was supplied as ` +
            `${JSON.stringify(value ?? null)}. Ignoring it would widen the ` +
            `result to the entire audit log. Omit the key entirely if the ` +
            `filter does not apply.`
        );
      }
    }

    // Column equalities go to Postgres, so non-matching rows never cross the
    // wire in the first place. Anything the mapping cannot map still throws
    // inside findWhere rather than being ignored.
    const criteria = {};
    for (const key of COLUMN_FILTERS) {
      if (key in filter) criteria[key] = filter[key];
    }

    const rows = await auditRepository.findWhere(criteria);

    // The one filter with no column. Applied after the pushdown, so it narrows
    // an already-narrowed set; it can never widen one.
    if ('actor' in filter) {
      return rows.filter((item) => item.actor === filter.actor);
    }
    return rows;
  }
}

export const auditLogService = new AuditLogService();
