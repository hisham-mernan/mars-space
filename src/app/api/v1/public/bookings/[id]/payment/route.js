import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { paymentMethod } = body;

    const db = getDb();
    const bookingIndex = db.bookings.findIndex(b => b.id === id);

    if (bookingIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BOOKING_NOT_FOUND',
            message: 'The requested booking ID was not found.'
          }
        },
        { status: 404 }
      );
    }

    const booking = db.bookings[bookingIndex];

    if (booking.status === 'Confirmed') {
      return NextResponse.json({
        success: true,
        data: booking,
        message: 'Booking was already paid and confirmed.'
      });
    }

    // Update status
    booking.status = 'Confirmed';
    booking.paymentStatus = 'Paid';
    booking.paymentMethod = paymentMethod || 'Card';
    booking.paidAt = new Date().toISOString();

    // Generate Invoice
    const newInvoiceId = `inv-${Date.now()}`;
    const newInvoiceNum = `INV-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    
    const newInvoice = {
      id: newInvoiceId,
      invoiceNumber: newInvoiceNum,
      customerId: booking.customerId,
      customerName: booking.customerName,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      type: 'Booking',
      description: `Meeting Room Booking for ${booking.resourceName}`,
      amount: booking.totalAmount,
      status: 'Paid',
      items: [
        {
          item: booking.resourceName,
          qty: 1,
          unitPrice: booking.subtotal,
          total: booking.subtotal
        }
      ],
      subtotal: booking.subtotal,
      vat: booking.vat,
      total: booking.totalAmount,
      bookingId: booking.id
    };

    db.invoices.push(newInvoice);
    db.bookings[bookingIndex] = booking;
    saveDb(db);

    return NextResponse.json({
      success: true,
      data: {
        booking,
        invoice: newInvoice
      }
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
