import { NextResponse } from 'next/server';
import { analyticsService } from '@/services';

export async function GET() {
  try {
    const data = await analyticsService.getExecutiveKpis();
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}
