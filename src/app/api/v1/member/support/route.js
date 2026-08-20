import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/api/guards';
import { apiFailure, apiServerError } from '@/lib/api/errors';
import supportTickets from '@/repositories/mappings/support_tickets';

const GET_SCOPE = 'api/v1/member/support GET';
const POST_SCOPE = 'api/v1/member/support POST';

/**
 * Member support desk.
 *
 * ---------------------------------------------------------------------------
 * WHAT WAS WRONG HERE
 *
 * GET used to read `customerId` out of the QUERY STRING and hand it to
 * supportService.getTickets(). Two holes, both trivially exploitable:
 *
 *   1. ?customerId=<someone else's company> returned that company's tickets.
 *      The value was never checked against the session.
 *   2. Omitting the parameter entirely returned EVERY ticket in the database.
 *      getTickets() falls back to an unfiltered findAll(), and since
 *      BaseRepository switched to the service-role client that findAll() is no
 *      longer scoped by RLS. `GET /api/v1/member/support` with no parameters
 *      was a full cross-tenant dump of the support desk.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DOES NOW
 *
 * Both handlers use the caller's own anon-key client, so Row Level Security is
 * in force (support_tickets_read_own: profile_id = auth.uid(), or staff), and
 * the identity comes from requireMember() — a JWT the auth server revalidated.
 * Nothing about who you are is read from the request any more: `customerId`,
 * `userId` and friends in the query string or body are ignored outright.
 *
 * That means this route deliberately does NOT go through supportService /
 * supportRepository. Those run as service role for the ERP's cross-tenant
 * reads, which is exactly the wrong client for a member-facing endpoint — see
 * the header of src/repositories/BaseRepository.js. The document shape the ERP
 * speaks is preserved by reusing the same mapping module, so callers see no
 * difference.
 */

/** GET /api/v1/member/support — the signed-in member's own tickets. */
export async function GET() {
  const gate = await requireMember();
  if (!gate.ok) return gate.response;

  const { supabase, user } = gate;

  try {
    // RLS already limits this to the caller's rows. The explicit .eq() is
    // belt-and-braces and states the intent of the endpoint: a staff account
    // hitting the *member* desk sees its own tickets, not everyone's.
    const { data, error } = await supabase
      .from(supportTickets.table)
      .select(supportTickets.selectColumns)
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: (data ?? []).map((row) => supportTickets.toDocument(row)),
    });
  } catch (error) {
    // The message here was already safe, but the logging and the body shape
    // were this route's own. Routed through the shared helper so there is one
    // convention to audit rather than two. See src/lib/api/errors.js.
    return apiServerError(GET_SCOPE, error, {
      code: 'TICKETS_READ_FAILED',
      message: 'Could not load your tickets.',
      messageAr: 'تعذّر تحميل تذاكرك.',
    });
  }
}

/** POST /api/v1/member/support — raise a ticket as the signed-in member. */
export async function POST(request) {
  const gate = await requireMember();
  if (!gate.ok) return gate.response;

  const { supabase, user } = gate;

  // Parsed on its own so a malformed body is a 400 the caller can act on,
  // rather than being folded into the generic 500 below.
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return apiServerError(POST_SCOPE, error, {
      status: 400,
      code: 'INVALID_BODY',
      message: 'Could not read the request body.',
      messageAr: 'تعذّرت قراءة محتوى الطلب.',
    });
  }

  // Checked here rather than left to supportTickets.toRow(), whose throw says
  // `public.support_tickets.subject is NOT NULL with no default` — accurate for
  // an operator, and exactly the kind of schema text that must not reach a
  // response body. The route names the field instead.
  if (typeof body?.subject !== 'string' || body.subject.trim() === '') {
    return apiFailure(400, 'SUBJECT_REQUIRED', 'Enter a subject for your ticket.', {
      messageAr: 'يُرجى إدخال عنوان للتذكرة.',
    });
  }

  try {
    // Only content comes from the body. Any customerId / userId / profileId /
    // customerName it carries is discarded: the reporter is the session.
    const row = supportTickets.toRow(
      {
        subject: body?.subject,
        description: body?.description || body?.subject,
        category: body?.category,
        priority: body?.priority,
        messages: Array.isArray(body?.messages) ? body.messages : undefined,
      },
      'create'
    );

    row.profile_id = user.id;
    row.company_id = await resolveCompanyId(supabase, user.id);
    // `reference` and `status` have column defaults (next_ticket_reference(),
    // 'open'); a client must not be able to pick either.
    delete row.reference;
    delete row.status;

    const { data, error } = await supabase
      .from(supportTickets.table)
      .insert(row)
      .select(supportTickets.selectColumns)
      .single();

    // The insert is checked twice over: RLS (support_tickets_insert_self
    // WITH CHECK profile_id = auth.uid()) would reject a forged reporter even
    // if the assignment above were ever removed.
    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: supportTickets.toDocument(data),
    });
  } catch (error) {
    // This was the sharpest of the five: the insert runs under the caller's
    // anon-key client, so an RLS rejection here arrives as
    // `new row violates row-level security policy for table "support_tickets"`
    // together with the row that was attempted — the member's own subject and
    // description echoed back inside a server error string. Detail to the log,
    // generic sentence to the caller. See src/lib/api/errors.js.
    //
    // 500, not the old 400: every caller-fault case is now rejected above with
    // a message written for it, so anything reaching here is ours.
    return apiServerError(POST_SCOPE, error, {
      code: 'TICKET_CREATE_FAILED',
      message: 'Could not create the ticket.',
      messageAr: 'تعذّر إنشاء التذكرة.',
    });
  }
}

/**
 * The company to file the ticket against — derived from the session's
 * memberships, never from the request. Null when the member belongs to no
 * company; support_tickets.company_id is nullable, so an unaffiliated member
 * can still raise a ticket.
 */
async function resolveCompanyId(supabase, profileId) {
  const { data } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('profile_id', profileId)
    .eq('status', 'active')
    .limit(1);

  return data?.[0]?.company_id ?? null;
}
