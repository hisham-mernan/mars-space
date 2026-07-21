import { NextResponse } from 'next/server';
import { inventoryService } from '@/services';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const items = await inventoryService.getInventory(category);
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const item = await inventoryService.addItem(body, 'Inventory Admin');
    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const updated = await inventoryService.updateItem(id, updates, 'Inventory Admin');
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    await inventoryService.deleteItem(id, 'Inventory Admin');
    return NextResponse.json({ success: true, message: 'Item deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
  }
}
