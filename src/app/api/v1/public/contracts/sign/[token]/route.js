import { NextResponse } from 'next/server';
import { contractService } from '@/services';

export async function GET(request, { params }) {
  try {
    const { token } = await params;
    const contract = await contractService.getContractByToken(token);
    if (!contract) {
      return NextResponse.json({ success: false, error: { message: 'Invalid or expired signing link' } }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: contract });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { token } = await params;
    const body = await request.json();
    const headers = request.headers;
    const userAgent = headers.get('user-agent') || 'Browser Web Client';
    const ip = headers.get('x-forwarded-for') || '185.192.44.10';

    const signedContract = await contractService.customerSign(token, body, { ip, userAgent });

    return NextResponse.json({
      success: true,
      message: 'Contract signed successfully',
      data: signedContract
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
  }
}
