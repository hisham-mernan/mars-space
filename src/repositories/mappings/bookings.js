/**
 * MAPPING — collection `bookings` -> table `public.bookings`
 *
 * The hardest of the fourteen, because the old document and the table disagree
 * about what a booking's time IS.
 *
 * TIME: `date` / `startTime` / `endTime` <-> `time_range` (README §6)
 *   public.bookings has no date, start_time or end_time columns. It has one
 *   `time_range tstzrange`, guarded by CHECK (lower < upper) and by the
 *   `bookings_no_overlap` GiST exclusion constraint. The services still read the
 *   three flat fields (BookingService, InvoiceService, NotificationService and
 *   ActivityService all interpolate booking.date / .startTime / .endTime), so
 *   timeRangeToDocumentFields() splits the range on read and buildTimeRange()
 *   rebuilds it on write. Both render in Asia/Riyadh, which is UTC+3 all year —
 *   Saudi Arabia observes no daylight saving. Never the server's local zone:
 *   Vercel runs in UTC and would move every booking three hours.
 *
 *   Read:  ["2026-09-01 06:00:00+00","2026-09-01 10:00:00+00")
 *          -> { date: '2026-09-01', startTime: '09:00', endTime: '13:00',
 *               duration: 4 }
 *   Write: half-open '[)' so a booking ending at 12:00 does not collide with
 *          one starting at 12:00.
 *
 *   ⚠ ALL THREE OR NONE ON UPDATE. The range is a single column, so a patch
 *   that mentions only `startTime` cannot be rebuilt without the other two
 *   edges, and toRow is synchronous — it has no client to read the current row
 *   with. Such a patch THROWS, naming the missing fields, rather than guessing
 *   and silently moving the other edge of the booking.
 *
 * NON-OBVIOUS TRANSLATIONS
 *   customerId    -> company_id            (uuid FK to public.companies)
 *   customerName  -> guest_name  | embedded company.name | booker.full_name
 *   customerEmail -> guest_email | embedded company.billing_email | booker.email
 *   vat           -> vat_amount
 *   totalAmount   -> total                 (also exposed as `total`)
 *   resourceName  -> embedded resources.name (no column on bookings)
 *
 * ⚠ WHO OWNS THIS BOOKING: THREE CASES, AND THE WRITE PATH MUST NOT MERGE THEM
 *   company — company_id set, the company embedded.
 *   member  — company_id NULL, booked_by set, the booker embedded.
 *   guest   — company_id NULL, booked_by NULL, guest_name/guest_email set.
 *
 *   customerName/customerEmail collapse all three into one pair of fields, by
 *   design: every ERP screen wants "who is this booking for" without caring.
 *   The consequence is that those two fields alone CANNOT be written back —
 *   feeding a member booking's document to update() would copy the member's own
 *   name and email into guest_name/guest_email, converting it to a guest
 *   booking, and because toDocument then prefers guest_name the document would
 *   still read back identically while the row no longer meant the same thing.
 *
 *   So toDocument also projects guestName/guestEmail/guestPhone and bookedBy,
 *   which mirror the columns exactly and are the only things toRow trusts. See
 *   the guest-identity block in toRow.
 *
 * SYNTHESISED, NO COLUMN
 *   - `paymentStatus`: derived from the invoices raised against this booking
 *     (invoices.booking_id -> bookings.id), 'Pending' when there are none.
 *     Dropped on write — payment lives on the invoice, not the booking, and
 *     there are no paymentStatus / paymentMethod / paidAt columns here.
 *     ⚠ src/app/api/v1/public/bookings/[id]/payment/route.js still writes all
 *     three straight into db.json without going through this repository. When
 *     that route is migrated they have to land on the invoice
 *     (invoices.status / .paid_at), not on the booking, or they will vanish.
 *   - `duration`: wall-clock hours from time_range. Distinct from the
 *     `billable_hours` column, which is hours after credit is applied; both are
 *     projected.
 *   - `isDeleted`: true when status is 'cancelled', the inverse of what
 *     softDelete() writes (README §5a).
 *
 * DROPPED ON WRITE, DELIBERATELY
 *   - `reference`. BookingService invents `MS-BK-${random 4 digits}`, but the
 *     column is UNIQUE with DEFAULT next_booking_reference() ('BK-' || nextval),
 *     which is the format every existing row uses ('BK-9024'). A random
 *     four-digit suffix collides after a few thousand bookings and would fail
 *     the insert. The database assigns the reference and the returned document
 *     carries it, so nothing downstream is left holding a stale number.
 *   - A `customerId` that is not a uuid — the old store's 'usr-guest'. It is not
 *     lost: the guest identity is written to guest_name/guest_email instead,
 *     which is exactly what those columns are for.
 *
 * NOT PROJECTED (columns that exist but no service reads): hold_session_id,
 * quoted_subtotal / quoted_vat / quoted_total / quote_notes / quote_expires_at /
 * quoted_by / quoted_at, contract_path, accepted_at / accepted_by,
 * decline_reason, event_title / event_title_ar / expected_guests / setup_notes,
 * cancelled_by. They belong to the member-facing quote-and-request flow, which
 * goes through the create_booking / quote RPCs and src/lib/supabase/queries.js,
 * not through this repository. Add them here if that flow ever moves onto the
 * ERP services.
 *
 * PROJECTED READ-ONLY: `bookedBy` (booked_by). It is read so the write path can
 * recognise a member booking, and it is DROPPED on write — booked_by is set
 * once by the create_booking RPC, and letting a whole-document update reassign
 * a booking's owner is not a capability the ERP asked for.
 *
 * ⚠ INSERTING A COMMUNITY-HALL BOOKING. The BEFORE INSERT trigger
 * `bookings_guard_community` rejects any booking of a `community_hall` resource
 * whose status is not requested/quoted/declined/expired, unless is_staff() is
 * true. is_staff() reads auth.uid(), which is NULL for the service-role client
 * this repository uses, so `bookingRepository.create({ status: 'Confirmed' })`
 * against the Community Space raises check_violation with
 * hint 'use_request_flow'. That is the database's design, not a mapping bug:
 * the community hall is booked by request.
 */

