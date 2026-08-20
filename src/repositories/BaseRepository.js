import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMapping } from './mappings';

/**
 * ============================================================================
 * SECURITY: THIS FILE USES THE SERVICE-ROLE CLIENT AND BYPASSES ROW LEVEL
 * SECURITY ENTIRELY.
 * ============================================================================
 *
 * Every read and write below goes through createAdminClient(). Postgres will
 * happily return any row of any tenant to this client -- RLS is not consulted.
 * That is deliberate: the ERP is staff software and the services layered on top
 * of these repositories need cross-tenant reads (occupancy across all
 * companies, every invoice, the whole audit log).
 *
 * The consequence is that THE ROUTE-LEVEL STAFF CHECK IS THE ONLY GUARD. If an
 * /api route reaches a repository without first verifying the caller's
 * platform_role server-side (requireStaffClient() in src/lib/supabase/admin.js,
 * or an equivalent check), that route is an unauthenticated dump of the entire
 * database. There is no second line of defence underneath this file.
 *
 * Rules that follow from that:
 *   - Repositories may only ever be imported from server-side route handlers or
 *     server components. `import 'server-only'` above makes a Client Component
 *     import fail the build; do not remove it.
 *   - Never expose a repository method directly to a member-facing route.
 *     Member data access goes through src/lib/supabase/queries.js with the anon
 *     client, where RLS applies.
 *
 * ----------------------------------------------------------------------------
 * WHAT THIS FILE IS
 *
 * The 12 services in src/services/ were written against a JSON document store
 * (src/data/db.json) whose documents are camelCase and flat. The database is
 * snake_case, differently shaped, and has no soft-delete flag anywhere. Rather
 * than rewrite the services, this file keeps their interface exactly as it was
 * -- findAll / findById / create / update / softDelete over camelCase documents
 * -- and delegates the shape translation to a per-collection mapping module in
 * ./mappings/. See ./mappings/README.md for that contract.
 *
 * Errors are always thrown with the Supabase message attached. A data layer
 * that swallows a failure into an empty array turns a broken migration into a
 * page that renders "no results" forever, which is far harder to notice.
 *
 * ----------------------------------------------------------------------------
 * TWO KINDS OF ROW FILTER, AND WHY THEY ARE NOT THE SAME KNOB
 *
 * A mapping may narrow its table in two entirely different ways. They used to
 * share one option, `activeFilter`, and that conflation was a real bug: see
 * `activities` and `audit_logs`, which are two collections over one table.
 *
 *   partitionFilter(q)  WHICH ROWS ARE THIS COLLECTION AT ALL.
 *       Rows outside it are not "deleted" rows of this collection, they are
 *       somebody else's rows. It is therefore applied to EVERY read and to
 *       every single-row write, and `includeDeleted` NEVER relaxes it. Only
 *       collections that share a table with another collection need one:
 *       activities (action LIKE 'activity:%') and audit_logs (NOT LIKE) both
 *       project public.audit_log and must never see each other's rows.
 *
 *   activeFilter(q)     WHICH ROWS ARE STILL LIVE.
 *       The replacement for the old store's `!item.isDeleted` list filter, over
 *       rows that unambiguously belong to this collection. `includeDeleted:
 *       true` deliberately relaxes it, because "show me the retired resources
 *       too" is a legitimate request. Set it only where the soft-delete target
 *       really means "gone from the ERP list" (mappings README section 8).
 *
 * A mapping may declare either, both, or neither. The two are composed in that
 * order; the partition is the outer, non-negotiable one.
 */

/**
 * One service-role client for the whole process.
 *
 * supabase-js clients are stateless request builders over fetch, so sharing one
 * is both safe and cheaper than constructing one per query. It is created
 * lazily so that merely importing a repository does not throw when
 * SUPABASE_SERVICE_ROLE_KEY is absent (during `next build`, for instance).
 */
let _client = null;
function db() {
  if (!_client) _client = createAdminClient();
  return _client;
}

