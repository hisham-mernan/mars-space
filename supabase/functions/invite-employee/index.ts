// Mars Space — invite-employee
//
// Creating an auth user needs the service-role key. That key can never ship in
// a mobile bundle, so the app's invite form (src/app/(app)/team/invite.tsx) has
// no wire to send down. This function is that wire.
//
// It runs with the service role, which means it bypasses RLS completely. The
// caller check below is therefore not a convenience — it is the entire security
// boundary. If it is wrong, anyone with any valid token can add themselves to
// any company. Read `verifyCaller` before changing anything in this file.
//
// The check is delegated to the database rather than reimplemented here: the
// two entitlement questions are asked over a client carrying the CALLER's JWT,
// so `auth.uid()` inside is_company_admin() / has_company_perm() resolves to
// the caller and not to the service role. Asking those helpers with the admin
// client would make them return false for everyone (auth.uid() is null), and
// "fixing" that by inlining the membership lookup on the admin client would
// silently delete the boundary.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected by
// the platform; they cannot be set with `secrets set` because the SUPABASE_
// prefix is reserved. The fallbacks cover projects already migrated to the
// publishable/secret key naming.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY =
  Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '';
const SERVICE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SB_SECRET_KEY') ?? '';

// Where the emailed link lands when the client does not supply one. The mobile
// app owns this contract: supabase/config.toml allows `marsspace://**`, and
// src/app/(auth)/set-password.tsx exchanges the `code` the link carries.
const DEFAULT_REDIRECT =
  Deno.env.get('INVITE_REDIRECT_URL') ?? 'marsspace://set-password';

// ---------------------------------------------------------------------------
// HTTP plumbing
// ---------------------------------------------------------------------------

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

/**
 * The envelope every other Mars Space endpoint uses
 * (see src/app/api/v1/auth/login/route.js), plus `message_ar`. Arabic is the
 * product's default language, so an Arabic string is required, not optional —
 * a client that renders `message` only is the one that is incomplete.
 */
function ok(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function fail(
  status: number,
  code: string,
  ar: string,
  en: string,
  details?: Record<string, unknown>,
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: { code, message: en, message_ar: ar, ...(details ? { details } : {}) },
    }),
    { status, headers: { ...CORS, 'Content-Type': 'application/json' } },
  );
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Deliberately loose, matching the check the invite form already does. A
// stricter pattern rejects valid-but-unusual addresses and blocks a real
// person for nothing; the address is proven by the email actually arriving.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Payload = {
  companyId: string;
  email: string;
  jobTitle: string | null;
  canBookRooms: boolean;
  canViewInvoices: boolean;
  canSubmitRepairs: boolean;
  canManageEmployees: boolean;
  fullName: string | null;
  redirectTo: string;
};

/** Accepts both the camelCase the app sends and the snake_case column names. */
function pickBool(body: Record<string, unknown>, camel: string, snake: string): boolean {
  const v = body[camel] ?? body[snake];
  return v === true;
}

