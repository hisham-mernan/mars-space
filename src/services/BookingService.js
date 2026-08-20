/**
 * BookingService — the ERP's booking surface.
 *
 * ============================================================================
 * WHAT CHANGED: src/lib/db.js is gone from this file.
 * ============================================================================
 *
 * This service used to import checkAvailability() and calculatePrice() from
 * src/lib/db.js, which read src/data/db.json off the filesystem. Both are
 * replaced by the database's own implementations, which the mobile app already
 * quotes and books from:
 *
 *   price_booking(p_resource_id, p_time_range, p_company_id, p_addons) -> jsonb
 *   create_booking(p_resource_id, p_time_range, p_company_id, p_addons,
 *                  p_notes, p_guest_name, p_guest_email, p_guest_phone,
 *                  p_hold_only, p_hold_session_id) -> bookings
 *
 * The JS pricing was not merely duplicated, it was WRONG:
 *   - it treated Sunday and Saturday as the weekend and surcharged them 15%.
 *     The KSA weekend is Friday and Saturday (public.is_ksa_weekend() uses
 *     isodow in (5, 6)), so every Sunday booking was overcharged and every
 *     Friday one undercharged.
 *   - it applied a flat 20% "member discount" that has been retired in favour
 *     of credit hours (public.credit_balance / credit_entries).
 *   - it surcharged peak hours and the weekend unconditionally, where the
 *     database applies resources.peak_surcharge_pct / weekend_surcharge_pct,
 *     both 0 across the live catalogue — i.e. the published price list.
 *   - it multiplied rate x hours and knew nothing about rate_tiers, so a
 *     4-hour block was billed at 4 x the hourly rate instead of the tier price.
 * Two implementations of pricing is how web and mobile drift apart. There is
 * now exactly one, and it lives in Postgres.
 *
 * ----------------------------------------------------------------------------
 * WHICH SUPABASE CLIENT, AND WHY IT MATTERS
 *
 * Two different clients are used here on purpose.
 *
 * 1. The RPCs are called with the CALLER'S client (anon key + the request's
 *    session cookie, from @/lib/supabase/server). Both functions are SECURITY
 *    DEFINER and authorise against auth.uid():
 *      - price_booking refuses a p_company_id unless is_staff() or
 *        is_company_member(company) — verified live: with no identity it
 *        raises 42501 "You do not have access to that company".
 *      - create_booking refuses a company booking unless is_staff() or
 *        has_company_perm(company, 'book_rooms'), stamps booked_by = auth.uid(),
 *        and notifies that user.
 *    The service-role client has NO identity (auth.uid() is null, is_staff()
 *    is false), so calling the RPCs with it would make every company booking
 *    fail. Outside a request scope (a script or a cron job, where cookies()
 *    throws) this falls back to the admin client, which can still take guest
 *    bookings and public quotes — a company booking then fails loudly with the
 *    42501 above, which _rpcError explains rather than leaving as a mystery.
 *
 * 2. The availability READ uses the service-role client, like every repository
 *    behind this service. Availability must see every tenant's bookings; under
 *    RLS a caller would see only their own rows and a taken slot would look
 *    free. Only non-identifying fields of a conflicting booking are returned.
 *
 * ----------------------------------------------------------------------------
 * NO BOOKING_CREATED EVENT — READ THIS BEFORE PUTTING IT BACK
 *
 * createBooking() no longer publishes DOMAIN_EVENTS.BOOKING_CREATED, because
 * create_booking() already does inside its transaction what the subscribers
 * were written to do afterwards:
 *   - InvoiceService subscribes to BOOKING_CREATED and calls createInvoice().
 *     The RPC already inserts the invoices row (invoices.booking_id -> this
 *     booking) for a company booking with a total above zero. Publishing the
 *     event would raise a SECOND invoice, with its own invoice_number, for the
 *     same booking. That is a money bug, not a cosmetic one.
 *   - NotificationService subscribes and writes a notification. The RPC already
 *     inserts one for the booker. The subscriber's version passes the company
 *     uuid as notifications.profile_id, which the notifications mapping rejects
 *     outright (see its header).
 * ActivityService's timeline entry is the one subscriber that was NOT made
 * redundant, so it is called directly below and writes exactly the row the
 * subscriber would have. Nothing else is lost.
 */

