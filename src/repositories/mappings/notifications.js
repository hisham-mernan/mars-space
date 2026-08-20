/**
 * MAPPING: collection "notifications"  ->  public.notifications
 * ============================================================================
 *
 * Live columns (confirmed against information_schema on 2026-08-20):
 *   id uuid pk DEFAULT gen_random_uuid()
 *   profile_id uuid NOT NULL -> profiles(id) ON DELETE CASCADE
 *   kind text NOT NULL CHECK (booking_confirmed, booking_reminder,
 *        booking_cancelled, invoice_issued, invoice_overdue, repair_update,
 *        event_reminder, employee_invited, contract_expiring, announcement)
 *   title text NOT NULL | title_ar text | body text | body_ar text
 *   link text | read_at timestamptz | created_at timestamptz NOT NULL
 *
 * There is NO updated_at column, and no lifecycle/archived column at all.
 *
 * NON-OBVIOUS RENAMES
 *   userId    -> profile_id
 *   message   -> body        (messageAr -> body_ar)
 *   read      -> read_at IS NOT NULL   (a timestamp, not a boolean)
 *   title / titleAr are direct (title, title_ar).
 *
 * KNOWN LOSSES - document fields NotificationService writes that have no
 * column. All are dropped on write and synthesised on read:
 *   - `channel` ('In-App' / 'Email'). No column. Read always reports 'In-App',
 *     because public.notifications IS the in-app inbox; e-mail delivery is a
 *     separate concern with no row here. A `channel text` column would fix it.
 *   - `status` ('Sent'). No column. Synthesised as 'Read' / 'Sent' from
 *     read_at, which is the only delivery state the table records.
 *   - `recipient` (a display name). No column, but recoverable: the embedded
 *     profile's full_name is returned instead of null.
 *   - `timestamp`. No column; created_at is returned under both `timestamp` and
 *     `createdAt`, and dropped on write (created_at has a DEFAULT now()).
 *   - `updatedAt` has no column either; created_at is returned so that every
 *     document satisfies the minimum shape in README section 4.
 *
 * KNOWN GAP - profile_id is NOT NULL and a real profiles FK, but
 * NotificationService.sendNotification() forwards booking.customerId, which for
 * a guest booking is the literal string 'usr-guest'. That insert CANNOT
 * succeed. toRow therefore throws a message naming the field rather than
 * letting Postgres raise an opaque 23502/22P02, and rather than silently
 * dropping the notification. Fixing it needs either a real profile id from the
 * caller or a migration that allows guest notifications (nullable profile_id
 * plus a guest_email column). Note that EventBus.publish() catches handler
 * errors and console.errors them, so a guest booking still completes - the
 * notification is what fails, loudly, in the log.
 *
 * kind is NOT NULL with a CHECK and NotificationService never supplies it, so
 * it is derived; see toNotificationKind() below.
 *
 * softDelete is null: there is no lifecycle column to move a notification to.
 * read_at records only that it was read, which is not deletion. isDeleted is
 * therefore the constant false - the row exists, so it is not deleted.
 *
 * Note on updates: the notifications_guard BEFORE UPDATE trigger rejects any
 * change to kind/title/body/link/profile_id for an end-user JWT. Repositories
 * run as service_role (auth.uid() is null), which the guard lets through, so
 * staff-side edits work; a member-side edit would not.
 */

import { put, isUuid, toSnakeCase } from './_helpers';

// ---------------------------------------------------------------- vocabulary

/** Exactly the values in notifications_kind_check. */
const NOTIFICATION_KINDS = new Set([
  'booking_confirmed',
  'booking_reminder',
  'booking_cancelled',
  'invoice_issued',
  'invoice_overdue',
  'repair_update',
  'event_reminder',
  'employee_invited',
  'contract_expiring',
  'announcement',
]);

