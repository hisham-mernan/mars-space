import { NextResponse } from 'next/server';
import { contractService } from '@/services';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const auditCert = await contractService.getAuditCertificate(id);
    return NextResponse.json({ success: true, data: auditCert });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 404 });
  }
}
