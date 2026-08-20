# Repository mapping modules — the contract

`BaseRepository` (../BaseRepository.js) knows how to select, insert, update and
soft-delete rows. It knows nothing about any particular table. Everything
table-shaped lives in **one module per collection in this directory**.

The services in `src/services/` were written against the old JSON store
(`src/data/db.json`). Their documents are **camelCase and flat**. Postgres is
**snake_case, normalised, and has no `isDeleted` column anywhere**. A mapping
module is the translator between those two worlds, in both directions.

> **Read this whole file before writing a mapping.** The four agents writing
> these modules are working in parallel on the same contract; anything you
> invent locally will not compose with the others.

---

## 1. Module shape

Every module in this directory has a **default export** of one plain object.

```js
import { put, num, toTitleCase, toSnakeCase } from './_helpers';

const mapping = {
  // ---- identity -----------------------------------------------------------

  /** REQUIRED. The Postgres table this collection lives in. */
  table: 'invoices',

  /** Optional. PostgREST select list. Default '*'. Use this to embed related
   *  rows (see §7). */
  selectColumns: '*',

  /** Optional. Primary key column. Default 'id'. */
  idColumn: 'id',

  /** Optional. Applied to every findAll/findWhere unless the caller overrides
   *  it. Default is nothing; almost every mapping should set created_at desc,
   *  because the old store unshifted new documents and the ERP lists assume
   *  newest-first. Set `null` for a table with no created_at. */
  defaultOrder: { column: 'created_at', ascending: false },

  // ---- reads --------------------------------------------------------------

  /** REQUIRED. row -> the camelCase document the services expect. Pure, total,
   *  and never throws: it runs over every row of the table. Return null to drop
   *  a row from the result set. */
  toDocument(row) { /* ... */ },

  // ---- writes -------------------------------------------------------------

  /** REQUIRED. document -> row.
   *  `mode` is 'create' or 'update'. In 'update' mode the document is a PARTIAL
   *  patch and you must emit ONLY the columns whose fields are present.
   *  See §3 — this is the single most common way to get a mapping wrong. */
  toRow(doc, mode) { /* ... */ },

  /** Optional. Columns that must never appear in an INSERT/UPDATE payload,
   *  e.g. GENERATED columns. Postgres raises 428C9 if you name one, even when
   *  you set it to the value it already has. */
  readOnlyColumns: ['is_low_stock'],

  // ---- filtering ----------------------------------------------------------

  /** Optional but strongly encouraged. Document field -> column equality, used
   *  by BaseRepository#findWhere to push a comparison into Postgres.
   *  A bare string is shorthand for { column: '<string>' }.
   *  `toColumn` translates the VALUE when the two vocabularies differ. */
  filters: {
    customerId: 'company_id',
    status: { column: 'status', toColumn: (v) => String(v).toLowerCase() },
  },

  /** Optional. The replacement for the old `!item.isDeleted` list filter.
   *  Receives the PostgREST query builder, returns it narrowed.
   *  Set it ONLY when the soft-delete target genuinely means "gone from the ERP
   *  list" — see §5, and the per-collection table in §8. */
  activeFilter: (q) => q.eq('is_active', true),

  // ---- delete -------------------------------------------------------------

  /** REQUIRED, may be null. What `isDeleted = true` becomes. Either:
   *    { column, value }                       — a single-column patch
   *    async ({ id, repository, client, mapping }) => document|null
   *    null                                    — this table cannot be
   *                                              soft-deleted; softDelete()
   *                                              throws using softDeleteReason
   */
  softDelete: { column: 'status', value: 'void' },

  /** Required when softDelete is null. Goes into the thrown error, so write the
   *  actual reason, not "not supported". */
  softDeleteReason: 'audit_log is append-only; entries are never removed',
};

export default mapping;
```

Register nothing yourself: `./index.js` already imports all fourteen modules by
filename. Replace the stub file in place, keep the default export, and **delete
the `stub: true` flag** — while it is present every repository call for that
collection throws "not yet implemented" instead of returning wrong data.

