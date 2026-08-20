import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapBooking } from '@/lib/supabase/mappers';
import { apiFailure, apiServerError } from '@/lib/api/errors';

const GET_SCOPE = 'api/v1/public/bookings GET';
const POST_SCOPE = 'api/v1/public/bookings POST';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

/**
 * Asia/Riyadh is UTC+3 year-round with no DST, so a fixed offset is correct
 * here and avoids pulling in a timezone library for one conversion.
 */
function riyadhInstant(date, time) {
  return `${date}T${time.length === 5 ? `${time}:00` : time}+03:00`;
}

/**
 * GET — the caller's bookings.
 *
 * The previous version took ?customerId= and returned whatever matched, so
 * anyone could read anyone else's bookings by guessing an id. The parameter is
 * gone: RLS scopes rows to the caller's company, and an anonymous caller gets
 * nothing.
 *
 * WHY THE SESSION GATE, AND WHY NOT A GRANT
 * =========================================
 * That paragraph described the intent but not the behaviour. Reads go through
 * `booking_details`, which is `security_invoker=on`, and the `anon` role holds
 * NO grant of any kind on the base `bookings` table (verified: only
 * `authenticated` has SELECT, and `anon`'s full grant on the *view* is
 * misleading — the base-table grant is what decides). So a signed-out request
 * did not come back empty, it raised `42501 permission denied for table
 * bookings`, and the old catch block forwarded that Postgres text verbatim:
 * every visitor got a 500 that named the table and described the grants.
 *
 * There were two ways to make the documented behaviour true.
 *
 *   (1) Grant `anon` SELECT on `bookings` and let RLS filter. REJECTED.
 *       `bookings_read_own` is
 *           company_id in (select current_company_ids())
 *           or booked_by = auth.uid()
 *           or is_staff()
 *       which is false for every row when signed out, so anon would get the
 *       same empty list this handler now returns — the grant buys literally
 *       nothing here. What it costs is real: the anon key ships in the browser
 *       bundle, so granting SELECT also opens `GET /rest/v1/bookings` to the
 *       whole internet, and the only thing then standing between that and a
 *       table holding guest_name, guest_email, guest_phone and internal notes
 *       is a single policy expression. Grants are the backstop that makes a
 *       future policy mistake survivable, and this is the wrong table to spend
 *       that backstop on. It would also actively undermine the sibling route:
 *       ./[id] serves anonymous guests through a fenced service-role read
 *       precisely so that no anon-facing RLS policy has to exist on
 *       `bookings`. Add one later on top of a SELECT grant and it is a
 *       full-table read, not a single-row lookup. (Out of scope besides — a
 *       grant is a migration, and this change owns one route file.)
 *
 *   (2) Only touch the view when there is a session. CHOSEN. Same shape as the
 *       guard in ./[id]/route.js, which already documents this exact hazard.
 *
 * [] rather than 401: a signed-out caller and a signed-in caller with no rows
 * now get byte-identical responses, so this endpoint is not an oracle for
 * "does this session have bookings", and no client has to special-case a
 * status on a route under /public. Nothing in the app calls this collection
 * today (src/app/member/page.js used to and no longer does), so the choice
 * breaks nothing either way.
 *
 * NOT AN AVAILABILITY FEED. If a public slot picker ever needs to know which
 * times are busy, it must not come from here — it needs its own endpoint
 * projecting start/end instants only, never booking rows.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const resourceId = searchParams.get('resourceId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Validate before querying. Left unchecked, a malformed uuid or timestamp
    // reaches Postgres and comes back as a parse error, which is another way
    // for raw database text to end up in front of a caller.
    if (resourceId && !UUID_RE.test(resourceId)) {
      return apiFailure(400, 'INVALID_RESOURCE_ID', 'resourceId must be a valid id.', {
        messageAr: 'مُعرِّف المساحة غير صالح.',
      });
    }
    for (const [name, value] of [['from', from], ['to', to]]) {
      if (value && Number.isNaN(Date.parse(value))) {
        return apiFailure(400, 'INVALID_DATE_RANGE', `${name} must be a valid date or timestamp.`, {
          messageAr: 'نطاق التاريخ غير صالح.',
        });
      }
    }

    const supabase = await createClient();

    // The gate. `anon` cannot read `bookings` at all, so querying the
    // security_invoker view without a session is a guaranteed 42501 rather
    // than an empty result. See the block comment above.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: true, data: [] });
    }

    let query = supabase
      .from('booking_details')
      .select('*')
      .order('starts_at', { ascending: false })
      .limit(200);

    if (resourceId) query = query.eq('resource_id', resourceId);
    if (from) query = query.gte('starts_at', from);
    if (to) query = query.lte('starts_at', to);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data: (data ?? []).map(mapBooking) });
  } catch (error) {
    // Never `error.message`: since the move off db.json these carry table
    // names, grant state and sometimes the submitted row. Detail to the log,
    // generic sentence to the caller.
    return apiServerError(GET_SCOPE, error);
  }
}

/**
 * Translate a create_booking() failure into a response.
 *
 * The RPC raises with sentences written for end users, but they are still
 * database output and must not be piped to the client: `Resource % is not
 * bookable (status: %)` interpolates an internal status value, and any fault
 * raised *outside* those hand-written `raise exception` sites — a constraint
 * violation inside price_booking, an RLS rejection on the credit or invoice
 * insert — arrives in the same `error.message` field and would be forwarded
 * just as readily. That is exactly how the GET leak happened.
 *
 * So the message text is only ever used to RECOGNISE which situation this is.
 * Every string returned from here is a literal in this file. Anything
 * unrecognised returns null and becomes a logged, generic 500 — an error we
 * cannot name is by definition one we cannot describe safely.
 */
