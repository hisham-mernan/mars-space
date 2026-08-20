import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapResource } from '@/lib/supabase/mappers';

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
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message || 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