---

## 2. Naming convention

| Side | Convention | Example |
| --- | --- | --- |
| Document (what services read/write) | `camelCase`, flat, Title Case enum values | `customerId`, `startTime`, `status: 'Checked-In'` |
| Row (what Postgres stores) | `snake_case`, normalised, lowercase snake enum values | `company_id`, `time_range`, `status: 'checked_in'` |

Mechanical rules:

* `camelCase` ⇄ `snake_case` for names that survived unchanged
  (`customerName` ⇄ `customer_name`).
* Enum-ish strings are **Title Case in documents, lowercase snake in Postgres**.
  Use `toTitleCase` / `toSnakeCase` from `./_helpers`, never a hand-rolled
  `.toLowerCase()` chain, so `'Checked-In'` ⇄ `'checked_in'` behaves the same in
  every mapping.
* Postgres `numeric` arrives over PostgREST as a **string**. Every money and
  quantity field must go through `num()` or the UI will concatenate instead of
  adding.
* `text[]` columns arrive as real JS arrays. Default them to `[]`, never `null`
  — pages do `.map()` on them.
* Several document names have **no mechanical relationship** to their column.
  Those are listed per collection in §8. Do not guess; confirm with
  `mcp__supabase__execute_sql` against `information_schema.columns`.

---

## 3. Partial updates — the rule that breaks things

`BaseRepository#update(id, updates)` passes the caller's **partial** document to
`toRow(doc, 'update')`. Services patch two or three fields:

```js
invoiceRepository.update(id, { status: 'Paid', paymentMethod: 'Mada', paidAt: ts });
```

If `toRow` builds a full row object, every unmentioned column is sent as
`undefined` → dropped by BaseRepository → fine, **or** as `null` → and you have
just wiped the invoice's company, dates and totals.

So: **never write `row.x = doc.x` unconditionally.** Use `put()`, which assigns
only when the value is not `undefined`:

```js
import { put } from './_helpers';

function toRow(doc, mode) {
  const row = {};
  put(row, 'company_id', doc.customerId);
  put(row, 'status', doc.status, toSnakeCase);      // transform runs only on
  put(row, 'total', doc.total, Number);             // non-null values
  put(row, 'paid_at', doc.paidAt);

  if (mode === 'create') {
    // Columns that are NOT NULL with no default must be present on insert.
    row.due_date ??= doc.dueDate ?? todayInRiyadh();
  }
  return row;
}
```

`put(row, col, null)` **does** assign `null` — clearing a column is a legitimate
patch. Only `undefined` means "not mentioned".

Other write rules BaseRepository already handles for you, so do not duplicate
them:

* **Ids.** Do not emit `id`. BaseRepository strips any `id` that is not a
  canonical UUID (the old store used `'inv-2026-001245'`) and lets the database
  assign one.
* **Timestamps.** Do not emit `created_at` / `updated_at`. They are column
  defaults and `touch_updated_at` triggers.
* **`isDeleted` / `deletedAt`.** No such columns exist. Never emit them.
* **Generated columns.** List them in `readOnlyColumns`; BaseRepository deletes
  them from the payload.

---

## 4. `toDocument` must be total

`toDocument` runs over every row the table holds, including rows written by the
mobile app, by triggers, and by seed scripts — not just rows your `toRow`
produced. It must never throw on a null column and never assume a relation was
embedded.

