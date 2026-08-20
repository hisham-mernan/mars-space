/**
 * MAPPING: collection "invoices"  ->  public.invoices
 *
 * See ./README.md for the module contract. Everything below is the translation
 * between the flat camelCase invoice documents the services in src/services/
 * still speak and the normalised snake_case rows Postgres actually stores.
 *
 * ---------------------------------------------------------------------------
 * MONEY IS READ FROM THE COLUMNS, NEVER RECOMPUTED
 *
 * public.invoices stores `subtotal`, `vat_rate`, `vat_amount` and `total` as
 * four separate numeric columns, guarded by
 *   CHECK (total = subtotal + vat_amount)     -- invoices_total_consistent
 * so the stored values are authoritative and this mapper simply passes them
 * through (via num(), because PostgREST serialises numeric as a STRING and the
 * UI would otherwise concatenate instead of adding).
 *
 * This deliberately retires a bug in InvoiceService.createInvoice, which fell
 * back to `subtotal = amount * 0.85` / `vat = amount * 0.15`. Saudi VAT is 15%
 * and the ERP quotes VAT-INCLUSIVE totals, so extracting the net from a gross
 * figure is `amount / 1.15`, not `amount * 0.85` (1000 gross -> 869.57 + 130.43,
 * not 850 + 150). Nothing here reproduces either formula: whatever the caller
 * supplies is what is written, and whatever the columns hold is what is read
 * back. Fixing the fallback belongs in InvoiceService, not in this layer.
 *
 * `amount` and `total` were two names for the same money in the old document
 * (`amount: 2400, total: 2400`). Both are returned from the single `total`
 * column; on write `total` wins and `amount` is the fallback.
 *
 * ---------------------------------------------------------------------------
 * NON-OBVIOUS FIELD -> COLUMN PAIRS
 *
 *   customerId    -> company_id      (a companies FK, NOT a profiles FK)
 *   type          -> kind            (different vocabulary, see KIND_ALIASES)
 *   date          -> issue_date
 *   dueDate       -> due_date        (CHECK due_date >= issue_date)
 *   amount, total -> total
 *   vat           -> vat_amount
 *   items         -> the separate public.invoice_line_items table (embedded)
 *   customerName / companyName / memberName -> no column; derived from the
 *                    embedded company, preferring the embedded booking's
 *                    guest_name for a walk-in booking invoice.
 *
 * ---------------------------------------------------------------------------
 * KNOWN LOSSES - fields the services write that this table cannot store.
 * Listed so the follow-up migration has an exact inventory; silent loss is the
 * failure mode this whole layer exists to avoid.
 *
 *   paymentMethod  NO COLUMN. Synthesised as null on read, dropped on write.
 *                  InvoiceService.payInvoice(id, 'Mada') still records status
 *                  and paid_at; the tender type is lost.
 *   items          READ-ONLY here. Line items live in invoice_line_items, and
 *                  BaseRepository#create inserts into exactly one table, so
 *                  `items` is embedded on read and DROPPED on write. An invoice
 *                  created through this repository has a correct total and no
 *                  line detail until something writes invoice_line_items.
 *   customerId     A legacy string id ('usr-01', 'usr-guest') is not a uuid and
 *                  cannot go into company_id, so it becomes null - company_id is
 *                  nullable and a guest invoice legitimately has no company. The
 *                  legacy string itself is lost. A real uuid passes straight
 *                  through and the FK to companies enforces the rest.
 *
 * ---------------------------------------------------------------------------
 * remindersSent - NO LONGER A LOSS
 *
 * It used to be one, and it made InvoiceService.sendReminder() lie: there was
 * no column, toRow emitted nothing, BaseRepository#update saw a zero-key patch
 * and returned findById() unchanged, so the route answered 200 with an invoice
 * whose reminder flags had not moved. Migration
 * supabase/migrations/20260820000100_invoice_reminder_state.sql adds
 * `reminders_sent jsonb NOT NULL DEFAULT '{"advance7d": false, "post48h": false}'`,
 * pinned by CHECK invoices_reminders_sent_shape to exactly those two boolean
 * keys, and this mapping reads and writes it.
 *
 * Whatever the caller supplies is normalised to those two booleans, and an
 * unknown key THROWS (see remindersToColumn). sendReminder passes its
 * `reminderType` argument straight through as an object key, so a typo would
 * otherwise be written as a flag nothing ever reads - the silent-success
 * failure this column exists to end. A new reminder kind means editing
 * REMINDER_KINDS and the CHECK constraint together.
 *
 * ---------------------------------------------------------------------------
 * isDeleted / softDelete
 *
 * Postgres has no isDeleted column. Soft delete for an invoice is
 * `status = 'void'`, so `isDeleted` is derived from it and a round trip is
 * honest. There is deliberately NO activeFilter: a voided invoice must stay
 * visible in finance (README section 8), so findAll() still returns it with
 * isDeleted: true.
 */

import { put, num, toTitleCase, toSnakeCase, toDateOnly, isUuid } from './_helpers';

