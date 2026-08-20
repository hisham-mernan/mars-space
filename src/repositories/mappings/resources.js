/**
 * MAPPING — collection `resources` -> table `public.resources`
 *
 * The workspace catalogue: private offices, meeting rooms, the community hall,
 * hot desks. Bilingual throughout, with `text[]` amenity/feature lists and a
 * gallery that lives in a separate table (`public.resource_photos`).
 *
 * WHERE THE DOCUMENT SHAPE COMES FROM
 * There is already a working row->document adapter for this exact table in
 * src/lib/supabase/mappers.js#mapResource, used by the public API routes. Its
 * decisions are reproduced here verbatim so a resource rendered from the public
 * route and one rendered from the ERP repository are the same object, plus the
 * four fields every repository document must carry (id, isDeleted, createdAt,
 * updatedAt — see README §4).
 *
 * NON-OBVIOUS TRANSLATIONS
 *   size      -> size_sqm      (numeric; arrives as a string, so num())
 *   image     -> hero_image
 *   loc/locAr -> location/location_ar
 *   gallery   -> public.resource_photos (a separate table — see the loss note)
 *   branchId  -> branch_id     (the DOCUMENT carries the branch SLUG, e.g.
 *                               'jeddah'; the COLUMN is a branches uuid)
 *
 * ENUM CASE — a deliberate exception to README §2
 *   `status` follows the convention: Title Case in the document ('Available',
 *   'Occupied', 'Maintenance', 'Retired'), lowercase in the column.
 *   `category` does NOT. It stays exactly as stored — 'private_office',
 *   'meeting_room', 'community_hall', 'focus_pod', 'hot_desk',
 *   'dedicated_desk'. Every call site compares against the snake form:
 *   AnalyticsService.getExecutiveKpis() does `w.category === 'private_office'`,
 *   WorkspaceService.createWorkspace() defaults to 'private_office', and
 *   src/app/erp/workspaces/page.js binds `<option value="private_office">`.
 *   Title-casing it here would silently zero the occupancy KPI. `filters` and
 *   `toRow` still run values through toSnakeCase, so a caller that does pass
 *   'Private Office' is handled.
 *
 * FIELDS THE OLD DOCUMENT NEVER HAD
 *   `rate_unit` is required (NOT NULL, default 'hour') but WorkspaceService
 *   never sends it, so on CREATE it is derived from the category — see
 *   RATE_UNIT_BY_CATEGORY below. `is_bookable` is left to the column default
 *   (true); the seeded private offices are false because they are quoted per
 *   contract rather than self-served, so pass isBookable explicitly when the
 *   ERP grows a control for it.
 *
 * KNOWN LOSSES ON WRITE (README §10.7)
 *   - `gallery` is NOT persisted. Photos are rows in public.resource_photos and
 *     toRow is synchronous with no database handle, so it cannot write them.
 *     On CREATE only, gallery[0] is used as `hero_image` when no `image` was
 *     given, so a workspace created through the ERP still has a picture.
 *     Managing the gallery itself needs a purpose-built call against
 *     resource_photos.
 *   - Nothing else: every other field WorkspaceService reads or writes has a
 *     column.
 *
 * RETIRED RESOURCES ARE HIDDEN FROM LISTS, NOT FROM LOOKUPS
 *   `status = 'retired'` is this table's soft delete, so it is an
 *   `activeFilter` and NOT a `partitionFilter` — the distinction BaseRepository's
 *   header draws, and it is load-bearing here. Four of the 33 live resources are
 *   retired and two of them still carry bookings (Community Hall
 *   3f24a656-…30968 and Ventures Room 709220bc-…25703, one booking each,
 *   BK-9023 on 2026-08-25 among them). A retired room must therefore vanish from
 *   the catalogue while every historical reference to it still resolves. See the
 *   activeFilter/partitionFilter block at the foot of this file.
 *
 * This module also owns the branch slug <-> uuid resolution used by
 * bookings.js and inventory.js; see the block comment below.
 */

import { put, num, toTitleCase, toSnakeCase, isUuid } from './_helpers';

