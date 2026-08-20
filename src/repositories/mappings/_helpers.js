/**
 * Shared helpers for the mapping modules in this directory.
 *
 * Owned by the BaseRepository author. Mapping modules import from here; they
 * should not copy these implementations, because getting the Asia/Riyadh
 * conversion subtly different in two mappers is exactly the class of bug this
 * file exists to prevent.
 *
 * See ./README.md for the mapping-module contract.
 */

/** Asia/Riyadh is UTC+3 all year. Saudi Arabia observes no daylight saving. */
export const RIYADH_TZ = 'Asia/Riyadh';
export const RIYADH_OFFSET = '+03:00';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when `value` is a canonical UUID string. */
export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

/**
 * Assign `column` on `row` only when `value` is defined.
 *
 * This is what makes a mapping's toRow() safe for partial updates: a service
 * calling update(id, { status: 'Paid' }) must produce { status: 'paid' } and
 * NOT null out every other column.
 *
 *   put(row, 'status', doc.status, (v) => v.toLowerCase());
 */
export function put(row, column, value, transform) {
  if (value === undefined) return row;
  row[column] = transform && value !== null ? transform(value) : value;
  return row;
}

/** 'available' -> 'Available'; 'in_progress' -> 'In Progress'. */
export function toTitleCase(value) {
  if (!value) return value ?? null;
  return String(value)
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** 'In Progress' -> 'in_progress'; 'Checked-In' -> 'checked_in'. */
export function toSnakeCase(value) {
  if (!value) return value ?? null;
  return String(value).trim().toLowerCase().replace(/[\s-]+/g, '_');
}

/** Postgres numeric arrives as a string over PostgREST; the UI wants a number. */
export function num(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

/**
 * Parse a Postgres tstzrange as PostgREST serialises it, e.g.
 *   ["2026-08-25 07:00:00+00","2026-08-25 09:00:00+00")
 * Returns { start: Date, end: Date } or null when the range is empty/absent.
 *
 * Note the wire format uses a space rather than 'T' and a bare '+00' offset,
 * neither of which is ISO 8601, so the strings are normalised before parsing.
 */
export function parseTstzRange(range) {
  if (!range || typeof range !== 'string') return null;
  const m = range.match(/^[[(]\s*"?([^",]*)"?\s*,\s*"?([^",]*)"?\s*[\])]$/);
  if (!m) return null;
  const start = parseTimestamptz(m[1]);
  const end = parseTimestamptz(m[2]);
  if (!start || !end) return null;
  return { start, end };
}

function parseTimestamptz(text) {
  if (!text) return null;
  let s = text.trim().replace(' ', 'T');
  // '+00' / '-03' -> '+00:00' / '-03:00'; a bare timestamp is UTC from Postgres.
  s = s.replace(/([+-]\d{2})$/, '$1:00');
  if (!/[zZ]|[+-]\d{2}:\d{2}$/.test(s)) s += 'Z';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

const RIYADH_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: RIYADH_TZ,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
});

/** A Date -> { date: 'YYYY-MM-DD', time: 'HH:MM' } rendered in Asia/Riyadh. */
export function riyadhParts(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const p = Object.fromEntries(
    RIYADH_PARTS.formatToParts(date).map((x) => [x.type, x.value])
  );
  // en-CA gives 24-hour time, but Intl renders midnight as '24' in some ICU
  // builds; normalise it so 'HH:MM' is always 00..23.
  const hour = p.hour === '24' ? '00' : p.hour;
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${hour}:${p.minute}` };
}

/**
 * bookings.time_range -> the flat { date, startTime, endTime, duration } the
 * old db.json documents carried, rendered in Asia/Riyadh.
 *
 * `date` is taken from the START of the range; a booking that crosses midnight
 * keeps the day it began on, which is what the ERP day view expects.
 */
export function timeRangeToDocumentFields(range) {
  const parsed = parseTstzRange(range);
  if (!parsed) {
    return { date: null, startTime: null, endTime: null, duration: null };
  }
  const start = riyadhParts(parsed.start);
  const end = riyadhParts(parsed.end);
  return {
    date: start.date,
    startTime: start.time,
    endTime: end.time,
    duration: (parsed.end.getTime() - parsed.start.getTime()) / 3600000,
  };
}

/**
 * The inverse: { date: '2026-08-25', startTime: '10:00', endTime: '12:00' } ->
 * '["2026-08-25T10:00:00+03:00","2026-08-25T12:00:00+03:00")'
 *
 * Half-open '[)' matches every existing range in the table and is what the
 * no-overlap exclusion constraint expects: a booking ending at 12:00 does not
 * conflict with one starting at 12:00.
 *
 * An endTime that is <= startTime is treated as crossing midnight and rolls to
 * the next day, so an 22:00-01:00 booking produces a valid range instead of
 * tripping the bookings_time_valid CHECK.
 *
 * ⚠ THE INPUTS ARE VALIDATED, NOT COERCED. Everything below is string splicing
 * into a Postgres range literal, and the rollover test is a LEXICOGRAPHIC
 * comparison — both are only meaningful for an ISO date and a zero-padded
 * 24-hour time. `requireIsoDate` and `padTime` therefore reject anything else
 * here, at the call site, rather than letting it reach Postgres as a malformed
 * literal or (worse) reach the exclusion constraint as a plausible-looking
 * range for the wrong day. See padTime for what a 12-hour clock used to do.
 */
export function buildTimeRange(date, startTime, endTime) {
  if (!date || !startTime || !endTime) {
    throw new Error(
      `buildTimeRange requires date, startTime and endTime (got ${date}, ${startTime}, ${endTime})`
    );
  }
  const day = requireIsoDate(date);
  const startAt = padTime(startTime, 'startTime');
  const endAt = padTime(endTime, 'endTime');

  const start = `${day}T${startAt}${RIYADH_OFFSET}`;
  // Both operands are now 'HH:MM:SS', fixed width and zero padded, so comparing
  // them as text is the same as comparing them as clock times.
  const endDay = endAt <= startAt ? addDays(day, 1) : day;
  const end = `${endDay}T${endAt}${RIYADH_OFFSET}`;
  return `["${start}","${end}")`;
}

/** 'YYYY-MM-DD', and only a date that really exists. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 24-hour 'H:MM', 'HH:MM' or 'HH:MM:SS'. Nothing else. */
const CLOCK_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

/**
 * A calendar date -> the 'YYYY-MM-DD' half of a range literal.
 *
 * Rejects both a wrong format ('01/09/2026', which would be spliced in as
 * '01/09/2026T09:00:00+03:00') and a date that does not exist ('2026-02-30'),
 * which would otherwise become an Invalid Date inside addDays and surface as a
 * TypeError with no mention of the input that caused it.
 */
function requireIsoDate(date) {
  const raw = String(date).trim();
  const d = ISO_DATE_RE.test(raw) ? new Date(`${raw}T00:00:00${RIYADH_OFFSET}`) : null;
  if (!d || Number.isNaN(d.getTime()) || riyadhParts(d).date !== raw) {
    throw new Error(
      `buildTimeRange: date must be a real calendar date as 'YYYY-MM-DD' ` +
        `(e.g. '2026-09-01'), got ${JSON.stringify(date)}.`
    );
  }
  return raw;
}

/**
 * A wall-clock time -> the 'HH:MM:SS' a range literal is built from.
 *
 *   '9:00' -> '09:00:00'   '09:00' -> '09:00:00'   '17:30:45' -> '17:30:45'
 *
 * ⚠ IT VALIDATES. The previous version padded whatever it was handed, which
 * made two failure modes possible and neither of them was visible at the call
 * site:
 *
 *   - '9:00 AM' became the literal '09:00 AM:00', spliced straight into the
 *     tstzrange. Postgres rejects that with a range-syntax error naming neither
 *     the booking nor the field.
 *   - the same string then defeated the midnight test in buildTimeRange, which
 *     compares the two times AS TEXT. '05:00 PM' < '09:00 AM' lexicographically,
 *     so buildTimeRange('2026-09-01', '9:00 AM', '5:00 PM') also decided the
 *     booking crossed midnight and rolled the end onto 2026-09-02.
 *
 * 24-hour clock only, and a 12-hour string is REJECTED rather than parsed:
 * quietly reading a bare '05:00' as the afternoon is how a booking lands on the
 * wrong half of the day. Convert before calling.
 *
 * @param {string|number} t
 * @param {string} field the document field being validated, for the message.
 */
export function padTime(t, field = 'time') {
  const raw = String(t ?? '').trim();
  const m = CLOCK_RE.exec(raw);
  if (!m) {
    throw new Error(
      `buildTimeRange: ${field} must be a 24-hour time as 'HH:MM' or 'HH:MM:SS' ` +
        `(e.g. '09:00', '17:30', '17:30:45'), got ${JSON.stringify(t)}. ` +
        `A 12-hour clock such as '5:00 PM' is not accepted — convert it first.`
    );
  }
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const ss = m[3] === undefined ? 0 : Number(m[3]);
  if (hh > 23 || mm > 59 || ss > 59) {
    throw new Error(
      `buildTimeRange: ${field} ${JSON.stringify(t)} is not a valid time of day ` +
        `(hours 00-23, minutes 00-59, seconds 00-59). Midnight at the END of a ` +
        `booking is '00:00', not '24:00' — buildTimeRange rolls it to the next day.`
    );
  }
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00${RIYADH_OFFSET}`);
  d.setUTCDate(d.getUTCDate() + days);
  return riyadhParts(d).date;
}

/** A timestamptz column -> the 'YYYY-MM-DD' date the old documents used. */
export function toDateOnly(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return riyadhParts(d).date;
}
