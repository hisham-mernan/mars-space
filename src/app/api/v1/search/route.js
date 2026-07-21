import { NextResponse } from 'next/server';
import { searchService } from '@/services';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const results = await searchService.globalSearch(q);
    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