```js
toDocument(row) {
  if (!row) return null;
  return {
    id: row.id,
    customerId: row.company_id ?? null,
    customerName: row.company?.name ?? row.guest_name ?? 'Guest',
    total: num(row.total) ?? 0,
    items: row.line_items ?? [],
    isDeleted: false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

Every document must carry, at minimum: `id`, `isDeleted`, `createdAt`,
`updatedAt`. Services persist whole documents into audit `beforeState` /
`afterState`, and pages read `createdAt`.

---

## 5. How `isDeleted` is synthesised

The old store carried `isDeleted: boolean` on every document, `findAll` filtered
it out, and `softDelete` set it. Postgres has **no such column on any table** —
soft delete was dropped in favour of real foreign keys and a lifecycle `status`.

Three separate things have to be reproduced:

**(a) The document field.** `toDocument` always sets `isDeleted`. For most
collections it is a constant `false` — the row exists, so it is not deleted. For
a collection whose soft delete is a status, derive it so a round-trip is honest:

```js
isDeleted: row.status === 'retired',            // inventory
isDeleted: row.is_active === false,             // contract_templates
```

**(b) The list filter.** The old `findAll` dropped deleted documents.
`activeFilter` is the replacement, and it is pushed into SQL. **Set it only when
"deleted" really means "should vanish from the ERP list."** A cancelled booking,
a voided invoice and a lost lead must all still appear in their ERP lists, so
those collections set `activeFilter: undefined`. The per-collection decision is
in §8; do not deviate from it without saying so in the module's header comment.

**(c) The write.** `softDelete: { column, value }`. If the table genuinely has
no soft-delete concept — append-only ledgers — set `softDelete: null` and give a
real `softDeleteReason`. `BaseRepository#softDelete` then throws. **Do not
"handle" it by returning success:** a delete button that reports success and
changes nothing is worse than one that errors.

---

## 6. `time_range` ⇄ `date` / `startTime` / `endTime` (bookings, events)

`public.bookings` has **no `date`, `start_time` or `end_time` columns.** It has a
single `time_range tstzrange`, guarded by `CHECK (lower(time_range) <
upper(time_range))` and by the no-overlap exclusion constraint. The old booking
document had three flat fields, and BookingService, NotificationService,
ActivityService and every ERP calendar view still read them.

**Times are rendered in `Asia/Riyadh`, which is UTC+3 all year — Saudi Arabia
observes no daylight saving.** Never use the server's local zone; Vercel runs in
UTC and would shift every booking three hours.

Use the helpers. Do not re-derive this arithmetic in a mapping.

### Read (row → document)

```js
import { timeRangeToDocumentFields } from './_helpers';

const { date, startTime, endTime, duration } = timeRangeToDocumentFields(row.time_range);
// '["2026-08-25 07:00:00+00","2026-08-25 09:00:00+00")'
//   -> { date: '2026-08-25', startTime: '10:00', endTime: '12:00', duration: 2 }
```

* PostgREST serialises the range as `["<ts>","<ts>")` with a **space** instead of
  `T` and a bare `+00` offset. Neither is ISO 8601; the helper normalises both.
* `date` comes from the **start** of the range. A booking that crosses midnight
  keeps the day it began on, which is what the ERP day view expects.
* `duration` is fractional hours (`2`, `1.5`), matching the old `duration` field.
* An unbounded or unparseable range yields all-null fields rather than throwing.

### Write (document → row)

```js
import { buildTimeRange } from './_helpers';

if (doc.date !== undefined || doc.startTime !== undefined || doc.endTime !== undefined) {
  row.time_range = buildTimeRange(doc.date, doc.startTime, doc.endTime);
}
```

* Produces `["2026-08-25T10:00:00+03:00","2026-08-25T12:00:00+03:00")` —
  half-open `[)`, matching every existing row and the exclusion constraint: a
  booking ending at 12:00 does not conflict with one starting at 12:00.
* An `endTime` at or before `startTime` is treated as crossing midnight and
  rolls the end to the next day, so `22:00–01:00` produces a valid range instead
  of tripping `bookings_time_valid`.
* It throws if any of the three parts is missing. **On an update that touches
  only one of them, read the current row first and fill in the other two** — the
  range is a single column and a partial rebuild would silently move the other
  edge. `buildTimeRange` cannot do this for you; it has no row.

---

## 7. Embedding related rows

Several documents flatten a join (`customerName`, `resourceName`, `branchId` as
a slug). Use PostgREST embedding in `selectColumns` rather than an N+1 loop in
`toDocument`:

