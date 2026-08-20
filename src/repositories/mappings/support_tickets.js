/**
 * MAPPING: collection "support_tickets"  ->  public.support_tickets
 * ============================================================================
 *
 * The thread of replies is NOT a jsonb column: it lives in public.support_messages
 * (FK support_messages.ticket_id -> support_tickets.id) and is pulled in with a
 * PostgREST embed, then flattened to the old document's
 * `messages: [{ sender, text, time }]` array.
 *
 * Live columns (confirmed against information_schema on 2026-08-20):
 *   id uuid pk | reference text NOT NULL UNIQUE DEFAULT next_ticket_reference()
 *   company_id uuid -> companies | profile_id uuid -> profiles
 *   category text NOT NULL DEFAULT 'other' | priority text NOT NULL DEFAULT 'normal'
 *   status text NOT NULL DEFAULT 'open' | subject text NOT NULL | description text
 *   assigned_to uuid -> profiles | resolved_at timestamptz
 *   created_at timestamptz NOT NULL | updated_at timestamptz NOT NULL
 *   (updated_at is maintained by the support_tickets_touch BEFORE UPDATE trigger)
 *
 * NON-OBVIOUS RENAMES
 *   ticketNumber -> reference        (the DB default next_ticket_reference()
 *                                     fires only when ticketNumber is omitted)
 *   customerId   -> company_id       (a companies FK, not the member)
 *   userId       -> profile_id       (the member who raised the ticket)
 *   messages     -> support_messages rows
 *                                    (body/author_id/created_at -> text/sender/time)
 *   resolvedAt   -> resolved_at      (a real column, unlike resolutionNotes)
 *
 * KNOWN LOSSES - every document field with no column, listed so the follow-up
 * migration has an exact inventory:
 *   - `resolutionNotes`. SupportService.resolveTicket() passes it; there is no
 *     column for it. It is DROPPED on write and returned as null on read.
 *     A `resolution_notes text` column would fix this.
 *   - `messages` on WRITE. BaseRepository issues a single-table insert, so a
 *     nested support_messages insert is impossible here. To avoid destroying
 *     the member's actual complaint text - SupportService.createTicket() puts
 *     the description into messages[0].text and never sets `description` - the
 *     first message body is salvaged into `description` on create. The message
 *     rows themselves are not written; a service-level support_messages insert
 *     is the real fix. Documented, not silent.
 *   - `customerId` / `userId` values that are NOT canonical UUIDs. company_id
 *     and profile_id are real FKs; the legacy ids the services still default to
 *     ('usr-01') would raise 22P02. Such a value is dropped and the ticket is
 *     created unlinked rather than failing outright, because both columns are
 *     nullable. Note that findWhere({ customerId: 'usr-01' }) still raises
 *     22P02 - that error is deliberately not swallowed, it means the caller is
 *     holding a legacy id.
 *
 * VOCABULARIES - all three are CHECK-constrained, so an unmapped ERP label
 * would abort the insert. The ERP writes free-text labels ('IT & Internet',
 * 'General Support', 'Medium'), so each goes through an explicit table rather
 * than a blind toSnakeCase().
 *   status:   open, in_progress, waiting_on_member, resolved, closed
 *   priority: low, normal, high, urgent
 *   category: facilities, it_network, billing, membership, booking, other
 *
 * isDeleted is derived from status === 'closed', which is what softDelete
 * writes. There is deliberately NO activeFilter (README section 8): a closed
 * ticket must still appear in the ERP support list.
 */

import { put, isUuid, toSnakeCase, toTitleCase, riyadhParts } from './_helpers';

// ---------------------------------------------------------------- vocabulary

const TICKET_STATUSES = new Set([
  'open',
  'in_progress',
  'waiting_on_member',
  'resolved',
  'closed',
]);

/** ERP labels that are not simply the snake_case of the column value. */
const STATUS_ALIASES = {
  submitted: 'open',
  new: 'open',
  pending: 'open',
  active: 'open',
  waiting: 'waiting_on_member',
  waiting_on_customer: 'waiting_on_member',
  awaiting_member: 'waiting_on_member',
  in_review: 'in_progress',
  working: 'in_progress',
  done: 'resolved',
  completed: 'resolved',
};

const TICKET_PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);

const PRIORITY_ALIASES = {
  medium: 'normal', // the ERP's default priority; there is no 'medium' value
  moderate: 'normal',
  standard: 'normal',
  critical: 'urgent',
  blocker: 'urgent',
};

const TICKET_CATEGORIES = new Set([
  'facilities',
  'it_network',
  'billing',
  'membership',
  'booking',
  'other',
]);

