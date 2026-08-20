// Mars Space — double-booking concurrency test
//
// The legacy implementation read src/data/db.json, compared "HH:MM" strings in
// JavaScript to decide whether a slot was free, then wrote the file back. That
// is a read-then-write race: two requests can both read "free" before either
// writes, and both bookings land. Spec 8.3 calls for a database-level
// guarantee instead.
//
// This test fires N genuinely simultaneous create_booking() calls for the
// identical slot on separate connections and asserts that exactly one wins.
// If this ever fails, the exclusion constraint has been dropped or weakened
// and the floor can be double-booked.
//
// Usage:
//   node supabase/tests/concurrency.test.mjs "postgres://user:pw@host:port/db"

import pg from 'pg';

const CONN = process.argv[2] || process.env.DATABASE_URL;
if (!CONN) {
  console.error('Usage: node concurrency.test.mjs <postgres-connection-string>');
  process.exit(2);
}

const CONTENDERS = 20;
const COMPANY = 'cccccccc-0000-0000-0000-00000000c001';
const ADMIN = 'dddddddd-0000-0000-0000-00000000d001';

const admin = new pg.Client({ connectionString: CONN });
await admin.connect();

let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'pass' : 'FAIL'}: ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

// Children first: the FKs are ON DELETE RESTRICT by design.
async function teardown() {
  await admin.query(`delete from public.invoices where company_id = $1`, [COMPANY]);
  await admin.query(`delete from public.credit_entries where company_id = $1`, [COMPANY]);
  await admin.query(`delete from public.bookings where company_id = $1`, [COMPANY]);
  await admin.query(`delete from public.company_members where company_id = $1`, [COMPANY]);
  await admin.query(`delete from public.office_assignments where company_id = $1`, [COMPANY]);
  await admin.query(`delete from public.companies where id = $1`, [COMPANY]);
  await admin.query(`delete from public.notifications where profile_id = $1`, [ADMIN]);
  await admin.query(`delete from auth.users where id = $1`, [ADMIN]);
}

async function setup() {
  // Clear anything a previous aborted run left behind, so this is re-runnable.
  await teardown();
  await admin.query('begin');
  await admin.query(
    `insert into auth.users (id, email) values ($1, 'race-admin@techcorp.sa')
     on conflict (id) do nothing`, [ADMIN]);
  await admin.query(`update public.profiles set status = 'active' where id = $1`, [ADMIN]);
  await admin.query(
    `insert into public.companies (id, name, status) values ($1, 'Race Test Co', 'active')
     on conflict (id) do nothing`, [COMPANY]);
  // A current office assignment is what gives the company its contracted seats.
  await admin.query(
    `insert into public.office_assignments (resource_id, company_id, term, desk_count)
     select r.id, $1, daterange(current_date - 10, current_date + 350, '[)'), 8
     from public.resources r where r.slug = 'office-01' limit 1`, [COMPANY]);
  await admin.query(
    `insert into public.company_members
       (company_id, profile_id, role, status, can_book_rooms, can_view_invoices,
        can_submit_repairs, can_manage_employees)
     values ($1, $2, 'company_admin', 'active', true, true, true, true)
     on conflict (company_id, profile_id) do nothing`, [COMPANY, ADMIN]);
  await admin.query('commit');

  const { rows } = await admin.query(
    `select id from public.resources where slug = 'meeting-room-small'`);
  return rows[0].id;
}

async function attempt(i, resourceId, range) {
  const c = new pg.Client({ connectionString: CONN });
  await c.connect();
  try {
    await c.query(`set role authenticated`);
    await c.query(`select set_config('request.jwt.claim.sub', $1, false)`, [ADMIN]);
    // Everyone waits on the same advisory barrier, then races on release, so
    // the calls genuinely overlap instead of trickling in one at a time.
    await c.query('begin');
    await c.query(`select pg_advisory_xact_lock_shared(987654321)`);
    const { rows } = await c.query(
      `select reference from public.create_booking($1::uuid, $2::tstzrange, $3::uuid)`,
      [resourceId, range, COMPANY]);
    await c.query('commit');
    return { ok: true, reference: rows[0].reference };
  } catch (e) {
    try { await c.query('rollback'); } catch {}
    return { ok: false, code: e.code, message: e.message };
  } finally {
    await c.end();
  }
}

