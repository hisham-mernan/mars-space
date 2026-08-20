import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapResource } from '@/lib/supabase/mappers';

/**
 * Public inventory listing, used by /spaces.
 *
 * Filtering moves from a JavaScript predicate over the whole collection into
 * the query, so the database returns only the matching rows instead of the
 * client receiving everything.
 *
 * branchId accepts the branch slug ('jeddah'), which is what the old JSON used
 * as its identifier and what the UI still sends.
 *
 * ---------------------------------------------------------------------------
 * `bookable` is a three-state filter, not an on/off switch
 * ---------------------------------------------------------------------------
 * A resource being bookable and a resource existing are different questions,
 * and this route now makes the caller say which one it is asking:
 *
 *   bookable absent   CATALOGUE. Every non-retired resource, whatever way it
 *                     is sold. This is the default because "what does Mars
 *                     Space have?" is the question a visitor on /spaces asks.
 *   bookable=true     BOOKING FLOW. Only what can be reserved instantly —
 *                     the hourly rooms, the day-rate desks.
 *   bookable=false    LEASE ENQUIRY. Only what is taken by contract rather
 *                     than by the hour: the private offices.
 *
 * The default used to be `true`, and that hid the entire private-office
 * inventory — all 25 of them — from the catalogue that is supposed to sell
 * them. `is_bookable = false` is correct data for an office: you lease one for
 * a month, you do not book it for an hour. It was the *default* that was
 * wrong. Narrowing to instantly-bookable stock is a booking flow's business,
 * so a booking flow now has to ask for it by name.
 *
 * Anything other than 'true'/'false' is a 400 rather than a silent fallback:
 * `?bookable=1` quietly meaning "catalogue" is how the original bug survived
 * review in the first place.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const branchId = searchParams.get('branchId');
  const capacity = searchParams.get('capacity');
  const bookableParam = searchParams.get('bookable');

  // null = no is_bookable predicate at all (catalogue).
  let bookable = null;
  if (bookableParam !== null) {
    if (bookableParam !== 'true' && bookableParam !== 'false') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_QUERY',
            message: "bookable must be 'true' or 'false'; omit it to list everything.",
          },
        },
        { status: 400 }
      );
    }
    bookable = bookableParam === 'true';
  }

  try {
    const supabase = await createClient();

    let query = supabase
      .from('resources')
      .select('*, branch:branches!inner(slug, name, name_ar), photos:resource_photos(url, sort_order)')
      .neq('status', 'retired')
      // Category first, then price. Rates in this table are not comparable
      // across categories — an office is priced per month, a meeting room per
      // hour, a desk per day — so a single rate sort over the whole catalogue
      // would interleave three different units and read as random. Name last
      // so the order is stable for equal rates (every office is currently
      // rate 0, i.e. priced on enquiry).
      .order('category', { ascending: true })
      .order('rate', { ascending: true })
      .order('name', { ascending: true });

    if (category) query = query.eq('category', category);
    if (branchId) query = query.eq('branch.slug', branchId);
    if (bookable !== null) query = query.eq('is_bookable', bookable);

    if (capacity) {
      const min = Number(capacity);
      if (Number.isFinite(min)) query = query.gte('capacity', min);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data: (data ?? []).map(mapResource) });
  } catch (error) {
    // Detail to the server log, generic body to the caller — the same split
    // src/lib/api/guards.js makes. A Postgres error message can name columns,
    // relations and constraints, and this endpoint is unauthenticated.
    console.error('[api/v1/public/workspaces] listing failed:', error);
    return NextResponse.json(
      { success: false, error: { code: 'LISTING_FAILED', message: 'Could not load spaces.' } },
      { status: 500 }
    );
  }
}
