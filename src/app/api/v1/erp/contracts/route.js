import { NextResponse } from 'next/server';
import { contractService } from '@/services';

export async function GET(request) {
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
  try {
    const body = await request.json();
    const contract = await contractService.createContract(body, 'Sales Executive');
    return NextResponse.json({ success: true, data: contract });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
  }
}

export async function PUT(request) {
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