import { bookingRepository, workspaceRepository } from '@/repositories';
import { createAdminClient } from '@/lib/supabase/admin';
import { SlotTakenError } from '@/lib/supabase/queries';
import {
  isUuid,
  buildTimeRange,
  parseTstzRange,
  timeRangeToDocumentFields,
  toTitleCase,
} from '@/repositories/mappings/_helpers';
import { resolveBranchId } from '@/repositories/mappings/resources';
import { auditLogService } from './AuditLogService';
import { activityService } from './ActivityService';

/**
 * The statuses that occupy a slot. This is exactly the predicate of the
 * bookings_no_overlap exclusion constraint:
 *
 *   EXCLUDE USING gist (resource_id WITH =, time_range WITH &&)
 *   WHERE (status = ANY (ARRAY['hold','requested','quoted','confirmed',
 *                              'checked_in','completed']))
 *
 * Keep the two in step: a status listed there but not here makes this check
 * report "available" for a slot the insert will then refuse.
 */
const BLOCKING_STATUSES = [
  'hold',
  'requested',
  'quoted',
  'confirmed',
  'checked_in',
  'completed',
];

/** One service-role client for the process, created lazily (as BaseRepository does). */
let _admin = null;
function admin() {
  if (!_admin) _admin = createAdminClient();
  return _admin;
}

/**
 * The caller's Supabase client — anon key plus the request's session, so the
 * RPCs see auth.uid() and can authorise. Falls back to the service-role client
 * when there is no request scope (cookies() throws in a script or a job).
 * The import is dynamic so this module stays free of next/headers at the top
 * level, the same reason requireStaffClient() does it in @/lib/supabase/admin.
 */
async function callerClient() {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    return await createClient();
  } catch {
    return admin();
  }
}

/** 'HH:MM' -> minutes since midnight. Only used to reject a zero-length range. */
function minutesOfDay(time) {
  const [h, m] = String(time).trim().split(':');
  return Number(h || 0) * 60 + Number(m || 0);
}

/**
 * The half-open Asia/Riyadh tstzrange literal both RPCs take, built by the same
 * helper the bookings mapping writes time_range with. Never re-derived here:
 * two slightly different Riyadh conversions is the bug that helper exists to
 * prevent.
 */
function riyadhRange(date, startTime, endTime) {
  return buildTimeRange(date, startTime, endTime);
}

/**
 * The same range as a UTC literal, for use in a PostgREST `ov` (&&) filter.
 * The Riyadh form carries a '+03:00' offset, and '+' in a URL query string is
 * ambiguous; ISO-8601 'Z' instants avoid the question entirely.
 */
function rangeToUtcLiteral(range) {
  const parsed = parseTstzRange(range);
  if (!parsed) return null;
  return `[${parsed.start.toISOString()},${parsed.end.toISOString()})`;
}

/** [{ addon_id, quantity }] from ids, {id}, or {addon_id, quantity} objects. */
function normaliseAddons(addons) {
  if (!Array.isArray(addons)) return [];
  return addons
    .map((a) => {
      if (typeof a === 'string') return isUuid(a) ? { addon_id: a, quantity: 1 } : null;
      if (a && typeof a === 'object') {
        const id = a.addon_id || a.id;
        return isUuid(id) ? { addon_id: id, quantity: Number(a.quantity ?? 1) } : null;
      }
      return null;
    })
    .filter(Boolean);
}

/**
 * A PostgREST error from one of the booking RPCs -> the error this codebase
 * already throws for it.
 *
 * 23P01 (exclusion_violation) is the losing side of a race for the same slot.
 * create_booking re-raises it with the wording used by @/lib/supabase/queries
 * and by POST /api/v1/public/bookings, so every surface says the same sentence;
 * SlotTakenError is that single definition.
 */
