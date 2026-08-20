import { BaseRepository } from './BaseRepository';

/**
 * Concrete repositories.
 *
 * The collection name passed to super() is NOT the table name. It selects a
 * mapping module in ./mappings/, which names the table and translates between
 * the camelCase documents the services speak and the snake_case rows Postgres
 * stores. See ./mappings/README.md.
 *
 * Finders here come in two flavours:
 *   - findWhere({...}) for straight column equality. The comparison is pushed
 *     into Postgres via PostgREST .eq(), so only matching rows cross the wire.
 *     Keys are document field names; the mapping's `filters` table translates
 *     them (and their values) to columns.
 *   - findAll(predicate) for anything that is not an equality — comparing two
 *     fields, substring matching, or reading a field the mapper computes. Those
 *     fetch and filter in memory, which is correct at this scale; see the note
 *     on findAll in BaseRepository.js.
 */

export class BookingRepository extends BaseRepository {
  constructor() {
    super('bookings');
  }

  async findByResourceAndDate(resourceId, date) {
    // `date` is not a column — bookings stores a single time_range tstzrange and
    // the mapper derives date/startTime/endTime from it in Asia/Riyadh. Only the
    // resource equality can be pushed down; the day is matched on the document.
    const sameResource = await this.findWhere({ resourceId });
    return sameResource.filter((b) => b.date === date);
  }

  async findByCustomer(customerId) {
    return this.findWhere({ customerId });
  }
}

export class WorkspaceRepository extends BaseRepository {
  constructor() {
    super('resources');
  }

  async findByCategory(category) {
    return this.findWhere({ category });
  }

  async findBySlug(slug) {
    return this.findOneWhere({ slug });
  }
}

export class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  async findByEmail(email) {
    return this.findOneWhere({ email });
  }
}

export class InvoiceRepository extends BaseRepository {
  constructor() {
    super('invoices');
  }

  async findByCustomer(customerId) {
    return this.findWhere({ customerId });
  }

  async findByStatus(status) {
    // The old predicate compared case-insensitively. The mapping's status filter
    // normalises 'Paid' -> 'paid' on the way to the column, so the equality is
    // exact in SQL and case-insensitive at the call site, as before.
    return this.findWhere({ status });
  }
}

export class ContractRepository extends BaseRepository {
  constructor() {
    super('contracts');
  }

  async findByCustomer(customerId) {
    return this.findWhere({ customerId });
  }

  async findByToken(token) {
    return this.findOneWhere({ signingToken: token });
  }
}

export class ContractTemplateRepository extends BaseRepository {
  constructor() {
    super('contract_templates');
  }
}

export class ContractVersionRepository extends BaseRepository {
  constructor() {
    super('contract_versions');
  }

  async findByContract(contractId) {
    return this.findWhere({ contractId }, { order: { column: 'version', ascending: true } });
  }
}

export class CustomerRepository extends BaseRepository {
  constructor() {
    super('customers');
  }
}

export class CrmRepository extends BaseRepository {
  constructor() {
    super('crm_leads');
  }

  async findByStage(stage) {
    // The pipeline stage lives in leads.status under a different vocabulary
    // ('Proposal Sent' -> 'qualified'); the mapping's filter does that
    // translation, so this stays a single indexed equality.
    return this.findWhere({ stage });
  }
}

export class InventoryRepository extends BaseRepository {
  constructor() {
    super('inventory');
  }

  async findLowStock() {
    // Genuinely computed: this compares two columns against each other, which
    // PostgREST .eq() cannot express, so it stays an in-memory predicate.
    // (public.inventory does carry a generated is_low_stock column; pushing this
    // down would mean adding it to the mapping's filters and calling
    // findWhere({ lowStock: true }). Left as-is deliberately, so the behaviour
    // matches the old store exactly during the migration.)
    return this.findAll((item) => item.quantity <= item.minStock);
  }
}

export class SupportRepository extends BaseRepository {
  constructor() {
    super('support_tickets');
  }

  async findByCustomer(customerId) {
    return this.findWhere({ customerId });
  }
}

export class ActivityRepository extends BaseRepository {
  constructor() {
    super('activities');
  }

  async getRecent(limit = 20) {
    // Not a predicate — a LIMIT, pushed down into Postgres, so this is the
    // newest `limit` rows and no more.
    //
    // The mapping orders audit_log by its bigint `id` desc, NOT by created_at.
    // That is deliberate and must stay: rows written in one transaction share
    // created_at to the microsecond, so created_at desc leaves them tied and a
    // pushed-down LIMIT would be nondeterministic about which of them it
    // returns. `id` is a monotonic sequence, so id desc is newest-first and a
    // total order. Only activity rows are considered — the mapping's
    // partitionFilter keeps the audit trail out.
    return this.findAll(null, { limit });
  }
}

export class AuditRepository extends BaseRepository {
  constructor() {
    super('audit_logs');
  }
}

export class NotificationRepository extends BaseRepository {
  constructor() {
    super('notifications');
  }
}

// Export repository instances
export const bookingRepository = new BookingRepository();
export const workspaceRepository = new WorkspaceRepository();
export const userRepository = new UserRepository();
export const invoiceRepository = new InvoiceRepository();
export const contractRepository = new ContractRepository();
export const contractTemplateRepository = new ContractTemplateRepository();
export const contractVersionRepository = new ContractVersionRepository();
export const customerRepository = new CustomerRepository();
export const crmRepository = new CrmRepository();
export const inventoryRepository = new InventoryRepository();
export const supportRepository = new SupportRepository();
export const activityRepository = new ActivityRepository();
export const auditRepository = new AuditRepository();
export const notificationRepository = new NotificationRepository();
