import { NextResponse } from 'next/server';
import { contractService } from '@/services';

export async function GET() {
  try {
    const templates = await contractService.getTemplates();
    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