// ---------------------------------------------------------------------------
// Branch resolution — shared with bookings.js and inventory.js
//
// resources.branch_id, bookings.branch_id and inventory.branch_id are all
// `uuid NOT NULL REFERENCES branches(id)`, but the old db.json documents named
// branches by slug ('jeddah') or by label ('Jeddah'). toRow is synchronous and
// has no Supabase client, so it cannot SELECT the id: the map below is seeded
// with the live rows and then kept current from every read that embeds the
// branch. Verified against the live database:
//
//   select id, slug from public.branches;
//   6d1036b5-0ae0-414f-b49b-f0e808963a47  jeddah
//   b86f4705-e354-4113-9246-0dbe6df01891  riyadh
//
// A third branch is picked up automatically the first time any resource,
// booking or inventory row that embeds it is read; add it here too if it must
// be writable from a cold process.
// ---------------------------------------------------------------------------

const BRANCH_ID_BY_SLUG = new Map([
  ['jeddah', '6d1036b5-0ae0-414f-b49b-f0e808963a47'],
  ['riyadh', 'b86f4705-e354-4113-9246-0dbe6df01891'],
]);

const BRANCH_SLUG_BY_ID = new Map(
  [...BRANCH_ID_BY_SLUG].map(([slug, id]) => [id, slug])
);

/** The branch the whole ERP runs on today; Riyadh is still 'coming_soon'. */
export const DEFAULT_BRANCH_SLUG = 'jeddah';

/** Learn a branch from an embedded `branch:branches(id,slug,...)` relation. */
export function rememberBranch(branch) {
  if (!branch || !branch.id || !branch.slug) return;
  BRANCH_ID_BY_SLUG.set(branch.slug, branch.id);
  BRANCH_SLUG_BY_ID.set(branch.id, branch.slug);
}

/** branches.id -> slug, or null when the id is unknown to this process. */
export function branchSlugForId(id) {
  return (id && BRANCH_SLUG_BY_ID.get(id)) || null;
}

/**
 * A row's branch as the old documents wrote it: the slug when we know it,
 * otherwise the raw uuid, so the field is never empty.
 */
export function branchIdForDocument(row) {
  return row?.branch?.slug ?? branchSlugForId(row?.branch_id) ?? row?.branch_id ?? null;
}

/** 'jeddah' -> 'Jeddah'. The display label db.json's inventory used. */
export function branchLabelForDocument(row) {
  const slug = row?.branch?.slug ?? branchSlugForId(row?.branch_id);
  return slug ? toTitleCase(slug) : null;
}

/**
 * A uuid, a slug ('jeddah') or a label ('Jeddah') -> branches.id.
 *
 * `undefined` in means "the caller did not mention a branch" and `undefined`
 * comes back, so put() leaves the column alone on a partial update. Anything
 * else that cannot be resolved THROWS: filing stock or a booking against the
 * wrong branch — or silently dropping the column on an update — is worse than
 * a loud failure naming the value.
 */
export function resolveBranchId(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (isUuid(value)) return value;
  const slug = toSnakeCase(value); // 'Jeddah' -> 'jeddah'
  const id = BRANCH_ID_BY_SLUG.get(slug);
  if (!id) {
    throw new Error(
      `Unknown branch "${value}". Known branches: ` +
        `${[...BRANCH_ID_BY_SLUG.keys()].join(', ')}. Pass a branches.id uuid, ` +
        `or add the slug to BRANCH_ID_BY_SLUG in ` +
        `src/repositories/mappings/resources.js.`
    );
  }
  return id;
}

// ---------------------------------------------------------------------------

/**
 * rate_unit is not in the old document at all, and the column defaults to
 * 'hour'. Taking that default would price a newly created private office at
 * 4,500 SAR per HOUR. In the live catalogue the unit is fully determined by the
 * category:
 *
 *   select category, rate_unit, count(*) from resources group by 1,2;
 *   private_office  month  25    meeting_room  hour  5
 *   community_hall  day     2    hot_desk      day   1
 *
 * dedicated_desk and focus_pod have no rows yet; they follow how each is sold
 * (a dedicated desk monthly, a focus pod by the hour). Used only when the
 * caller does not supply rateUnit itself.
 */
