/**
 * MAPPING - collection "customers"  ->  public.companies
 *
 * The ERP's customer/account documents. In the old JSON store `customers` was a
 * standalone collection; in Postgres the same entity is `public.companies`, the
 * table that bookings.company_id, invoices.company_id, contracts.company_id and
 * support_tickets.company_id all point at. That is why `customerId` on those
 * other documents is a companies uuid.
 *
 * Consumers: `customerRepository` is currently exported from
 * src/repositories/index.js and used by no service (verified by grep across the
 * repo). The document shape below therefore follows two things rather than a
 * live call site:
 *   - README section 8: companyName/name -> name, email -> billing_email,
 *     status vocabulary prospect|active|suspended|churned;
 *   - the `customerId` / `customerName` pair that the bookings, invoices,
 *     contracts and support_tickets documents flatten out of this same table,
 *     so a customer document and an embedded company agree on their names.
 *
 * NON-OBVIOUS TRANSLATIONS
 *   name, companyName -> name          Both document names map to the ONE column.
 *                                      db.json used `companyName` in some places
 *                                      and `name` in others; toDocument emits
 *                                      both so neither caller breaks, and toRow
 *                                      accepts either (doc.name wins).
 *   email             -> billing_email The column is citext, so equality is
 *                                      case-insensitive in SQL. It is the
 *                                      INVOICING address, not a login: a company
 *                                      has no auth identity of its own.
 *   crNumber          -> cr_number     Saudi commercial registration number.
 *   vatNumber         -> vat_number    Saudi VAT registration number. Both are
 *                                      identifiers, NOT money - they stay
 *                                      strings and must never go through num(),
 *                                      which would eat leading zeroes.
 *   status            -> status        Title Case in the document, lowercase in
 *                                      the column ('Churned' <-> 'churned').
 *   contactName/
 *   contactEmail/
 *   contactPhone      -> READ ONLY projections of the primary_contact_id embed
 *                        into profiles.
 *
 * KNOWN LOSSES (fields with no column)
 *   address, addressAr - public.companies has no address columns at all.
 *   notes              - no column. Company-level notes have nowhere to live.
 *   type / segment     - no column; `industry` is the nearest real column and is
 *                        mapped separately, so nothing is folded into it.
 *   contactName /
 *   contactEmail /
 *   contactPhone       - readable but NOT writable: they belong to the linked
 *                        profiles row. Writing `primaryContactId` (a profiles
 *                        uuid) is the supported way to change the contact.
 *
 * isDeleted / softDelete / activeFilter (README sections 5 and 8)
 *   softDelete    -> status = 'churned'
 *   activeFilter  -> none. A churned customer keeps its invoices and contracts
 *                    and must stay in the ERP list.
 *   isDeleted     -> derived, status === 'churned', so softDelete(id) followed
 *                    by findById(id) reports true.
 *
 * Live schema confirmed with information_schema.columns / pg_constraint:
 *   id uuid PK DEFAULT gen_random_uuid(), name text NOT NULL, name_ar text,
 *   cr_number text, vat_number text,
 *   primary_contact_id uuid -> profiles(id) ON DELETE SET NULL,
 *   billing_email citext, phone text,
 *   status text NOT NULL DEFAULT 'active'
 *     CHECK ('prospect','active','suspended','churned'),
 *   created_at timestamptz NOT NULL DEFAULT now(),
 *   updated_at timestamptz NOT NULL DEFAULT now(),
 *   description text, description_ar text, industry text, website text,
 *   logo_path text, is_listed boolean NOT NULL DEFAULT true.
 *   `name` is the only NOT NULL column without a default, so it is the only one
 *   an insert must supply.
 */

import { put, toTitleCase, toSnakeCase } from './_helpers';

/**
 * profiles is reachable from companies two ways - directly via
 * companies.primary_contact_id, and as a many-to-many through company_members -
 * so a bare `profiles(...)` embed is ambiguous (PGRST201). Naming the
 * constraint pins it to the primary-contact relation.
 */
const SELECT_COLUMNS = `
  *,
  primaryContact:profiles!companies_primary_contact_id_fkey(
    id, full_name, full_name_ar, email, phone
  )
`.replace(/\s+/g, ' ').trim();