const CATEGORY_ALIASES = {
  // IT
  it: 'it_network',
  it_support: 'it_network',
  'it_&_internet': 'it_network',
  'it_&_network': 'it_network',
  it_internet: 'it_network',
  internet: 'it_network',
  network: 'it_network',
  wifi: 'it_network',
  wi_fi: 'it_network',
  'wi_fi_&_network': 'it_network',
  // Facilities
  maintenance: 'facilities',
  cleaning: 'facilities',
  repair: 'facilities',
  repairs: 'facilities',
  hvac: 'facilities',
  // Money
  finance: 'billing',
  invoice: 'billing',
  invoices: 'billing',
  payment: 'billing',
  payments: 'billing',
  // Membership / bookings
  account: 'membership',
  plan: 'membership',
  bookings: 'booking',
  reservation: 'booking',
  meeting_room: 'booking',
  // Catch-alls
  general: 'other',
  general_support: 'other',
  general_enquiry: 'other',
  support: 'other',
};

/**
 * Column value -> the label the ERP shows. toTitleCase would render
 * 'it_network' as 'It Network', so the categories get an explicit table.
 * Chosen so a round trip is stable: 'IT & Network' -> it_network -> 'IT & Network'.
 */
const CATEGORY_LABELS = {
  facilities: 'Facilities',
  it_network: 'IT & Network',
  billing: 'Billing',
  membership: 'Membership',
  booking: 'Booking',
  other: 'Other',
};

function toTicketStatus(value) {
  const snake = toSnakeCase(value);
  if (!snake) return snake;
  if (TICKET_STATUSES.has(snake)) return snake;
  // An unrecognised status is passed through rather than coerced to 'open': the
  // CHECK constraint then rejects it loudly, which is far easier to notice than
  // a ticket that silently reopened itself.
  return STATUS_ALIASES[snake] || snake;
}

function toTicketPriority(value) {
  const snake = toSnakeCase(value);
  if (!snake) return snake;
  if (TICKET_PRIORITIES.has(snake)) return snake;
  return PRIORITY_ALIASES[snake] || snake;
}

function toTicketCategory(value) {
  const snake = toSnakeCase(value);
  if (!snake) return snake;
  if (TICKET_CATEGORIES.has(snake)) return snake;
  // The ERP's category list is open-ended free text while the column's CHECK is
  // not, and 'other' is exactly what the column means by an unrecognised
  // category, so this one DOES fall back instead of erroring.
  return CATEGORY_ALIASES[snake] || 'other';
}

// ------------------------------------------------------------------- helpers

/**
 * 'HH:MM' (24h, Asia/Riyadh) -> 'HH:MM AM/PM', the format the old documents
 * carry. The timezone conversion itself is riyadhParts() from ./_helpers - only
 * the 12-hour presentation happens here, so there is no second implementation
 * of Riyadh time in this directory.
 */
function riyadhClock(value) {
  if (!value) return null;
  const parts = riyadhParts(value instanceof Date ? value : new Date(value));
  if (!parts) return null;
  const [hh, mm] = parts.time.split(':');
  const hour = Number(hh);
  const suffix = hour < 12 ? 'AM' : 'PM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, '0')}:${mm} ${suffix}`;
}

/**
 * Assign a uuid foreign key.
 *   undefined     -> not mentioned, skip (the partial-update rule)
 *   null          -> clear the column
 *   a uuid        -> set it
 *   anything else -> DROPPED. A legacy id such as 'usr-01' is not a uuid and
 *                    would raise 22P02; both columns are nullable, so an
 *                    unlinked ticket beats a failed insert. Known loss, see
 *                    the header.
 */
function putUuidFk(row, column, value) {
  if (value === undefined) return;
  if (value === null || isUuid(value)) row[column] = value ?? null;
}

/** support_messages rows -> the old `messages: [{ sender, text, time }]`. */
function toMessages(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .slice()
    // PostgREST cannot order an embedded resource from the select list, so the
    // thread is ordered here. A ticket holds a handful of messages.
    .sort((a, b) => String(a?.created_at ?? '').localeCompare(String(b?.created_at ?? '')))
    .map((m) => ({
      id: m?.id ?? null,
      // `sender` is a display name in the old documents; author_id is a
      // profiles FK. Fall back to the side of the conversation when the author
      // is null (deleted profile, or a message written by an automation).
      sender: m?.author?.full_name ?? (m?.is_internal ? 'Staff' : 'Member'),
      authorId: m?.author_id ?? null,
      text: m?.body ?? '',
      time: riyadhClock(m?.created_at),
      internal: m?.is_internal === true,
      createdAt: m?.created_at ?? null,
    }));
}

