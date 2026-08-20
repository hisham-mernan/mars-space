import { NextResponse } from 'next/server';
import { crmService } from '@/services';
import { apiFailure, apiServerError } from '@/lib/api/errors';

/**
 * ============================================================================
 * POST /api/v1/public/contact — the public contact and tour-request forms
 * ============================================================================
 *
 * This is one of the few endpoints in the application that an unauthenticated
 * stranger is *supposed* to be able to write through, which makes it the one
 * that has to be strictest about what it accepts.
 *
 * WHAT IT USED TO DO. Nine lines: JSON.parse the body, hand the whole thing to
 * crmService.createLead(), and on failure return `error.message` to the caller.
 * With the site still reading src/data/db.json that was harmless. After the
 * move to Supabase it meant:
 *
 *   - an unvalidated, unbounded, unrate-limited insert into public.leads,
 *     through the SERVICE-ROLE client with Row Level Security bypassed, so
 *     anonymous callers could grow that table without limit and with fields of
 *     any length;
 *   - a second service-role insert into public.audit_log — a table anon holds
 *     no INSERT grant on and for which no INSERT policy exists — putting
 *     attacker-controlled text into the ledger staff read;
 *   - a THIRD service-role insert into public.audit_log, because
 *     ActivityService subscribes to CRM_LEAD_CREATED and writes the visitor's
 *     name into the timeline (see the note in CrmService.createPublicLead);
 *   - and BaseRepository#_error() strings — which concatenate the table name,
 *     the Postgres hint and the JSON of the attempted row — forwarded verbatim
 *     into the 400 body.
 *
 * FOUR THINGS GUARD IT NOW, in the order a request meets them:
 *
 *   1. Size.       The body is rejected on Content-Length, and again on actual
 *                  bytes, before it is parsed. Nothing large is ever handed to
 *                  JSON.parse.
 *   2. Rate.       In-process, per-IP, two budgets. See RATE LIMITING below —
 *                  including an honest account of what it does not cover.
 *   3. Shape.      Every field is typed, normalised and length-bounded here.
 *                  The database is reached only with values this file built.
 *   4. Privilege.  crmService.createPublicLead() writes with the ANON client,
 *                  so the `leads_public_insert` policy is what actually permits
 *                  the row, and anon's grants (INSERT on public.leads and
 *                  nothing else) cap the blast radius if this file has a hole.
 *                  It writes no audit row at all.
 *
 * Failures never carry a caught error's text; see src/lib/api/errors.js.
 */

// The rate limiter below is module-scoped mutable state, which only means
// anything in a long-lived server process. Stated explicitly so nobody moves
// this handler to the edge runtime and quietly turns the limiter into a no-op.
export const runtime = 'nodejs';

// ============================================================================
// RATE LIMITING
// ============================================================================
//
// WHAT THIS IS: a fixed-size, in-process, sliding-window counter keyed by the
// client IP. It costs one Map lookup, needs no dependency and no external
// store, and it is genuinely sufficient for the actual threat here — a single
// bored person with curl pointing at one coworking floor's contact form.
//
// WHAT THIS IS NOT — read this before trusting it:
//
//   * It is PER PROCESS. Two `next start` instances behind a load balancer, or
//     any serverless deployment where each invocation may be a fresh isolate,
//     multiply every limit below by the number of live instances. On a platform
//     that scales to zero the counters also reset whenever the process is
//     recycled. It is not a cluster-wide limit and must not be described as one.
//
//   * It is PER IP, so it does nothing against a distributed source. A botnet,
//     a residential-proxy pool or a handful of mobile connections rotating
//     through CGNAT addresses walk straight past the per-IP budgets. That is
//     what MAX_WRITES_GLOBAL exists for, and see its own caveat.
//
//   * The IP itself is only as trustworthy as the hop in front of this process
//     (see clientIp() below).
//
//   * It does not distinguish a human from a script. It is a brake, not a bot
//     check. The real answer to a determined spammer is a challenge —
//     Turnstile/reCAPTCHA — on the form plus a shared counter (Redis, Upstash,
//     or a Postgres rate-limit table keyed by ip and minute). Do that before
//     this endpoint is advertised anywhere.
//
// TREAT THE NUMBERS BELOW AS FRICTION, NOT AS PROTECTION.

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Requests of any outcome, per IP, per window. Generous, because a validation
 * error costs the caller a retry and it would be hostile to lock someone out
 * for mistyping their email twice.
 */
