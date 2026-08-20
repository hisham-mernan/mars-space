/**
 * MAPPING - collection "users"  ->  public.profiles
 *
 * The ERP's member documents. `profiles` is the public mirror of `auth.users`:
 * its primary key IS the auth user's uuid
 * (profiles_id_fkey: FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE),
 * so a profile cannot be minted from this layer. See "create() is impossible"
 * in toRow below.
 *
 * Consumers of this document (grepped, not guessed):
 *   src/services/AnalyticsService.js  users.filter(u => u.status === 'Active')
 *   src/services/SearchService.js     u.name, u.email, u.company
 *   src/context/SessionContext.js     establishes the field names this document
 *                                     mirrors (name/nameAr/phone/avatar/language/
 *                                     role/company/companyAr/companyId)
 *
 * NON-OBVIOUS TRANSLATIONS
 *   name        -> full_name           (renamed column)
 *   nameAr      -> full_name_ar        (renamed column)
 *   avatar      -> avatar_url          (renamed column; db.json called it `avatar`)
 *   language    -> preferred_language  (CHECK: 'ar' | 'en')
 *   role        -> platform_role       (see the role note below)
 *   status      -> status              Title Case in the document, lowercase in
 *                                      the column. AnalyticsService compares
 *                                      against the literal 'Active', so the
 *                                      Title Case conversion is load-bearing.
 *   company     -> NO COLUMN ON profiles. It is reached through
 *                  company_members -> companies and is embedded read-only
 *                  (see SELECT_COLUMNS).
 *
 * `role` DELIBERATELY BREAKS THE TITLE-CASE CONVENTION of README section 2. The
 * document carries the raw lowercase platform_role ('member' | 'staff' |
 * 'erp_admin') because every live comparison is against those exact strings
 * (SessionContext.js: ['staff','erp_admin'].includes(profile?.platform_role);
 * requireStaffClient() in src/lib/supabase/admin.js does the same). Title-casing
 * it here would silently break authorisation checks downstream. On write the
 * value goes through toSnakeCase, so the legacy db.json vocabulary
 * ('MEMBER' / 'ERP_ADMIN' / 'STAFF') and the Title Case form both land on a
 * value that profiles_platform_role_check accepts.
 *
 * KNOWN LOSSES (fields with no column; nothing disappears silently)
 *   membership        - no such column on profiles and no membership table is
 *                       joined here. Not synthesised: it would be a fiction.
 *   company           - READ ONLY. Derived from the company_members embed.
 *                       Writing it is a no-op (see toRow); reassigning a member
 *                       to a company is an insert/update on
 *                       public.company_members, not a patch of profiles.
 *   companyAr,
 *   companyId,
 *   companyJobTitle   - same: read-only projections of that embed.
 *                       companyJobTitle is company_members.job_title, which is
 *                       a DIFFERENT column from profiles.job_title (the
 *                       document's `jobTitle`); the two are kept apart so a
 *                       whole-document round trip cannot copy one onto the other.
 *
 * isDeleted / softDelete / activeFilter (README sections 5 and 8)
 *   softDelete    -> status = 'suspended'
 *   activeFilter  -> none. A suspended member must stay visible in the ERP
 *                    member list, so no filter is pushed into SQL.
 *   isDeleted     -> derived, status === 'suspended', so the round trip is
 *                    honest: softDelete(id) then findById(id) reports true.
 *
 * Live schema confirmed with information_schema.columns / pg_constraint:
 *   id uuid PK -> auth.users(id), email citext NOT NULL UNIQUE, full_name text,
 *   full_name_ar text, phone text, avatar_url text,
 *   preferred_language text NOT NULL DEFAULT 'ar' CHECK ('ar','en'),
 *   platform_role text NOT NULL DEFAULT 'member' CHECK ('member','staff','erp_admin'),
 *   status text NOT NULL DEFAULT 'active' CHECK ('invited','active','suspended'),
 *   last_seen_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 *   updated_at timestamptz NOT NULL DEFAULT now(),
 *   show_in_directory boolean NOT NULL DEFAULT false, job_title text, bio text.
 */

import { put, toTitleCase, toSnakeCase } from './_helpers';

/**
 * company_members has TWO foreign keys into profiles (profile_id and
 * invited_by), so a bare `company_members(...)` embed is ambiguous and
 * PostgREST rejects it with PGRST201. The constraint name disambiguates it.
 */
const SELECT_COLUMNS = `
  *,
  memberships:company_members!company_members_profile_id_fkey(
    company_id, status, role, job_title,
    company:companies(id, name, name_ar)
  )
`.replace(/\s+/g, ' ').trim();

/**
 * The membership whose company answers "what company is this member with?".
 * Mirrors SessionContext.js, which takes the first active membership and falls
 * back to the first of any status.
 */
function activeMembership(row) {
  const list = Array.isArray(row.memberships) ? row.memberships : [];
  return list.find((m) => m && m.status === 'active') || list[0] || null;
}