/** Coarse labels the ERP uses ('booking', 'finance') -> a real kind. */
const KIND_ALIASES = {
  booking: 'booking_confirmed',
  bookings: 'booking_confirmed',
  reservation: 'booking_confirmed',
  finance: 'invoice_issued',
  invoice: 'invoice_issued',
  invoices: 'invoice_issued',
  billing: 'invoice_issued',
  payment: 'invoice_issued',
  overdue: 'invoice_overdue',
  contract: 'contract_expiring',
  event: 'event_reminder',
  events: 'event_reminder',
  community: 'announcement',
  repair: 'repair_update',
  maintenance: 'repair_update',
  invite: 'employee_invited',
  invitation: 'employee_invited',
  general: 'announcement',
  system: 'announcement',
};

/**
 * The three buckets the member inbox filters by ('booking' / 'finance' /
 * 'community'). Derived from kind on read; there is no `category` column and
 * nothing writes one.
 */
function kindToCategory(kind) {
  if (!kind) return 'community';
  if (kind.startsWith('booking_')) return 'booking';
  if (kind.startsWith('invoice_') || kind === 'contract_expiring') return 'finance';
  return 'community';
}

/**
 * kind is NOT NULL with a CHECK and NotificationService supplies no kind at
 * all, so it has to be derived from the caller's intent:
 *
 *   1. an explicit doc.kind / doc.type / doc.category, if it names a real kind
 *      (directly or through KIND_ALIASES);
 *   2. otherwise a keyword read of the title and message the caller wrote -
 *      NotificationService's two subscribers produce 'Booking Confirmation
 *      Pass' and 'Invoice #... Issued', which is the only signal available;
 *   3. otherwise 'announcement', the catch-all in the CHECK list.
 *
 * Step 2 is a heuristic and is the part to delete once NotificationService
 * passes an explicit `kind`.
 */
function toNotificationKind(doc) {
  const explicit = doc.kind ?? doc.type ?? doc.category;
  if (explicit) {
    const snake = toSnakeCase(explicit);
    if (NOTIFICATION_KINDS.has(snake)) return snake;
    if (KIND_ALIASES[snake]) return KIND_ALIASES[snake];
  }

  const text = `${doc.title ?? ''} ${doc.message ?? ''}`.toLowerCase();
  const mentionsBooking = /booking|reservation|meeting room|workspace/.test(text);
  if (mentionsBooking && /cancel/.test(text)) return 'booking_cancelled';
  if (mentionsBooking && /remind|upcoming|tomorrow/.test(text)) return 'booking_reminder';
  if (mentionsBooking) return 'booking_confirmed';
  if (/overdue|past due|unpaid/.test(text)) return 'invoice_overdue';
  if (/invoice|payment|receipt/.test(text)) return 'invoice_issued';
  if (/contract|agreement/.test(text)) return 'contract_expiring';
  if (/event|workshop|meetup/.test(text)) return 'event_reminder';
  if (/repair|maintenance|fault/.test(text)) return 'repair_update';
  if (/invit/.test(text)) return 'employee_invited';
  return 'announcement';
}

// ------------------------------------------------------------------- mapping

