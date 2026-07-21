import { invoiceRepository } from '@/repositories';
import { eventBus, DOMAIN_EVENTS } from '@/core/events/EventBus';
import { auditLogService } from './AuditLogService';

export class InvoiceService {
  constructor() {
    this._registerEventHandlers();
  }

  _registerEventHandlers() {
    // Automatically generate invoice upon BOOKING_CREATED
    eventBus.subscribe(DOMAIN_EVENTS.BOOKING_CREATED, async (event) => {
      const { booking } = event.payload;
      await this.createInvoice({
        customerId: booking.customerId,
        customerName: booking.customerName,
        companyName: booking.customerName,
        type: 'Booking',
        description: `Booking ${booking.reference} - ${booking.resourceName}`,
        amount: booking.totalAmount,
        dueDate: booking.date,
        items: [
          { item: booking.resourceName, qty: booking.duration, unitPrice: booking.subtotal / (booking.duration || 1), total: booking.totalAmount }
        ],
        subtotal: booking.subtotal,
        vat: booking.vat,
        total: booking.totalAmount,
        status: 'Unpaid'
      });
    });
  }

  async getInvoices(filters = {}) {
    let list = await invoiceRepository.findAll();
    if (list.length === 0) {
      // Return default seeded invoices if empty
      list = [
        {
          id: "inv-2026-001245",
          invoiceNumber: "INV-2026-001245",
          customerId: "usr-01",
          customerName: "Ahmed Alharbi",
          companyName: "Mars Technologies",
          date: "2026-06-28",
          dueDate: "2026-07-05",
          type: "Membership",
          description: "Mars Premium Membership - Business Plan",
          amount: 2400,
          status: "Paid",
          items: [{ item: "Premium Membership", qty: 1, unitPrice: 2400, total: 2400 }],
          subtotal: 2086.96,
          vat: 313.04,
          total: 2400,
          remindersSent: { advance7d: true, post48h: false }
        },
        {
          id: "inv-2026-001288",
          invoiceNumber: "INV-2026-001288",
          customerId: "usr-02",
          customerName: "Sarah Khan",
          companyName: "Mars Technologies",
          date: "2026-07-10",
          dueDate: "2026-07-27",
          type: "Booking",
          description: "Meeting Room Alpha - 2 hours",
          amount: 160,
          status: "Unpaid",
          items: [{ item: "Meeting Room Alpha", qty: 2, unitPrice: 80, total: 160 }],
          subtotal: 139.13,
          vat: 20.87,
          total: 160,
          remindersSent: { advance7d: false, post48h: false }
        }
      ];
    }

    return list.filter(inv => {
      if (filters.customerId && inv.customerId !== filters.customerId) return false;
      if (filters.status && inv.status.toLowerCase() !== filters.status.toLowerCase()) return false;
      return true;
    });
  }

  async createInvoice(invoiceData) {
    const invCount = (await invoiceRepository.findAll()).length + 1246;
    const invNumber = `INV-2026-${String(invCount).padStart(6, '0')}`;

    const newInvoice = await invoiceRepository.create({
      invoiceNumber: invNumber,
      date: new Date().toISOString().split('T')[0],
      dueDate: invoiceData.dueDate || new Date().toISOString().split('T')[0],
      customerId: invoiceData.customerId || 'usr-guest',
      customerName: invoiceData.customerName || 'Guest',
      companyName: invoiceData.companyName || 'Mars Space',
      type: invoiceData.type || 'Service',
      description: invoiceData.description,
      amount: Number(invoiceData.amount),
      status: invoiceData.status || 'Unpaid',
      items: invoiceData.items || [],
      subtotal: Number(invoiceData.subtotal || invoiceData.amount * 0.85),
      vat: Number(invoiceData.vat || invoiceData.amount * 0.15),
      total: Number(invoiceData.total || invoiceData.amount),
      remindersSent: { advance7d: false, post48h: false }
    });

    await eventBus.publish(DOMAIN_EVENTS.INVOICE_GENERATED, { invoice: newInvoice });
    return newInvoice;
  }

  async payInvoice(id, paymentMethod = 'Mada', actor = 'Customer') {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw new Error('Invoice not found');

    const updated = await invoiceRepository.update(id, {
      status: 'Paid',
      paymentMethod,
      paidAt: new Date().toISOString()
    });

    await auditLogService.recordAudit({
      actor,
      action: 'PAY_INVOICE',
      module: 'FINANCE',
      entityId: id,
      beforeState: invoice,
      afterState: updated
    });

    await eventBus.publish(DOMAIN_EVENTS.INVOICE_PAID, { invoice: updated });
    return updated;
  }

  async sendReminder(id, reminderType) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw new Error('Invoice not found');

    const currentReminders = invoice.remindersSent || { advance7d: false, post48h: false };
    const updatedReminders = { ...currentReminders, [reminderType]: true };

    const updated = await invoiceRepository.update(id, {
      remindersSent: updatedReminders
    });

    return updated;
  }
}

export const invoiceService = new InvoiceService();
