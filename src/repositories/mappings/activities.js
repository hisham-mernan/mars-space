/**
 * MAPPING: collection "activities"  ->  public.audit_log
 * ============================================================================
 *
 * `activities` and `audit_logs` are TWO VIEWS OF THE SAME TABLE. There is no
 * activities table; the ERP's operations timeline and its audit trail are both
 * rows of public.audit_log, told apart by the `action` column:
 *
 *   activities  action LIKE 'activity:%'      (this file)
 *   audit_logs  action NOT LIKE 'activity:%'  (./audit_logs.js)
 *
 * ACTIVITY_ACTION_PREFIX below is the single definition of that marker, and
 * ./audit_logs.js imports it so the two partitionFilters cannot drift apart.
 *
 * THAT SPLIT IS A `partitionFilter`, NOT AN `activeFilter`. The distinction is
 * the one BaseRepository's header spells out, and it matters here more than
 * anywhere else in this directory:
 *
 *   - It says which rows ARE this collection, so it is applied unconditionally
 *     — including by findById(), update() and count() — and `includeDeleted:
 *     true` does not relax it. Ids in audit_log are bigints unique per TABLE,
 *     not per collection, so without that, activityRepository.findById('33') of
 *     an audit row returned a CREATE_CRM_LEAD audit entry as a timeline
 *     document, and a whole-document update() of it would have rewritten
 *     `action` to 'activity:CREATE_CRM_LEAD' — silently moving a row out of the
 *     audit trail.
 *   - It is NOT a soft-delete filter. audit_log is append-only and nothing here
 *     is ever hidden, so this mapping declares no activeFilter at all. When the
 *     prefix test lived in activeFilter, count({ includeDeleted: true })
 *     returned 26 — every row in the table, audit rows included — instead of
 *     the 4 activities that exist.
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
 * THE ENVELOPE. A timeline entry is title/desc/time/actor text, none of which
 * has a column. It is stored whole in the `after` jsonb column:
 *
 *   action = 'activity:booking'
 *   after  = { title, titleAr, desc, descAr, time, actor }
 *
 * toDocument tolerates rows written by anything else - the trigger-written rows
 * already in this table put a raw table row in `after` - by treating a payload
 * without the expected keys as empty rather than throwing (README section 4:
 * toDocument runs over every row and must be total).
 *
 * Fields the services actually read (grepped, not guessed):
 *   ActivityService.logActivity writes  type, title, titleAr, description,
 *     descriptionAr, desc, descAr, time, entityId, actor
 *   ActivityService.getTimeline / AnalyticsService pass the documents straight
 *     to src/app/erp/page.js, which renders act.id, act.time, act.desc and
 *     act.descAr.
 *
 * `description` / `descriptionAr` are the same text as `desc` / `descAr` -
 * logActivity sets both - so they are stored once and returned under both
 * names, which keeps every existing reader working without duplicating the
 * string in jsonb.
 *
 * KNOWN LOSSES: none. Every field ActivityService writes survives a round trip,
 * either in a column (type via action, entityId via record_id) or in the
 * envelope.
 *
 * softDelete is null: audit_log is append-only. BaseRepository#softDelete
 * throws with softDeleteReason rather than reporting a success that changed
 * nothing.
 *
 * PARTIAL-UPDATE CAVEAT. `after` is a single jsonb column, so an update that
 * mentions only one payload field REPLACES the whole envelope, the same way a
 * partial rebuild of bookings.time_range would move the edge it did not
 * mention (README section 6). Nothing updates an activity today - the timeline
 * is append-only and softDelete is disabled - but a future caller must pass the
 * complete payload to update(), not a single field.
 */

import { put, isUuid, riyadhParts } from './_helpers';

/**
 * The marker that separates timeline rows from audit rows in the shared
 * audit_log table. ./audit_logs.js imports this constant; do not inline it.
 */
export const ACTIVITY_ACTION_PREFIX = 'activity:';

/**
 * audit_log.table_name is NOT NULL, and a timeline entry has no table behind
 * it, so every activity row carries this sentinel. Nothing reads it back as the
 * document's `module`.
 */
const ACTIVITY_TABLE_NAME = 'activities';

/** The document fields that live inside the `after` envelope. */
const PAYLOAD_FIELDS = [
  'title',
  'titleAr',
  'desc',
  'descAr',
  'description',
  'descriptionAr',
  'time',
  'actor',
];

/**
 * 'HH:MM' (24h, Asia/Riyadh) -> 'HH:MM AM/PM', the format ActivityService's
 * own logActivity() produces and the ERP dashboard renders in its time pill.
 * The timezone conversion itself is riyadhParts() from ./_helpers; only the
 * 12-hour presentation happens here, so Riyadh time still has exactly one
 * implementation in this directory.
 */
function riyadhClock(value) {
  if (!value) return null;
  const parts = riyadhParts(value instanceof Date ? value : new Date(value));
  if (!parts) return null;
  const [hh, mm] = parts.time.split(':');
  const hour = Number(hh);
  const suffix = hour < 12 ? 'AM' : 'PM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, '0')}:${mm} ${suffix}`;
}

/** A jsonb value that is a plain object, or {} for anything else. */
function payloadOf(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value;
}

/** 'activity:booking' -> 'booking'. Anything unprefixed is returned as-is. */
function actionToType(action) {
  if (typeof action !== 'string') return null;
  return action.startsWith(ACTIVITY_ACTION_PREFIX)
    ? action.slice(ACTIVITY_ACTION_PREFIX.length)
    : action;
}