function describeBookingError(error) {
  const raw = String(error?.message ?? '');
  const code = error?.code;

  if (code === '23P01' || /just been taken/i.test(raw)) {
    return {
      status: 409,
      code: 'SLOT_TAKEN',
      message: 'That slot has just been taken. Please choose another time.',
      messageAr: 'تم حجز هذا الموعد للتو. يُرجى اختيار وقت آخر.',
    };
  }
  if (code === 'P0002' || /resource not found/i.test(raw)) {
    return {
      status: 404,
      code: 'RESOURCE_NOT_FOUND',
      message: 'Requested resource does not exist.',
      messageAr: 'المساحة المطلوبة غير موجودة.',
    };
  }
  if (/is not bookable/i.test(raw)) {
    return {
      status: 409,
      code: 'RESOURCE_NOT_BOOKABLE',
      message: 'That space is not available for booking right now.',
      messageAr: 'هذه المساحة غير متاحة للحجز حاليًا.',
    };
  }
  if (/unavailable for this resource/i.test(raw)) {
    return {
      status: 409,
      code: 'SLOT_UNAVAILABLE',
      message: 'That time is unavailable for this space.',
      messageAr: 'هذا الوقت غير متاح لهذه المساحة.',
    };
  }
  if (/guest bookings require/i.test(raw)) {
    return {
      status: 400,
      code: 'GUEST_CONTACT_REQUIRED',
      message: 'Please provide a name and email for the booking.',
      messageAr: 'يُرجى إدخال الاسم والبريد الإلكتروني للحجز.',
    };
  }
  if (/select a company/i.test(raw)) {
    return {
      status: 400,
      code: 'COMPANY_REQUIRED',
      message: 'Select a company to book for.',
      messageAr: 'يُرجى اختيار الشركة التي تحجز باسمها.',
    };
  }
  if (/permission to book for this company/i.test(raw)) {
    return {
      status: 403,
      code: 'COMPANY_BOOKING_FORBIDDEN',
      message: 'You do not have permission to book for this company.',
      messageAr: 'ليس لديك صلاحية الحجز باسم هذه الشركة.',
    };
  }
  return null;
}

/**
 * Build the POST response body from the same projection GET reads.
 *
 * create_booking() returns `setof public.bookings` — the base row. mapBooking()
 * is written against `booking_details`, so four of the fields it reads
 * (booking_date, start_time, hours, resource_name) simply do not exist on that
 * row: the old handler shipped date/startTime/endTime absent, hours null, and
 * a hard-coded `resource_name: null`. Re-reading the view fixes all four at
 * once and guarantees the answer stays identical to a GET of the same booking,
 * because it is literally the same query.
 *
 * WHY THE SERVICE-ROLE CLIENT. The row has to be readable by whoever just
 * created it, and for a guest that is `anon`, which holds no grant on
 * `bookings` — the read would raise 42501 exactly as the GET did. The fence is
 * that the id is not caller-supplied: it was minted by the RPC we just
 * executed on this caller's behalf, in this request, so the caller
 * demonstrably owns this one row and the query is pinned to it. That is the
 * same capability argument ./[id]/route.js makes for its guest branch, with
 * the id's provenance known rather than merely unguessable.
 *
 * `booking_details` has no guest_phone column, so `customerPhone` is undefined
 * here — as it is on GET, which is the point. The unmapped RPC row still rides
 * along as `booking` for anything that needs the base columns.
 */
async function presentCreated(row) {
  try {
    const admin = createAdminClient();
    const { data: view, error } = await admin
      .from('booking_details')
      .select('*')
      .eq('id', row.id)
      .maybeSingle();

    if (error) throw error;
    if (view) return mapBooking(view);
  } catch (error) {
    // Only reachable if the service-role key is missing or the view moved.
    // The booking exists and `data.id` is what the checkout redirect needs, so
    // fall back to the partial mapping rather than fail a committed write.
    console.error(`[${POST_SCOPE}] BOOKING_REFETCH_FAILED:`, error);
  }
  return mapBooking(row);
}

