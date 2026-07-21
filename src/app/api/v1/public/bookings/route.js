import { NextResponse } from 'next/server';
import { bookingService } from '@/services';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const bookings = await bookingService.getBookings({ customerId });
    return NextResponse.json({ success: true, data: bookings });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const booking = await bookingService.createBooking(body);
    return NextResponse.json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Booking conflict or error' } },
      { status: 400 }
    );
  }
}