const MAX_ATTEMPTS_PER_IP = 12;

/**
 * Rows successfully inserted, per IP, per window. This is the budget that
 * actually bounds table growth. Four is already more enquiries than any real
 * visitor sends in ten minutes.
 */
const MAX_WRITES_PER_IP = 4;

/**
 * Rows successfully inserted across ALL callers, per window — a crude circuit
 * breaker for the distributed case the per-IP budget cannot see.
 *
 * The honest trade-off: an attacker who can burn this budget denies the contact
 * form to legitimate visitors for the rest of the window. That is accepted here
 * because it is recoverable (it clears itself in ten minutes and staff can still
 * be reached by the phone and email printed on /contact) whereas unbounded
 * growth of a production table is not. 120 per ten minutes is roughly two
 * orders of magnitude above this floor's real traffic, so tripping it is itself
 * a signal worth alerting on.
 */
const MAX_WRITES_GLOBAL = 120;

/**
 * Cap on how many distinct IPs are tracked, so the limiter cannot become the
 * memory-exhaustion bug it was added to prevent. Past this, the least recently
 * seen entries are evicted — i.e. the per-IP limiter fails OPEN under a
 * spraying attack, which is precisely when MAX_WRITES_GLOBAL takes over.
 */
const MAX_TRACKED_IPS = 5000;

/** @type {Map<string, { attempts: number[], writes: number[], seen: number }>} */
const buckets = new Map();

/** @type {number[]} timestamps of successful inserts, all callers. */
let globalWrites = [];

/** Drop timestamps older than the window. Arrays stay bounded by the caps. */
function prune(timestamps, now) {
  const cutoff = now - WINDOW_MS;
  let i = 0;
  while (i < timestamps.length && timestamps[i] <= cutoff) i += 1;
  return i === 0 ? timestamps : timestamps.slice(i);
}

function sweep(now) {
  const cutoff = now - WINDOW_MS;
  for (const [ip, bucket] of buckets) {
    if (bucket.seen <= cutoff) buckets.delete(ip);
  }
  if (buckets.size <= MAX_TRACKED_IPS) return;

  // Still oversized: evict least-recently-seen down to 90% of the cap. Sorting
  // up to a few thousand entries is cheap and only happens under attack.
  const victims = [...buckets.entries()]
    .sort((a, b) => a[1].seen - b[1].seen)
    .slice(0, buckets.size - Math.floor(MAX_TRACKED_IPS * 0.9));
  for (const [ip] of victims) buckets.delete(ip);
  console.warn(
    `[api/v1/public/contact] rate-limit table full: evicted ${victims.length} ` +
      `least-recently-seen IPs. Per-IP limiting is degraded; ` +
      `MAX_WRITES_GLOBAL is now the only bound.`
  );
}

let lastSweep = 0;

/**
 * The caller's IP, as far as it can be known.
 *
 * `request.ip` was REMOVED in Next 15 (see
 * node_modules/next/dist/docs/01-app/03-api-reference/04-functions/next-request.md),
 * so this reads the forwarding headers.
 *
 * BE CLEAR ABOUT WHAT THIS IS WORTH: X-Forwarded-For is a request header. It is
 * authoritative only when every hop in front of this process overwrites rather
 * than appends it — true on Vercel and behind a correctly configured CDN or
 * nginx, and NOT true of `next dev`, of a container exposed directly, or of any
 * deployment reachable on its origin address. Where it is not true, an attacker
 * picks a fresh IP per request and the per-IP budgets are decoration. The
 * leftmost value is used because that is the client position, which is also the
 * spoofable one; taking the rightmost would defeat spoofing but would bucket
 * every visitor behind the proxy together.
 */
function clientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first.slice(0, 64);
  }
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim().slice(0, 64);
  // Local development sends neither header; everything shares one bucket.
  return 'unknown';
}

function getBucket(ip, now) {
  let bucket = buckets.get(ip);
  if (!bucket) {
    bucket = { attempts: [], writes: [], seen: now };
    buckets.set(ip, bucket);
  }
  bucket.attempts = prune(bucket.attempts, now);
  bucket.writes = prune(bucket.writes, now);
  bucket.seen = now;
  return bucket;
}

/** Seconds until the oldest entry in a full window expires. */
function retryAfter(timestamps, now) {
  if (timestamps.length === 0) return Math.ceil(WINDOW_MS / 1000);
  return Math.max(1, Math.ceil((timestamps[0] + WINDOW_MS - now) / 1000));
}

/**
 * Charge one attempt against `ip`.
 * @returns {{ allowed: true, bucket: object } | { allowed: false, retryAfter: number }}
 */
function chargeAttempt(ip, now) {
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    sweep(now);
  }

  const bucket = getBucket(ip, now);
  if (bucket.attempts.length >= MAX_ATTEMPTS_PER_IP) {
    // Deliberately NOT pushing: recording a rejected attempt would keep sliding
    // the window forward and lock the caller out indefinitely.
    return { allowed: false, retryAfter: retryAfter(bucket.attempts, now) };
  }
  bucket.attempts.push(now);
  return { allowed: true, bucket };
}

/**
 * Check the two write budgets. Called after validation passes and before the
 * insert, so a caller who only ever sends malformed bodies never consumes it.
 */
function checkWriteBudget(bucket, now) {
  globalWrites = prune(globalWrites, now);

  if (bucket.writes.length >= MAX_WRITES_PER_IP) {
    return { allowed: false, retryAfter: retryAfter(bucket.writes, now), scope: 'ip' };
  }
  if (globalWrites.length >= MAX_WRITES_GLOBAL) {
    return { allowed: false, retryAfter: retryAfter(globalWrites, now), scope: 'global' };
  }
  return { allowed: true };
}

function recordWrite(bucket, now) {
  bucket.writes.push(now);
  globalWrites.push(now);
}

// ============================================================================
// INPUT NORMALISATION
// ============================================================================
//
// THE ARABIC RULE. This site is bilingual and Arabic is the DEFAULT language,
// so the normaliser has to be able to tell "hostile" from "not Latin". It
// therefore does not strip, escape or transliterate anything on the basis of
// script:
//
//   * No HTML escaping and no tag stripping. `<` and `&` are ordinary
//     characters in a message and mangling them here corrupts the stored data
//     for every future consumer. Escaping is the *renderer's* job and React
//     already does it by default. The one consumer that would need care is an
//     HTML notification email, and that must escape at the point of rendering,
//     not rely on the database holding pre-escaped text.
//
//   * NFC, never NFKC. NFC is the canonical composed form and is a no-op for
//     ordinary Arabic. NFKC would rewrite Arabic presentation forms and
//     ligatures (U+FEFB ﻻ -> two characters) and fold Arabic-Indic digits — a
//     real loss of what the visitor typed.
//
//   * ZWNJ (U+200C) and ZWJ (U+200D) SURVIVE. They carry meaning in
//     Arabic-script orthography. So do RLM/LRM (U+200E/U+200F), which appear in
//     legitimately mixed Arabic/Latin text.
//
// What is removed is only what is invisible AND dangerous:
//   * C0/C1 control characters (keeping tab, LF, CR), which have no business in
//     a form field and are the classic header-injection payload if any of this
//     text is ever put into an email header;
//   * the bidirectional OVERRIDE, EMBEDDING and ISOLATE controls (U+202A–U+202E,
//     U+2066–U+2069), whose entire purpose is to make rendered text read
//     differently from its stored order — a spoofing tool, not orthography;
//   * U+200B zero-width space and U+FEFF, used to pad text past filters.

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const BIDI_CONTROLS = /[\u202A-\u202E\u2066-\u2069]/g;
const INVISIBLES = /[\u200B\uFEFF]/g;