import {
  put,
  num,
  toTitleCase,
  toSnakeCase,
  isUuid,
  timeRangeToDocumentFields,
  buildTimeRange,
} from './_helpers';
import { rememberBranch, resolveBranchId, DEFAULT_BRANCH_SLUG } from './resources';

/**
 * paymentStatus has no column. Derive it from the invoices raised against the
 * booking; a booking with no invoice yet is 'Pending', which is what the old
 * store wrote at creation time.
 */
function paymentStatusFrom(row) {
  const invoices = Array.isArray(row.invoices) ? row.invoices : [];
  const statuses = invoices.map((i) => i?.status).filter(Boolean);
  if (!statuses.length) return 'Pending';
  if (statuses.some((s) => s === 'paid') && statuses.every((s) => s === 'paid' || s === 'void')) {
    return 'Paid';
  }
  if (statuses.some((s) => s === 'paid' || s === 'partially_paid')) return 'Partially Paid';
  if (statuses.every((s) => s === 'void')) return 'Void';
  return 'Pending';
}

/** A uuid, or a clear error explaining which field was wrong and why. */
function requireUuid(value, field, hint) {
  if (isUuid(value)) return value;
  throw new Error(
    `bookings: "${field}" must be a uuid, got ${JSON.stringify(value)}. ${hint}`
  );
}

