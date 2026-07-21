import { NextResponse } from 'next/server';
import { workspaceService } from '@/services';

export async function GET(request) {
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
  try {
    const body = await request.json();
    const space = await workspaceService.createWorkspace(body, 'ERP Admin');
    return NextResponse.json({ success: true, data: space });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
  }
}

export async function PUT(request) {
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
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    await workspaceService.deleteWorkspace(id, 'ERP Admin');
    return NextResponse.json({ success: true, message: 'Workspace deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
  }
}