```js
selectColumns: `
  *,
  company:companies(id,name,name_ar),
  resource:resources(id,slug,name,name_ar,category,floor),
  line_items:invoice_line_items(description,quantity,unit_price,line_total)
`.replace(/\s+/g, ' '),
```

Embedding requires a real foreign key, which every relation named in §8 has. The
embedded key is whatever you alias it to, so `toDocument` reads `row.company?.name`.
Guard every embed with `?.` — a row whose FK is null embeds as `null`.

Note that `activeFilter`, `defaultOrder` and `findWhere` all still work with an
embedded select; they operate on the base table's columns.

---

## 8. The fourteen collections

Collection keys are what `src/repositories/index.js` passes to
`new BaseRepository(...)`. They are **not** table names.

| Collection | Table | `softDelete` | `activeFilter` |
| --- | --- | --- | --- |
| `bookings` | `bookings` | `status = 'cancelled'` (also set `cancelled_at`; use the function form) | none — cancelled bookings stay in the ERP list |
| `resources` | `resources` | `status = 'retired'` | `q.neq('status','retired')` |
| `users` | `profiles` | `status = 'suspended'` | none — suspended members stay listed |
| `invoices` | `invoices` | `status = 'void'` | none — voided invoices stay in finance |
| `contracts` | `contracts` | `status = 'terminated'` | none |
| `contract_templates` | `contract_templates` | `is_active = false` | `q.eq('is_active', true)` |
| `contract_versions` | `contract_versions` | `null` — append-only version history | none |
| `customers` | `companies` | `status = 'churned'` | none |
| `crm_leads` | `leads` | `status = 'lost'` | none — lost leads stay in the pipeline |
| `inventory` | `inventory` | `status = 'retired'` | `q.neq('status','retired')` |
| `support_tickets` | `support_tickets` | `status = 'closed'` | none |
| `activities` | `audit_log` | `null` — append-only | `q.like('action','activity:%')` |
| `audit_logs` | `audit_log` | `null` — append-only | `q.not('action','like','activity:%')` |
| `notifications` | `notifications` | `null` — no lifecycle column exists (see below) | none |

### Non-obvious field ⇄ column pairs

Confirm every one of these against the live schema before you use it.

**bookings** — `customerId` → `company_id`; `customerName`/`customerEmail` →
`guest_name`/`guest_email` **or** the embedded company/profile;
`vat` → `vat_amount`; `totalAmount` → `total`; `date`/`startTime`/`endTime` →
`time_range` (§6). `paymentStatus` has **no column** — synthesise it (`'Pending'`
until the linked invoice says otherwise) and drop it on write.
Status vocabulary: `hold, requested, quoted, confirmed, checked_in, cancelled,
declined, expired, no_show, completed`.

**resources** — `size` → `size_sqm`; `image` → `hero_image`; `loc` → `location`;
`gallery` → the separate `resource_photos` table (embed it). Status vocabulary:
`available, occupied, maintenance, retired`. Category vocabulary: `meeting_room,
community_hall, private_office, focus_pod, hot_desk, dedicated_desk`. There is
an existing, working row→document adapter for this exact table in
`src/lib/supabase/mappers.js#mapResource` — reuse its decisions.

**users** — `name` → `full_name`; `nameAr` → `full_name_ar`. `company` has **no
column on profiles**; it comes from `company_members` → `companies`. `membership`
does not exist. Status vocabulary: `invited, active, suspended`.

**invoices** — `customerId` → `company_id`; `type` → `kind` (`booking,
membership, addon, deposit, other`); `date` → `issue_date`; `amount`/`total` →
`total`; `vat` → `vat_amount`; `items` → the `invoice_line_items` table.
`companyName` comes from the embedded company. `remindersSent` has **no column**
— synthesise `{ advance7d: false, post48h: false }` on read and drop it on
write, or note the loss in the module header. Status vocabulary: `draft, unpaid,
partially_paid, paid, overdue, void`. `CHECK (total = subtotal + vat_amount)` is
enforced, so writes must be internally consistent.

