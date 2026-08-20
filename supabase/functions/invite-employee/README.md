# `invite-employee`

Adds an employee to a company: creates their auth user if they do not have one,
emails them a link to set a password, and writes the `company_members` row.

It exists because creating an auth user requires the service-role key, and that
key can never ship inside a mobile bundle. Until this function is deployed, the
app's invite form (`src/app/(app)/team/invite.tsx` in the mobile repo) is
deliberately wired to nothing and says so on submit.

---

## Secrets and environment

| Name | Where it comes from | Required |
| --- | --- | --- |
| `SUPABASE_URL` | injected by the platform | yes |
| `SUPABASE_ANON_KEY` | injected by the platform | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | injected by the platform | yes |
| `INVITE_REDIRECT_URL` | optional, `supabase secrets set` | no |

The first three are injected into every Edge Function automatically and
**cannot** be set with `supabase secrets set` — the `SUPABASE_` prefix is
reserved and the CLI refuses it. Nothing needs to be added to `.env.local`, and
nothing about this function should ever cause the service-role key to be
written into a file, a log line, or a response body.

`INVITE_REDIRECT_URL` only overrides the default redirect
(`marsspace://set-password`). Set it if the deep link ever changes:

```bash
supabase secrets set INVITE_REDIRECT_URL='marsspace://set-password'
```

The function reads `SUPABASE_PUBLISHABLE_KEY` / `SB_SECRET_KEY` as fallbacks so
it keeps working after the project moves to the new API key naming.

## Deploying

```bash
# from the website repo root
supabase functions deploy invite-employee --project-ref xihjvfcjnkcjmgruxapu
```

Leave JWT verification at its default (on). Note what that does and does not
buy: the platform only checks that the bearer token is *a* valid token for this
project, and the anon key is itself a valid JWT. It is a cheap filter, not the
security boundary. The boundary is `verifyCaller` in `index.ts`.

Consider adding to `supabase/config.toml` (owned by the orchestrator, not by
this directory):

```toml
[functions.invite-employee]
verify_jwt = true
```

The redirect target must stay inside `auth.additional_redirect_urls` in
`config.toml`. `marsspace://**` is already listed.

---

## What the caller check guarantees

The function runs with the service role, so it bypasses RLS entirely. If the
caller check is wrong, **any holder of any valid token can add themselves to any
company**. That is the whole risk, and it is why the check is written the way it
is.

`verifyCaller(authHeader, companyId, admin)` establishes, in order:

1. **The token is a live session.** `getUser()` is called on a client carrying
   the caller's bearer token; it asks the auth server rather than merely
   decoding the JWT, so an expired, revoked, or forged token is rejected with
   `401`.
2. **The caller's own profile is active.** Read with the *admin* client on
   purpose — a suspended member may be unable to read their own row under RLS,
   and "cannot read it" must never be allowed to mean "allowed".
3. **The caller is entitled to this specific company.** Two RPCs are issued over
   the **caller-scoped** client, so `auth.uid()` inside the SECURITY DEFINER
   helpers resolves to the caller:
   - `is_company_admin(company_id)` — active `company_admin` of that company;
   - `has_company_perm(company_id, 'manage_employees')` — active member holding
     that permission.

   Either one is sufficient. Both must be answered; an RPC that *errored*
   answered nothing, and no answer is treated as **not** permission, so a
   transport blip can never widen access.

Three details are load-bearing:

- **The company id comes from the request body and is never trusted.** It is the
  argument the helpers are asked about, which is exactly what binds the
  entitlement to the row that gets written. There is no path where the check
  passes for one company and the insert lands in another.
- **The permission string is `manage_employees`, not `can_manage_employees`.**
  `has_company_perm` matches on the short name; the column name falls through to
  its `else false` branch. Verified below.
- **`role` is hard-coded to `'employee'` and is not read from the body.** An
  employee who holds `manage_employees` must not be able to mint a
  `company_admin` and so escalate past the person who granted them the
  permission.

Everything the caller *can* choose — the four permission booleans, the job
title — is confined to a single company they already control.

---

## Contract

`POST /functions/v1/invite-employee`, `Authorization: Bearer <caller session>`.