/**
 * Multi-line text: paragraphs preserved, CRLF normalised.
 *
 * A finite number is coerced to its string form — a JSON client that sends
 * `"phone": 966501234567` means a phone number, and silently dropping it would
 * lose real data with no error anywhere. Every other non-string (object, array,
 * boolean, null, NaN) becomes the empty string, so the required-field checks
 * reject it rather than something further down having to cope with it.
 */
function cleanText(value) {
  if (typeof value === 'number' && Number.isFinite(value)) value = String(value);
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFC')
    .replace(CONTROL_CHARS, '')
    .replace(BIDI_CONTROLS, '')
    .replace(INVISIBLES, '')
    .replace(/\r\n?/g, '\n')
    .trim();
}

/**
 * Single-line text. Everything cleanText does, plus: newlines and tabs become
 * spaces and runs of whitespace collapse. A name containing a newline is either
 * a mistake or an injection attempt; either way it is not a name.
 */
function cleanLine(value) {
  return cleanText(value).replace(/\s+/g, ' ').trim();
}

/**
 * Length in CODE POINTS, not UTF-16 units.
 *
 * Arabic letters are BMP so `.length` would agree, but emoji and many symbols
 * are surrogate pairs and would count double — meaning a limit expressed in
 * "characters" would silently be half as long for some visitors. Counting code
 * points is what a person means by "120 characters".
 */
function len(value) {
  // Array.from uses the string iterator, which yields code points rather than
  // UTF-16 units. The array it allocates is bounded by MAX_BODY_BYTES.
  return Array.from(value).length;
}

// ---------------------------------------------------------------- constraints

/**
 * 8 KB. The largest legitimate submission is a long message plus short fields;
 * even 4000 Arabic characters is ~8000 bytes of UTF-8, so the message limit
 * below is the real constraint and this is the outer envelope that stops a
 * multi-megabyte body being parsed at all.
 */
const MAX_BODY_BYTES = 8 * 1024;

const MAX = {
  name: 120,
  email: 254, // RFC 5321 maximum path length.
  phone: 32,
  company: 160,
  topic: 64,
  message: 4000,
  preferredTime: 5,
  workspaceInterest: 64,
};
const MIN_NAME = 2;

/**
 * Pragmatic, ASCII-only, and bounded so it cannot backtrack: every alternative
 * is anchored by a literal dot, and the input is length-checked before it gets
 * here. Internationalised (IDN / UTF-8 local part) addresses are rejected — a
 * deliberate limitation, because staff have to be able to actually reply to
 * these and the rest of the stack is not IDN-clean.
 */
const EMAIL_RE =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;

/**
 * Phone: digits, and the punctuation people actually type. Arabic-Indic
 * (U+0660–U+0669) and Extended Arabic-Indic (U+06F0–U+06F9) digits are accepted
 * as digits, because on an Arabic keyboard that is what a number looks like.
 */
const PHONE_ALLOWED = /^[\d٠-٩۰-۹+()./\s-]+$/;
const PHONE_DIGIT = /[\d٠-٩۰-۹]/g;

/**
 * `topic` and `workspaceInterest` are select-box values, not prose. A shape
 * constraint rather than an allow-list: the option lists on /contact and
 * /book-tour change with the marketing copy, and a hard allow-list here would
 * mean a new option silently 400s. This still bounds them to a short slug.
 */
const SLUG_RE = /^[A-Za-z0-9_-]{1,64}$/;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * `source` is sent by the page, not typed by the visitor, so it is the one
 * field that IS an allow-list — it lands in a NOT NULL column that the ERP
 * renders, and accepting free text there would let a caller write arbitrary
 * strings into a field staff read as trustworthy provenance. An unrecognised
 * value falls back to the default rather than 400ing, because a stale deployed
 * page sending an old constant should not break the form.
 */
