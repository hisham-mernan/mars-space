import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const db = getDb();
    const booking = db.bookings.find(b => b.id === id);

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BOOKING_NOT_FOUND',
            message: 'Booking not found'
          }
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: booking
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
