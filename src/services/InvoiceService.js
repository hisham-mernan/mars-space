import { invoiceRepository } from '@/repositories';
import { eventBus, DOMAIN_EVENTS } from '@/core/events/EventBus';
import { auditLogService } from './AuditLogService';

/**
 * KSA VAT. public.invoices.vat_rate is numeric(5,4) with the same 0.15 default,
 * so the rate stored alongside the split always describes the split.
 */
const VAT_RATE = 0.15;

/**
 * Every money column on public.invoices is numeric(10,2), i.e. an exact integer
 * number of halalas. All arithmetic below is done in halalas so that binary
 * floating point never gets a chance to produce 130.43000000000006 and round
 * the wrong way. Riyals are reconstructed only at the moment of writing.
 */
function toHalalas(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function toRiyals(halalas) {
  return halalas / 100;
}

/** `0` is a legitimate subtotal, so `||` cannot be used to detect absence. */
function isSupplied(value) {
  return value !== undefined && value !== null && value !== '';
}

/**
 * Split a VAT-INCLUSIVE gross total into { subtotal, vat }, both in halalas,
 * guaranteeing subtotal + vat === gross EXACTLY.
 *
 * ---------------------------------------------------------------------------
 * WHY `/ 1.15` AND NOT `* 0.85`  (this is the bug that reached Postgres)
 *
 * Every figure the ERP quotes is GROSS — VAT included. Extracting the net from
 * a gross figure is `gross / 1.15`; `gross * 0.85` is a different number and is
 * simply wrong:
 *
 *   gross 1000.00  ->  869.57 + 130.43   correct  (869.57 * 1.15 = 1000.00)
 *                  ->  850.00 + 150.00   WRONG    (850.00 * 1.15 =  977.50)
 *
 *   gross 2400.00  ->  2086.96 + 313.04  correct, and the figure the seeded
 *                                        demo invoices have always carried.
 *
 * The old fallback (`amount * 0.85` / `amount * 0.15`) understates the net and
 * overstates the VAT, yet still sums to the total, so
 * `CHECK (total = subtotal + vat_amount)` accepts it and the error is invisible
 * in the database. Hence this comment.
 *
 * ---------------------------------------------------------------------------
 * WHY ONE COMPONENT IS DERIVED BY SUBTRACTION
 *
 * Rounding the two components independently can land a halala out, and
 * invoices_total_consistent then rejects the whole insert. Take gross 1000.00:
 *
 *   subtotal = round(1000.00 / 1.15)   = round(869.5652...) = 869.57
 *   vat      = round(869.57 * 0.15)    = round(130.4355)    = 130.44   <- BAD
 *              869.57 + 130.44 = 1000.01  != 1000.00        CHECK fails
 *
 *   vat      = 1000.00 - 869.57        = 130.43             <- what we do
 *              869.57 + 130.43 = 1000.00                    CHECK holds
 *
 * So: round the gross to the halala first, round exactly ONE component, and
 * take the other as the remainder. That identity holds for every input, which
 * is why the verification asserts it rather than spot-checking a few values.
 */
function splitVatInclusive(grossHalalas) {
  const subtotal = Math.round(grossHalalas / (1 + VAT_RATE));
  return { subtotal, vat: grossHalalas - subtotal };
}

/**
 * Reconcile whatever the caller supplied into a { subtotal, vat, total } triple
 * in halalas that always satisfies subtotal + vat === total.
 *
 * A caller supplying BOTH components owns the split — the booking pipeline
 * reads its figures straight back out of Postgres, where they already balance,
 * and silently re-deriving them here would throw away a real quote. Anything
 * missing is derived by subtraction, never by a second independent rounding.
 */
function resolveMoney(invoiceData) {
  const gross = isSupplied(invoiceData.total) ? invoiceData.total : invoiceData.amount;
  const total = toHalalas(gross);

  const hasSubtotal = isSupplied(invoiceData.subtotal);
  const hasVat = isSupplied(invoiceData.vat);

  if (hasSubtotal && hasVat) {
    return { subtotal: toHalalas(invoiceData.subtotal), vat: toHalalas(invoiceData.vat), total };
  }
  if (hasSubtotal) {
    const subtotal = toHalalas(invoiceData.subtotal);
    return { subtotal, vat: total - subtotal, total };
  }
  if (hasVat) {
    const vat = toHalalas(invoiceData.vat);
    return { subtotal: total - vat, vat, total };
  }
  const { subtotal, vat } = splitVatInclusive(total);
  return { subtotal, vat, total };
}

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

  /**
   * An empty invoice table now returns an empty array. There used to be a
   * hardcoded pair of seed invoices here that stood in whenever the query came
   * back empty, which meant a broken read looked identical to a working one —
   * exactly the failure the Supabase migration needs to be able to see.
   */
  async getInvoices(filters = {}) {
    const list = await invoiceRepository.findAll();

    return list.filter(inv => {
      if (filters.customerId && inv.customerId !== filters.customerId) return false;
      if (filters.status && String(inv.status ?? '').toLowerCase() !== filters.status.toLowerCase()) return false;
      return true;
    });
  }

  async createInvoice(invoiceData) {
    const invCount = (await invoiceRepository.findAll()).length + 1246;
    const invNumber = `INV-2026-${String(invCount).padStart(6, '0')}`;

    // See splitVatInclusive() above: a bare `amount` is a VAT-INCLUSIVE gross,
    // so the net is amount / 1.15 and the VAT is the remainder.
    const money = resolveMoney(invoiceData);

    const newInvoice = await invoiceRepository.create({
      invoiceNumber: invNumber,
      date: new Date().toISOString().split('T')[0],
      dueDate: invoiceData.dueDate || new Date().toISOString().split('T')[0],
      customerId: invoiceData.customerId || 'usr-guest',
      customerName: invoiceData.customerName || 'Guest',
      companyName: invoiceData.companyName || 'Mars Space',
      type: invoiceData.type || 'Service',
      description: invoiceData.description,
      // `amount` and `total` are two names for the same gross money and map to
      // the single `total` column; they must never disagree.
      amount: toRiyals(money.total),
      status: invoiceData.status || 'Unpaid',
      items: invoiceData.items || [],
      subtotal: toRiyals(money.subtotal),
      vat: toRiyals(money.vat),
      vatRate: isSupplied(invoiceData.vatRate) ? Number(invoiceData.vatRate) : VAT_RATE,
      total: toRiyals(money.total),
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
