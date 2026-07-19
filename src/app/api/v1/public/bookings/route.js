import { NextResponse } from 'next/server';
import { getDb, saveDb, checkAvailability, calculatePrice } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { resourceId, date, startTime, endTime, customerName, email, mobile, userId } = body;

    // Validation
    if (!resourceId || !date || !startTime || !endTime || !customerName || !email || !mobile) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'All fields (resourceId, date, startTime, endTime, customerName, email, mobile) are required.'
          }
        },
        { status: 400 }
      );
    }

    // Check Availability
    const check = checkAvailability(resourceId, date, startTime, endTime);
    if (!check.available) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BOOKING_CONFLICT',
            message: check.reason
          }
        },
        { status: 409 }
      );
    }

    // Calculate Price
    const pricing = calculatePrice(resourceId, date, startTime, endTime, userId);

    // Save Booking
    const db = getDb();
    const newBookingId = `bk-${Date.now()}`;
    const newBookingRef = `MS-BK-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBooking = {
      id: newBookingId,
      reference: newBookingRef,
      customerId: userId || `guest-${Date.now()}`,
      customerName,
      email,
      mobile,
      resourceId,
      date,
      startTime,
      endTime,
      duration: pricing.hours,
      status: 'Pending Payment',
      paymentStatus: 'Unpaid',
      totalAmount: pricing.total,
      subtotal: pricing.subtotal,
      vat: pricing.vat,
      createdAt: new Date().toISOString()
    };

    db.bookings.push(newBooking);
    saveDb(db);

    return NextResponse.json({
      success: true,
      data: newBooking
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
