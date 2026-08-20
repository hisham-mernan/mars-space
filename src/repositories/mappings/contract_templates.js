/**
 * MAPPING: collection "contract_templates"  ->  public.contract_templates
 *
 * See ./README.md for the module contract.
 *
 * The unfilled agreement bodies ContractService.getTemplates() serves and
 * createContract() interpolates. `body` still carries its {{Placeholder}}
 * tokens; interpolation happens in the service, and the filled text is stored
 * per amendment in contract_versions - never back into a template.
 *
 * ---------------------------------------------------------------------------
 * ids AND slugs
 *
 * The old db.json template ids were stable hand-written strings ('tpl-office',
 * 'tpl-coworking'). Postgres gives every row a uuid primary key and keeps that
 * stable key in `slug` (text NOT NULL UNIQUE).
 *
 * The document's `id` is therefore the UUID - it has to be, because
 * BaseRepository#findById looks up idColumn 'id' - and `slug` is exposed as its
 * own document field. A caller holding a legacy id finds its row with
 * findOneWhere({ slug: 'tpl-office' }); the `slug` filter below exists for
 * exactly that. On create, a non-uuid `id` on the incoming document is taken as
 * the slug, which is what makes importing the db.json fixtures a straight
 * pass-through.
 *
 * ---------------------------------------------------------------------------
 * FIELD -> COLUMN
 *
 *   id        -> id (uuid)        legacy string ids land in `slug` instead
 *   name      -> name             NOT NULL
 *   nameAr    -> name_ar
 *   category  -> category         Title Case <-> lowercase snake, see below
 *   body      -> body             NOT NULL
 *   bodyAr    -> body_ar
 *   isActive  -> is_active
 *   sortOrder -> sort_order
 *
 * contract_templates_category_check: private_office, dedicated_desk, hot_desk,
 * coworking, meeting_room, virtual_office, custom. 'Private Office' snake-cases
 * straight onto 'private_office'. Anything unrecognised becomes 'custom' rather
 * than raising a constraint violation - 'custom' is precisely the escape hatch
 * the vocabulary provides, and ContractService uses tpl.category as a free-text
 * plan label (`planName: builderData.planName || tpl.category`).
 *
 * No known losses: every field the services and the ERP contracts page read
 * (id, name, category, body, bodyAr) has a column.
 *
 * ---------------------------------------------------------------------------
 * isDeleted / softDelete / ordering
 *
 * Soft delete is `is_active = false`, so isDeleted is derived from it, and
 * unlike most collections there IS an activeFilter: a retired template must
 * disappear from the builder's template picker (README section 8).
 *
 * defaultOrder deviates from the usual created_at desc: this table carries an
 * explicit `sort_order integer NOT NULL DEFAULT 0` whose only purpose is the
 * order the picker lists templates in. Rows sharing a sort_order fall back to
 * whatever order Postgres returns them in; give templates distinct sort_order
 * values if that matters.
 */

import { put, toTitleCase, toSnakeCase, isUuid } from './_helpers';

/** contract_templates_category_check */
const TEMPLATE_CATEGORIES = [
  'private_office', 'dedicated_desk', 'hot_desk', 'coworking',
  'meeting_room', 'virtual_office', 'custom',
];

function categoryToColumn(value) {
  const snake = toSnakeCase(value);
  return TEMPLATE_CATEGORIES.includes(snake) ? snake : 'custom';
}

/**
 * 'Private Office Suite Agreement' -> 'private-office-suite-agreement'.
 * Local rather than in _helpers because slug shape is this table's business.
 * Returns '' when nothing survives (an Arabic-only name, say), which toRow
 * turns into an explicit error rather than a NOT NULL violation.
 */
function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const mapping = {
  table: 'contract_templates',
  selectColumns: '*',
  idColumn: 'id',

  // See the header: sort_order is this table's display order, not created_at.
  defaultOrder: { column: 'sort_order', ascending: true },

  /** Retired templates must vanish from the contract builder's picker. */
  activeFilter: (q) => q.eq('is_active', true),

  filters: {
    // The legacy db.json id ('tpl-office') lives here.
    slug: 'slug',
    name: 'name',
    isActive: 'is_active',
    category: { column: 'category', toColumn: categoryToColumn },
  },

  softDelete: { column: 'is_active', value: false },

  toDocument(row) {
    if (!row) return null;
    return {
      id: row.id,
      slug: row.slug ?? null,
      name: row.name ?? null,
      nameAr: row.name_ar ?? null,
      category: toTitleCase(row.category),
      body: row.body ?? '',
      bodyAr: row.body_ar ?? null,
      isActive: row.is_active !== false,
      sortOrder: row.sort_order ?? 0,

      isDeleted: row.is_active === false,
      createdAt: row.created_at ?? null,
      updatedAt: row.updated_at ?? null,
    };
  },

  toRow(doc, mode) {
    const row = {};
    if (!doc) return row;

    // A non-uuid `id` on the incoming document is a legacy db.json key and is
    // the slug. BaseRepository strips the non-uuid `id` from the payload itself,
    // so the value is only read here, never written to the primary key.
    const legacyId =
      typeof doc.id === 'string' && doc.id !== '' && !isUuid(doc.id) ? doc.id : undefined;
    put(row, 'slug', doc.slug !== undefined ? doc.slug : legacyId);

    put(row, 'name', doc.name);
    put(row, 'name_ar', doc.nameAr);
    put(row, 'category', doc.category, categoryToColumn);
    put(row, 'body', doc.body);
    put(row, 'body_ar', doc.bodyAr);
    put(row, 'is_active', doc.isActive, Boolean);
    put(row, 'sort_order', doc.sortOrder, Number);

    if (mode === 'create') {
      // slug, name and body are NOT NULL with no default.
      row.slug ??= slugify(doc.name);
      const missing = [];
      if (!row.slug) missing.push('slug (or an id/name it can be derived from)');
      if (!row.name) missing.push('name');
      if (row.body === undefined || row.body === null) missing.push('body');
      if (missing.length) {
        throw new Error(
          '[contract_templates -> public.contract_templates] cannot create a template: ' +
            `${missing.join(', ')} required (NOT NULL with no default). ` +
            `Received: id=${JSON.stringify(doc.id ?? null)}, ` +
            `slug=${JSON.stringify(doc.slug ?? null)}, name=${JSON.stringify(doc.name ?? null)}.`
        );
      }
    }

    return row;
  },
};

export default mapping;
