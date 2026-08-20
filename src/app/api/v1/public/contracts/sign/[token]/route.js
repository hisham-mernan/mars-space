import { NextResponse } from 'next/server';
import { contractService } from '@/services';

/**
 * /api/v1/public/contracts/sign/[token]
 *
 * The customer e-signature portal. Legitimately public — it is reached by
 * somebody holding an emailed link and no account — which makes the token in
 * the path the ONLY credential guarding a service-role read and write.
 *
 * Consequences, all handled in ContractService#_resolveSigningToken:
 *   - the token is re-checked in constant time after the lookup;
 *   - malformed, unknown and already-redeemed tokens raise the SAME error, so
 *     this route is not an oracle for which tokens exist;
 *   - repository errors are caught below the route and never reach a body.
 *
 * Both verbs therefore answer failure identically: 404, one code, one message.
 * A 400-vs-404 split would itself be the oracle — it would separate "that is
 * not a token" from "that token is spent".
 */

const INVALID_LINK = {
  success: false,
  error: {
    code: 'INVALID_SIGNING_LINK',
    message: 'This signing link is invalid, expired, or has already been used.'
  }
};

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * One response for every failure.
 *
 * Anything that is not the expected signing-link rejection is logged as a
 * genuine fault and then reported as the same rejection: an operator gets the
 * detail, the anonymous caller gets nothing to distinguish the cases by.
 */
function refuse(error, where) {
  if (error?.code !== 'INVALID_SIGNING_LINK') {
    console.error(`[public/contracts/sign] ${where} failed:`, error);
  } else if (error.logDetail) {
    console.warn(`[public/contracts/sign] ${where} refused: ${error.logDetail}`);
  }
  return NextResponse.json(INVALID_LINK, { status: 404, headers: NO_STORE });
}

export async function GET(request, { params }) {
  try {
    const { token } = await params;
    const contract = await contractService.getContractByToken(token);

    // Projected, not returned whole: the raw document carries the signing
    // token itself, the company's billing email and several internal foreign
    // keys. See ContractService#toSigningView.
    return NextResponse.json(
      { success: true, data: contractService.toSigningView(contract) },
      { headers: NO_STORE }
    );
  } catch (error) {
    return refuse(error, 'GET');
  }
}

export async function POST(request, { params }) {
  try {
    const { token } = await params;

    let body;
    try {
      body = await request.json();
    } catch {
      // A malformed body is not a reason to say anything different from every
      // other rejection on this route.
      throw Object.assign(new Error('Invalid signing link'), {
        code: 'INVALID_SIGNING_LINK',
        logDetail: 'request body was not valid JSON'
      });
    }

    const userAgent = request.headers.get('user-agent') || null;
    // Only the first hop of X-Forwarded-For, and only as recorded evidence —
    // it is client-supplied and is never used to make a decision here.
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim().slice(0, 64) || null : null;

    const signedContract = await contractService.customerSign(token, body, { ip, userAgent });

    return NextResponse.json(
      {
        success: true,
        message: 'Contract signed successfully',
        // A signing confirmation, not the contract record: enough for the page
        // to name what was signed and link to the certificate.
        data: {
          id: signedContract.id,
          contractNumber: signedContract.contractNumber,
          status: signedContract.status,
          signatoryName: signedContract.signatoryName,
          signedAt: signedContract.signedAt,
          version: signedContract.version
        }
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    return refuse(error, 'POST');
  }
}