/** Postgres "invalid input syntax for type uuid" -- a malformed id, not a fault. */
const INVALID_TEXT_REPRESENTATION = '22P02';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class BaseRepository {
  /**
   * @param {string} collectionName the key the services already use ('bookings',
   *   'crm_leads', ...). It selects the mapping module, which in turn names the
   *   Postgres table -- the two are no longer the same string for most
   *   collections (users -> profiles, crm_leads -> leads, activities ->
   *   audit_log).
   */
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  /**
   * The mapping module for this collection. Resolved lazily so an unimplemented
   * mapping fails loudly at the call site rather than at import time, where it
   * would take the whole route down with a confusing stack.
   */
  get mapping() {
    const mapping = getMapping(this.collectionName);
    if (mapping.stub) {
      throw new Error(
        `No Supabase mapping for collection "${this.collectionName}" yet: ` +
          `src/repositories/mappings/${this.collectionName}.js is still a stub. ` +
          `Implement it against src/repositories/mappings/README.md.`
      );
    }
    return mapping;
  }

  get table() {
    return this.mapping.table;
  }

  // ---------------------------------------------------------------- internals

  _error(operation, error, extra = '') {
    const table = getMapping(this.collectionName)?.table ?? '?';
    const err = new Error(
      `[${this.collectionName} -> ${table}] ${operation} failed: ` +
        `${error?.message || 'unknown Supabase error'}` +
        `${error?.details ? ` (${error.details})` : ''}` +
        `${error?.hint ? ` hint: ${error.hint}` : ''}` +
        `${extra ? ` ${extra}` : ''}`
    );
    err.cause = error;
    err.code = error?.code;
    err.collection = this.collectionName;
    err.table = table;
    return err;
  }

  /**
   * Narrow a query to the rows that belong to this collection.
   *
   * ALWAYS applied — to reads, to update() and to softDelete() — and never
   * relaxed by `includeDeleted`, because a row outside the partition is not a
   * deleted row of this collection, it is a row of a different collection that
   * happens to live in the same table. See the header note.
   *
   * A mapping with no partitionFilter owns its whole table, which is every
   * collection except activities/audit_logs.
   */
  _partition(q) {
    const { partitionFilter } = this.mapping;
    return partitionFilter ? partitionFilter(q) : q;
  }

  /**
   * Build the base SELECT, with the mapping's column list, partition filter,
   * active-row filter and default ordering applied.
   */
  _query(options = {}) {
    const mapping = this.mapping;
    let q = db().from(mapping.table).select(mapping.selectColumns || '*');

    // (1) The partition. Unconditional: `includeDeleted` must never widen a
    // collection into the neighbouring collection's rows.
    q = this._partition(q);

    // (2) The soft delete. Collections whose soft delete really means "gone
    // from the ERP list" declare an activeFilter; it is the replacement for
    // `!item.isDeleted`, and `includeDeleted: true` relaxes it on purpose.
    if (mapping.activeFilter && options.includeDeleted !== true) {
      q = mapping.activeFilter(q);
    }

    const order = options.order !== undefined ? options.order : mapping.defaultOrder;
    if (order) {
      q = q.order(order.column, { ascending: order.ascending !== false });
    }
    return q;
  }

  _toDocuments(rows) {
    const mapping = this.mapping;
    return (rows || []).map((row) => mapping.toDocument(row)).filter(Boolean);
  }

  /** camelCase document -> row, minus keys the database will not accept. */
  _toRow(data, mode) {
    const mapping = this.mapping;
    const row = mapping.toRow(data, mode) || {};

    // Generated / read-only columns (inventory.is_low_stock) raise 428C9 if they
    // appear in an INSERT or UPDATE payload at all, even set to their own value.
    for (const column of mapping.readOnlyColumns || []) delete row[column];

    // db.json ids were strings like 'inv-2026-001245'. Postgres primary keys are
    // uuid (or bigint for audit_log) with a server-side default, so anything
    // that is not already a uuid is dropped and the database assigns the id.
    if ('id' in row && !(typeof row.id === 'string' && UUID_RE.test(row.id))) {
      delete row.id;
    }

    for (const key of Object.keys(row)) {
      if (row[key] === undefined) delete row[key];
    }
    return row;
  }

  // ------------------------------------------------------------------- reads

  /**
   * All rows of the collection as camelCase documents.
   *
   * `filterFn` is a plain JavaScript predicate over the OLD document shape, the
   * same as it was against db.json, so every existing call site keeps working.
   *
   * IN-MEMORY FILTERING IS INTENTIONAL, NOT AN OVERSIGHT. The predicate cannot
   * be translated to SQL in general -- call sites do `.toLowerCase().includes()`,
   * compare two fields against each other, and read fields that the mapper
   * computes and that exist as no column at all. Every table behind this
   * repository holds dozens to low hundreds of rows (one coworking floor), so
   * fetching and filtering in the route process is correct and cheap. For the
   * cases that ARE straight column equality, use findWhere() below, which pushes
   * the comparison into Postgres. If a table ever grows past a few thousand
   * rows, that is the moment to move the specific hot call site to findWhere()
   * or a purpose-built query -- not to quietly change what findAll() means.
   *
   * @param {((doc: object) => boolean) | null} filterFn
   * @param {{ limit?: number, order?: {column: string, ascending?: boolean} | null,
   *           includeDeleted?: boolean }} options
   */
  async findAll(filterFn = null, options = {}) {
    let q = this._query(options);

    // The limit may only be pushed down when nothing is filtered afterwards,
    // otherwise `limit: 20` plus a predicate would silently return fewer than
    // the 20 matching rows that exist.
    if (options.limit && !filterFn) q = q.limit(options.limit);

    const { data, error } = await q;
    if (error) throw this._error('findAll', error);

    let docs = this._toDocuments(data);
    if (filterFn) docs = docs.filter(filterFn);
    if (options.limit) docs = docs.slice(0, options.limit);
    return docs;
  }

  /**
   * Rows matching a set of column equalities, pushed down to PostgREST.
   *
   * Keys are DOCUMENT field names (camelCase, the shape the services speak);
   * the mapping's `filters` table translates each one to a column and, where the
   * vocabularies differ, translates the value too ('Paid' -> 'paid'). Unknown
   * keys throw rather than being ignored, because a filter that silently does
   * nothing returns too MANY rows.
   *
   *   invoiceRepository.findWhere({ customerId, status: 'Paid' })
   *
   * @param {Record<string, unknown>} criteria
   * @param {{ limit?: number, order?: object | null, includeDeleted?: boolean }} options
   */
  async findWhere(criteria = {}, options = {}) {
    const mapping = this.mapping;
    const filters = mapping.filters || {};
    let q = this._query(options);

    for (const [field, value] of Object.entries(criteria)) {
      if (value === undefined) continue;
      const spec = filters[field];
      if (!spec) {
        throw new Error(
          `[${this.collectionName}] findWhere: no column mapped for "${field}". ` +
            `Supported: ${Object.keys(filters).join(', ') || '(none declared)'}. ` +
            `Add it to filters in src/repositories/mappings/${this.collectionName}.js, ` +
            `or use findAll(predicate) if the comparison is not a column equality.`
        );
      }
      const column = typeof spec === 'string' ? spec : spec.column;
      const toColumn = typeof spec === 'string' ? null : spec.toColumn;
      const dbValue = toColumn && value !== null ? toColumn(value) : value;
      q = dbValue === null ? q.is(column, null) : q.eq(column, dbValue);
    }

    if (options.limit) q = q.limit(options.limit);

    const { data, error } = await q;
    if (error) throw this._error('findWhere', error, `criteria=${JSON.stringify(criteria)}`);
    return this._toDocuments(data);
  }

  /** Convenience for the many finders that want at most one row. */
  async findOneWhere(criteria = {}, options = {}) {
    const rows = await this.findWhere(criteria, { ...options, limit: 1 });
    return rows[0] || null;
  }

  /**
   * A single document by primary key, or null.
   *
   * A malformed id (22P02) is reported as "not found" rather than thrown: the
   * old store used string ids like 'inv-2026-001245' and a few seeded fixtures
   * still carry them, so a lookup with one of those is a miss, not a fault.
   * Every other error still throws.
   *
   * The PARTITION applies here too. Ids are unique per table, not per
   * collection, so activityRepository.findById() of an audit_log row's id would
   * otherwise hand back an audit entry dressed as a timeline document — and a
   * whole-document update() of it would rewrite `action` with the activity
   * prefix and move the row out of the audit trail. Out-of-partition ids are
   * "not found". The soft-delete filter is deliberately NOT applied: fetching a
   * retired resource by its id has always worked and services rely on it.
   */
  async findById(id) {
    if (id === null || id === undefined || id === '') return null;
    const mapping = this.mapping;

    let q = db()
      .from(mapping.table)
      .select(mapping.selectColumns || '*')
      .eq(mapping.idColumn || 'id', id);
    q = this._partition(q);

    const { data, error } = await q.maybeSingle();

    if (error) {
      if (error.code === INVALID_TEXT_REPRESENTATION) return null;
      throw this._error('findById', error, `id=${id}`);
    }
    return data ? mapping.toDocument(data) : null;
  }

  // ------------------------------------------------------------------ writes

  /**
   * Insert one row and return it as a document.
   *
   * Note what is NO LONGER done here, versus the db.json implementation:
   *   - no client-side id is invented; Postgres assigns the uuid/bigint.
   *   - createdAt/updatedAt come from column defaults and touch triggers.
   *   - no isDeleted flag is written; there is no such column anywhere.
   * The document returned still carries id/createdAt/updatedAt/isDeleted,
   * because the mapping synthesises them.
   */
  async create(data) {
    const mapping = this.mapping;
    const row = this._toRow(data, 'create');

    const { data: inserted, error } = await db()
      .from(mapping.table)
      .insert(row)
      .select(mapping.selectColumns || '*')
      .single();

    if (error) throw this._error('create', error, `row=${JSON.stringify(row)}`);
    return mapping.toDocument(inserted);
  }

  /**
   * Patch one row by id. Returns the updated document, or null when no row
   * matched -- the same contract the services already branch on.
   *
   * The mapping's toRow(data, 'update') must emit ONLY the columns whose
   * document fields are present in `updates`; see mappings/README.md.
   *
   * The partition is part of the WHERE clause, so a collection can only ever
   * write its own rows: activityRepository.update() of an audit_log id matches
   * nothing and returns null instead of rewriting an audit entry's `action`.
   *
   * -------------------------------------------------------------------------
   * A PATCH THAT MAPS TO NO COLUMN THROWS. IT USED TO REPORT SUCCESS.
   *
   * This branch previously did `return this.findById(id)` and called it honest.
   * It is not. findById returns a FULL, WELL-FORMED DOCUMENT, and every caller
   * in src/services/ reads a non-null return as "the write happened":
   *
   *     const updated = await invoiceRepository.update(id, patch);
   *     await eventBus.publish(DOMAIN_EVENTS.INVOICE_PAID, { invoice: updated });
   *     return updated;                      // -> route answers 200
   *
   * So a patch nothing could store produced a 200, a domain event, an audit row
   * with an afterState that never existed, and a UI that re-rendered the OLD
   * values as if they were new. That is the single worst failure shape this
   * layer can have: it is indistinguishable from working, from the outside, in
   * the logs, and in the audit trail. `sendReminder` shipped like that for the
   * whole of the Supabase migration -- staff could press "Send 7-day reminder"
   * forever and the row never moved.
   *
   * WHY THROW, RATHER THAN RETURN AN EXPLICIT RESULT THE CALLER HANDLES.
   * Both were considered:
   *
   *   return null                  Already means "no row matched that id", which
   *                                every service branches on as NOT FOUND. Two
   *                                different faults collapsed onto one signal is
   *                                a second lie, not a fix -- customerSign()
   *                                would report "the contract disappeared".
   *   return { ok: false, ... }    Changes update()'s return type at ~11 call
   *                                sites across 12 services, none of which check
   *                                it today. An unchecked result object IS a
   *                                truthy document-shaped value, so every caller
   *                                that does not opt in keeps reporting success
   *                                -- the same bug, one level down, and now
   *                                invisible in a type-free codebase.
   *   throw                        Cannot be ignored, cannot be mistaken for a
   *                                document, and surfaces at the route as a 500
   *                                naming the collection, the table, the fields
   *                                and the mapping file to edit.
   *
   * Throwing is also what this file already does for the same class of fault:
   * softDelete() throws rather than succeed against a mapping that cannot
   * express a delete, "because a delete button that reports success and changes
   * nothing is worse than one that errors". The same sentence applies verbatim
   * to a save button.
   *
   * WHAT THIS DOES NOT CATCH, stated rather than hidden. The check is on the
   * WHOLE patch, so an update that maps SOME of its fields still drops the rest
   * silently -- update(id, { status: 'Paid', paymentMethod: 'Mada' }) writes the
   * status and loses the tender. Three of the four known losses were of that
   * shape. Catching those needs each mapping to declare which document fields it
   * knowingly drops (the KNOWN LOSSES list every module already carries in its
   * header, as data rather than prose) so that an UNDECLARED dropped field can
   * throw here too. That is a change across all fourteen mapping modules and is
   * deliberately not smuggled into this one; until it exists, the KNOWN LOSSES
   * headers are the inventory and they must be kept accurate.
   */
  async update(id, updates) {
    if (id === null || id === undefined || id === '') return null;
    const mapping = this.mapping;
    const row = this._toRow(updates, 'update');
    delete row.id; // never move a row's primary key

    if (Object.keys(row).length === 0) {
      const fields = Object.keys(updates && typeof updates === 'object' ? updates : {});
      const err = new Error(
        `[${this.collectionName} -> ${mapping.table}] update(${id}) would persist nothing: ` +
          `${fields.length ? `none of ${fields.map((f) => JSON.stringify(f)).join(', ')} maps to a column`
                            : 'the patch is empty'}. ` +
          `Refusing instead of returning the unchanged row, which every caller reads as success. ` +
          `Fix one of: the caller (it is patching fields this collection does not have), or ` +
          `src/repositories/mappings/${this.collectionName}.js (add the field to toRow), or ` +
          `the schema (add the column in a migration under supabase/migrations/ and map it). ` +
          `The mapping's KNOWN LOSSES header lists what this collection cannot store.`
      );
      err.code = 'NO_MAPPED_COLUMNS';
      err.collection = this.collectionName;
      err.table = mapping.table;
      err.fields = fields;
      throw err;
    }

    let q = db()
      .from(mapping.table)
      .update(row)
      .eq(mapping.idColumn || 'id', id);
    q = this._partition(q);

    const { data, error } = await q.select(mapping.selectColumns || '*');

    if (error) {
      if (error.code === INVALID_TEXT_REPRESENTATION) return null;
      throw this._error('update', error, `id=${id} row=${JSON.stringify(row)}`);
    }
    return data && data.length ? mapping.toDocument(data[0]) : null;
  }

  /**
   * The soft delete the old store did with `isDeleted: true`.
   *
   * Postgres has no such column: soft delete was dropped in favour of real
   * foreign keys and a lifecycle status. Each mapping therefore declares what
   * "deleted" means for its table -- usually a status change
   * ({ column: 'status', value: 'retired' }), sometimes a boolean flag
   * ({ column: 'is_active', value: false }), sometimes a function for anything
   * more involved.
   *
   * A mapping whose table genuinely cannot be soft-deleted (append-only ledgers
   * such as audit_log and contract_versions) declares softDelete: null, and this
   * throws. It does NOT quietly succeed: a delete button that reports success
   * and changes nothing is worse than one that errors.
   */
  async softDelete(id) {
    const mapping = this.mapping;
    const strategy = mapping.softDelete;

    if (!strategy) {
      throw new Error(
        `[${this.collectionName} -> ${mapping.table}] softDelete is not supported: ` +
          `${mapping.softDeleteReason || 'this table is append-only and has no delete path'}.`
      );
    }

    if (typeof strategy === 'function') {
      return strategy({ id, repository: this, client: db(), mapping });
    }

    // Same WHERE clause as update(): a collection soft-deletes only its own
    // rows, never a row that belongs to the other half of a shared table.
    let q = db()
      .from(mapping.table)
      .update({ [strategy.column]: strategy.value })
      .eq(mapping.idColumn || 'id', id);
    q = this._partition(q);

    const { data, error } = await q.select(mapping.selectColumns || '*');

    if (error) {
      if (error.code === INVALID_TEXT_REPRESENTATION) return null;
      throw this._error('softDelete', error, `id=${id}`);
    }
    return data && data.length ? mapping.toDocument(data[0]) : null;
  }

  /**
   * Row count for the collection, without transferring the rows.
   *
   * Counts the same rows findAll() would return, which means the partition
   * applies unconditionally: count({ includeDeleted: true }) widens a
   * collection to its own soft-deleted rows, never to the whole table.
   */
  async count(options = {}) {
    const mapping = this.mapping;
    let q = db()
      .from(mapping.table)
      .select(mapping.idColumn || 'id', { count: 'exact', head: true });
    q = this._partition(q);
    if (mapping.activeFilter && options.includeDeleted !== true) q = mapping.activeFilter(q);

    const { count, error } = await q;
    if (error) throw this._error('count', error);
    return count ?? 0;
  }
}
