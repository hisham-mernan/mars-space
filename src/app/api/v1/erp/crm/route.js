import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/api/guards';
import { crmService } from '@/services';

export async function GET() {
  // Staff gate. BaseRepository queries with the service-role client, which
  // bypasses RLS, so this check is the only thing standing between a signed-in
  // member and every row in the database. Outside the try block on purpose:
  // inside it, the 401/403 would be swallowed and re-emitted as a 500.
  const gate = await requireStaff();
  if (!gate.ok) return gate.response;

  try {
    const pipeline = await crmService.getPipeline();
    return NextResponse.json({ success: true, data: pipeline });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}

export async function POST(request) {
  // Staff gate. BaseRepository queries with the service-role client, which
  // bypasses RLS, so this check is the only thing standing between a signed-in
  // member and every row in the database. Outside the try block on purpose:
  // inside it, the 401/403 would be swallowed and re-emitted as a 500.
  const gate = await requireStaff();
  if (!gate.ok) return gate.response;

  try {
    const body = await request.json();
    const lead = await crmService.createLead(body, 'Sales Admin');
    return NextResponse.json({ success: true, data: lead });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
  }
}

export async function PUT(request) {
  // Staff gate. BaseRepository queries with the service-role client, which
  // bypasses RLS, so this check is the only thing standing between a signed-in
  // member and every row in the database. Outside the try block on purpose:
  // inside it, the 401/403 would be swallowed and re-emitted as a 500.
  const gate = await requireStaff();
  if (!gate.ok) return gate.response;

  try {
    const body = await request.json();
    const { id, stage } = body;
    const updated = await crmService.updateLeadStage(id, stage, 'Sales Admin');
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
  }
}