const mapping = {
  table: 'audit_log',

  // actor_id is a profiles FK; the embed gives a real name for rows written by
  // the mobile app or a trigger, where the envelope's free-text actor is absent.
  // Whitespace is stripped - PostgREST's select parameter does not accept spaces.
  selectColumns: `
    *,
    actor:profiles(id,full_name,full_name_ar)
  `.replace(/\s+/g, ''),

  idColumn: 'id',

  /**
   * Ordered by the bigint primary key, not created_at.
   *
   * Newest-first is what the old store's unshift gave the timeline, and both
   * orderings agree - id is a monotonic sequence - but audit_log rows written in
   * one transaction share created_at to the microsecond (ids 10, 11 and 12 in
   * the live table all carry 2026-08-20 08:51:31.526464+00). Ordering by
   * created_at alone would leave those tied, which makes
   * ActivityRepository.getRecent(limit) - a pushed-down LIMIT - nondeterministic
   * about which rows it returns.
   */
  defaultOrder: { column: 'id', ascending: false },

  /**
   * WHICH ROWS OF audit_log ARE ACTIVITIES. Keeps the timeline and the audit
   * trail from reading, updating or counting each other's rows. Must stay the
   * exact complement of the audit_logs mapping's partitionFilter.
   *
   * BaseRepository applies this to every read AND to update()/softDelete(), and
   * `includeDeleted` never relaxes it — see that file's header.
   */
  partitionFilter: (q) => q.like('action', `${ACTIVITY_ACTION_PREFIX}%`),

  /**
   * No activeFilter, deliberately. audit_log is append-only: there is no
   * status, no soft-delete column, nothing that "deleted" could mean, and
   * toDocument therefore returns a constant isDeleted: false. The row-type
   * split above is a partition and lives in partitionFilter; putting it here
   * would make `includeDeleted: true` leak the audit trail into the timeline.
   */
  activeFilter: undefined,

  /**
   * Document field -> column equality, for BaseRepository#findWhere.
   * `actor`, `title`, `desc` and `time` live in the jsonb envelope and cannot be
   * pushed down as column equalities; use findAll(predicate) for those.
   */
  filters: {
    type: {
      column: 'action',
      toColumn: (v) => `${ACTIVITY_ACTION_PREFIX}${v}`,
    },
    entityId: { column: 'record_id', toColumn: String },
    actorId: 'actor_id',
  },

  // audit_log is append-only.
  softDelete: null,
  softDeleteReason:
    'public.audit_log is an append-only ledger shared by the activity timeline ' +
    'and the audit trail; it has no status, no soft-delete column and no delete ' +
    'path - a timeline entry that could be retracted would not be a log',

  toDocument(row) {
    if (!row) return null;
    const payload = payloadOf(row.after);

    // logActivity writes desc/descAr and description/descriptionAr with the
    // same text; accept whichever the writer used.
    const desc = payload.desc ?? payload.description ?? null;
    const descAr = payload.descAr ?? payload.descriptionAr ?? desc;

    return {
      // bigint -> string, so documents stay string-keyed. findById(String(id))
      // still matches the column.
      id: String(row.id),
      type: actionToType(row.action),

      title: payload.title ?? null,
      titleAr: payload.titleAr ?? null,
      desc,
      descAr,
      // Aliases for the same text: logActivity's callers pass `description`.
      description: desc,
      descriptionAr: descAr,

      // The envelope's time was formatted by the writer; fall back to the row's
      // own created_at rendered in Asia/Riyadh (UTC+3, no DST) for rows written
      // by anything else.
      time: payload.time ?? riyadhClock(row.created_at),

      // Free-text actor from the envelope, else the embedded profile's name,
      // else the raw uuid.
      actor: payload.actor ?? row.actor?.full_name ?? row.actor_id ?? null,
      actorId: row.actor_id ?? null,
      entityId: row.record_id ?? null,

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

    // action carries the type AND the marker the two activeFilters split on.
    put(row, 'action', doc.type, (t) => `${ACTIVITY_ACTION_PREFIX}${t}`);
    put(row, 'record_id', doc.entityId, String);

    // actor is free text in the ERP ('Sales Executive', a customer name), and
    // actor_id is a profiles FK, so only a real uuid goes to the column. The
    // text always survives in the envelope below, so nothing is lost.
    if (isUuid(doc.actor)) row.actor_id = doc.actor;
    else if (isUuid(doc.actorId)) row.actor_id = doc.actorId;

    const desc = doc.desc !== undefined ? doc.desc : doc.description;
    const descAr = doc.descAr !== undefined ? doc.descAr : doc.descriptionAr;
    const touchesPayload = PAYLOAD_FIELDS.some((f) => doc[f] !== undefined);

    if (mode === 'create' || touchesPayload) {
      // One jsonb column, written whole. See the partial-update caveat in the
      // header: an update mentioning one field replaces the entire envelope.
      row.after = {
        title: doc.title ?? null,
        titleAr: doc.titleAr ?? null,
        desc: desc ?? null,
        descAr: descAr ?? desc ?? null,
        time: doc.time ?? null,
        actor: doc.actor ?? null,
      };
    }

    if (mode === 'create') {
      // action and table_name are both NOT NULL with no default.
      // An activity with no type is still a timeline entry, and the prefix has
      // to be present or the row would land in the audit trail instead, so it
      // gets the generic type rather than an error.
      row.action ??= `${ACTIVITY_ACTION_PREFIX}general`;
      row.table_name = ACTIVITY_TABLE_NAME;
    }

    // `before` is never written: a timeline entry has no prior state.
    return row;
  },
};

export default mapping;