function pickString(body: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = body[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

/**
 * The redirect is where a one-time sign-in code is delivered, so an unchecked
 * value handed to an attacker's host is an account takeover. GoTrue also
 * checks it against additional_redirect_urls, but `exp://**` has to be
 * allowed there for Expo Go, which is broad — so it is checked here too.
 */
function safeRedirect(raw: unknown): string | null {
  if (raw == null || raw === '') return DEFAULT_REDIRECT;
  if (typeof raw !== 'string') return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  // The app's own scheme, and Expo Go's dev scheme. Both are opaque to us;
  // there is no host an attacker can substitute.
  if (url.protocol === 'marsspace:' || url.protocol === 'exp:') return raw;

  // Web links must land on an origin we own. Mirrors additional_redirect_urls.
  const ALLOWED_ORIGINS = [
    'https://space.mars.sa',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  if (ALLOWED_ORIGINS.includes(url.origin)) return raw;

  return null;
}

function parsePayload(body: Record<string, unknown>): Payload | Response {
  const companyId = pickString(body, 'companyId', 'company_id');
  if (!companyId || !UUID_RE.test(companyId)) {
    return fail(
      400,
      'INVALID_INPUT',
      'معرّف الشركة غير صالح.',
      'A valid company id is required.',
    );
  }

  const emailRaw = pickString(body, 'email');
  if (!emailRaw || !EMAIL_RE.test(emailRaw)) {
    return fail(
      400,
      'INVALID_INPUT',
      'البريد الإلكتروني غير صالح.',
      'A valid email address is required.',
    );
  }

  const redirectTo = safeRedirect(body.redirectTo ?? body.redirect_to);
  if (redirectTo === null) {
    return fail(
      400,
      'INVALID_REDIRECT',
      'رابط العودة غير مسموح به.',
      'That redirect target is not allowed.',
    );
  }

  return {
    companyId,
    // profiles.email is citext, but auth.users.email is not — lowercasing here
    // keeps one address from becoming two auth users.
    email: emailRaw.toLowerCase(),
    jobTitle: pickString(body, 'jobTitle', 'job_title'),
    fullName: pickString(body, 'fullName', 'full_name'),
    canBookRooms: pickBool(body, 'canBookRooms', 'can_book_rooms'),
    canViewInvoices: pickBool(body, 'canViewInvoices', 'can_view_invoices'),
    canSubmitRepairs: pickBool(body, 'canSubmitRepairs', 'can_submit_repairs'),
    canManageEmployees: pickBool(body, 'canManageEmployees', 'can_manage_employees'),
    redirectTo,
  };
}

// ---------------------------------------------------------------------------
// The security boundary
// ---------------------------------------------------------------------------

type Caller = { id: string };

/**
 * Establishes who is calling and whether they may add employees to this
 * company. Every failure path returns a Response; a Caller means entitled.
 *
 * What this guarantees:
 *   - the bearer token is a live Supabase session (getUser() asks the auth
 *     server, it does not merely decode the JWT), so an expired or forged
 *     token is rejected;
 *   - the caller's own profile is active, which a suspended employee's still
 *     valid session would otherwise sail past;
 *   - the caller is an ACTIVE company_admin of, or holds manage_employees on,
 *     the company named in the BODY — not a company of their choosing later.
 *
 * The company id is read from the request body and never trusted; it is the
 * argument the helpers are asked about, which is what ties the entitlement to
 * the row that gets written.
 */
async function verifyCaller(
  authHeader: string | null,
  companyId: string,
  admin: SupabaseClient,
): Promise<Caller | Response> {
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return fail(
      401,
      'UNAUTHENTICATED',
      'يلزم تسجيل الدخول.',
      'Authentication is required.',
    );
  }

  // Anon key + the caller's token: RLS applies and auth.uid() is the caller.
  const asCaller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await asCaller.auth.getUser();
  const user = userData?.user;
  if (userError || !user) {
    return fail(
      401,
      'UNAUTHENTICATED',
      'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.',
      'Your session has expired. Please sign in again.',
    );
  }

  // Read with the admin client: a suspended caller may well be unable to read
  // their own profile row, and "cannot read it" must not become "allowed".
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, email, status')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile || profile.status !== 'active') {
    return fail(
      403,
      'FORBIDDEN',
      'هذا الحساب غير نشط.',
      'This account is not active.',
    );
  }

  const [adminCheck, permCheck] = await Promise.all([
    asCaller.rpc('is_company_admin', { p_company: companyId }),
    // The helper's own vocabulary: the perm is 'manage_employees', while the
    // column it reads is can_manage_employees. Passing the column name here
    // hits the `else false` branch and locks out a legitimate caller.
    asCaller.rpc('has_company_perm', {
      p_company: companyId,
      p_perm: 'manage_employees',
    }),
  ]);

  // Fail closed. An RPC that errored answered nothing, and "no answer" is not
  // permission — a transport blip must never widen access.
  if (adminCheck.error || permCheck.error) {
    console.error('entitlement check failed', {
      admin: adminCheck.error?.message,
      perm: permCheck.error?.message,
    });
    return fail(
      403,
      'FORBIDDEN',
      'تعذّر التحقق من صلاحيتك لإدارة الموظفين.',
      'Your permission to manage employees could not be verified.',
    );
  }

  if (adminCheck.data !== true && permCheck.data !== true) {
    return fail(
      403,
      'FORBIDDEN',
      'ليس لديك صلاحية إدارة الموظفين.',
      'You do not have permission to manage employees.',
    );
  }

  return { id: profile.id as string };
}

// ---------------------------------------------------------------------------
// Auth-user lookup
// ---------------------------------------------------------------------------

/**
 * Last-resort lookup for the case where an auth user exists but its profile
 * row does not — a trigger failure, or a profile deleted by hand. listUsers()
 * would page the whole user table; GoTrue's admin filter does it in one call.
 */
async function findAuthUserByEmail(email: string): Promise<{ id: string } | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?per_page=200&filter=${encodeURIComponent(email)}`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    if (!res.ok) return null;
    const body = await res.json();
    const users: Array<{ id: string; email?: string }> = body?.users ?? [];
    const hit = users.find((u) => (u.email ?? '').toLowerCase() === email);
    return hit ? { id: hit.id } : null;
  } catch (e) {
    console.error('admin user lookup failed', e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method !== 'POST') {
    return fail(405, 'METHOD_NOT_ALLOWED', 'الطلب غير مدعوم.', 'Method not allowed.');
  }

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
    console.error('missing environment: url/anon/service key');
    return fail(
      500,
      'MISCONFIGURED',
      'الخدمة غير مهيأة.',
      'The invitation service is not configured.',
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail(400, 'INVALID_INPUT', 'صيغة الطلب غير صحيحة.', 'Malformed request body.');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return fail(400, 'INVALID_INPUT', 'صيغة الطلب غير صحيحة.', 'Malformed request body.');
  }

  const parsed = parsePayload(raw as Record<string, unknown>);
  if (parsed instanceof Response) return parsed;
  const input = parsed;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ---- 1. Who is calling, and may they? ------------------------------------
  const caller = await verifyCaller(
    req.headers.get('Authorization'),
    input.companyId,
    admin,
  );
  if (caller instanceof Response) return caller;

  // ---- 2. The company itself ----------------------------------------------
  const { data: company, error: companyError } = await admin
    .from('companies')
    .select('id, name, name_ar, status')
    .eq('id', input.companyId)
    .maybeSingle();

  if (companyError) {
    console.error('company lookup failed', companyError.message);
    return fail(500, 'INTERNAL_ERROR', 'حدث خطأ غير متوقع.', 'Something went wrong.');
  }
  if (!company) {
    // Unreachable in practice: verifyCaller already proved membership of this
    // company, so a missing row means it was deleted mid-request.
    return fail(404, 'COMPANY_NOT_FOUND', 'الشركة غير موجودة.', 'Company not found.');
  }
  if (company.status !== 'active') {
    return fail(
      403,
      'COMPANY_INACTIVE',
      'حساب الشركة غير نشط. يرجى التواصل مع مارس سبيس.',
      'This company account is not active. Please contact Mars Space.',
    );
  }

  // ---- 3. The seat cap -----------------------------------------------------
  // company_seat_limit sums desk_count over the office assignments whose term
  // covers today in Asia/Riyadh; company_seats_used counts members that are
  // 'invited' or 'active'. A pending invitation therefore holds a seat, which
  // is the behaviour the team screen already displays.
  const [limitRes, usedRes] = await Promise.all([
    admin.rpc('company_seat_limit', { p_company: input.companyId }),
    admin.rpc('company_seats_used', { p_company: input.companyId }),
  ]);

  if (limitRes.error || usedRes.error) {
    console.error('seat check failed', {
      limit: limitRes.error?.message,
      used: usedRes.error?.message,
    });
    return fail(500, 'INTERNAL_ERROR', 'تعذّر التحقق من المقاعد.', 'Seat check failed.');
  }

  const seatLimit = Number(limitRes.data ?? 0);
  const seatsUsed = Number(usedRes.data ?? 0);

  if (seatLimit <= 0) {
    // Distinct from "full": nothing to free up, the contract is the problem.
    return fail(
      409,
      'NO_CONTRACTED_SEATS',
      'لا توجد مقاعد متعاقد عليها لهذه الشركة حاليًا. يرجى التواصل مع مارس سبيس.',
      'This company has no contracted seats at the moment. Please contact Mars Space.',
      { limit: seatLimit, used: seatsUsed },
    );
  }

  // The `seatsUsed >= seatLimit` rejection is NOT made here. Whether this
  // request costs a seat depends on the membership row, which is not known
  // until step 5 — a pending invitation is already counted, so re-sending it
  // costs nothing, and refusing that at capacity would leave an admin unable to
  // re-send the very invitation occupying the seat.

  // ---- 4. Resolve the invitee's profile ------------------------------------
  const { data: existingProfile, error: profileLookupError } = await admin
    .from('profiles')
    .select('id, email, full_name, status')
    .eq('email', input.email) // citext: case-insensitive, unique, indexed
    .maybeSingle();

  if (profileLookupError) {
    console.error('profile lookup failed', profileLookupError.message);
    return fail(500, 'INTERNAL_ERROR', 'حدث خطأ غير متوقع.', 'Something went wrong.');
  }

  if (existingProfile && existingProfile.status === 'suspended') {
    return fail(
      403,
      'INVITEE_SUSPENDED',
      'حساب هذا الشخص موقوف. يرجى التواصل مع مارس سبيس.',
      'This person’s account is suspended. Please contact Mars Space.',
    );
  }

  let profileId: string | null = existingProfile?.id ?? null;
  let hadAccount = Boolean(existingProfile);
  // profiles.status is 'invited' until the person confirms and sets a password.
  const neverSignedIn = existingProfile?.status === 'invited';
  let emailSent = false;

  // ---- 5. Existing membership ---------------------------------------------
  // Every field the write in step 7 overwrites is read here, so that a revert
  // in step 8 puts the row back exactly as it was.
  const MEMBER_COLS =
    'id, status, role, job_title, can_book_rooms, can_view_invoices, can_submit_repairs, can_manage_employees, invited_by, invited_at, joined_at, removed_at';

  type MemberRow = {
    id: string;
    status: string;
    role: string;
    job_title: string | null;
    can_book_rooms: boolean;
    can_view_invoices: boolean;
    can_submit_repairs: boolean;
    can_manage_employees: boolean;
    invited_by: string | null;
    invited_at: string;
    joined_at: string | null;
    removed_at: string | null;
  };
  let existingMember: MemberRow | null = null;

  if (profileId) {
    const { data: member, error: memberError } = await admin
      .from('company_members')
      .select(MEMBER_COLS)
      .eq('company_id', input.companyId)
      .eq('profile_id', profileId)
      .maybeSingle();

    if (memberError) {
      console.error('membership lookup failed', memberError.message);
      return fail(500, 'INTERNAL_ERROR', 'حدث خطأ غير متوقع.', 'Something went wrong.');
    }
    existingMember = (member as MemberRow) ?? null;

    if (existingMember?.status === 'active') {
      return fail(
        409,
        'ALREADY_MEMBER',
        'هذا الشخص عضو في الشركة بالفعل.',
        'This person is already a member of the company.',
      );
    }

    if (existingMember?.status === 'suspended') {
      // Reviving a suspension silently would undo a deliberate act. Send them
      // to the member screen, where reactivating is explicit.
      return fail(
        409,
        'MEMBER_SUSPENDED',
        'عضوية هذا الشخص موقوفة. يمكن إعادة تفعيلها من صفحة العضو.',
        'This person’s membership is suspended. Reactivate it from their member page.',
      );
    }
  }

  // ---- 5b. The seat cap, now that the cost is known ------------------------
  // A member sitting at 'invited' is already inside company_seats_used, so
  // re-sending their invitation is free. Everything else — a new person, or a
  // removed member returning — takes a seat that must be available. This is
  // checked before any auth user is created, so a refusal leaves nothing
  // behind.
  const consumesSeat = existingMember?.status !== 'invited';

  if (consumesSeat && seatsUsed >= seatLimit) {
    return fail(
      409,
      'SEAT_LIMIT_REACHED',
      `تم استخدام جميع المقاعد المتعاقد عليها (${seatsUsed} من ${seatLimit}). أزل عضوًا أو تواصل مع مارس سبيس لزيادة المقاعد.`,
      `All contracted seats are in use (${seatsUsed} of ${seatLimit}). Remove a member, or contact Mars Space to add seats.`,
      { limit: seatLimit, used: seatsUsed },
    );
  }

  // ---- 6. Create the auth user, or re-notify an existing one ---------------
  if (!profileId) {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      input.email,
      {
        redirectTo: input.redirectTo,
        data: {
          ...(input.fullName ? { full_name: input.fullName } : {}),
          invited_company_id: company.id,
          invited_company_name: company.name,
        },
      },
    );

    if (inviteError || !invited?.user) {
      const msg = (inviteError?.message ?? '').toLowerCase();
      const alreadyRegistered =
        msg.includes('already') || msg.includes('exists') || msg.includes('registered');

      if (alreadyRegistered) {
        // An auth user with no profile row. Adopt it rather than dead-ending.
        const found = await findAuthUserByEmail(input.email);
        if (!found) {
          return fail(
            409,
            'EMAIL_IN_USE',
            'هذا البريد الإلكتروني مسجّل بالفعل ولا يمكن دعوته آليًا. يرجى التواصل مع مارس سبيس.',
            'That email is already registered and cannot be invited automatically. Please contact Mars Space.',
          );
        }
        profileId = found.id;
        hadAccount = true;
      } else {
        console.error('inviteUserByEmail failed', inviteError?.message);
        return fail(
          502,
          'INVITE_FAILED',
          'تعذّر إرسال الدعوة. يرجى المحاولة مرة أخرى.',
          'The invitation could not be sent. Please try again.',
        );
      }
    } else {
      profileId = invited.user.id;
      emailSent = true;
    }

    // handle_new_auth_user() writes the profile in the same transaction as the
    // auth user, so it is normally already there. If it is not — trigger
    // disabled, profile deleted by hand — write it, because the membership row
    // has a foreign key to profiles and would otherwise fail with a bare 23503.
    const { data: after, error: afterError } = await admin
      .from('profiles')
      .select('id')
      .eq('id', profileId)
      .maybeSingle();

    if (afterError) {
      console.error('profile re-read failed', afterError.message);
      return fail(500, 'INTERNAL_ERROR', 'حدث خطأ غير متوقع.', 'Something went wrong.');
    }

    if (!after) {
      const { error: insertProfileError } = await admin.from('profiles').insert({
        id: profileId,
        email: input.email,
        full_name: input.fullName ?? input.email.split('@')[0],
        status: 'invited',
      });
      if (insertProfileError) {
        console.error('profile backfill failed', insertProfileError.message);
        return fail(500, 'INTERNAL_ERROR', 'حدث خطأ غير متوقع.', 'Something went wrong.');
      }
    }
  }
  // The `else` is deliberately absent: when the address already has a profile,
  // no auth user is created. One person, one login, across every company they
  // belong to — a second auth user would split their bookings and invoices.

  // Send a fresh link when there is one to be useful about: an invitation being
  // re-sent, a removed member returning, or someone who has an account on paper
  // but has never set a password (invited to another company and never
  // accepted). The recovery email lands on the very same set-password screen as
  // an invite — both carry a one-time `code` — and it is the only send that
  // works for an address auth already knows.
  const wantsResend =
    hadAccount &&
    (neverSignedIn ||
      existingMember?.status === 'invited' ||
      existingMember?.status === 'removed');

  if (wantsResend) {
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: resendError } = await anon.auth.resetPasswordForEmail(input.email, {
      redirectTo: input.redirectTo,
    });
    if (resendError) {
      // Not fatal: the membership is the thing that matters, and the person can
      // always use "forgot password" themselves.
      console.error('re-send failed', resendError.message);
    } else {
      emailSent = true;
    }
  }

  // ---- 7. Write the membership --------------------------------------------
  const now = new Date().toISOString();
  const permissions = {
    can_book_rooms: input.canBookRooms,
    can_view_invoices: input.canViewInvoices,
    can_submit_repairs: input.canSubmitRepairs,
    can_manage_employees: input.canManageEmployees,
  };

  // role is fixed at 'employee' and is NOT taken from the body. An employee
  // holding manage_employees could otherwise mint a company_admin and escalate
  // past the person who granted them the permission.
  const membershipFields = {
    company_id: input.companyId,
    profile_id: profileId,
    role: 'employee' as const,
    status: 'invited' as const,
    job_title: input.jobTitle,
    ...permissions,
    invited_by: caller.id,
    invited_at: now,
    joined_at: null,
    removed_at: null,
    updated_at: now,
  };

  // One upsert covers all three write cases — new member, invitation re-sent,
  // removed member returning — against the (company_id, profile_id) unique
  // index. It is also what makes a retried request safe: a client that times
  // out and sends again lands on the same row instead of a duplicate.
  const { data: membership, error: writeError } = await admin
    .from('company_members')
    .upsert(membershipFields, { onConflict: 'company_id,profile_id' })
    .select('id, status, role, job_title, can_book_rooms, can_view_invoices, can_submit_repairs, can_manage_employees, invited_at')
    .single();

  if (writeError || !membership) {
    console.error('membership write failed', writeError?.message);
    return fail(
      500,
      'MEMBERSHIP_FAILED',
      'تعذّر إضافة العضو. يرجى المحاولة مرة أخرى.',
      'The member could not be added. Please try again.',
    );
  }

  // ---- 8. Re-check the cap ------------------------------------------------
  // The check in step 3 and the write in step 7 are not one transaction, so two
  // admins inviting at the same moment can both pass it. Re-reading afterwards
  // catches that and gives the seat back. Both may revert if they collide
  // exactly, which fails closed — the safe direction for a contracted limit.
  const { data: usedAfter, error: usedAfterError } = await admin.rpc('company_seats_used', {
    p_company: input.companyId,
  });

  if (!usedAfterError && Number(usedAfter ?? 0) > seatLimit) {
    if (existingMember) {
      // Put every overwritten field back, not just the status — otherwise a
      // failed invitation would still have rewritten a removed member's
      // permissions and their record of who invited them originally.
      const { id: _ignored, ...restore } = existingMember;
      await admin
        .from('company_members')
        .update({ ...restore, updated_at: now })
        .eq('id', membership.id);
    } else {
      await admin.from('company_members').delete().eq('id', membership.id);
    }
    return fail(
      409,
      'SEAT_LIMIT_REACHED',
      `تم استخدام جميع المقاعد المتعاقد عليها (${seatLimit} مقعد). يرجى المحاولة مرة أخرى.`,
      `All contracted seats are in use (${seatLimit} seats). Please try again.`,
      { limit: seatLimit, used: Number(usedAfter ?? 0) },
    );
  }

  // ---- 9. Done -------------------------------------------------------------
  return ok(
    {
      member: membership,
      profileId,
      email: input.email,
      // The client needs these to say something true. An existing account gets
      // no email, and telling them "invitation sent" would be a lie they would
      // discover by waiting for a message that never arrives.
      emailSent,
      accountExisted: hadAccount,
      reinvited: existingMember?.status === 'removed',
      seats: { limit: seatLimit, used: seatsUsed + (consumesSeat ? 1 : 0) },
      message: emailSent
        ? 'Invitation sent.'
        : 'This person already has a Mars Space account and has been added to the company. They can sign in with their existing password.',
      message_ar: emailSent
        ? 'تم إرسال الدعوة.'
        : 'لدى هذا الشخص حساب في مارس سبيس بالفعل وتمت إضافته إلى الشركة. يمكنه تسجيل الدخول بكلمة المرور الحالية.',
    },
    existingMember ? 200 : 201,
  );
});