const mapping = {
  table: 'notifications',

  // profile_id is the only FK; the embed supplies `recipient`, which otherwise
  // has no column at all. Whitespace is stripped - PostgREST's select parameter
  // does not accept spaces.
  selectColumns: `
    *,
    profile:profiles(id,full_name,full_name_ar,email)
  `.replace(/\s+/g, ''),

  idColumn: 'id',
  defaultOrder: { column: 'created_at', ascending: false },

  /**
   * Document field -> column equality, for BaseRepository#findWhere.
   *
   * `read` is deliberately NOT here: it maps to `read_at IS [NOT] NULL`, which
   * findWhere's .eq()/.is(null) pair cannot express in both directions. An
   * unmapped key throws a clear error, which is the honest outcome - use
   * findAll(n => n.read) for that one, as NotificationService already does.
   */
  filters: {
    userId: 'profile_id',
    profileId: 'profile_id',
    kind: { column: 'kind', toColumn: (v) => toNotificationKind({ kind: v }) },
  },

  // No lifecycle column exists, so there is nothing to move a notification to.
  softDelete: null,
  softDeleteReason:
    'public.notifications has no lifecycle, archived or deleted column - a ' +
    'notification is either delivered or removed outright, and read_at records ' +
    'only that it was read',

  toDocument(row) {
    if (!row) return null;
    const kind = row.kind ?? null;
    return {
      id: row.id,
      userId: row.profile_id ?? null,

      kind,
      // Derived from kind for the member inbox's filter tabs; no column.
      category: kindToCategory(kind),

      title: row.title ?? '',
      titleAr: row.title_ar ?? null,
      message: row.body ?? null,
      messageAr: row.body_ar ?? null,
      link: row.link ?? null,

      // read is a boolean in the documents; the column is a timestamp.
      read: row.read_at != null,
      readAt: row.read_at ?? null,

      // Synthesised - no columns for these; see the known losses in the header.
      recipient: row.profile?.full_name ?? null,
      channel: 'In-App',
      status: row.read_at != null ? 'Read' : 'Sent',
      timestamp: row.created_at ?? null,

      // The row exists, so it is not deleted; there is no soft-delete concept.
      isDeleted: false,
      createdAt: row.created_at ?? null,
      // No updated_at column on this table.
      updatedAt: row.created_at ?? null,
    };
  },

  toRow(doc, mode) {
    const row = {};
    if (!doc) return row;

    const profileId = doc.profileId !== undefined ? doc.profileId : doc.userId;
    if (profileId !== undefined) {
      if (!isUuid(profileId)) {
        // Do NOT swallow this. profile_id is NOT NULL and a profiles FK, so the
        // insert cannot succeed, and a notification that vanishes silently is
        // exactly the failure this layer exists to prevent.
        throw new Error(
          `notifications: userId must be a profiles uuid, got ${JSON.stringify(profileId)}. ` +
            'public.notifications.profile_id is NOT NULL and references profiles(id), ' +
            'so a legacy id such as "usr-guest" cannot be stored. Pass the real ' +
            'profile id, or migrate the table to allow guest notifications.'
        );
      }
      row.profile_id = profileId;
    }

    put(row, 'title', doc.title);
    put(row, 'title_ar', doc.titleAr);
    put(row, 'body', doc.message);
    put(row, 'body_ar', doc.messageAr);
    put(row, 'link', doc.link);

    // kind is only re-derived when the caller actually said something about it;
    // a patch of { read: true } must not rewrite the notification's kind.
    if (doc.kind !== undefined || doc.type !== undefined || doc.category !== undefined) {
      row.kind = toNotificationKind(doc);
    }

    // read (boolean) -> read_at (timestamp). An explicit readAt wins; read:true
    // with no readAt stamps now; read:false clears the column.
    if (doc.readAt !== undefined) {
      row.read_at = doc.readAt;
    } else if (doc.read !== undefined) {
      row.read_at = doc.read ? new Date().toISOString() : null;
    }

    // DROPPED by design: channel, status, recipient, timestamp - no columns.
    // See the known losses in the header.

    if (mode === 'create') {
      if (row.profile_id === undefined) {
        throw new Error(
          'notifications: userId is required to create a notification ' +
            '(public.notifications.profile_id is NOT NULL with no default).'
        );
      }
      if (row.title === undefined || row.title === null || row.title === '') {
        throw new Error(
          'notifications: `title` is required to create a notification ' +
            '(public.notifications.title is NOT NULL with no default).'
        );
      }
      // kind is NOT NULL with no default, so it must be present on insert even
      // when the caller named nothing - toNotificationKind falls back to
      // 'announcement'.
      row.kind ??= toNotificationKind(doc);
    }

    return row;
  },
};

export default mapping;
