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
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const branchId = searchParams.get('branchId');
    const capacity = searchParams.get('capacity');
    const bookableOnly = searchParams.get('bookable') !== 'false';

    const supabase = await createClient();

    let query = supabase
      .from('resources')
      .select('*, branch:branches!inner(slug, name, name_ar), photos:resource_photos(url, sort_order)')
      .neq('status', 'retired')
      .order('rate', { ascending: true });

    if (category) query = query.eq('category', category);
    if (branchId) query = query.eq('branch.slug', branchId);
    if (bookableOnly) query = query.eq('is_bookable', true);

    if (capacity) {
      const min = Number(capacity);
      if (Number.isFinite(min)) query = query.gte('capacity', min);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data: (data ?? []).map(mapResource) });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Server error' } },
      { status: 500 }
    );
  }
}