**contracts** — `contractNumber` → `reference`; `customerId` → `company_id`;
`startDate`/`endDate` → `starts_on`/`ends_on`; `monthlyFee` → `monthly_rate`.
Status vocabulary: `draft, sent, signed, active, expiring, terminated, expired`
(the ERP's `'Sent to Customer'` is `sent`).
**⚠ Known gap, flag it, do not paper over it:** the live table has **no**
`version`, `content`, `content_ar`, `template_id`, `template_name`,
`customer_name`, `company_name`, `workspace_id`, `workspace_name`,
`office_number`, `plan_name`, `vat`, `total`, `parking_spaces`, `locker_unit`,
`meeting_credits`, `signatory_name`, `signatory_ip`, `signatory_user_agent`,
`signature_method`, `signature_data`, `signature_hash`, `counter_signed_by`,
`counter_signed_at` or `sent_at` columns — all of which `ContractService` writes.
Derive what you can (`version` = `max(contract_versions.version)` via an embed;
`content` = the latest `contract_versions.content`), return the rest as `null`,
drop them on write, and list every dropped field in the module's header comment
so the follow-up migration has an exact inventory. `company_id`, `branch_id`,
`starts_on` and `monthly_rate` are all NOT NULL with no default, so an insert
must supply them.

**contract_templates** — `bodyAr` → `body_ar`. The db.json ids (`'tpl-office'`)
map onto `slug`. Category vocabulary: `private_office, dedicated_desk, hot_desk,
coworking, meeting_room, virtual_office, custom` (`'Private Office'` →
`private_office`).

**contract_versions** — `contractId` → `contract_id`; `createdBy` is a free-text
actor label in the ERP (`'Sales Executive'`) and goes to `created_by_name`, not
to `created_by` (which is a `profiles` FK — set it only when the actor is a UUID).
`UNIQUE (contract_id, version)`.

**customers** → `companies` — `companyName`/`name` → `name`; `email` →
`billing_email`. Status vocabulary: `prospect, active, suspended, churned`.

**crm_leads** → `leads` — `name` → `full_name`; `company` → `company_name`;
`notes` → `message`; **`stage` → `status`** with a different vocabulary:
`Leads`→`new`, `Contacted`→`contacted`, `Proposal Sent`→`qualified`,
`Won`→`converted`, plus `lost`. `CrmService.getPipeline()` groups on the document
`stage`, so `toDocument` must map back to the four Title Case stage names the UI
buckets by. `value` and `contact` have **no columns** — synthesise on read
(`value: 0`), drop on write, and note the loss.

**inventory** — `minStock` → `min_stock`; `cost` → `unit_cost`; `branch` (a name,
`'Jeddah'`) → `branch_id` (a UUID; resolve via `branches.slug`). `is_low_stock` is
**GENERATED** — put it in `readOnlyColumns`; naming it in a write raises 428C9.
Category vocabulary: `electronics, furniture, pantry, office_supplies,
maintenance, other`. `status` is lifecycle (`active, on_order, discontinued,
retired`), **not** stock level.

**support_tickets** — `ticketNumber` → `reference`; `customerId` → `company_id`;
`messages` → the `support_messages` table (embed `support_messages(...)` and map
`body`/`author_id`/`created_at` to the document's `text`/`sender`/`time`);
`resolutionNotes` has **no column**. Status vocabulary: `open, in_progress,
waiting_on_member, resolved, closed`. Priority: `low, normal, high, urgent`.
Category: `facilities, it_network, billing, membership, booking, other`.

**activities** and **audit_logs** both project `public.audit_log`
(`id, actor_id, action, table_name, record_id, before, after, created_at`).
Note `id` is **bigint**, not uuid — `toDocument` should return `String(row.id)`
so documents stay string-keyed; `findById` with that string still matches.
There is no `updated_at`; return `createdAt` for both.

* The ERP's free-text `actor` (`'Sales Executive'`) and `ip` have no columns.
  Persist them in an envelope and unwrap on read, so nothing is lost:
  `after := { state: afterState ?? null, actor, ip }`,
  `before := { state: beforeState ?? null }`. On read, fall back for rows written
  by anything else: `row.after?.state ?? row.after ?? null`.
* `audit_logs`: `module` → `table_name`, `entityId` → `record_id`,
  `action` → `action`.
* `activities`: write `action` as `` `activity:${type}` `` and keep the timeline
  payload (`title`, `titleAr`, `desc`, `descAr`, `time`, `actor`) in the `after`
  envelope. That prefix is what the two `activeFilter`s in the table above use to
  keep the timeline and the audit trail from reading each other's rows. Keep the
  prefix exactly as written — the two mappings must agree.

**notifications** — `userId` → `profile_id`; `message` → `body`;
`read` → `read_at != null`; `title`/`titleAr` are direct. `kind` is NOT NULL with
a CHECK (`booking_confirmed, booking_reminder, booking_cancelled, invoice_issued,
invoice_overdue, repair_update, event_reminder, employee_invited,
contract_expiring, announcement`) — derive it from the caller's intent and
default to `announcement`. `channel`, `status`, `recipient` and `timestamp` have
**no columns**; synthesise on read, drop on write. There is no `updated_at`.
**⚠ Known gap:** `profile_id` is NOT NULL and a `profiles` FK, but
`NotificationService` passes `booking.customerId`, which for a guest booking is
the literal `'usr-guest'`. That insert cannot succeed. Do **not** silently
swallow it — throw a clear error naming the field, and report the gap so the
caller (or a follow-up migration allowing guest notifications) can be fixed.

---

## 9. Helpers available

From `./_helpers` — all verified against live rows:

| Helper | Purpose |
| --- | --- |
| `put(row, column, value, transform?)` | Assign only when `value !== undefined`; the partial-update primitive (§3) |
| `num(value)` | PostgREST numeric string → number, `null`-safe |
| `toTitleCase(v)` / `toSnakeCase(v)` | `'in_progress'` ⇄ `'In Progress'`, `'Checked-In'` → `'checked_in'` |
| `timeRangeToDocumentFields(range)` | `tstzrange` → `{ date, startTime, endTime, duration }` in Riyadh |
| `buildTimeRange(date, start, end)` | the inverse, half-open, midnight-safe |
| `parseTstzRange(range)` / `riyadhParts(date)` | the lower-level pieces, if you need them |
| `toDateOnly(value)` | `timestamptz` → `'YYYY-MM-DD'` in Riyadh |
| `isUuid(value)` | guard before writing a UUID FK from a legacy string id |
| `RIYADH_TZ`, `RIYADH_OFFSET` | `'Asia/Riyadh'`, `'+03:00'` |

`_helpers.js` is owned by the BaseRepository author. If you need something added,
add it there rather than copying an implementation into a mapping — two mappers
disagreeing about Riyadh time is precisely the bug this file exists to prevent.

---

## 10. Before you call a mapping done

1. `stub: true` is deleted from the module.
2. `toDocument(row)` returns `id`, `isDeleted`, `createdAt`, `updatedAt` and every
   field the services in `src/services/` actually read for that collection. Grep
   the service; do not guess.
3. `toRow(doc, 'update')` on a two-field patch emits exactly two columns. Test it:
   `console.log(mapping.toRow({ status: 'Paid' }, 'update'))`.
4. `toRow` emits no `id`, no `created_at`/`updated_at`, no `isDeleted`, and no
   generated column.
5. Every enum value written satisfies its `CHECK` constraint. Every NOT NULL
   column with no default is set in `'create'` mode.
6. `filters` covers every equality the finders in `src/repositories/index.js`
   use for this collection.
7. Any document field with no column is listed in the module's header comment as
   a known loss. **Silent loss is the failure mode this whole layer exists to
   avoid.**
8. Verify against the live database, not against this document:
   `mcp__supabase__execute_sql` with
   `select column_name, data_type, is_nullable, column_default from
   information_schema.columns where table_schema='public' and table_name='…'`.