const KNOWN_SOURCES = new Map([
  ['website contact form', 'Website Contact Form'],
  ['website_contact_form', 'Website Contact Form'],
  ['website tour request form', 'Website Tour Request Form'],
  ['website_tour_request_form', 'Website Tour Request Form'],
]);
const DEFAULT_SOURCE = 'Website Contact Form';

/** A calendar date that exists, within a sane window around today. */
function parseDate(value) {
  const match = DATE_RE.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null; // 2026-02-30 and friends.
  }
  const nowYear = new Date().getUTCFullYear();
  if (year < nowYear - 1 || year > nowYear + 5) return null;
  return value;
}

/**
 * Validate and normalise the parsed body.
 *
 * Returns either a clean lead document (camelCase, the vocabulary
 * CrmService/the crm_leads mapping speak) or the first problem found. One error
 * at a time keeps the response small and gives a prober no more information
 * than they already have about their own input.
 *
 * @returns {{ ok: true, lead: object } | { ok: false, code: string, field: string,
 *            message: string, messageAr: string }}
 */
function validate(body) {
  const bad = (code, field, message, messageAr) => ({
    ok: false,
    code,
    field,
    message,
    messageAr,
  });

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return bad(
      'INVALID_BODY',
      'body',
      'The request body must be a JSON object.',
      'يجب أن يكون محتوى الطلب كائن JSON.'
    );
  }

  // ---- name (required) ----------------------------------------------------
  // Both pages send `name`; /book-tour also sends `fullName`. Accept either.
  const name = cleanLine(body.name ?? body.fullName ?? '');
  if (!name) {
    return bad(
      'NAME_REQUIRED',
      'name',
      'Please enter your name.',
      'يُرجى إدخال الاسم.'
    );
  }
  if (len(name) < MIN_NAME) {
    return bad(
      'NAME_TOO_SHORT',
      'name',
      `Please enter your full name (at least ${MIN_NAME} characters).`,
      `يُرجى إدخال الاسم كاملاً (حرفان على الأقل).`
    );
  }
  if (len(name) > MAX.name) {
    return bad(
      'NAME_TOO_LONG',
      'name',
      `Name must be ${MAX.name} characters or fewer.`,
      `يجب ألا يتجاوز الاسم ${MAX.name} حرفاً.`
    );
  }

  // ---- email (required) ---------------------------------------------------
  const email = cleanLine(body.email ?? '');
  if (!email) {
    return bad(
      'EMAIL_REQUIRED',
      'email',
      'Please enter your email address.',
      'يُرجى إدخال البريد الإلكتروني.'
    );
  }
  // Length before regex, so the pattern never sees an unbounded string.
  if (email.length > MAX.email || !EMAIL_RE.test(email)) {
    return bad(
      'EMAIL_INVALID',
      'email',
      'Please enter a valid email address.',
      'يُرجى إدخال بريد إلكتروني صحيح.'
    );
  }

  // ---- phone (optional) ---------------------------------------------------
  let phone = cleanLine(body.phone ?? body.mobile ?? '');
  if (phone) {
    if (len(phone) > MAX.phone) {
      return bad(
        'PHONE_TOO_LONG',
        'phone',
        `Phone number must be ${MAX.phone} characters or fewer.`,
        `يجب ألا يتجاوز رقم الهاتف ${MAX.phone} خانة.`
      );
    }
    const digits = phone.match(PHONE_DIGIT);
    if (!PHONE_ALLOWED.test(phone) || !digits || digits.length < 6 || digits.length > 20) {
      return bad(
        'PHONE_INVALID',
        'phone',
        'Please enter a valid phone number, or leave it blank.',
        'يُرجى إدخال رقم هاتف صحيح، أو ترك الحقل فارغاً.'
      );
    }
  } else {
    phone = undefined;
  }

  // ---- company (optional) -------------------------------------------------
  let company = cleanLine(body.company ?? '');
  if (company && len(company) > MAX.company) {
    return bad(
      'COMPANY_TOO_LONG',
      'company',
      `Company name must be ${MAX.company} characters or fewer.`,
      `يجب ألا يتجاوز اسم الجهة ${MAX.company} حرفاً.`
    );
  }
  if (!company) company = undefined;

  // ---- topic (optional) ---------------------------------------------------
  // /contact posts this as `aboutTopic`; public.leads has a `topic` column that
  // nothing was writing to before, so the visitor's choice was being dropped.
  let topic = cleanLine(body.topic ?? body.aboutTopic ?? '');
  if (topic) {
    if (len(topic) > MAX.topic || !SLUG_RE.test(topic)) {
      return bad(
        'TOPIC_INVALID',
        'topic',
        'That enquiry type is not recognised.',
        'نوع الطلب غير معروف.'
      );
    }
    topic = topic.toLowerCase();
  } else {
    topic = undefined;
  }

  // ---- message (optional) -------------------------------------------------
  // Optional server-side even though /contact marks the textarea `required`:
  // that attribute is a client-side hint, and /book-tour composes its own
  // message string. A lead with no message is still a lead.
  let message = cleanText(body.message ?? body.notes ?? '');
  if (message && len(message) > MAX.message) {
    return bad(
      'MESSAGE_TOO_LONG',
      'message',
      `Message must be ${MAX.message} characters or fewer.`,
      `يجب ألا تتجاوز الرسالة ${MAX.message} حرف.`
    );
  }
  if (!message) message = undefined;

  // ---- tour fields (optional) ---------------------------------------------
  let preferredDate = cleanLine(body.preferredDate ?? '');
  if (preferredDate) {
    preferredDate = parseDate(preferredDate);
    if (!preferredDate) {
      return bad(
        'DATE_INVALID',
        'preferredDate',
        'Please choose a valid date (YYYY-MM-DD).',
        'يُرجى اختيار تاريخ صحيح بصيغة YYYY-MM-DD.'
      );
    }
  } else {
    preferredDate = undefined;
  }

  let preferredTime = cleanLine(body.preferredTime ?? '');
  if (preferredTime) {
    if (len(preferredTime) > MAX.preferredTime || !TIME_RE.test(preferredTime)) {
      return bad(
        'TIME_INVALID',
        'preferredTime',
        'Please choose a valid time (HH:MM).',
        'يُرجى اختيار وقت صحيح بصيغة HH:MM.'
      );
    }
  } else {
    preferredTime = undefined;
  }

  let workspaceInterest = cleanLine(body.workspaceInterest ?? '');
  if (workspaceInterest) {
    if (len(workspaceInterest) > MAX.workspaceInterest || !SLUG_RE.test(workspaceInterest)) {
      return bad(
        'WORKSPACE_INVALID',
        'workspaceInterest',
        'That workspace type is not recognised.',
        'نوع المساحة غير معروف.'
      );
    }
    workspaceInterest = workspaceInterest.toLowerCase();
  } else {
    workspaceInterest = undefined;
  }

  // ---- source (page-supplied, allow-listed) -------------------------------
  const source =
    KNOWN_SOURCES.get(cleanLine(body.source ?? '').toLowerCase()) || DEFAULT_SOURCE;

  // NOTE what is NOT read from the body, and never should be: `stage`/`status`
  // (a visitor does not get to place themselves in the pipeline), `assignedTo`,
  // `value`, and `id`. Anything not listed above is simply ignored — this is an
  // allow-list of fields, not a filter over the body.
  return {
    ok: true,
    lead: {
      name,
      email,
      phone,
      company,
      topic,
      message,
      source,
      preferredDate,
      preferredTime,
      workspaceInterest,
    },
  };
}