const mapping = {
  table: 'profiles',
  selectColumns: SELECT_COLUMNS,
  idColumn: 'id',
  defaultOrder: { column: 'created_at', ascending: false },

  toDocument(row) {
    if (!row) return null;
    const membership = activeMembership(row);
    const company = membership?.company ?? null;

    return {
      id: row.id,
      email: row.email ?? null,
      name: row.full_name ?? null,
      nameAr: row.full_name_ar ?? null,
      phone: row.phone ?? null,
      avatar: row.avatar_url ?? null,
      language: row.preferred_language ?? 'ar',
      // Raw lowercase platform_role on purpose - see the header.
      role: row.platform_role ?? 'member',
      // 'active' -> 'Active'. AnalyticsService compares against 'Active'.
      status: toTitleCase(row.status) ?? null,
      // profiles.job_title ONLY. It deliberately does NOT fall back to the
      // membership's job_title: that column belongs to company_members, and
      // falling back would make a whole-document round trip copy it onto
      // profiles.job_title. It is exposed separately as companyJobTitle below.
      jobTitle: row.job_title ?? null,
      bio: row.bio ?? null,
      showInDirectory: row.show_in_directory === true,
      lastSeenAt: row.last_seen_at ?? null,

      // Read-only projections of the company_members embed. SearchService reads
      // `company`; writing any of the four does nothing (see toRow).
      company: company?.name ?? null,
      companyAr: company?.name_ar ?? null,
      companyId: company?.id ?? membership?.company_id ?? null,
      companyJobTitle: membership?.job_title ?? null,

      // No isDeleted column exists anywhere; softDelete() is status='suspended',
      // so derive the flag from that same status (README section 5a).
      isDeleted: row.status === 'suspended',
      createdAt: row.created_at ?? null,
      updatedAt: row.updated_at ?? null,
    };
  },

  toRow(doc, mode) {
    if (mode === 'create') {
      // create() is impossible by design, and must fail loudly rather than
      // half-work: profiles.id is a foreign key onto auth.users(id), so there is
      // no way to insert a profile for a person who has no auth user. Letting it
      // through would raise a bare 23503 from Postgres with no hint about what
      // the caller should have done instead.
      throw new Error(
        'users.create() is not available: public.profiles.id is a foreign key ' +
          'onto auth.users(id), so a profile cannot exist without an auth user. ' +
          'Create the member through Supabase Auth instead ' +
          '(auth.admin.inviteUserByEmail(email) or auth.admin.createUser()), which ' +
          'provisions auth.users and its profiles row; then use ' +
          'userRepository.update(id, {...}) to fill in name/phone/role, and insert ' +
          'into public.company_members to attach the member to a company.'
      );
    }

    const row = {};

    // profiles.email is citext and UNIQUE. Note that auth.users.email is the
    // real login identity; patching this column alone desynchronises the two.
    put(row, 'email', doc.email);
    put(row, 'full_name', doc.name);
    put(row, 'full_name_ar', doc.nameAr);
    put(row, 'phone', doc.phone);
    put(row, 'avatar_url', doc.avatar);
    put(row, 'preferred_language', doc.language, (v) => String(v).toLowerCase());

    // PRIVILEGE ESCALATION SURFACE. platform_role is what requireStaffClient()
    // and src/proxy.js authorise against; a route that lets an end user patch it
    // hands out the whole ERP. BaseRepository already runs with the service-role
    // key, so the route-level staff check is the only guard here (see the
    // security header of BaseRepository.js).
    // toSnakeCase accepts 'ERP_ADMIN', 'Erp Admin' and 'erp_admin' alike.
    put(row, 'platform_role', doc.role, toSnakeCase);

    // 'Active' -> 'active', 'Suspended' -> 'suspended'.
    put(row, 'status', doc.status, toSnakeCase);

    put(row, 'job_title', doc.jobTitle);
    put(row, 'bio', doc.bio);
    put(row, 'show_in_directory', doc.showInDirectory, Boolean);
    put(row, 'last_seen_at', doc.lastSeenAt);

    // Deliberately NOT written, and listed in the header as known losses:
    //   doc.company / doc.companyAr / doc.companyId / doc.companyJobTitle -
    //     they live in company_members and companies, not on profiles.
    //   doc.membership - no column exists.
    //   id / created_at / updated_at / isDeleted - BaseRepository's job, or no
    //     such column at all (README section 3).
    return row;
  },

  /**
   * Document field -> column equality, pushed into Postgres by findWhere().
   * `email` backs UserRepository#findByEmail. The column is citext, so the
   * equality is case-insensitive in SQL, which is exactly what the old
   * in-memory predicate achieved by lowercasing both sides.
   */
  filters: {
    id: 'id',
    email: 'email',
    status: { column: 'status', toColumn: toSnakeCase },
    role: { column: 'platform_role', toColumn: toSnakeCase },
    phone: 'phone',
    showInDirectory: { column: 'show_in_directory', toColumn: Boolean },
    // NOTE: companyId is intentionally absent. It is not a column on profiles,
    // so an .eq() against it would be a lie. findWhere throws for unmapped keys,
    // which is the correct outcome - query company_members instead.
  },

  // A suspended member is still a member: no activeFilter, so findAll() keeps
  // returning them (README section 8).
  activeFilter: undefined,

  softDelete: { column: 'status', value: 'suspended' },
};

export default mapping;
