import { NextResponse } from 'next/server';
import { crmService } from '@/services';

export async function POST(request) {
  try {
    const body = await request.json();
    const lead = await crmService.createLead(body, 'Public Contact Form');
    return NextResponse.json({
      success: true,
      message: 'Thank you for reaching out. A Mars Space workspace consultant will contact you shortly.',
      data: lead
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to submit contact form' } },
      { status: 400 }
    );
  }
}