function _rpcError(error, fn) {
  const message = error?.message || `${fn} failed`;

  if (error?.code === '23P01' || /just been taken/i.test(message)) {
    const taken = new SlotTakenError(message);
    taken.sqlState = '23P01';
    taken.status = 409;
    return taken;
  }

  const err = new Error(
    error?.code === '42501'
      ? `${message} — ${fn} authorises against the signed-in user (auth.uid()). ` +
        `A company booking needs a staff session or a member with 'book_rooms'; ` +
        `the service-role client has no identity, so it can only take guest bookings.`
      : message
  );
  err.cause = error;
  err.code = error?.code;
  err.details = error?.details;
  err.hint = error?.hint;
  return err;
}

export class BookingService {
  async getBookings(filters = {}) {
    return bookingRepository.findAll(b => {
      if (filters.customerId && b.customerId !== filters.customerId) return false;
      if (filters.resourceId && b.resourceId !== filters.resourceId) return false;
      if (filters.status && b.status !== filters.status) return false;
      return true;
    });
  }

  /**
   * Is this slot free? Advisory only — see the note in createBooking().
   *
   * Same contract as the old db.js checkAvailability():
   *   { available: true } | { available: false, reason, conflict? }
   *
   * What it checks now, and did not before:
   *   - the resource is bookable and available (is_bookable / status), the same
   *     pair create_booking() guards on;
   *   - resource_blackouts overlapping the window, for this resource OR its
   *     whole branch (maintenance and private hire), which create_booking()
   *     also refuses and the JSON store had no concept of;
   *   - overlap computed by Postgres with && over time_range, against exactly
   *     the statuses the exclusion constraint blocks — not by comparing 'HH:MM'
   *     strings, which could not see a booking that crosses midnight;
   *   - an expired hold is not a conflict. create_booking() deletes stale holds
   *     on the slot before it inserts, so reporting one as taken would refuse a
   *     booking the database would happily accept.
   *
   * `conflict` carries only the id, reference, status and clock time of the
   * blocking booking. The old version returned the whole document, which made
   * an availability probe a way to read another tenant's customer details.
   */
  async checkRoomAvailability(resourceId, date, startTime, endTime, excludeBookingId = null) {
    if (!date || !startTime || !endTime) {
      return { available: false, reason: 'date, startTime and endTime are required' };
    }

    const resource = await workspaceRepository.findById(resourceId);
    if (!resource) return { available: false, reason: 'Resource not found' };
    if (resource.status !== 'Available') {
      return { available: false, reason: `Resource status is ${resource.status}` };
    }
    if (resource.isBookable === false) {
      return { available: false, reason: `${resource.name} is not bookable` };
    }

    // buildTimeRange treats an endTime at or before startTime as crossing
    // midnight, which is right for a 22:00-01:00 booking but would silently
    // turn 10:00-10:00 into a 24-hour one.
    if (minutesOfDay(startTime) === minutesOfDay(endTime)) {
      return { available: false, reason: 'Start time must be before end time' };
    }

    let range;
    try {
      range = riyadhRange(date, startTime, endTime);
    } catch (error) {
      return { available: false, reason: error.message };
    }
    const window = rangeToUtcLiteral(range);
    if (!window) {
      return { available: false, reason: `Could not read the time range ${range}` };
    }

    // --- blackouts ---------------------------------------------------------
    let branchId = null;
    try {
      branchId = resolveBranchId(resource.branchId) ?? null;
    } catch {
      // An unknown branch only costs us the branch-wide blackout check; the
      // per-resource one below still runs, and create_booking() is the arbiter.
      branchId = null;
    }

    const { data: blackouts, error: blackoutError } = await admin()
      .from('resource_blackouts')
      .select('id, resource_id, branch_id, reason, time_range')
      .filter('time_range', 'ov', window);
    if (blackoutError) {
      throw _rpcError(blackoutError, 'resource_blackouts overlap check');
    }

    const blackout = (blackouts ?? []).find(
      (b) => b.resource_id === resource.id || (branchId && b.branch_id === branchId)
    );
    if (blackout) {
      return {
        available: false,
        reason: blackout.reason || 'That time is unavailable for this resource',
      };
    }

    // --- overlapping bookings ---------------------------------------------
    const { data: rows, error } = await admin()
      .from('bookings')
      .select('id, reference, status, time_range, hold_expires_at')
      .eq('resource_id', resource.id)
      .in('status', BLOCKING_STATUSES)
      .filter('time_range', 'ov', window);
    if (error) throw _rpcError(error, 'bookings overlap check');

    const now = Date.now();
    const conflicts = (rows ?? []).filter((row) => {
      if (excludeBookingId && row.id === excludeBookingId) return false;
      const expired =
        row.status === 'hold' &&
        row.hold_expires_at &&
        new Date(row.hold_expires_at).getTime() < now;
      return !expired;
    });

    if (conflicts.length > 0) {
      const c = conflicts[0];
      const when = timeRangeToDocumentFields(c.time_range);
      return {
        available: false,
        reason: 'Time slot is already booked by another customer',
        conflict: {
          id: c.id,
          reference: c.reference,
          status: toTitleCase(c.status),
          date: when.date,
          startTime: when.startTime,
          endTime: when.endTime,
        },
      };
    }

    return { available: true };
  }

