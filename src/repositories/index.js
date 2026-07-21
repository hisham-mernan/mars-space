import { BaseRepository } from './BaseRepository';

export class BookingRepository extends BaseRepository {
  constructor() {
    super('bookings');
  }

  async findByResourceAndDate(resourceId, date) {
    return this.findAll(b => b.resourceId === resourceId && b.date === date);
  }

  async findByCustomer(customerId) {
    return this.findAll(b => b.customerId === customerId);
  }
}

export class WorkspaceRepository extends BaseRepository {
  constructor() {
    super('resources');
  }

  async findByCategory(category) {
    return this.findAll(w => w.category === category);
  }

  async findBySlug(slug) {
    const items = await this.findAll(w => w.slug === slug);
    return items[0] || null;
  }
}

export class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  async findByEmail(email) {
    const items = await this.findAll(u => u.email === email);
    return items[0] || null;
  }
}

export class InvoiceRepository extends BaseRepository {
  constructor() {
    super('invoices');
  }

  async findByCustomer(customerId) {
    return this.findAll(inv => inv.customerId === customerId);
  }

  async findByStatus(status) {
    return this.findAll(inv => inv.status.toLowerCase() === status.toLowerCase());
  }
}

export class ContractRepository extends BaseRepository {
  constructor() {
    super('contracts');
  }

  async findByCustomer(customerId) {
    return this.findAll(c => c.customerId === customerId);
  }

  async findByToken(token) {
    const items = await this.findAll(c => c.signingToken === token);
    return items[0] || null;
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
    return this.findAll(v => v.contractId === contractId);
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
    return this.findAll(lead => lead.stage === stage);
  }
}

export class InventoryRepository extends BaseRepository {
  constructor() {
    super('inventory');
  }

  async findLowStock() {
    return this.findAll(item => item.quantity <= item.minStock);
  }
}

export class SupportRepository extends BaseRepository {
  constructor() {
    super('support_tickets');
  }

  async findByCustomer(customerId) {
    return this.findAll(t => t.customerId === customerId);
  }
}

export class ActivityRepository extends BaseRepository {
  constructor() {
    super('activities');
  }

  async getRecent(limit = 20) {
    const items = await this.findAll();
    return items.slice(0, limit);
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