/** invoices_status_check */
const INVOICE_STATUSES = ['draft', 'unpaid', 'partially_paid', 'paid', 'overdue', 'void'];

/** invoices_kind_check */
const INVOICE_KINDS = ['booking', 'membership', 'addon', 'deposit', 'other'];

/**
 * The ERP's free-text `type` is wider than the kind CHECK. Anything unlisted
 * lands on 'other' rather than raising a constraint violation, because `type`
 * is only a label and rejecting an invoice over it would be worse than
 * generalising. 'Contract Invoice' (written by ContractService on
 * CONTRACT_ACTIVATED) is a recurring workspace charge, i.e. 'membership' - note
 * that the round trip therefore renames it to 'Membership'.
 */
const KIND_ALIASES = {
  booking: 'booking',
  membership: 'membership',
  contract_invoice: 'membership',
  subscription: 'membership',
  addon: 'addon',
  add_on: 'addon',
  deposit: 'deposit',
  service: 'other',
  other: 'other',
};

function statusToColumn(value) {
  const snake = toSnakeCase(value);
  if (!INVOICE_STATUSES.includes(snake)) {
    throw new Error(
      `[invoices -> public.invoices] unknown status ${JSON.stringify(value)} ` +
        `(mapped to "${snake}"). invoices_status_check accepts: ${INVOICE_STATUSES.join(', ')}.`
    );
  }
  return snake;
}

function kindToColumn(value) {
  const snake = toSnakeCase(value);
  return KIND_ALIASES[snake] ?? (INVOICE_KINDS.includes(snake) ? snake : 'other');
}

/**
 * The dunning reminders invoices.reminders_sent tracks, and the only keys
 * CHECK invoices_reminders_sent_shape allows. Keep in step with the constraint
 * in supabase/migrations/20260820000100_invoice_reminder_state.sql.
 */
const REMINDER_KINDS = ['advance7d', 'post48h'];

/** The column -> the { advance7d, post48h } map the ERP page indexes into. */
function remindersToDocument(value) {
  const sent = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  // Booleans, never undefined: src/app/erp/invoices/page.js does
  // `inv.remindersSent.advance7d` unguarded.
  return Object.fromEntries(REMINDER_KINDS.map((k) => [k, sent[k] === true]));
}

/**
 * The map -> the column. Normalises to exactly the known keys as booleans, and
 * refuses anything else.
 *
 * The throw is the point. InvoiceService.sendReminder(id, reminderType) builds
 * `{ ...current, [reminderType]: true }`, so reminderType arrives here as an
 * object key with no validation anywhere behind it. Writing an unrecognised key
 * would store a flag nothing reads and report success - which is exactly the
 * bug the reminders_sent column was added to fix, reintroduced one level down.
 */
function remindersToColumn(value) {
  // null clears the state, and "no reminder has been sent" is what cleared
  // means. The column is NOT NULL with this as its default.
  if (value === null || value === undefined) {
    return Object.fromEntries(REMINDER_KINDS.map((k) => [k, false]));
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(
      `[invoices -> public.invoices] remindersSent must be an object of ` +
        `${REMINDER_KINDS.join('/')} booleans, got ${JSON.stringify(value)}.`
    );
  }
  const unknown = Object.keys(value).filter((k) => !REMINDER_KINDS.includes(k));
  if (unknown.length) {
    throw new Error(
      `[invoices -> public.invoices] unknown reminder kind ` +
        `${unknown.map((k) => JSON.stringify(k)).join(', ')}. ` +
        `invoices.reminders_sent holds exactly ${REMINDER_KINDS.join(' and ')} ` +
        `(CHECK invoices_reminders_sent_shape). InvoiceService.sendReminder(id, ` +
        `reminderType) passes reminderType through as a key, so check the caller. ` +
        `A genuinely new kind means editing REMINDER_KINDS here and the CHECK ` +
        `constraint in the same change.`
    );
  }
  return Object.fromEntries(REMINDER_KINDS.map((k) => [k, value[k] === true]));
}

/** A uuid FK column cannot hold a legacy db.json id; anything else clears it. */
function uuidOrNull(value) {
  return isUuid(value) ? value : null;
}

/** invoice_line_items row -> the { item, qty, unitPrice, total } the old documents carried. */
function lineItemToDocument(row) {
  return {
    item: row?.description ?? '',
    itemAr: row?.description_ar ?? null,
    qty: num(row?.quantity) ?? 0,
    unitPrice: num(row?.unit_price) ?? 0,
    total: num(row?.line_total) ?? 0,
  };
}

