import { NextResponse } from 'next/server';
import { contractService } from '@/services';

/**
 * GET /api/v1/public/contracts/verify/[id]
 *
 * Public contract verification certificate. Unauthenticated by design: it is
 * the endpoint a counterparty hits to confirm a contract really was signed.
 *
 * There is no caller identity here and none is possible, so the disclosure
 * decision lives entirely in ContractService#getAuditCertificate, which
 * projects the payload down to what verification needs. Read the block comment
 * on that method before adding a field: this route is anonymous and the layer
 * beneath it queries with the service-role client, so anything the certificate
 * carries is world-readable to anyone who can name a contract id.
 *
 * Every failure is one 404 with one body. An unknown id, a malformed id and an
 * internal fault are indistinguishable from outside, so the endpoint cannot be
 * walked to discover which contract ids exist. Detail goes to the server log,
 * following src/lib/api/guards.js — a raw `error.message` from the repository
 * layer names tables, columns and constraints.
 */

const NOT_FOUND = {
  success: false,
  error: {
    code: 'CONTRACT_NOT_FOUND',
    message: 'No verifiable contract matches this reference.'
  }
};

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const auditCert = await contractService.getAuditCertificate(id);

    return NextResponse.json(
      { success: true, data: auditCert },
      {
        // A certificate is generated per request (it carries verifiedAt) and is
        // about a single contract; it must not sit in a shared cache.
        headers: { 'Cache-Control': 'no-store' }
      }
    );
  } catch (error) {
    if (error?.code !== 'CONTRACT_NOT_FOUND') {
      // A genuine fault, reported to the caller as a miss like everything else.
      console.error('[public/contracts/verify] certificate lookup failed:', error);
    }
    return NextResponse.json(NOT_FOUND, {
      status: 404,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
}
