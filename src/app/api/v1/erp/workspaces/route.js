import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/api/guards';
import { workspaceService } from '@/services';

export async function GET(request) {
  // Staff gate. BaseRepository queries with the service-role client, which
  // bypasses RLS, so this check is the only thing standing between a signed-in
  // member and every row in the database. Outside the try block on purpose:
  // inside it, the 401/403 would be swallowed and re-emitted as a 500.
  const gate = await requireStaff();
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const list = await workspaceService.getWorkspaces({ category });
    return NextResponse.json({ success: true, data: list });
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
    const space = await workspaceService.createWorkspace(body, 'ERP Admin');
    return NextResponse.json({ success: true, data: space });
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
    const { id, ...updates } = body;
    const updated = await workspaceService.updateWorkspace(id, updates, 'ERP Admin');
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
  }
}

export async function DELETE(request) {
  // Staff gate. BaseRepository queries with the service-role client, which
  // bypasses RLS, so this check is the only thing standing between a signed-in
  // member and every row in the database. Outside the try block on purpose:
  // inside it, the 401/403 would be swallowed and re-emitted as a 500.
  const gate = await requireStaff();
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    await workspaceService.deleteWorkspace(id, 'ERP Admin');
    return NextResponse.json({ success: true, message: 'Workspace deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
  }
}