try {
  const resourceId = await setup();

  // A Tuesday well in the future, 10:00-12:00 Riyadh: outside the peak window
  // and not a Friday/Saturday, so the price is the plain base rate.
  const { rows: [{ range }] } = await admin.query(`
    select tstzrange(
      (date_trunc('week', now() at time zone 'Asia/Riyadh') + interval '35 days 10 hours')
        at time zone 'Asia/Riyadh',
      (date_trunc('week', now() at time zone 'Asia/Riyadh') + interval '35 days 12 hours')
        at time zone 'Asia/Riyadh'
    ) as range`);

  // Hold the barrier so every contender queues behind it.
  const gate = new pg.Client({ connectionString: CONN });
  await gate.connect();
  await gate.query('begin');
  await gate.query(`select pg_advisory_xact_lock(987654321)`);

  const pending = Array.from({ length: CONTENDERS }, (_, i) => attempt(i, resourceId, range));
  await new Promise(r => setTimeout(r, 400));   // let them all reach the barrier
  await gate.query('commit');                    // release: they race
  await gate.end();

  const results = await Promise.all(pending);
  const winners = results.filter(r => r.ok);
  const losers = results.filter(r => !r.ok);
  const exclusion = losers.filter(r => r.code === '23P01');

  console.log(`\n${CONTENDERS} concurrent create_booking() calls for one slot:`);
  console.log(`  succeeded: ${winners.length}`);
  console.log(`  rejected:  ${losers.length} (${exclusion.length} via exclusion constraint)`);
  if (losers.length && losers[0].message) {
    console.log(`  rejection message: ${losers[0].message.split('\n')[0]}`);
  }
  const otherCodes = [...new Set(losers.filter(r => r.code !== '23P01').map(r => `${r.code}: ${r.message?.split('\n')[0]}`))];
  if (otherCodes.length) console.log(`  other failures: ${otherCodes.join(' | ')}`);

  check(winners.length === 1, 'exactly one booking wins the race',
        `got ${winners.length}`);
  check(exclusion.length === CONTENDERS - 1,
        'every loser is rejected by the exclusion constraint (23P01)',
        `got ${exclusion.length} of ${CONTENDERS - 1}`);

  // The database is the arbiter, so confirm at the row level too.
  const { rows: live } = await admin.query(
    `select count(*)::int as n from public.bookings
      where resource_id = $1 and time_range && $2::tstzrange
        and status in ('hold','confirmed','checked_in','completed')`,
    [resourceId, range]);
  check(live[0].n === 1, 'exactly one live booking row exists for the slot',
        `found ${live[0].n}`);

  // A rolled-back attempt must not leave credit consumed or an invoice behind.
  const { rows: inv } = await admin.query(
    `select count(*)::int as n from public.invoices where company_id = $1`, [COMPANY]);
  check(inv[0].n <= 1, 'no orphan invoices from the losing attempts',
        `found ${inv[0].n}`);

  const { rows: cred } = await admin.query(
    `select count(*)::int as n from public.credit_entries
      where company_id = $1 and reason = 'booking'`, [COMPANY]);
  check(cred[0].n <= 1, 'no orphan credit consumption from the losing attempts',
        `found ${cred[0].n}`);

  // =========================================================================
  // Credit-ledger race.
  //
  // price_booking() reads the balance and create_booking() later writes the
  // negative ledger row. Under READ COMMITTED each concurrent transaction
  // takes its own snapshot, so without the per-company advisory lock they all
  // see the same hours available and all spend them - the ledger goes
  // negative and the allowance is given away several times over. The bookings
  // exclusion constraint does not help here: each booking is for a different
  // slot, so nothing arbitrates between them.
  // =========================================================================
  await admin.query(
    `insert into public.credit_entries (company_id, period, hours, reason, note)
     values ($1, public.credit_period(), 4, 'plan_allocation', 'Race test allocation')`,
    [COMPANY]);

  const { rows: [{ balance: opening }] } = await admin.query(
    `select public.credit_balance($1) as balance`, [COMPANY]);
  check(Number(opening) === 4, 'opening credit balance is 4 hours', `got ${opening}`);

  // Eight bookings of 1 hour each, on distinct non-overlapping slots so the
  // exclusion constraint never fires. Only 4 hours of credit exist.
  const { rows: [{ id: vcId }] } = await admin.query(
    `select id from public.resources where slug = 'meeting-room-large'`);

  const gate2 = new pg.Client({ connectionString: CONN });
  await gate2.connect();
  await gate2.query('begin');
  await gate2.query(`select pg_advisory_xact_lock(123456789)`);

  const spenders = Array.from({ length: 8 }, (_, i) => (async () => {
    const c = new pg.Client({ connectionString: CONN });
    await c.connect();
    try {
      await c.query(`set role authenticated`);
      await c.query(`select set_config('request.jwt.claim.sub', $1, false)`, [ADMIN]);
      await c.query('begin');
      await c.query(`select pg_advisory_xact_lock_shared(123456789)`);
      const { rows } = await c.query(
        `select credit_hours_used from public.create_booking(
           $1::uuid,
           tstzrange(now() + ($2 || ' days')::interval,
                     now() + ($2 || ' days')::interval + interval '1 hour'),
           $3::uuid)`,
        [vcId, String(60 + i), COMPANY]);
      await c.query('commit');
      return Number(rows[0].credit_hours_used);
    } catch (e) {
      try { await c.query('rollback'); } catch {}
      return { error: e.code };
    } finally {
      await c.end();
    }
  })());

  await new Promise(r => setTimeout(r, 400));
  await gate2.query('commit');
  await gate2.end();

  const spent = await Promise.all(spenders);
  const okSpends = spent.filter(v => typeof v === 'number');
  const totalCredit = okSpends.reduce((a, b) => a + b, 0);

  const { rows: [{ balance: closing }] } = await admin.query(
    `select public.credit_balance($1) as balance`, [COMPANY]);

  console.log(`
8 concurrent bookings against a 4-hour allowance:`);
  console.log(`  bookings created : ${okSpends.length}`);
  console.log(`  credit consumed  : ${totalCredit}`);
  console.log(`  closing balance  : ${closing}`);

  check(Number(closing) >= 0, 'credit balance never goes negative',
        `closed at ${closing}`);
  check(totalCredit === 4, 'exactly the 4 available hours were consumed',
        `consumed ${totalCredit}`);
  check(okSpends.length === 8, 'all 8 bookings still succeed (the overage is billed)',
        `got ${okSpends.length}`);

  // No period other than the current one should have been touched.
  const { rows: periods } = await admin.query(
    `select distinct period::text as p from public.credit_entries where company_id = $1`,
    [COMPANY]);
  check(periods.length === 1, 'credit stays within a single period',
        `touched ${periods.map(r => r.p).join(', ')}`);

  await teardown();
} finally {
  await admin.end();
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll concurrency checks passed');
process.exit(failures ? 1 : 0);
