import { NextResponse } from 'next/server';
import { supportService } from '@/services';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const tickets = await supportService.getTickets(customerId);
    return NextResponse.json({ success: true, data: tickets });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const ticket = await supportService.createTicket(body, 'Member');
    return NextResponse.json({ success: true, data: ticket });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
  }
}