const RATE_UNIT_BY_CATEGORY = {
  private_office: 'month',
  dedicated_desk: 'month',
  community_hall: 'day',
  hot_desk: 'day',
  meeting_room: 'hour',
  focus_pod: 'hour',
};

/** resource_photos rows -> the flat array of urls the pages map() over. */
function galleryFrom(row) {
  const photos = Array.isArray(row.photos)
    ? [...row.photos]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((p) => p.url)
        .filter(Boolean)
    : [];
  // Fall back to the hero image so a resource with no photo rows still renders
  // a gallery rather than an empty carousel (mapResource does the same).
  if (photos.length) return photos;
  return row.hero_image ? [row.hero_image] : [];
}

const mapping = {
  table: 'resources',

  /**
   * The branch and the photo rows are embedded rather than fetched per row:
   * `branchId` is the branch SLUG in the document, and `gallery` is a list of
   * resource_photos urls. Both aliases match src/lib/supabase/queries.js so the
   * two read paths return identically shaped rows.
   */
  selectColumns: [
    '*',
    'branch:branches(id,slug,name,name_ar)',
    'photos:resource_photos(url,alt,alt_ar,sort_order)',
  ].join(','),

  idColumn: 'id',
  defaultOrder: { column: 'created_at', ascending: false },

  toDocument(row) {
    if (!row) return null;
    rememberBranch(row.branch);

    return {
      id: row.id,
      slug: row.slug,
      branchId: branchIdForDocument(row),
      name: row.name,
      nameAr: row.name_ar,
      // Intentionally NOT Title Case — see the ENUM CASE note in the header.
      category: row.category,
      floor: row.floor,
      loc: row.location,
      locAr: row.location_ar,
      capacity: row.capacity,
      size: num(row.size_sqm),
      rate: num(row.rate) ?? 0,
      rateUnit: row.rate_unit,
      // 'available' -> 'Available'; the ERP compares against the Title form.
      status: toTitleCase(row.status),
      isBookable: row.is_bookable !== false,
      teaser: row.teaser,
      teaserAr: row.teaser_ar,
      // text[] columns arrive as real arrays; default to [] so pages can map().
      features: row.features ?? [],
      featuresAr: row.features_ar ?? [],
      amenities: row.amenities ?? [],
      amenitiesAr: row.amenities_ar ?? [],
      includes: row.includes ?? [],
      includesAr: row.includes_ar ?? [],
      peakSurchargePct: num(row.peak_surcharge_pct) ?? 0,
      weekendSurchargePct: num(row.weekend_surcharge_pct) ?? 0,
      image: row.hero_image,
      gallery: galleryFrom(row),
      // Soft delete is `status = 'retired'`, so this is the honest inverse of
      // what softDelete() writes (README §5a).
      isDeleted: row.status === 'retired',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  toRow(doc, mode) {
    const row = {};
    if (!doc) return row;

    put(row, 'branch_id', resolveBranchId(doc.branchId));
    put(row, 'slug', doc.slug);
    put(row, 'name', doc.name);
    put(row, 'name_ar', doc.nameAr);
    put(row, 'category', doc.category, toSnakeCase);
    put(row, 'floor', doc.floor);
    put(row, 'location', doc.loc);
    put(row, 'location_ar', doc.locAr);
    put(row, 'capacity', doc.capacity, Number);
    put(row, 'size_sqm', doc.size, Number);
    put(row, 'rate', doc.rate, Number);
    put(row, 'rate_unit', doc.rateUnit, toSnakeCase);
    put(row, 'status', doc.status, toSnakeCase);
    put(row, 'is_bookable', doc.isBookable, Boolean);
    put(row, 'teaser', doc.teaser);
    put(row, 'teaser_ar', doc.teaserAr);
    put(row, 'features', doc.features);
    put(row, 'features_ar', doc.featuresAr);
    put(row, 'amenities', doc.amenities);
    put(row, 'amenities_ar', doc.amenitiesAr);
    put(row, 'includes', doc.includes);
    put(row, 'includes_ar', doc.includesAr);
    put(row, 'peak_surcharge_pct', doc.peakSurchargePct, Number);
    put(row, 'weekend_surcharge_pct', doc.weekendSurchargePct, Number);
    put(row, 'hero_image', doc.image);

    if (mode === 'create') {
      // branch_id, slug, name, category and rate are all NOT NULL with no
      // default, so an insert has to carry them.
      if (!row.branch_id) row.branch_id = resolveBranchId(DEFAULT_BRANCH_SLUG);
      if (!row.slug && row.name) {
        row.slug = String(row.name).trim().toLowerCase().replace(/\s+/g, '-');
      }
      row.category ??= 'private_office';
      // A workspace with no price is legal (CHECK rate >= 0) and is how the
      // seeded private offices are stored: they are quoted per contract.
      row.rate ??= 0;
      // Never let a private office inherit the column's 'hour' default.
      row.rate_unit ??= RATE_UNIT_BY_CATEGORY[row.category] ?? 'hour';
      // The gallery has no column. Rescue the first photo as the hero image so
      // the workspace is not created pictureless; see the loss note.
      if (row.hero_image == null && Array.isArray(doc.gallery) && doc.gallery.length) {
        row.hero_image = doc.gallery[0];
      }
    }

    return row;
  },

  /** Document field -> column equality, pushed into Postgres by findWhere(). */
  filters: {
    slug: 'slug',
    name: 'name',
    // Accepts 'private_office' (what the call sites pass) and 'Private Office'.
    category: { column: 'category', toColumn: toSnakeCase },
    status: { column: 'status', toColumn: toSnakeCase },
    // `?? v` so an unresolvable value reaches Postgres and fails loudly there
    // rather than becoming `.eq(column, undefined)`.
    branchId: { column: 'branch_id', toColumn: (v) => resolveBranchId(v) ?? v },
    isBookable: { column: 'is_bookable', toColumn: Boolean },
    floor: 'floor',
  },

  /**
   * WHICH ROWS ARE THIS COLLECTION: all of them.
   *
   * public.resources belongs to `resources` alone — nothing else projects it,
   * the way activities and audit_logs both project public.audit_log — so there
   * is no partition to declare, and `retired` must never become one.
   *
   * That is the whole fix for the retired-resource bug, so it is spelled out
   * rather than left as an absent key: a partitionFilter is applied to
   * findById(), update() and softDelete() as well as to the lists, and
   * `includeDeleted` never relaxes it. Moving `neq('status','retired')` up here
   * would make the two retired rooms that still carry bookings unresolvable by
   * id — BookingService.createBooking() and checkRoomAvailability() both open
   * with `workspaceRepository.findById(resourceId)` and treat a null as
   * "Requested resource does not exist" — and would make un-retiring one
   * impossible, because update() could no longer see the row it must change.
   */
  partitionFilter: undefined,

  /**
   * WHICH ROWS ARE STILL LIVE — a LIST filter, and only a list filter.
   *
   * A retired workspace is gone from the ERP catalogue: unlike a cancelled
   * booking or a voided invoice, there is no list it should keep appearing in.
   * So findAll(), findWhere() and count() drop it, and { includeDeleted: true }
   * brings it back (29 rows vs 33 against the live database today).
   *
   * BaseRepository deliberately does NOT apply this to findById(), which is what
   * keeps a historical reference resolvable: a booking on the retired Ventures
   * Room still resolves its resource, reads status 'Retired', and is refused
   * with a reason that names the state instead of claiming the room never
   * existed. Do not "fix" that asymmetry — it is the contract.
   *
   * The corollary for callers: because this filter is ANDed with whatever
   * findWhere() asks for, `findWhere({ status: 'Retired' })` matches nothing.
   * Asking for retired rows means asking for them:
   * `findWhere({ status: 'Retired' }, { includeDeleted: true })`.
   */
  activeFilter: (q) => q.neq('status', 'retired'),

  softDelete: { column: 'status', value: 'retired' },
};

export default mapping;
