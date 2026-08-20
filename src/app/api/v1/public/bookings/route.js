import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapBooking } from '@/lib/supabase/mappers';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const resourceId = searchParams.get('resourceId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const supabase = await createClient();

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
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
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
      return NextResponse.json(
        { success: false, error: { message: 'resourceId (or resourceSlug), date, startTime and endTime are required.' } },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // The UI historically identified resources by slug ('ventures'); rows are
    // now keyed by uuid. Accept either.
    let targetId = resourceId;
    if (!targetId || !UUID_RE.test(targetId)) {
      const { data: resource } = await supabase
        .from('resources')
        .select('id')
        .eq('slug', resourceSlug || resourceId)
        .maybeSingle();
      if (!resource) {
        return NextResponse.json(
          { success: false, error: { message: 'Requested resource does not exist' } },
          { status: 404 }
        );
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
      // 23P01 = exclusion_violation: someone else took the slot mid-checkout.
      const taken = error.code === '23P01' || /just been taken/i.test(error.message ?? '');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: taken ? 'SLOT_TAKEN' : 'BOOKING_FAILED',
            message: error.message || 'Booking conflict or error',
          },
        },
        { status: taken ? 409 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Booking created successfully',
      data: mapBooking({ ...data, resource_name: null }),
      booking: data,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Booking conflict or error' } },
      { status: 400 }
    );
  }
}