  /**
   * What a slot would cost. price_booking() with nothing reserved.
   *
   * The fifth argument used to be a users id, looked up only to apply the
   * retired 20% member discount. It is now the COMPANY id (companies.id, what
   * the booking documents call customerId), because that is what decides how
   * many credit hours the booking can draw on. A non-uuid — the old store's
   * 'usr-guest' — is passed as null rather than being sent to Postgres to fail.
   *
   * The return value is the RPC's own quote (hours, base, pricing_basis,
   * rate_parts, list_price, saving, credit_available, credit_hours_used,
   * billable_hours, addons_total, subtotal, vat_amount, total, currency, ...)
   * PLUS the camelCase names the old calculatePrice() returned, so existing
   * readers keep working. membershipDiscount is always 0: the discount no
   * longer exists, and creditHoursUsed is what replaced it.
   */
  async computePricing(resourceId, date, startTime, endTime, companyId = null, addons = []) {
    const range = riyadhRange(date, startTime, endTime);
    const client = await callerClient();

    const { data, error } = await client.rpc('price_booking', {
      p_resource_id: resourceId,
      p_time_range: range,
      p_company_id: isUuid(companyId) ? companyId : null,
      p_addons: normaliseAddons(addons),
    });
    if (error) throw _rpcError(error, 'price_booking');

    const quote = data ?? {};
    return {
      ...quote,
      hours: Number(quote.hours ?? 0),
      basePrice: Number(quote.base ?? 0),
      peakHourAdjustment: Number(quote.peak_surcharge ?? 0),
      weekendAdjustment: Number(quote.weekend_surcharge ?? 0),
      membershipDiscount: 0,
      creditAvailable: Number(quote.credit_available ?? 0),
      creditHoursUsed: Number(quote.credit_hours_used ?? 0),
      billableHours: Number(quote.billable_hours ?? 0),
      addonsTotal: Number(quote.addons_total ?? 0),
      subtotal: Number(quote.subtotal ?? 0),
      vat: Number(quote.vat_amount ?? 0),
      total: Number(quote.total ?? 0),
      currency: quote.currency ?? 'SAR',
    };
  }