```jsonc
{
  "companyId": "uuid",              // required
  "email": "person@example.com",    // required
  "jobTitle": "Designer",           // optional
  "fullName": "Sara Al-Amri",       // optional
  "canBookRooms": false,
  "canViewInvoices": false,
  "canSubmitRepairs": false,
  "canManageEmployees": false,
  "redirectTo": "marsspace:///set-password" // optional
}
```

`snake_case` keys are accepted for every field, so the payload can be sent
straight from a row shaped like the table.

`redirectTo` exists because Expo Go rewrites deep links to `exp://IP:8081/--/…`
while a standalone build uses `marsspace://`, so the client is the only party
that knows its own link. It carries a one-time sign-in code, so an unchecked
value is an account takeover: `safeRedirect()` allows only the `marsspace:` and
`exp:` schemes and the three web origins Mars Space owns. GoTrue re-checks it
against `additional_redirect_urls`; the local check is there because `exp://**`
has to be allow-listed for development and is broad.

**Success** — `201` for a new membership, `200` for a re-invite:

```jsonc
{
  "success": true,
  "data": {
    "member": { "id": "…", "status": "invited", "role": "employee", … },
    "profileId": "uuid",
    "email": "person@example.com",
    "emailSent": true,
    "accountExisted": false,
    "reinvited": false,
    "seats": { "limit": 8, "used": 2 },
    "message": "Invitation sent.",
    "message_ar": "تم إرسال الدعوة."
  }
}
```

`emailSent` matters to the UI. Someone who already has a Mars Space account and
a password receives no email — they are simply added and can sign in. Rendering
"Invitation sent" there would be a lie the member discovers by waiting for a
message that never arrives, so the screen should use `emailSent` to choose
between `t.team.inviteSent` and the "added, they can sign in" wording.

**Failure** — the envelope the rest of the API uses
(`src/app/api/v1/auth/login/route.js`), plus `message_ar`:

```jsonc
{ "success": false,
  "error": { "code": "SEAT_LIMIT_REACHED",
             "message": "All contracted seats are in use (8 of 8). …",
             "message_ar": "تم استخدام جميع المقاعد المتعاقد عليها …",
             "details": { "limit": 8, "used": 8 } } }
```

Arabic is the product's default language, so `message_ar` is always present. A
client that renders only `message` is the incomplete one.

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `INVALID_INPUT` | missing/invalid company id, email, or body |
| 400 | `INVALID_REDIRECT` | `redirectTo` outside the allow-list |
| 401 | `UNAUTHENTICATED` | no bearer token, or the session has expired |
| 403 | `FORBIDDEN` | caller inactive, or not entitled for this company |
| 403 | `COMPANY_INACTIVE` | company account is not active |
| 403 | `INVITEE_SUSPENDED` | the invited person's account is suspended |
| 404 | `COMPANY_NOT_FOUND` | company deleted mid-request |
| 409 | `NO_CONTRACTED_SEATS` | no office assignment covers today — a contract problem, not a full-house problem |
| 409 | `SEAT_LIMIT_REACHED` | `seats_used >= seat_limit` |
| 409 | `ALREADY_MEMBER` | active member of this company |
| 409 | `MEMBER_SUSPENDED` | suspended member; reactivate explicitly instead |
| 409 | `EMAIL_IN_USE` | auth user exists but is unreachable |
| 500 | `MISCONFIGURED` / `INTERNAL_ERROR` / `MEMBERSHIP_FAILED` | server-side |
| 502 | `INVITE_FAILED` | GoTrue refused to send |

## Seat cap

`company_seat_limit(company)` sums `office_assignments.desk_count` over the
assignments whose `term` covers today in Asia/Riyadh.
`company_seats_used(company)` counts members with status `invited` **or**
`active` — a pending invitation holds a seat, which is what the team screen
already shows.

The cap is only charged against requests that actually cost a seat. A member
already sitting at `invited` is inside `company_seats_used` already, so
re-sending their invitation is free; refusing that at capacity would leave an
admin unable to re-send the very invitation occupying the seat. A new person, or
a `removed` member returning, does take one. The check runs before any auth user
is created, so a refusal leaves nothing behind.

A limit of `0` returns `NO_CONTRACTED_SEATS` rather than `SEAT_LIMIT_REACHED`:
"you have no contract" and "your desks are full" call for different actions, and
a generic failure would send an admin hunting for a member to remove when there
is nothing to free.

