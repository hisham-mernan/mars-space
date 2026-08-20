import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/api/guards';
import { analyticsService } from '@/services';

export async function GET() {
  // Staff gate. BaseRepository queries with the service-role client, which
  // bypasses RLS, so this check is the only thing standing between a signed-in
  // member and every row in the database. Outside the try block on purpose:
  // inside it, the 401/403 would be swallowed and re-emitted as a 500.
  const gate = await requireStaff();
  if (!gate.ok) return gate.response;

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
