import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapResource } from '@/lib/supabase/mappers';
import { apiServerError } from '@/lib/api/errors';

const GET_SCOPE = 'api/v1/public/meeting-rooms/featured GET';

/**
 * Bookable meeting rooms, cheapest first.
 *
 * Focus pods are included: spec 7.4 treats them as hourly bookable rooms and
 * the site's meeting-room surfaces should list both.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('resources')
      .select('*, branch:branches(slug), photos:resource_photos(url, sort_order)')
      .in('category', ['meeting_room', 'focus_pod'])
      .eq('is_bookable', true)
      .eq('status', 'available')
      .order('rate', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data: (data ?? []).map(mapResource) });
  } catch (error) {
    // Anonymous route: `error.message` would hand a prober the table name and
    // the grant state one failed request at a time. See src/lib/api/errors.js.
    return apiServerError(GET_SCOPE, error);
  }
}