const mapping = {
  table: 'invoices',

  /**
   * `company` gives the invoice its customer/company name; `line_items` is the
   * `items` array in one query rather than an N+1 loop; `booking` supplies
   * guest_name for a walk-in invoice with no company on file. Every embed is
   * guarded with ?. in toDocument because each FK is nullable.
   */
  selectColumns: [
    '*',
    'company:companies(id,name,name_ar)',
    'booking:bookings(id,reference,guest_name,guest_email)',
    'line_items:invoice_line_items(id,description,description_ar,quantity,unit_price,line_total,sort_order)',
  ].join(','),

  idColumn: 'id',
  defaultOrder: { column: 'created_at', ascending: false },

  // No activeFilter: voided invoices stay in the finance list (README section 8).

  filters: {
    customerId: 'company_id',
    companyId: 'company_id',
    contractId: 'contract_id',
    bookingId: 'booking_id',
    invoiceNumber: 'invoice_number',
    currency: 'currency',
    date: 'issue_date',
    dueDate: 'due_date',
    // 'Paid' -> 'paid': the call site stays case-insensitive, the SQL exact.
    status: { column: 'status', toColumn: statusToColumn },
    type: { column: 'kind', toColumn: kindToColumn },
  },

  softDelete: { column: 'status', value: 'void' },

  toDocument(row) {
    if (!row) return null;

    const companyName = row.company?.name ?? null;
    // The old document's customerName was a person. invoices has no profiles FK,
    // so the company name is the closest available truth, with the booking's
    // guest name preferred when there is one.
    const personName = row.booking?.guest_name ?? null;

    const items = Array.isArray(row.line_items)
      ? [...row.line_items]
          .sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0))
          .map(lineItemToDocument)
      : [];

    const total = num(row.total) ?? 0;

    return {
      id: row.id,
      invoiceNumber: row.invoice_number ?? null,

      customerId: row.company_id ?? null,
      customerName: personName ?? companyName,
      companyName,
      memberName: personName ?? companyName,
      memberEmail: row.booking?.guest_email ?? null,

      contractId: row.contract_id ?? null,
      bookingId: row.booking_id ?? null,

      type: toTitleCase(row.kind),
      description: row.description ?? null,
      descriptionAr: row.description_ar ?? null,

      date: row.issue_date ?? null,
      dueDate: row.due_date ?? null,

      // Straight from the columns. See the header: nothing is recomputed.
      subtotal: num(row.subtotal) ?? 0,
      vat: num(row.vat_amount) ?? 0,
      vatRate: num(row.vat_rate) ?? 0,
      total,
      amount: total,
      amountPaid: num(row.amount_paid) ?? 0,
      currency: row.currency ?? 'SAR',

      status: toTitleCase(row.status),
      paidAt: row.paid_at ?? null,
      pdfPath: row.pdf_path ?? null,

      items,

      remindersSent: remindersToDocument(row.reminders_sent),

      // No column; see KNOWN LOSSES in the header.
      paymentMethod: null,

      isDeleted: row.status === 'void',
      createdAt: row.created_at ?? null,
      updatedAt: row.updated_at ?? null,
    };
  },

  toRow(doc, mode) {
    const row = {};
    if (!doc) return row;

    // invoice_number has a next_invoice_number() default, but the ERP generates
    // its own human-facing number and SearchService looks invoices up by it, so
    // an explicitly supplied number is written rather than dropped.
    put(row, 'invoice_number', doc.invoiceNumber);

    put(row, 'company_id', doc.customerId !== undefined ? doc.customerId : doc.companyId, uuidOrNull);
    put(row, 'contract_id', doc.contractId, uuidOrNull);
    put(row, 'booking_id', doc.bookingId, uuidOrNull);

    put(row, 'kind', doc.type, kindToColumn);
    put(row, 'description', doc.description);
    put(row, 'description_ar', doc.descriptionAr);

    put(row, 'issue_date', doc.date, toDateOnly);
    put(row, 'due_date', doc.dueDate, toDateOnly);

    put(row, 'subtotal', doc.subtotal, Number);
    put(row, 'vat_rate', doc.vatRate, Number);
    put(row, 'vat_amount', doc.vat, Number);
    put(row, 'total', doc.total !== undefined ? doc.total : doc.amount, Number);
    put(row, 'amount_paid', doc.amountPaid, Number);
    put(row, 'currency', doc.currency);

    put(row, 'status', doc.status, statusToColumn);
    put(row, 'paid_at', doc.paidAt);
    put(row, 'pdf_path', doc.pdfPath);

    // Not routed through put()'s transform: put() skips the transform for null,
    // and null here means "nothing sent", not a NULL in a NOT NULL column.
    if (doc.remindersSent !== undefined) {
      row.reminders_sent = remindersToColumn(doc.remindersSent);
    }

    if (mode === 'create') {
      // issue_date has a (now() AT TIME ZONE 'Asia/Riyadh')::date default, but
      // due_date is NOT NULL with none, and invoices_due_after_issue requires
      // due_date >= issue_date. Defaulting due_date to the issue date satisfies
      // both without inventing payment terms.
      row.issue_date ??= toDateOnly(new Date());
      row.due_date ??= row.issue_date;
    }

    // subtotal / vat_amount / total are NOT derived from one another here. A
    // create supplying `total` alone is rejected by invoices_total_consistent,
    // deliberately: guessing the split is how the amount * 0.85 bug happened.
    return row;
  },
};

export default mapping;