**Known race.** The pre-check and the write are not one transaction, so two
admins inviting simultaneously can both pass it. Step 8 re-reads
`company_seats_used` afterwards and reverts the membership — restoring every
overwritten field for an existing row, deleting a newly created one — if the cap
was breached. If two requests collide exactly, both revert: over-correcting, but
failing closed, which is the right direction for a contracted limit. A database
trigger on `company_members` would close this properly and belongs in a
migration, which this directory does not own.

## Idempotency and the awkward cases

| Situation | Behaviour |
| --- | --- |
| New address | auth user created, invite email sent, membership inserted (`201`) |
| Address already has an account | membership only — **no second auth user**; one person keeps one login across every company (`201`, `emailSent: false`) |
| Account exists but never accepted | membership written, and a fresh set-password email sent |
| Already an active member | `409 ALREADY_MEMBER` |
| Invitation pending | permissions updated, link re-sent, `200`; costs no additional seat |
| Previously removed | row revived to `invited`, link re-sent, `200`, `reinvited: true` |
| Suspended member | `409 MEMBER_SUSPENDED` — reviving a suspension silently would undo a deliberate act |
| Same request retried | the `upsert` on `(company_id, profile_id)` lands on the same row |

The re-send uses `resetPasswordForEmail`, not `inviteUserByEmail`, because
GoTrue refuses to invite an address it already knows. The recovery link lands on
exactly the same set-password screen — mobile
`src/app/(auth)/set-password.tsx` and web `/auth/callback` → `/auth/set-password`
both exchange the one-time `code` — so the two are interchangeable from the
recipient's point of view. That screen already documents itself as the place
"an invited member sets their first password, and where a reset lands".

A failed re-send is logged but not fatal: the membership is the thing that
matters, and the person can always use "forgot password" themselves.

If an auth user exists with no `profiles` row (a trigger failure, or a profile
deleted by hand), the function adopts it via GoTrue's admin `filter` endpoint
rather than paging `listUsers()`, and backfills the profile so the membership's
foreign key has something to point at instead of failing with a bare `23503`.

---

## Verification

No Docker on this machine, so `supabase functions serve` could not run. What was
done instead:

**The TypeScript is checked, not asserted.** `deno check` passes against the
real `npm:@supabase/supabase-js@2` declarations (it resolves
`@supabase/auth-js` 2.112.3), and the check was proven non-vacuous by feeding it
a deliberate `inviteUserByEmailTYPO` and a bad return-type binding, both of which
it caught:

```bash
cd supabase/functions/invite-employee
deno check index.ts     # Check index.ts
deno lint  index.ts     # Checked 1 file
```

**Every column and function signature was read from the live database**, never
guessed: the four permission booleans on `company_members`, its
`(company_id, profile_id)` unique index, the status check constraint
(`invited | active | suspended | removed`), `profiles.email` being `citext`
(hence case-insensitive matching on a unique index), and the exact argument
names `p_company` / `p_perm`.

### SQL that verified the caller check

Run against the live database; both impersonation blocks roll back, and the
restore was confirmed afterwards.

An entitled `company_admin` — but note this case cannot distinguish the
permission-name bug, because `has_company_perm` short-circuits on
`role = 'company_admin'` before it looks at any column:

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<admin profile id>","role":"authenticated"}';
select auth.uid(),
       public.is_company_admin('<company id>'),                              -- t
       public.has_company_perm('<company id>','manage_employees');           -- t
rollback;
```

The case that does distinguish it — a plain employee holding only the
permission:

```sql
begin;
update public.company_members set role='employee', can_manage_employees=true
 where company_id='<company id>' and profile_id='<profile id>';
set local role authenticated;
set local request.jwt.claims = '{"sub":"<profile id>","role":"authenticated"}';
select public.is_company_admin('<company id>'),                             -- f
       public.has_company_perm('<company id>','manage_employees'),          -- t  entitled
       public.has_company_perm('<company id>','can_manage_employees'),      -- f  the bug
       public.is_company_admin('<other company id>'),                       -- f
       public.has_company_perm('<other company id>','manage_employees');    -- f
rollback;
```

Results were `f, t, f, f, f` as annotated. Two things are confirmed by that
row: passing the **column** name instead of the permission name would lock out
every legitimate non-admin caller, and naming a company the caller does not
belong to is refused.

And the shape a service-role or anonymous caller presents — which is why the
entitlement RPCs must go over the caller-scoped client and not the admin one:

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated"}';
select auth.uid(),                                                   -- null
       public.is_company_admin('<company id>'),                      -- f
       public.has_company_perm('<company id>','manage_employees');   -- f
rollback;
```

