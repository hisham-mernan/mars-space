import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapFaq } from '@/lib/supabase/mappers';
import { apiServerError } from '@/lib/api/errors';

const GET_SCOPE = 'api/v1/public/faqs/featured GET';

/**
 * Published FAQs. The route is named "featured" but always returned every FAQ;
 * that behaviour is preserved, with ?featured=true to narrow it.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const featuredOnly = searchParams.get('featured') === 'true';

    const supabase = await createClient();
    let query = supabase
      .from('faqs')
      .select('*')
      .eq('is_published', true)
      .order('sort_order', { ascending: true });

    if (featuredOnly) query = query.eq('is_featured', true);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data: (data ?? []).map(mapFaq) });
  } catch (error) {
    // Anonymous route: `error.message` would hand a prober the table name and
    // the grant state one failed request at a time. See src/lib/api/errors.js.
    return apiServerError(GET_SCOPE, error);
  }
}
