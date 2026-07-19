import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const branchId = searchParams.get('branchId');
    const minCapacity = searchParams.get('capacity') ? Number(searchParams.get('capacity')) : null;

    const db = getDb();
    let workspaces = db.resources;

    if (category) {
      workspaces = workspaces.filter(w => w.category === category);
    }
    if (branchId) {
      workspaces = workspaces.filter(w => w.branchId === branchId);
    }
    if (minCapacity) {
      workspaces = workspaces.filter(w => w.capacity >= minCapacity);
    }

    return NextResponse.json({
      success: true,
      data: workspaces
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message || 'An unexpected error occurred'
        }
      },
      { status: 500 }
    );
  }
}