const mapping = {
  table: 'bookings',

  /**
   * Four embeds, all over real foreign keys:
   *   resource  — resourceName/resourceNameAr, which have no column here.
   *   company   — customerName/customerEmail for a company booking.
   *   booker    — the same, for a member who booked without a company. The
   *               profiles hint is required: bookings has four FKs to profiles
   *               (booked_by, cancelled_by, quoted_by, accepted_by) and
   *               PostgREST refuses an ambiguous embed.
   *   invoices  — the reverse side of invoices.booking_id, for paymentStatus.
   */
  selectColumns: [
    '*',
    'resource:resources(id,slug,name,name_ar,category,floor)',
    'company:companies(id,name,name_ar,billing_email,phone)',
    'booker:profiles!booked_by(id,full_name,full_name_ar,email)',
    'branch:branches(id,slug,name,name_ar)',
    'invoices:invoices(id,status,total,amount_paid)',
  ].join(','),

  idColumn: 'id',
  defaultOrder: { column: 'created_at', ascending: false },

  toDocument(row) {
    if (!row) return null;
    rememberBranch(row.branch);

    // One tstzrange -> the three flat fields the services still read, in
    // Asia/Riyadh. An unbounded or unparseable range yields nulls, never throws.
    const { date, startTime, endTime, duration } = timeRangeToDocumentFields(row.time_range);

    return {
      id: row.id,
      reference: row.reference,

      // Customer identity: a company booking carries company_id and embeds the
      // company; a guest booking carries the guest_* columns and no FK.
      customerId: row.company_id ?? null,
      customerName:
        row.guest_name ?? row.company?.name ?? row.booker?.full_name ?? 'Guest',
      customerNameAr: row.company?.name_ar ?? row.booker?.full_name_ar ?? null,
      customerEmail:
        row.guest_email ?? row.company?.billing_email ?? row.booker?.email ?? null,
      customerPhone: row.guest_phone ?? row.company?.phone ?? null,

      // The columns themselves, unmerged. customerName/customerEmail above are
      // a three-way fallback and so cannot be written back; these can, and are
      // what toRow reads. Null on a company or member booking, which is exactly
      // the fact the write path needs.
      guestName: row.guest_name ?? null,
      guestEmail: row.guest_email ?? null,
      guestPhone: row.guest_phone ?? null,
      // Read-only provenance: set means a member booked this in their own name.
      bookedBy: row.booked_by ?? null,

      resourceId: row.resource_id,
      resourceName: row.resource?.name ?? null,
      resourceNameAr: row.resource?.name_ar ?? null,
      resourceSlug: row.resource?.slug ?? null,
      resourceCategory: row.resource?.category ?? null,
      branchId: row.branch?.slug ?? row.branch_id,

      date,
      startTime,
      endTime,
      duration,

      // 'checked_in' -> 'Checked In'; 'no_show' -> 'No Show'.
      status: toTitleCase(row.status),
      paymentStatus: paymentStatusFrom(row),
      visibility: toTitleCase(row.visibility),

      // Every numeric arrives as a string over PostgREST.
      creditHoursUsed: num(row.credit_hours_used) ?? 0,
      billableHours: num(row.billable_hours) ?? 0,
      subtotal: num(row.subtotal) ?? 0,
      vat: num(row.vat_amount) ?? 0,
      totalAmount: num(row.total) ?? 0,
      // `total` is what src/lib/supabase/mappers.js#mapBooking calls it and what
      // the member screens read; `totalAmount` is the old ERP name. Same column.
      total: num(row.total) ?? 0,
      priceBreakdown: row.price_breakdown ?? {},

      qrCode: row.qr_code,
      notes: row.notes,
      cancelledAt: row.cancelled_at,
      cancellationReason: row.cancellation_reason,
      holdExpiresAt: row.hold_expires_at,

      isDeleted: row.status === 'cancelled',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  toRow(doc, mode) {
    const row = {};
    if (!doc) return row;

    if (doc.resourceId !== undefined) {
      row.resource_id = requireUuid(
        doc.resourceId,
        'resourceId',
        'Resolve a slug to resources.id first — toRow is synchronous and cannot ' +
          'query (POST /api/v1/public/bookings does this lookup before calling in).'
      );
    }
    put(row, 'branch_id', resolveBranchId(doc.branchId));

    // company_id is a real FK. The old store's guest placeholder ('usr-guest')
    // is not a company, so it is not written; the guest_* columns below carry
    // that identity instead, which is what bookings_has_owner checks for.
    const companyId = isUuid(doc.customerId) ? doc.customerId : undefined;
    put(row, 'company_id', companyId);
    if (doc.customerId === null) row.company_id = null;

    // --- guest identity ------------------------------------------------------
    //
    // guest_name/guest_email/guest_phone describe a WALK-IN, and nothing else.
    // They are never filled from customerName/customerEmail alone, because
    // toDocument derives those from the guest columns OR the embedded company OR
    // the embedded booker (see the header): a member booking — company_id NULL,
    // booked_by set — reads back carrying the member's own name and email there,
    // and copying them into the guest columns silently converts the row into a
    // guest booking. It is invisible afterwards, too: toDocument prefers
    // guest_name, so the document still reads the same while the row does not.
    //
    // Two ways in, and only the explicit one is trusted unconditionally:
    //
    //   guestName / guestEmail / guestPhone — mirrored straight off the columns
    //     by toDocument, so a whole-document round trip is exact in both
    //     directions. A member or company booking carries all three as null and
    //     writing null back is a no-op, which is the fix for the case above.
    //
    //   customerName / customerEmail / customerPhone — the only names the old
    //     services know. Honoured on CREATE, where "no company" leaves no other
    //     reading (CHECK bookings_has_owner: a booking is a company's or a
    //     guest's), and on an UPDATE that identifies itself as a guest booking
    //     by carrying the old store's non-uuid customerId ('usr-guest').
    //     Otherwise the patch is ambiguous and throws rather than guessing.
    const declaresGuest =
      doc.guestName !== undefined || doc.guestEmail !== undefined || doc.guestPhone !== undefined;
    const declaresCustomer =
      doc.customerName !== undefined ||
      doc.customerEmail !== undefined ||
      doc.customerPhone !== undefined;

    if (declaresGuest) {
      put(row, 'guest_name', doc.guestName);
      put(row, 'guest_email', doc.guestEmail);
      put(row, 'guest_phone', doc.guestPhone);
      // With a company on the patch there is nothing to decide, so this branch
      // does not run: the name belongs to companies.name, not to this table, and
      // writing it to guest_name would shadow the embed on read. It is dropped,
      // as it always has been.
    } else if (declaresCustomer && !companyId) {
      const saysGuest =
        mode === 'create' ||
        (doc.customerId !== undefined && doc.customerId !== null && !isUuid(doc.customerId));
      if (!saysGuest) {
        throw new Error(
          'bookings: cannot tell whether this patch describes a guest booking. ' +
            'customerName/customerEmail are read back from guest_name/guest_email, ' +
            'from the embedded company, or from the member who booked, so writing ' +
            'them to the guest columns would turn a member or company booking into ' +
            'a guest one. Pass guestName/guestEmail/guestPhone instead (every ' +
            'document this mapping returns already carries them), or set customerId ' +
            'to the company uuid.'
        );
      }
      put(row, 'guest_name', doc.customerName);
      put(row, 'guest_email', doc.customerEmail);
      put(row, 'guest_phone', doc.customerPhone);
    }

    // --- time_range: all three parts or none ---------------------------------
    const touchesTime =
      doc.date !== undefined || doc.startTime !== undefined || doc.endTime !== undefined;
    if (touchesTime) {
      const missing = ['date', 'startTime', 'endTime'].filter((f) => !doc[f]);
      if (missing.length) {
        throw new Error(
          `bookings: time_range is one column, so date, startTime and endTime ` +
            `must be patched together. Missing: ${missing.join(', ')}. Read the ` +
            `booking first and pass all three (README §6).`
        );
      }
      row.time_range = buildTimeRange(doc.date, doc.startTime, doc.endTime);
    }

    put(row, 'status', doc.status, toSnakeCase);
    put(row, 'visibility', doc.visibility, toSnakeCase);
    put(row, 'credit_hours_used', doc.creditHoursUsed, Number);
    put(row, 'billable_hours', doc.billableHours, Number);
    put(row, 'subtotal', doc.subtotal, Number);
    put(row, 'vat_amount', doc.vat, Number);
    // The ERP calls it totalAmount, the member screens call it total. Two names,
    // one column, so absent (undefined) and explicitly cleared (null) have to be
    // told apart the same way invoices.js does it for total/amount: `??` treats
    // null as absent, which let { totalAmount: null } fall through to doc.total
    // and write the old figure back while reporting that the clear succeeded.
    // A null does reach a NOT NULL column and Postgres rejects it — loudly, at
    // the call site, which is the point.
    put(row, 'total', doc.totalAmount !== undefined ? doc.totalAmount : doc.total, Number);
    put(row, 'price_breakdown', doc.priceBreakdown);
    put(row, 'qr_code', doc.qrCode);
    put(row, 'notes', doc.notes);
    put(row, 'cancelled_at', doc.cancelledAt);
    put(row, 'cancellation_reason', doc.cancellationReason);
    put(row, 'hold_expires_at', doc.holdExpiresAt);

    if (mode === 'create') {
      if (!row.resource_id) {
        throw new Error('bookings.create requires resourceId (bookings.resource_id is NOT NULL).');
      }
      if (!row.time_range) {
        throw new Error(
          'bookings.create requires date, startTime and endTime (bookings.time_range is NOT NULL).'
        );
      }
      if (!row.branch_id) {
        // branch_id is NOT NULL and belongs to the resource, but toRow cannot
        // read the resource to find out. Default to the operating branch — the
        // Riyadh branch is still 'coming_soon' and has no resources. Pass
        // branchId explicitly for a multi-branch booking.
        row.branch_id = resolveBranchId(DEFAULT_BRANCH_SLUG);
      }
      // CHECK bookings_has_owner: company_id IS NOT NULL OR guest_email IS NOT NULL.
      if (!row.company_id && !row.guest_email) {
        throw new Error(
          'bookings.create needs either a company (customerId as a companies uuid) ' +
            'or a guest email (guestEmail, or customerEmail which create still ' +
            'accepts as one) — CHECK bookings_has_owner.'
        );
      }
      // `reference` is intentionally not emitted; see the header.
    }

    return row;
  },

  filters: {
    reference: 'reference',
    resourceId: {
      column: 'resource_id',
      toColumn: (v) =>
        requireUuid(v, 'resourceId', 'findWhere pushes this to resources.id in SQL.'),
    },
    customerId: {
      column: 'company_id',
      toColumn: (v) =>
        requireUuid(
          v,
          'customerId',
          "It maps to companies.id. A legacy id such as 'usr-guest' has no company row; " +
            'use findAll(predicate) to match guest bookings on guest_email.'
        ),
    },
    status: { column: 'status', toColumn: toSnakeCase },
    visibility: { column: 'visibility', toColumn: toSnakeCase },
    branchId: { column: 'branch_id', toColumn: (v) => resolveBranchId(v) ?? v },
  },

  /**
   * No activeFilter. A cancelled booking must keep appearing in the ERP list —
   * staff need to see what was cancelled and when, and the occupancy figures are
   * computed from the same rows (README §5b).
   */
  activeFilter: undefined,

  /**
   * Cancelling is more than a status flip: cancelled_at is what the ERP shows,
   * and hold_expires_at must be cleared or CHECK bookings_hold_has_expiry
   * rejects the update for a row that was on hold (the constraint allows an
   * expiry only while status = 'hold').
   */
  async softDelete({ id, client, mapping: self }) {
    const { data, error } = await client
      .from(self.table)
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        hold_expires_at: null,
      })
      .eq(self.idColumn || 'id', id)
      .select(self.selectColumns);

    if (error) {
      // 22P02: a legacy non-uuid id is a miss, not a fault — same contract as
      // BaseRepository#findById and #update.
      if (error.code === '22P02') return null;
      const err = new Error(
        `[bookings -> bookings] softDelete failed: ${error.message || 'unknown Supabase error'}` +
          `${error.details ? ` (${error.details})` : ''}` +
          `${error.hint ? ` hint: ${error.hint}` : ''} id=${id}`
      );
      err.cause = error;
      err.code = error.code;
      err.collection = 'bookings';
      err.table = self.table;
      throw err;
    }
    return data && data.length ? self.toDocument(data[0]) : null;
  },
};

export default mapping;
