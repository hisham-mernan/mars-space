import { NextResponse } from 'next/server';
import { workspaceService } from '@/services';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const branchId = searchParams.get('branchId');
    const capacity = searchParams.get('capacity');

    const workspaces = await workspaceService.getWorkspaces({ category, branchId, capacity });

    return NextResponse.json({
      success: true,
      data: workspaces
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Server error' } },
      { status: 500 }
    );
  }
}
