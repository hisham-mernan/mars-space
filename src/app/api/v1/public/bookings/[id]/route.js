import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapBooking } from '@/lib/supabase/mappers';
import { apiServerError } from '@/lib/api/errors';

const GET_SCOPE = 'api/v1/public/bookings/[id] GET';

/**
 * GET /api/v1/public/bookings/:id — look up a single booking.
 *
 * WHICH CLIENT, AND WHY
 * =====================
 * Two clients, in this order, because two different callers reach this route.
 *
 * 1. The session client (anon key, RLS applies) is tried first. The policy
 *    `bookings_read_own` is:
 *
 *      company_id in (select current_company_ids())
 *      or booked_by = auth.uid()
 *      or is_staff()
 *
 *    so a signed-in member, their colleagues with the same company, and staff
 *    all get the row — scoped by the database, not by this handler. Reads go
 *    through `booking_details`, which is declared `security_invoker=on`, so the
 *    view does not launder RLS the way an owner-rights view would.
 *
 * 2. That policy evaluates to false for every row when the caller is signed
 *    out, so an anonymous guest checking their own guest booking gets nothing
 *    from the anon client. There is no anon SELECT policy on bookings and no
 *    SECURITY DEFINER read function, so the only way to serve the guest
 *    confirmation screen is the service-role client — used deliberately, and
 *    fenced by the three constraints below.
 *
 * WHAT MAKES THE ANONYMOUS BRANCH SAFE
 * ------------------------------------
 * a) The key must be the uuid. `bookings.reference` is
 *    `'BK-' || nextval('booking_reference_seq')` — BK-9023, BK-9024, … — which
 *    is a sequential counter, so accepting it here would let anyone walk the
 *    whole table by incrementing an integer. `bookings.id` is
 *    `gen_random_uuid()`, ~122 bits of randomness, and the visitor already
 *    holds it because POST /api/v1/public/bookings returned it and the
 *    checkout URL carries it. That is the capability. Anything that is not a
 *    uuid is refused before a query is issued, so a reference can never be
 *    used as a lookup key on a public route.
 *
 * b) Only unclaimed guest bookings are served — `company_id is null` and
 *    `booked_by is null`. A member's or a company's booking is never returned
 *    to an anonymous caller; those are reachable only through branch 1, where
 *    RLS decides. Without this filter the service role would happily hand any
 *    company's booking to whoever guessed its id, which is exactly the leak
 *    the anon key is there to prevent.
 *
 * c) The anonymous branch returns a redacted projection. The link is a bearer
 *    token that can end up in a shared screenshot or a browser history, so it
 *    carries what the confirmation screen renders and nothing more — no
 *    contact details, no internal notes, no company or branch ids.
 */

/** Matches only a canonical uuid; deliberately not `BK-1234`. See (a) above. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NOT_FOUND = {
  success: false,
  error: {
    code: 'BOOKING_NOT_FOUND',
    message: 'Booking not found',
  },
};

/**
 * `mapBooking` is the shared adapter, but the checkout pages were written
 * against the old db.json document and still read `duration` and
 * `totalAmount`. Alias them here rather than widening the shared mapper, which
 * the mobile app and newer screens do not want.
 */
function present(row) {
  const booking = mapBooking(row);
  return {
    ...booking,
    duration: booking.hours,
    totalAmount: booking.total,
  };
}

/** The subset an anonymous link-holder gets. See (c) above. */
function presentRedacted(row) {
  const booking = present(row);
  return {
    id: booking.id,
    reference: booking.reference,
    status: booking.status,
    resourceName: booking.resourceName,
    resourceNameAr: booking.resourceNameAr,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    hours: booking.hours,
    duration: booking.duration,
    customerName: booking.customerName,
    creditHoursUsed: booking.creditHoursUsed,
    subtotal: booking.subtotal,
    vat: booking.vat,
    total: booking.total,
    totalAmount: booking.totalAmount,
    createdAt: booking.createdAt,
  };
}

export async function GET(request, { params }) {
  try {
    // Next 16: the route context's `params` is a promise.
    const { id } = await params;

    if (!UUID_RE.test(id)) {
      // Same body and status as a genuine miss, so this does not become an
      // oracle that distinguishes "malformed" from "does not exist".
      return NextResponse.json(NOT_FOUND, { status: 404 });
    }

    // Branch 1 — let RLS answer for signed-in callers.
    //
    // Only attempted when there is a session. `anon` holds no SELECT grant on
    // `bookings` (only `authenticated` does), and `booking_details` is
    // security_invoker, so a signed-out probe does not come back empty — it
    // raises `42501 permission denied for table bookings`. Gating on the
    // session keeps that guaranteed failure out of every guest request. Note
    // that `anon` *is* granted SELECT on the view itself; the grant is
    // misleading, the base-table grant is what actually decides.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: ownRow, error: ownError } = await supabase
        .from('booking_details')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      // 42501 would mean the grants moved under us; fall through to the guest
      // branch rather than 500, but do not swallow anything else.
      if (ownError && ownError.code !== '42501') throw ownError;
      if (ownRow) {
        return NextResponse.json({ success: true, data: present(ownRow) });
      }
    }

    // Branch 2 — guest confirmation lookup. Service role, fenced by (b).
    const admin = createAdminClient();
    const { data: guestRow, error: guestError } = await admin
      .from('booking_details')
      .select('*')
      .eq('id', id)
      .is('company_id', null)
      .is('booked_by', null)
      .maybeSingle();

    if (guestError) throw guestError;
    if (!guestRow) {
      // Either no such booking, or one that belongs to a company/member and
      // the caller failed the RLS check in branch 1. Both answer 404 — telling
      // an anonymous caller "this exists but is not yours" confirms the id.
      return NextResponse.json(NOT_FOUND, { status: 404 });
    }

    return NextResponse.json({ success: true, data: presentRedacted(guestRow) });
  } catch (error) {
    // Never `error.message`. Two of the three throws above are Postgrest
    // errors carrying the table name, and the 42501 fall-through in branch 1
    // exists precisely because the grant state is the thing most likely to
    // move under this route — describing it to an anonymous link-holder would
    // undo the whole point of the redacted projection. Detail to the log,
    // generic sentence to the caller. See src/lib/api/errors.js.
    return apiServerError(GET_SCOPE, error);
  }
}