// ------------------------------------------------------------------- mapping

const mapping = {
  table: 'support_tickets',

  /**
   * Two separate FKs point at profiles (profile_id and assigned_to), so the
   * reporter embed must name its constraint or PostgREST cannot disambiguate.
   * All whitespace is stripped: PostgREST's select parameter does not accept
   * spaces, and no alias here contains one.
   */
  selectColumns: `
    *,
    company:companies(id,name,name_ar),
    profile:profiles!support_tickets_profile_id_fkey(id,full_name,full_name_ar,email),
    messages:support_messages(id,body,is_internal,author_id,created_at,
      author:profiles(id,full_name))
  `.replace(/\s+/g, ''),

  idColumn: 'id',
  defaultOrder: { column: 'created_at', ascending: false },

  /**
   * Document field -> column equality, for BaseRepository#findWhere.
   * Covers SupportRepository.findByCustomer(customerId).
   */
  filters: {
    customerId: 'company_id',
    userId: 'profile_id',
    profileId: 'profile_id',
    ticketNumber: 'reference',
    assignedTo: 'assigned_to',
    status: { column: 'status', toColumn: toTicketStatus },
    priority: { column: 'priority', toColumn: toTicketPriority },
    category: { column: 'category', toColumn: toTicketCategory },
  },

  // A closed ticket is "deleted" for the member but stays in the ERP list, so
  // no activeFilter is declared (README section 8).
  softDelete: { column: 'status', value: 'closed' },

  toDocument(row) {
    if (!row) return null;
    return {
      id: row.id,
      ticketNumber: row.reference ?? null,

      // customerId is the company; userId is the member who raised the ticket.
      customerId: row.company_id ?? null,
      userId: row.profile_id ?? null,
      // The old documents carried a person's name here, so the reporter's
      // profile wins over the company name.
      customerName: row.profile?.full_name ?? row.company?.name ?? null,
      customerNameAr: row.profile?.full_name_ar ?? row.company?.name_ar ?? null,
      customerEmail: row.profile?.email ?? null,
      companyName: row.company?.name ?? null,

      subject: row.subject ?? '',
      description: row.description ?? null,
      category: CATEGORY_LABELS[row.category] ?? toTitleCase(row.category),
      priority: toTitleCase(row.priority),
      status: toTitleCase(row.status),

      assignedTo: row.assigned_to ?? null,
      resolvedAt: row.resolved_at ?? null,
      // No column. Always null; see the known losses in the header.
      resolutionNotes: null,

      messages: toMessages(row.messages),

      // Synthesised: soft delete is the 'closed' status, so deriving it keeps a
      // round trip honest rather than returning a constant false.
      isDeleted: row.status === 'closed',
      createdAt: row.created_at ?? null,
      updatedAt: row.updated_at ?? null,
    };
  },

  toRow(doc, mode) {
    const row = {};
    if (!doc) return row;

    put(row, 'reference', doc.ticketNumber);
    putUuidFk(row, 'company_id', doc.customerId);
    putUuidFk(row, 'profile_id', doc.profileId !== undefined ? doc.profileId : doc.userId);
    putUuidFk(row, 'assigned_to', doc.assignedTo);

    put(row, 'subject', doc.subject);
    put(row, 'description', doc.description);
    put(row, 'category', doc.category, toTicketCategory);
    put(row, 'priority', doc.priority, toTicketPriority);
    put(row, 'status', doc.status, toTicketStatus);
    put(row, 'resolved_at', doc.resolvedAt);

    // DROPPED by design: `resolutionNotes` has no column, and `messages` are
    // rows in another table that a single-table insert cannot reach. Both are
    // listed in the header.

    if (mode === 'create') {
      // subject is NOT NULL with no default. Naming the field beats a bare
      // 23502 from Postgres.
      if (row.subject === undefined || row.subject === null || row.subject === '') {
        throw new Error(
          'support_tickets: `subject` is required to create a ticket ' +
            '(public.support_tickets.subject is NOT NULL with no default).'
        );
      }
      // Salvage the member's text so the first message is not lost outright.
      if (row.description === undefined) {
        const first = Array.isArray(doc.messages) ? doc.messages[0] : null;
        if (first && typeof first.text === 'string' && first.text.trim()) {
          row.description = first.text;
        }
      }
      // category / priority / status all have column defaults
      // ('other' / 'normal' / 'open'), so an omitted one is fine and is NOT
      // forced here.
    }

    return row;
  },
};

export default mapping;
