import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/api/guards';
import { contractService } from '@/services';

export async function GET(request) {
  // Staff gate. BaseRepository queries with the service-role client, which
  // bypasses RLS, so this check is the only thing standing between a signed-in
  // member and every row in the database. Outside the try block on purpose:
  // inside it, the 401/403 would be swallowed and re-emitted as a 500.
  const gate = await requireStaff();
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');
    const contracts = await contractService.getContracts({ status, customerId });
    return NextResponse.json({ success: true, data: contracts });
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
    const contract = await contractService.createContract(body, 'Sales Executive');
    return NextResponse.json({ success: true, data: contract });
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
    const { action, id, managerName, amendmentData } = body;

    if (action === 'send') {
      const updated = await contractService.sendToCustomer(id, 'Sales Executive');
      return NextResponse.json({ success: true, data: updated });
    } else if (action === 'counterSign') {
      const updated = await contractService.counterSign(id, managerName || 'Operations Director', 'Executive Manager');
      return NextResponse.json({ success: true, data: updated });
    } else if (action === 'amend') {
      const updated = await contractService.amendContract(id, amendmentData || {}, 'Sales Executive');
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: { message: 'Invalid CLM action' } }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
  }
}