  /**
   * Create a booking.
   *
   * One RPC call does what steps 1-4 of the old implementation did separately:
   * it validates the resource and the blackouts, holds the slot, consumes
   * meeting-room credit, prices the remainder with price_booking() and raises
   * the invoice — all in one transaction, so a failure anywhere leaves nothing
   * behind.
   *
   * THE PRE-FLIGHT AVAILABILITY CHECK IS DELIBERATELY GONE. Read-then-write
   * cannot make a slot safe: two callers both read "free" and both write. The
   * bookings_no_overlap GiST exclusion constraint is the arbiter, the loser
   * gets SQLSTATE 23P01, and the whole transaction rolls back — no credit
   * spent, no invoice raised. That is why POST /api/v1/public/bookings dropped
   * its check too. checkRoomAvailability() above is for showing a calendar, not
   * for guarding a write.
   *
   * `bookingData` keeps its shape ({ resourceId, date, startTime, endTime,
   * customerId, customerName, customerEmail }) and additionally accepts
   * customerPhone, addons, notes, holdOnly and holdSessionId. Two behaviours of
   * the old version are gone on purpose:
   *   - it invented a reference, `MS-BK-${random}`; the column is UNIQUE with
   *     DEFAULT next_booking_reference() ('BK-9024'), which is what every row
   *     uses and what the returned document carries.
   *   - it defaulted a missing guest to 'usr-guest' / 'guest@example.com'.
   *     Those land in real columns now (bookings.guest_email, and every
   *     downstream invoice and notification), so a missing email raises the
   *     RPC's own "Guest bookings require a name and email" instead of writing
   *     a fake one.
   */
  async createBooking(bookingData, actor = 'System') {
    const {
      resourceId,
      date,
      startTime,
      endTime,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      addons = [],
      notes = null,
      holdOnly = false,
      holdSessionId = null,
    } = bookingData ?? {};

    if (!resourceId) throw new Error('resourceId is required');
    if (!date || !startTime || !endTime) {
      throw new Error('date, startTime and endTime are required');
    }

    // Resolves the id and gives the same "does not exist" message as before;
    // without it a slug or a legacy id would reach Postgres as a bad uuid.
    const resource = await workspaceRepository.findById(resourceId);
    if (!resource) throw new Error('Requested resource does not exist');

    // customerId is companies.id in the new model. Anything that is not a uuid
    // is a guest, and the guest columns carry that identity instead.
    const companyId = isUuid(customerId) ? customerId : null;

    const client = await callerClient();
    const { data: row, error } = await client.rpc('create_booking', {
      p_resource_id: resource.id,
      p_time_range: riyadhRange(date, startTime, endTime),
      p_company_id: companyId,
      p_addons: normaliseAddons(addons),
      p_notes: notes ?? null,
      // Never both: guest_name would shadow the company's own name when the
      // booking is read back (see the bookings mapping header).
      p_guest_name: companyId ? null : (customerName ?? null),
      p_guest_email: companyId ? null : (customerEmail ?? null),
      p_guest_phone: companyId ? null : (customerPhone ?? null),
      p_hold_only: Boolean(holdOnly),
      p_hold_session_id: holdSessionId ?? null,
    });
    if (error) throw _rpcError(error, 'create_booking');

    // The RPC returns the raw bookings row. Read it back through the repository
    // so callers get the camelCase document they have always had, with date /
    // startTime / endTime rendered in Asia/Riyadh and resourceName resolved.
    const newBooking = (await bookingRepository.findById(row.id)) ?? row;

    // The booking, its credit entry and its invoice are committed by this
    // point. Bookkeeping that fails afterwards must not be reported to the
    // caller as a failed booking — they would retry and hit 23P01 on their own
    // slot. EventBus.publish() swallowed subscriber errors for the same reason.
    try {
      await auditLogService.recordAudit({
        actor: actor || customerName || 'Customer',
        action: 'CREATE_BOOKING',
        module: 'BOOKINGS',
        entityId: newBooking.id,
        afterState: newBooking,
      });

      // What the BOOKING_CREATED subscriber in ActivityService wrote, written
      // directly. See the "NO BOOKING_CREATED EVENT" note at the top of this
      // file for why the event itself is not published.
      await activityService.logActivity({
        type: 'booking',
        title: `New Booking ${newBooking.reference}`,
        titleAr: `تم إنشاء حجز جديد ${newBooking.reference}`,
        description: `${newBooking.customerName} reserved ${newBooking.resourceName} for ${newBooking.date}`,
        descriptionAr: `قام ${newBooking.customerName} بحجز ${newBooking.resourceName} بتاريخ ${newBooking.date}`,
        entityId: newBooking.id,
        actor: newBooking.customerName,
      });
    } catch (err) {
      console.error(
        `[BookingService] booking ${newBooking.reference} was created, but its ` +
          `audit/timeline entry failed:`,
        err
      );
    }

    return newBooking;
  }
}

export const bookingService = new BookingService();
