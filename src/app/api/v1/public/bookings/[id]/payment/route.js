import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/v1/public/bookings/:id/payment — submit payment for a booking.
 *
 * WHICH CLIENT, AND WHY
 * =====================
 * The session client (anon key), always. Never the service role.
 *
 * This route calls `submit_payment_proof()`, which is SECURITY DEFINER and
 * makes its own authorization decision from `auth.uid()`:
 *
 *     if v_invoice.company_id is null
 *        or not (is_staff() or has_company_perm(v_invoice.company_id,
 *                                               'view_invoices'))
 *     then raise exception 'You do not have permission to pay this invoice'
 *
 * Calling it through the service-role client would send `auth.uid() = null`,
 * so `is_staff()` and `has_company_perm()` both return false and the function
 * refuses anyway — the admin client buys nothing here except the risk of
 * someone later "fixing" the refusal by writing to `payments` directly and
 * bypassing every check in that function. The session client is what makes the
 * function's guard meaningful, so it is the only client this route uses.
 *
 * WHY THE OLD BEHAVIOUR IS NOT REPRODUCED
 * ---------------------------------------
 * The db.json version took an unauthenticated POST carrying nothing but
 * `{ paymentMethod: 'Mada' }`, set the booking to Confirmed/Paid and minted an
 * invoice already marked Paid. There was no payment processor anywhere in it —
 * the caller asserted payment and the server believed them. Against a real
 * ledger that is a write-side version of the same leak the GET route guards
 * against: anyone holding a booking link could mint a paid invoice and take a
 * room for free.
 *
 * The database is explicit that this must not happen:
 *   - `payments` and `invoices` are staff-write only under RLS
 *     (`payments_staff_write`, `invoices_staff_write`).
 *   - `submit_payment_proof` is granted to `authenticated` and `service_role`
 *     but *not* to `anon`.
 *   - `create_booking` raises an invoice only `if p_company_id is not null`,
 *     so a guest booking has no invoice to pay in the first place.
 *
 * So payment here means what the schema means by it: a member submits proof of
 * a bank transfer against their company's invoice, it lands as `pending`, and
 * staff verify it. Nothing this route does marks anything paid — hence 202,
 * not 200. Anonymous guests are told to settle with the team, because until a
 * real gateway is integrated there is no honest way for a signed-out visitor
 * to pay online.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(status, code, message, extra) {
  return NextResponse.json(
    { success: false, error: { code, message, ...extra } },
    { status }
  );
}

export async function POST(request, { params }) {
  try {
    // Next 16: the route context's `params` is a promise.
    const { id } = await params;

    // `bookings.reference` is a sequence ('BK-' || nextval(...)), so it is
    // never accepted as a key on a public route. Only the random uuid is.
    if (!UUID_RE.test(id)) {
      return fail(404, 'BOOKING_NOT_FOUND', 'Booking not found');
    }

    let body = {};
    try {
      body = (await request.json()) ?? {};
    } catch {
      body = {};
    }
    const { proofPath, amount, note } = body;

    const supabase = await createClient();

    // getUser() revalidates the JWT against the auth server; getSession() would
    // trust the cookie as presented, which is not good enough for a decision
    // that gates a financial write.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return fail(
        401,
        'AUTH_REQUIRED',
        'Sign in with the account that holds this booking to submit payment. ' +
          'Guest bookings are settled directly with the Mars Space team — ' +
          'online card payment is not available yet.'
      );
    }

    // Read through RLS: `bookings_read_own` decides whether this caller may see
    // the booking at all. No service-role fallback — an authenticated caller
    // who cannot see the booking has no business paying for it.
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, reference, status, company_id, total')
      .eq('id', id)
      .maybeSingle();

    if (bookingError) throw bookingError;
    if (!booking) {
      return fail(404, 'BOOKING_NOT_FOUND', 'Booking not found');
    }

    if (booking.status === 'cancelled') {
      return fail(409, 'BOOKING_CANCELLED', 'This booking has been cancelled.');
    }

    // One invoice per booking from create_booking(); ordered + limited rather
    // than .maybeSingle() so a historical duplicate returns the newest instead
    // of erroring the whole request.
    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, invoice_number, status, total, amount_paid, company_id')
      .eq('booking_id', id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (invoiceError) throw invoiceError;
    const invoice = invoices?.[0];

    if (!invoice) {
      // Three ways to land here, none of them payable through this route: a
      // guest booking (no company, so create_booking raised no invoice), a
      // booking fully covered by the company's credit allowance, or a member
      // without 'view_invoices' on the owning company.
      return fail(
        409,
        'NO_PAYABLE_INVOICE',
        'No open invoice for this booking is visible to you. It may be covered ' +
          'by your credit allowance, or billed to a company you cannot view ' +
          'invoices for.'
      );
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({
        success: true,
        message: 'This booking is already paid.',
        data: { booking, invoice },
      });
    }

    const outstanding = Number(invoice.total) - Number(invoice.amount_paid);
    const submittedAmount = amount != null ? Number(amount) : outstanding;

    if (!Number.isFinite(submittedAmount) || submittedAmount <= 0) {
      return fail(400, 'INVALID_AMOUNT', 'Amount must be a number greater than zero.');
    }

    if (!proofPath || typeof proofPath !== 'string') {
      // The RPC records a bank transfer awaiting verification, so the receipt
      // is the whole point of the submission. A `paymentMethod` string — which
      // is all the old checkout form sent — is not evidence of anything.
      return fail(
        400,
        'PROOF_REQUIRED',
        'proofPath is required: upload the transfer receipt to storage first, ' +
          'then submit its path.'
      );
    }

    const { data: payment, error: rpcError } = await supabase.rpc(
      'submit_payment_proof',
      {
        p_invoice_id: invoice.id,
        p_amount: submittedAmount,
        p_proof_path: proofPath,
        p_note: note ?? null,
      }
    );

    if (rpcError) {
      // The function raises with deliberate SQLSTATEs; map them rather than
      // flattening everything to 500.
      if (rpcError.code === '42501') {
        return fail(403, 'PAYMENT_FORBIDDEN', rpcError.message);
      }
      if (rpcError.code === '23514') {
        return fail(
          409,
          rpcError.hint === 'already_pending' ? 'ALREADY_PENDING' : 'PAYMENT_REJECTED',
          rpcError.message
        );
      }
      if (rpcError.code === 'P0002') {
        return fail(404, 'INVOICE_NOT_FOUND', rpcError.message);
      }
      throw rpcError;
    }

    // 202: recorded as pending, not settled. Staff verification flips the
    // invoice to paid, and nothing in this request may do that.
    return NextResponse.json(
      {
        success: true,
        message: 'Transfer submitted. Mars Space will confirm receipt shortly.',
        data: { booking, invoice, payment },
      },
      { status: 202 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message || 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}