const mapping = {
  table: 'companies',
  selectColumns: SELECT_COLUMNS,
  idColumn: 'id',
  defaultOrder: { column: 'created_at', ascending: false },

  toDocument(row) {
    if (!row) return null;
    const contact = row.primaryContact ?? null;

    return {
      id: row.id,
      // One column, two document field names - see the header.
      name: row.name ?? null,
      companyName: row.name ?? null,
      nameAr: row.name_ar ?? null,
      // billing_email, not a login address.
      email: row.billing_email ?? null,
      phone: row.phone ?? null,
      // Identifiers, deliberately left as strings.
      crNumber: row.cr_number ?? null,
      vatNumber: row.vat_number ?? null,
      // 'churned' -> 'Churned'.
      status: toTitleCase(row.status) ?? null,
      industry: row.industry ?? null,
      website: row.website ?? null,
      description: row.description ?? null,
      descriptionAr: row.description_ar ?? null,
      logoPath: row.logo_path ?? null,
      isListed: row.is_listed !== false,

      primaryContactId: row.primary_contact_id ?? null,
      // Read-only; guarded with ?. because the FK is nullable and embeds as null.
      contactName: contact?.full_name ?? null,
      contactNameAr: contact?.full_name_ar ?? null,
      contactEmail: contact?.email ?? null,
      contactPhone: contact?.phone ?? null,

      // No isDeleted column exists; softDelete() is status='churned', so derive
      // the flag from the same status (README section 5a).
      isDeleted: row.status === 'churned',
      createdAt: row.created_at ?? null,
      updatedAt: row.updated_at ?? null,
    };
  },

  toRow(doc, mode) {
    const row = {};

    // `name` and `companyName` are two names for one column. Take `name` when it
    // is present (including an explicit null), otherwise `companyName`. Written
    // through a single put() so an update that mentions neither emits neither.
    put(row, 'name', doc.name !== undefined ? doc.name : doc.companyName);
    put(row, 'name_ar', doc.nameAr);
    put(row, 'billing_email', doc.email);
    put(row, 'phone', doc.phone);
    put(row, 'cr_number', doc.crNumber);
    put(row, 'vat_number', doc.vatNumber);
    // 'Churned' -> 'churned'; also accepts an already-lowercase value.
    put(row, 'status', doc.status, toSnakeCase);
    put(row, 'industry', doc.industry);
    put(row, 'website', doc.website);
    put(row, 'description', doc.description);
    put(row, 'description_ar', doc.descriptionAr);
    put(row, 'logo_path', doc.logoPath);
    put(row, 'is_listed', doc.isListed, Boolean);
    // The supported way to change the contact: a profiles uuid, not a name.
    put(row, 'primary_contact_id', doc.primaryContactId);

    if (mode === 'create') {
      // companies.name is the only NOT NULL column with no default. Catch it
      // here so the caller gets a field name instead of a bare 23502.
      if (row.name === undefined || row.name === null || row.name === '') {
        throw new Error(
          'customers.create() requires a name: public.companies.name is NOT NULL ' +
            'with no default. Pass { name } (or the legacy { companyName }).'
        );
      }
      // status, is_listed, id, created_at and updated_at all have defaults, so
      // nothing else needs to be supplied.
    }

    // Deliberately NOT written, and listed in the header as known losses:
    //   doc.address / doc.addressAr / doc.notes / doc.type - no columns exist.
    //   doc.contactName / contactEmail / contactPhone / contactNameAr - they
    //     belong to the linked profiles row; patch primaryContactId instead.
    //   id / created_at / updated_at / isDeleted - BaseRepository's job, or no
    //     such column at all (README section 3).
    return row;
  },

  /** Document field -> column equality, pushed into Postgres by findWhere(). */
  filters: {
    id: 'id',
    name: 'name',
    companyName: 'name',
    // citext: case-insensitive equality in SQL.
    email: 'billing_email',
    phone: 'phone',
    status: { column: 'status', toColumn: toSnakeCase },
    crNumber: 'cr_number',
    vatNumber: 'vat_number',
    industry: 'industry',
    isListed: { column: 'is_listed', toColumn: Boolean },
    primaryContactId: 'primary_contact_id',
  },

  // A churned customer stays in the ERP list (README section 8).
  activeFilter: undefined,

  softDelete: { column: 'status', value: 'churned' },
};

export default mapping;
