import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapBranch, mapResource, mapEvent, mapFaq } from '@/lib/supabase/mappers';
import { apiServerError } from '@/lib/api/errors';

const GET_SCOPE = 'api/v1/public/homepage GET';

/**
 * Aggregated homepage content.
 *
 * Reads Supabase instead of src/data/db.json. All four queries hit tables that
 * are readable by anon under RLS, so this works for signed-out visitors.
 *
 * The statistics block stays hardcoded: those are marketing figures (642
 * members, 98% satisfaction) that were never derived from the data and should
 * not be — counting rows in a seeded database would report something different
 * and wrong. They belong in the CMS work, not here.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const [branches, resources, events, faqs] = await Promise.all([
      supabase.from('branches').select('*').order('status', { ascending: true }),
      supabase
        .from('resources')
        .select('*, branch:branches(slug), photos:resource_photos(url, sort_order)')
        .eq('is_bookable', true)
        .eq('status', 'available')
        .limit(3),
      supabase
        .from('community_schedule')
        .select('*')
        .eq('status', 'scheduled')
        .gte('ends_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(2),
      supabase
        .from('faqs')
        .select('*')
        .eq('is_published', true)
        .order('sort_order', { ascending: true })
        .limit(3),
    ]);

    const firstError = branches.error || resources.error || events.error || faqs.error;
    if (firstError) throw firstError;

    return NextResponse.json({
      success: true,
      data: {
        branches: (branches.data ?? []).map(mapBranch),
        statistics: {
          members: 642,
          companies: 184,
          events: 128,
          meetingRooms: 12,
          satisfaction: '98%',
        },
        featuredWorkspaces: (resources.data ?? []).map(mapResource),
        upcomingEvents: (events.data ?? []).map(mapEvent),
        faqs: (faqs.data ?? []).map(mapFaq),
      },
    });
  } catch (error) {
    // Never `error.message`. This is the route the leak was found on: the four
    // queries above are the ONLY thing every signed-out visitor touches, so a
    // revoked grant or a renamed column here turns the front page into a
    // broadcast of table names and Postgres hints. `firstError` above is a
    // PostgrestError forwarded verbatim by the old block. Detail to the log,
    // generic sentence to the caller. See src/lib/api/errors.js.
    return apiServerError(GET_SCOPE, error);
  }
}