// ============================================================================
// HANDLER
// ============================================================================

const SCOPE = 'api/v1/public/contact POST';

export async function POST(request) {
  const now = Date.now();
  const ip = clientIp(request);

  // ---- 1. rate limit ------------------------------------------------------
  // First, so that everything below — including reading the body — is work an
  // abusive caller cannot make the server do repeatedly.
  const attempt = chargeAttempt(ip, now);
  if (!attempt.allowed) {
    return apiFailure(
      429,
      'RATE_LIMITED',
      'Too many requests. Please wait a few minutes and try again.',
      {
        messageAr: 'عدد كبير من المحاولات. يُرجى الانتظار بضع دقائق ثم المحاولة مرة أخرى.',
        headers: { 'Retry-After': String(attempt.retryAfter) },
      }
    );
  }

  // ---- 2. size ------------------------------------------------------------
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return apiFailure(
      413,
      'BODY_TOO_LARGE',
      'That submission is too large. Please shorten your message.',
      { messageAr: 'حجم الطلب كبير جداً. يُرجى اختصار الرسالة.' }
    );
  }

  let raw;
  try {
    raw = await request.text();
  } catch (error) {
    // A truncated or aborted upload. Nothing to disclose.
    return apiServerError(SCOPE, error, {
      status: 400,
      code: 'BODY_UNREADABLE',
      message: 'Could not read the request body.',
      messageAr: 'تعذّرت قراءة محتوى الطلب.',
    });
  }

  // Content-Length can be absent (chunked) or a lie, so the real bytes are
  // checked too — before JSON.parse ever sees them.
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    return apiFailure(
      413,
      'BODY_TOO_LARGE',
      'That submission is too large. Please shorten your message.',
      { messageAr: 'حجم الطلب كبير جداً. يُرجى اختصار الرسالة.' }
    );
  }

  // ---- 3. parse -----------------------------------------------------------
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    // The parser's own message quotes the offending input back; not returned.
    return apiFailure(
      400,
      'INVALID_JSON',
      'The request body must be valid JSON.',
      { messageAr: 'يجب أن يكون محتوى الطلب بصيغة JSON صحيحة.' }
    );
  }

  // ---- 4. validate --------------------------------------------------------
  const result = validate(body);
  if (!result.ok) {
    return apiFailure(400, result.code, result.message, {
      messageAr: result.messageAr,
      // The field name is this file's own constant, not anything the caller
      // sent, so echoing it discloses nothing and lets a form highlight the
      // right input.
      details: { field: result.field },
    });
  }

  // ---- 5. write budget ----------------------------------------------------
  const budget = checkWriteBudget(attempt.bucket, now);
  if (!budget.allowed) {
    if (budget.scope === 'global') {
      console.warn(
        `[${SCOPE}] GLOBAL write budget exhausted ` +
          `(${MAX_WRITES_GLOBAL} inserts / ${WINDOW_MS / 60000}min). ` +
          `The contact form is refusing all submissions until the window ` +
          `clears — this is either an attack or a traffic spike, and it should ` +
          `be alerted on.`
      );
    }
    return apiFailure(
      429,
      'RATE_LIMITED',
      'Too many requests. Please wait a few minutes and try again.',
      {
        messageAr: 'عدد كبير من المحاولات. يُرجى الانتظار بضع دقائق ثم المحاولة مرة أخرى.',
        headers: { 'Retry-After': String(budget.retryAfter) },
      }
    );
  }

  // ---- 6. write -----------------------------------------------------------
  try {
    await crmService.createPublicLead(result.lead);
  } catch (error) {
    // apiServerError logs the real failure (including the PostgREST code that
    // createPublicLead attaches) and returns a body that names no table, no
    // policy and no column.
    return apiServerError(SCOPE, error, { context: { source: result.lead.source } });
  }

  recordWrite(attempt.bucket, now);

  // 201, and NO `data`. The previous handler returned the whole lead document,
  // which handed an anonymous caller a database uuid and the internal shape of
  // the row. The forms only read `success`.
  return NextResponse.json(
    {
      success: true,
      message:
        'Thank you for reaching out. A Mars Space workspace consultant will contact you shortly.',
      messageAr: 'شكراً لتواصلك معنا. سيتواصل معك أحد مستشاري مساحات مارس قريباً.',
    },
    { status: 201 }
  );
}
