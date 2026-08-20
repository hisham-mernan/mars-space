import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/api/guards';
import { invoiceService } from '@/services';

export async function GET(request) {
  // Staff gate. BaseRepository queries with the service-role client, which
  // bypasses RLS, so this check is the only thing standing between a signed-in
  // member and every row in the database. Outside the try block on purpose:
  // inside it, the 401/403 would be swallowed and re-emitted as a 500.
  const gate = await requireStaff();
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const invoices = await invoiceService.getInvoices({ customerId, status });
    return NextResponse.json({ success: true, data: invoices });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}

export async function POST(request) {
  // Staff gate. BaseRepository queries with the service-role client, which
  // bypasses RLS, so this check is the only thing standing between a signed-in
  // member and every row in the database. Outside the try block on purpose:
  // inside it, the 401/403 would be swallowed and re-emitted as a 500.
  const gate = await requireStaff();
  if (!gate.ok) return gate.response;

  try {
    const body = await request.json();
    const invoice = await invoiceService.createInvoice(body);
    return NextResponse.json({ success: true, data: invoice });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
  }
}

export async function PUT(request) {
  // Staff gate. BaseRepository queries with the service-role client, which
  // bypasses RLS, so this check is the only thing standing between a signed-in
  // member and every row in the database. Outside the try block on purpose:
  // inside it, the 401/403 would be swallowed and re-emitted as a 500.
  const gate = await requireStaff();
  if (!gate.ok) return gate.response;

  try {
    const body = await request.json();
    const { action, id, paymentMethod, reminderType } = body;

    if (action === 'pay') {
      const paidInvoice = await invoiceService.payInvoice(id, paymentMethod || 'Mada');
      return NextResponse.json({ success: true, data: paidInvoice });
    } else if (action === 'sendReminder') {
      const updatedInvoice = await invoiceService.sendReminder(id, reminderType);
      return NextResponse.json({ success: true, data: updatedInvoice });
    }

    return NextResponse.json({ success: false, error: { message: 'Invalid action' } }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
  }
}
