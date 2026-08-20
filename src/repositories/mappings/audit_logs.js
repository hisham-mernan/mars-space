/**
 * MAPPING: collection "audit_logs"  ->  public.audit_log
 * ============================================================================
 *
 * `audit_logs` and `activities` are TWO VIEWS OF THE SAME TABLE, told apart by
 * the `action` column:
 *
 *   activities  action LIKE 'activity:%'      (./activities.js)
 *   audit_logs  action NOT LIKE 'activity:%'  (this file)
 *
 * The marker is imported from ./activities.js rather than repeated, so the two
 * partitionFilters cannot drift apart and start reading each other's rows.
 *
 * THAT SPLIT IS A `partitionFilter`, NOT AN `activeFilter` — see
 * BaseRepository's header, and the longer note in ./activities.js. In short: it
 * says which rows ARE the audit trail, so BaseRepository applies it to every
 * read, to findById() and to update(), and `includeDeleted: true` does not
 * relax it. audit_log is append-only, so this mapping has no soft-delete filter
 * at all.
 *
 * Live columns (confirmed against information_schema on 2026-08-20):
 *   id bigint pk | actor_id uuid -> profiles(id) ON DELETE SET NULL
 *   action text NOT NULL | table_name text NOT NULL | record_id text
 *   before jsonb | after jsonb | created_at timestamptz NOT NULL DEFAULT now()
 *
 * There is NO updated_at column, so `updatedAt` returns created_at.
 * `id` is a BIGINT, not a uuid: toDocument returns String(row.id) so documents
 * stay string-keyed, and findById with that string still matches.
 *
 * NON-OBVIOUS RENAMES
 *   module   -> table_name   (the ERP writes a module name, 'SUPPORT', into a
 *                             column named table_name; it is stored verbatim
 *                             because AuditLogService.getAuditLogs() compares
 *                             it with ===)
 *   entityId -> record_id    (text, so a uuid or a legacy id both fit)
 *
 * THE ENVELOPE. AuditLogService.recordAudit() writes a free-text `actor`
 * ('Staff', 'Sales Executive') and an `ip`, and neither has a column. Rather
 * than lose them, the two jsonb columns carry an envelope:
 *
 *   after  = { state: afterState  ?? null, actor, ip }
 *   before = { state: beforeState ?? null }
 *
 * ROWS THIS MAPPING DID NOT WRITE. public.audit_log already holds rows written
 * by database triggers, whose `after` is the raw table row (see id 5: an
 * invoices INSERT). unwrapState() below tells the two apart and returns the raw
 * row unchanged for those, so toDocument stays total (README section 4).
 *
 * Fields the services actually read (grepped, not guessed):
 *   AuditLogService.recordAudit writes actor, action, module, entityId,
 *     beforeState, afterState, ip, timestamp
 *   AuditLogService.getAuditLogs filters on item.module and item.actor
 *   ContractService.getAuditCertificate returns the documents whole as
 *     `auditTrail`
 *
 * KNOWN LOSSES: none. `actor` and `ip` have no columns but survive in the
 * envelope; `timestamp` has no column but is created_at, returned under both
 * names and dropped on write (created_at has a DEFAULT now()).
 *
 * softDelete is null: audit_log is append-only. BaseRepository#softDelete
 * throws with softDeleteReason rather than reporting a success that changed
 * nothing.
 *
 * PARTIAL-UPDATE CAVEAT. `before` and `after` are single jsonb columns, so an
 * update mentioning only `afterState` REPLACES that whole envelope, dropping
 * the actor and ip it used to hold. Nothing updates an audit row today -
 * AuditLogService only creates and reads - but a future caller must pass actor
 * and ip alongside any state change.
 */

import { put, isUuid } from './_helpers';
import { ACTIVITY_ACTION_PREFIX } from './activities';

/**
 * Unwrap the { state, actor, ip } envelope, tolerating rows written by anything
 * else.
 *
 * A value counts as an envelope only when it carries `state` and nothing but
 * the envelope's own keys. That is what distinguishes it from a trigger-written
 * raw table row, which has many columns and no `state`. Note the plain
 * `v.state ?? v` shorthand is wrong here: an envelope with state === null would
 * fall through and return the envelope itself as the document's state.
 */
const ENVELOPE_KEYS = new Set(['state', 'actor', 'ip']);

function isEnvelope(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (!('state' in value)) return false;
  return Object.keys(value).every((k) => ENVELOPE_KEYS.has(k));
}

function unwrapState(value) {
  if (value === undefined) return null;
  return isEnvelope(value) ? (value.state ?? null) : (value ?? null);
}

function envelopeField(value, field) {
  return isEnvelope(value) ? (value[field] ?? null) : null;
}