/**
 * POST — create a booking.
 *
 * Delegates to the create_booking() RPC, which validates, reserves the slot,
 * consumes meeting-room credit and raises the invoice inside one transaction.
 * The slot is arbitrated by a database exclusion constraint, so a lost race
 * returns 409 with a usable message rather than silently double-booking, which
 * is what the previous read-then-write check did under concurrency.
 *
 * Accepts the legacy payload shape { resourceId, date, startTime, endTime, ... }
 * that BookingModal already sends.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      resourceId, resourceSlug, date, startTime, endTime,
      companyId, addons = [], notes,
      customerName, customerEmail, customerPhone,
      holdOnly = false, holdSessionId,
    } = body ?? {};

    if (!date || !startTime || !endTime || !(resourceId || resourceSlug)) {
      return apiFailure(
        400,
        'MISSING_FIELDS',
        'resourceId (or resourceSlug), date, startTime and endTime are required.',
        { messageAr: 'المساحة والتاريخ ووقتا البداية والنهاية مطلوبة.' }
      );
    }

    // Shape-check the date and times here rather than letting Postgres do it.
    // `p_time_range` is assembled from these three strings, so a value like
    // '10 AM' produces a malformed tstzrange and the parse error used to be
    // returned to the caller verbatim. (BookingModal.js does send hour labels
    // in that form; it now gets a clean 400 instead of a leaky one.)
    if (!DATE_RE.test(date) || !TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
      return apiFailure(
        400,
        'INVALID_DATE_TIME',
        'Use date as YYYY-MM-DD and times as HH:MM (24-hour).',
        { messageAr: 'استخدم التاريخ بصيغة YYYY-MM-DD والوقت بصيغة HH:MM.' }
      );
    }
    if (startTime.slice(0, 5) >= endTime.slice(0, 5)) {
      return apiFailure(
        400,
        'INVALID_TIME_RANGE',
        'The end time must be later than the start time.',
        { messageAr: 'يجب أن يكون وقت النهاية بعد وقت البداية.' }
      );
    }

    const supabase = await createClient();

    // The UI historically identified resources by slug ('ventures'); rows are
    // now keyed by uuid. Accept either.
    let targetId = resourceId;
    if (!targetId || !UUID_RE.test(targetId)) {
      const { data: resource, error: resourceError } = await supabase
        .from('resources')
        .select('id')
        .eq('slug', resourceSlug || resourceId)
        .maybeSingle();
      if (resourceError) throw resourceError;
      if (!resource) {
        return apiFailure(404, 'RESOURCE_NOT_FOUND', 'Requested resource does not exist.', {
          messageAr: 'المساحة المطلوبة غير موجودة.',
        });
      }
      targetId = resource.id;
    }

    // The modal sends add-ons as display names; the RPC wants ids. Resolve
    // whichever form arrived, and ignore anything unrecognised rather than
    // failing the whole booking over a stale label.
    let addonPayload = [];
    if (Array.isArray(addons) && addons.length) {
      const asObjects = addons.filter((a) => a && typeof a === 'object');
      const asLabels = addons.filter((a) => typeof a === 'string');

      addonPayload = asObjects
        .filter((a) => a.addon_id || a.id)
        .map((a) => ({ addon_id: a.addon_id || a.id, quantity: a.quantity ?? 1 }));

      if (asLabels.length) {
        const { data: rows } = await supabase
          .from('addons')
          .select('id, name, name_ar, slug')
          .eq('is_active', true);
        const match = (label) =>
          (rows ?? []).find(
            (r) => r.name === label || r.name_ar === label || r.slug === label
          );
        for (const label of asLabels) {
          const hit = match(label);
          if (hit) addonPayload.push({ addon_id: hit.id, quantity: 1 });
        }
      }
    }

    const { data, error } = await supabase.rpc('create_booking', {
      p_resource_id: targetId,
      p_time_range: `[${riyadhInstant(date, startTime)},${riyadhInstant(date, endTime)})`,
      p_company_id: companyId ?? null,
      p_addons: addonPayload,
      p_notes: notes ?? null,
      p_guest_name: customerName ?? null,
      p_guest_email: customerEmail ?? null,
      p_guest_phone: customerPhone ?? null,
      p_hold_only: Boolean(holdOnly),
      p_hold_session_id: holdSessionId ?? null,
    });

    if (error) {
      const known = describeBookingError(error);
      if (known) {
        return apiFailure(known.status, known.code, known.message, {
          messageAr: known.messageAr,
        });
      }
      // A failure we cannot name. Log it whole, say nothing about it.
      return apiServerError(POST_SCOPE, error, { context: { resource_id: targetId } });
    }

    // The booking is committed from here on. presentCreated() swallows its own
    // faults for that reason: a 500 after a successful write invites the client
    // to retry and book the slot twice.
    return NextResponse.json({
      success: true,
      message: 'Booking created successfully',
      data: await presentCreated(data),
      booking: data,
    });
  } catch (error) {
    return apiServerError(POST_SCOPE, error, { status: 400, code: 'BOOKING_FAILED' });
  }
}
