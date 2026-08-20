import 'server-only';
import { NextResponse } from 'next/server';

/**
 * ============================================================================
 * SAFE FAILURE RESPONSES FOR /api/v1
 * ============================================================================
 *
 * THE PROBLEM THIS EXISTS TO STOP. Most handlers under /api/v1 are written as
 *
 *     } catch (error) {
 *       return NextResponse.json(
 *         { success: false, error: { message: error.message } },
 *         { status: 500 }
 *       );
 *     }
 *
 * and `error.message` is not a message written for the public. Since the move
 * off db.json every data-layer failure is built by BaseRepository#_error(),
 * which deliberately concatenates the collection, the TABLE NAME, the failing
 * operation, the Postgres message, its `details`, its `hint`, and for writes the
 * JSON of the row it tried to insert. Forwarding that verbatim hands an
 * anonymous caller a map of the schema and of the grant configuration, one
 * failed request at a time:
 *
 *     [crm_leads -> leads] create failed: new row violates row-level security
 *     policy for table "leads" ... row={"full_name":"...","email":"..."}
 *
 * The row echo is the sharpest edge: whatever the attacker typed comes back
 * inside a server error string, which is exactly the shape a careless client
 * renders as HTML.
 *
 * THE RULE. The detail belongs in the server log, where operators can read it
 * and attackers cannot. The response body gets a stable machine-readable `code`
 * and a sentence written for a human. Never `error.message`.
 *
 * HOW TO ADOPT THIS IN A ROUTE. Two helpers, and the choice between them is
 * "did I decide this status, or did something blow up?":
 *
 *     import { apiFailure, apiServerError } from '@/lib/api/errors';
 *
 *     // A rejection you chose deliberately, with a message you wrote:
 *     if (!parsed.ok) {
 *       return apiFailure(400, 'INVALID_EMAIL', 'Enter a valid email address.', {
 *         messageAr: 'يُرجى إدخال بريد إلكتروني صحيح.',
 *       });
 *     }
 *
 *     // Anything you caught. Logs the real error, returns a generic body:
 *     try { ... } catch (error) {
 *       return apiServerError('api/v1/public/contact POST', error);
 *     }
 *
 * BODY SHAPE. Identical to the one src/lib/api/guards.js already returns, so
 * adopting this changes nothing a client has to parse:
 *
 *     { success: false, error: { code, message, messageAr? } }
 *
 * BILINGUAL. The site is bilingual with Arabic as the default language, so
 * every helper takes an optional Arabic string. `message` stays a STRING and
 * stays English — the existing forms do `setErrorMsg(data.error?.message)` and
 * render the result directly, and React throws "Objects are not valid as a
 * React child" if a body suddenly hands them `{ en, ar }`. The Arabic goes
 * alongside in `messageAr`, which a page can prefer when language === 'ar'
 * without any coordination with this file.
 */

/**
 * The only thing an anonymous caller ever learns about an unexpected fault.
 *
 * Deliberately says nothing about *what* failed. "Database error", "insert
 * failed" and "permission denied" are all leaks: they tell a prober which of
 * their inputs reached which layer.
 */
export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';
export const GENERIC_ERROR_MESSAGE_AR = 'حدث خطأ ما. يُرجى المحاولة مرة أخرى.';

/**
 * Build a failure response with a message that is safe to show anyone.
 *
 * Nothing here touches an Error object — the caller is asserting that `message`
 * was written by a human for this situation. If you find yourself passing
 * `error.message` into this function, you want apiServerError() instead.
 *
 * @param {number} status HTTP status.
 * @param {string} code   Stable, machine-readable, SCREAMING_SNAKE. Clients
 *                        branch on this; the prose is free to change.
 * @param {string} message English sentence for a human.
 * @param {{ messageAr?: string, headers?: Record<string,string>, details?: unknown }} [options]
 *   `details` is an OPTIONAL, caller-curated, non-sensitive payload — a list of
 *   which fields failed validation, say. It is echoed to the client, so it must
 *   never carry anything derived from a caught error.
 * @returns {NextResponse}
 */
export function apiFailure(status, code, message, options = {}) {
  const { messageAr, headers, details } = options;

  const error = { code, message };
  if (messageAr) error.messageAr = messageAr;
  if (details !== undefined) error.details = details;

  return NextResponse.json({ success: false, error }, { status, headers });
}

/**
 * Log a caught error server-side, return a body that discloses nothing.
 *
 * `scope` is a short, greppable label for where this happened
 * ('api/v1/public/contact POST'). It is written to the log ONLY; it is not in
 * the response.
 *
 * The default status is 500. Pass one explicitly when the caught error is
 * genuinely the caller's fault and you still do not want to describe it — a
 * malformed JSON body, for instance, is a 400 with a generic body.
 *
 * @param {string} scope
 * @param {unknown} error The thing you caught. Logged, never returned.
 * @param {{ status?: number, code?: string, message?: string, messageAr?: string,
 *           headers?: Record<string,string>, context?: Record<string, unknown> }} [options]
 *   `context` is extra detail for the LOG (a request id, which validator ran).
 *   Keep secrets and raw request bodies out of it; logs get shipped too.
 * @returns {NextResponse}
 */
export function apiServerError(scope, error, options = {}) {
  const {
    status = 500,
    code = 'INTERNAL_ERROR',
    message = GENERIC_ERROR_MESSAGE,
    messageAr = GENERIC_ERROR_MESSAGE_AR,
    headers,
    context,
  } = options;

  // console.error is what the rest of this codebase uses (guards.js, EventBus)
  // and what `next dev` / the platform log drain both capture. The Error is
  // passed as its own argument so the runtime prints the stack rather than
  // String()-ing it away.
  if (context) {
    console.error(`[${scope}] ${code}:`, error, context);
  } else {
    console.error(`[${scope}] ${code}:`, error);
  }

  return apiFailure(status, code, message, { messageAr, headers });
}
