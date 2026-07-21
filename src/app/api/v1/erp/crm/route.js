import { NextResponse } from 'next/server';
import { crmService } from '@/services';

export async function GET() {
  try {
    const pipeline = await crmService.getPipeline();
    return NextResponse.json({ success: true, data: pipeline });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const lead = await crmService.createLead(body, 'Sales Admin');
    return NextResponse.json({ success: true, data: lead });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, stage } = body;
    const updated = await crmService.updateLeadStage(id, stage, 'Sales Admin');
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
  }
}