### SQL to verify the remaining branches after deployment

Set up, invoke, assert, clean up. `<company>` below is the company under test.

```sql
-- Seat arithmetic the function reads before every invite.
select public.company_seat_limit('<company>') as seat_limit,
       public.company_seats_used('<company>') as seats_used;

-- NO_CONTRACTED_SEATS: no assignment covers today, so the limit is 0.
select count(*) from public.office_assignments
 where company_id='<company>' and term @> (now() at time zone 'Asia/Riyadh')::date;

-- SEAT_LIMIT_REACHED: fill the company to its cap, then invite once more.
-- (A pending invitation counts, which is the point of the 'invited' arm.)
select status, count(*) from public.company_members
 where company_id='<company>' and status in ('invited','active') group by status;
```

```sql
-- After a successful new invite: exactly one membership, no duplicate profile.
select cm.status, cm.role, cm.job_title,
       cm.can_book_rooms, cm.can_view_invoices,
       cm.can_submit_repairs, cm.can_manage_employees,
       cm.invited_by, cm.invited_at, cm.joined_at, cm.removed_at
  from public.company_members cm
  join public.profiles p on p.id = cm.profile_id
 where cm.company_id='<company>' and p.email='<invitee email>';
-- expect: invited / employee / the four booleans exactly as sent /
--         invited_by = the caller's profile id / joined_at and removed_at null

select count(*) from public.profiles where email='<invitee email>';  -- expect 1
```

```sql
-- ALREADY_MEMBER: invite the same address again while active -> 409, and the
-- row must be untouched.
update public.company_members set status='active', joined_at=now()
 where company_id='<company>' and profile_id='<invitee profile>';
-- (invoke) then:
select status, joined_at from public.company_members
 where company_id='<company>' and profile_id='<invitee profile>';

-- Re-invite of a removed member: revived in place, same row id, seat retaken.
update public.company_members set status='removed', removed_at=now()
 where company_id='<company>' and profile_id='<invitee profile>';
-- (invoke) then expect status='invited', removed_at null, a fresh invited_at,
-- and one row only:
select count(*) from public.company_members
 where company_id='<company>' and profile_id='<invitee profile>';  -- expect 1

-- Second auth user check for an address that already had an account.
select count(*) from auth.users where lower(email)='<invitee email>';  -- expect 1
```

```sql
-- Clean up a test invite completely.
delete from public.company_members
 where company_id='<company>' and profile_id='<invitee profile>';
-- profiles cascades from auth.users; deleting the auth user removes both.
-- Do this through the dashboard or the admin API, not by hand in SQL.
```

### What could NOT be tested

Honest list. None of the following was executed, because the function was not
deployed and Docker is unavailable:

- **Nothing was invoked over HTTP.** No request has ever reached this code. CORS
  preflight, the JSON envelope on the wire, and the status codes are reasoned
  from the source, not observed.
- **No email was sent.** Whether `inviteUserByEmail` delivers, and whether the
  `marsspace://set-password` link opens the app and arrives with a usable
  `code`, is unverified end to end. Project SMTP configuration was not checked.
- **`resetPasswordForEmail` against an address whose account was never
  confirmed** is the weakest assumption in the file. GoTrue is expected to issue
  a recovery token regardless of confirmation state, but that was not observed.
  If it turns out not to, the re-invite path writes the membership correctly and
  silently sends no mail (`emailSent: false`, already logged) — it fails soft,
  but the person would need to be told another way. **Test this first.**
- **The `EMAIL_IN_USE` fallback** — GoTrue's admin `?filter=` endpoint and the
  string-matching on the "already registered" error message — was not exercised;
  that error text is not a stable API and may need adjusting.
- **The seat-cap race and its revert** cannot be produced without concurrent
  live traffic. The revert code path has never run.
- **The profile-backfill branch** (auth user exists, `profiles` row does not)
  has never run; it exists for a trigger failure that has not occurred.
- **`safeRedirect`** was reasoned about but not fuzzed.
- Only one company exists in the database today (8 seats, 1 used, 1 admin) and
  one profile, so the multi-company and at-capacity branches have no data to
  exercise them yet.