const mapping = {
  table: 'audit_log',

  // actor_id is a profiles FK; the embed names the actor for trigger-written
  // rows, which have an actor_id but no envelope. Whitespace is stripped -
  // PostgREST's select parameter does not accept spaces.
  selectColumns: `
    *,
    actor:profiles(id,full_name,full_name_ar)
  `.replace(/\s+/g, ''),

  idColumn: 'id',

  /**
   * Ordered by the bigint primary key, not created_at: audit rows written in
   * one transaction share created_at to the microsecond (ids 10, 11 and 12 in
   * the live table all carry 2026-08-20 08:51:31.526464+00), so created_at
   * alone leaves ties and makes a pushed-down LIMIT nondeterministic. id is a
   * monotonic sequence, so id desc is newest-first and total.
   */
  defaultOrder: { column: 'id', ascending: false },

  /**
   * WHICH ROWS OF audit_log ARE THE AUDIT TRAIL: everything that is not a
   * timeline entry. Must stay the exact complement of the activities mapping's
   * partitionFilter, which is why the prefix is imported rather than repeated.
   *
   * Applied unconditionally by BaseRepository, reads and single-row writes
   * alike, so auditRepository can never return, patch or count an activity row.
   */
  partitionFilter: (q) => q.not('action', 'like', `${ACTIVITY_ACTION_PREFIX}%`),

  /**
   * No activeFilter, deliberately: an audit trail hides nothing, and audit_log
   * has no status or soft-delete column for one to test. The row-type split is
   * a partition, above.
   */
  activeFilter: undefined,

  /**
   * Document field -> column equality, for BaseRepository#findWhere.
   *
   * `actor` and `ip` are NOT here: they live inside the jsonb envelope, so no
   * column equality can express them. AuditLogService.getAuditLogs() already
   * filters on actor with an in-memory predicate, which is the right tool;
   * findWhere would throw a clear "no column mapped" error, not silently
   * return everything.
   */
  filters: {
    module: 'table_name',
    action: 'action',
    entityId: { column: 'record_id', toColumn: String },
    actorId: 'actor_id',
  },

  // audit_log is append-only.
  softDelete: null,
  softDeleteReason:
    'public.audit_log is an append-only ledger; it has no status, no ' +
    'soft-delete column and no delete path - an audit trail whose entries can ' +
    'be removed is not an audit trail',

  toDocument(row) {
    if (!row) return null;
    return {
      // bigint -> string, so documents stay string-keyed. findById(String(id))
      // still matches the column.
      id: String(row.id),

      action: row.action ?? null,
      // The ERP's module name is stored verbatim in table_name.
      module: row.table_name ?? null,
      entityId: row.record_id ?? null,

      // Free-text actor from the envelope, else the embedded profile's name,
      // else the raw uuid - trigger-written rows carry only actor_id.
      actor: envelopeField(row.after, 'actor') ?? row.actor?.full_name ?? row.actor_id ?? null,
      actorId: row.actor_id ?? null,
      // No column; recorded in the envelope. Trigger rows have none.
      ip: envelopeField(row.after, 'ip'),

      beforeState: unwrapState(row.before),
      afterState: unwrapState(row.after),

      // No column; created_at is the audit timestamp.
      timestamp: row.created_at ?? null,

      // Append-only: a row that exists was never deleted.
      isDeleted: false,
      createdAt: row.created_at ?? null,
      // No updated_at column on audit_log.
      updatedAt: row.created_at ?? null,
    };
  },

  toRow(doc, mode) {
    const row = {};
    if (!doc) return row;

    put(row, 'action', doc.action);
    put(row, 'table_name', doc.module);
    put(row, 'record_id', doc.entityId, String);

    // actor is free text ('Staff'); actor_id is a profiles FK, so only a real
    // uuid goes to the column. The text always survives in the envelope.
    if (isUuid(doc.actor)) row.actor_id = doc.actor;
    else if (isUuid(doc.actorId)) row.actor_id = doc.actorId;

    const touchesAfter =
      doc.afterState !== undefined || doc.actor !== undefined || doc.ip !== undefined;

    if (mode === 'create' || touchesAfter) {
      // One jsonb column, written whole. See the partial-update caveat above.
      row.after = {
        state: doc.afterState ?? null,
        actor: doc.actor ?? null,
        ip: doc.ip ?? null,
      };
    }
    if (mode === 'create' || doc.beforeState !== undefined) {
      row.before = { state: doc.beforeState ?? null };
    }

    // DROPPED by design: `timestamp` - created_at has a DEFAULT now() and
    // BaseRepository never emits created_at.

    if (mode === 'create') {
      // action and table_name are both NOT NULL with no default. Naming the
      // missing field beats an opaque 23502 from Postgres.
      if (!row.action) {
        throw new Error(
          'audit_logs: `action` is required to record an audit entry ' +
            '(public.audit_log.action is NOT NULL with no default).'
        );
      }
      if (!row.table_name) {
        throw new Error(
          'audit_logs: `module` is required to record an audit entry ' +
            '(it is stored in public.audit_log.table_name, which is NOT NULL ' +
            'with no default).'
        );
      }
      if (String(row.action).startsWith(ACTIVITY_ACTION_PREFIX)) {
        // Such a row would match the activities activeFilter and disappear from
        // the audit trail entirely - a silent loss, so it is refused instead.
        throw new Error(
          `audit_logs: action must not start with "${ACTIVITY_ACTION_PREFIX}" ` +
            '(that prefix marks activity-timeline rows in the shared ' +
            'public.audit_log table, and such a row would vanish from the audit ' +
            'trail). Use activityRepository for timeline entries.'
        );
      }
    }

    return row;
  },
};

export default mapping;
