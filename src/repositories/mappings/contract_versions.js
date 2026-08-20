/**
 * MAPPING: collection "contract_versions"  ->  public.contract_versions
 *
 * See ./README.md for the module contract.
 *
 * The append-only amendment history behind a contract. Each row is the
 * INTERPOLATED document text as it stood at that version - the filled contract,
 * not the template - so contracts.js reads the newest row of this table to
 * project `version`, `content`, `contentAr` and `templateId` onto a contract
 * document, none of which public.contracts stores itself.
 *
 * ---------------------------------------------------------------------------
 * FIELD -> COLUMN
 *
 *   contractId  -> contract_id     uuid NOT NULL, FK contracts ON DELETE CASCADE
 *   version     -> version         integer NOT NULL, CHECK (version > 0),
 *                                  UNIQUE (contract_id, version)
 *   content     -> content         NOT NULL
 *   contentAr   -> content_ar
 *   reason      -> reason          'Initial Contract Draft Generation', ...
 *   reasonAr    -> reason_ar
 *   templateId  -> template_id     uuid FK contract_templates
 *   documentPath-> document_path   contracts/<contract_id>/v<n>.pdf
 *   createdBy   -> created_by_name OR created_by   <-- see below
 *
 * `createdBy` IS TWO COLUMNS. ContractService passes an actor LABEL
 * ('Sales Executive', 'Executive Manager', 'System CLM Automation'), which goes
 * to created_by_name (text). created_by is a profiles FK and is only written
 * when the actor is actually a uuid. On read the label wins and the uuid is the
 * fallback, so the document's `createdBy` is always something printable; the raw
 * FK is also exposed separately as `createdById`.
 *
 * ---------------------------------------------------------------------------
 * KNOWN LOSSES
 *
 *   templateId   ContractService passes the TEMPLATE DOCUMENT's id, which for a
 *                seeded db.json template is the legacy string 'tpl-office', not
 *                a uuid. template_id is a uuid FK, so a legacy id is dropped to
 *                null (the FK is nullable and ON DELETE SET NULL, so an unknown
 *                template is a legitimate state). Once contract_templates is
 *                populated from Postgres the ids are real uuids and this stops
 *                losing anything - see contract_templates.js on slugs.
 *
 * No other field the services read is unmapped.
 *
 * ---------------------------------------------------------------------------
 * isDeleted / softDelete
 *
 * `isDeleted` is a constant false: the row exists, so it is not deleted, and
 * there is no lifecycle column to derive anything else from.
 *
 * softDelete is null. This table is an append-only legal history - a version a
 * customer signed against cannot be withdrawn, it is superseded by writing the
 * next version. BaseRepository#softDelete therefore THROWS with the reason
 * below rather than quietly reporting success, which is the whole point of
 * declaring it null (README section 5c).
 */

import { put, num, isUuid } from './_helpers';

const mapping = {
  table: 'contract_versions',

  /** The template name, when a real template uuid was recorded. */
  selectColumns: [
    '*',
    'template:contract_templates(id,slug,name,name_ar)',
    'author:profiles!contract_versions_created_by_fkey(id,full_name,full_name_ar)',
  ].join(','),

  idColumn: 'id',

  // Newest first, matching every other collection. ContractVersionRepository
  // #findByContract overrides this with version ascending, which is the order a
  // history is read in.
  defaultOrder: { column: 'created_at', ascending: false },

  // No activeFilter: nothing in this table is ever hidden.

  filters: {
    contractId: 'contract_id',
    version: { column: 'version', toColumn: Number },
    templateId: 'template_id',
    createdBy: 'created_by_name',
    createdById: 'created_by',
  },

  softDelete: null,
  softDeleteReason:
    'contract_versions is the append-only amendment history of a contract; ' +
    'a version that has been sent or signed against is superseded by writing ' +
    'the next version, never withdrawn',

  toDocument(row) {
    if (!row) return null;
    return {
      id: row.id,
      contractId: row.contract_id ?? null,
      version: num(row.version) ?? 1,

      content: row.content ?? '',
      contentAr: row.content_ar ?? null,
      documentPath: row.document_path ?? null,

      reason: row.reason ?? null,
      reasonAr: row.reason_ar ?? null,

      templateId: row.template_id ?? null,
      templateName: row.template?.name ?? null,

      // The ERP's free-text actor label, falling back to the linked profile.
      createdBy: row.created_by_name ?? row.author?.full_name ?? row.created_by ?? null,
      createdById: row.created_by ?? null,

      isDeleted: false,
      createdAt: row.created_at ?? null,
      updatedAt: row.updated_at ?? null,
    };
  },

  toRow(doc, mode) {
    const row = {};
    if (!doc) return row;

    put(row, 'contract_id', doc.contractId);
    put(row, 'version', doc.version, Number);
    put(row, 'content', doc.content);
    put(row, 'content_ar', doc.contentAr);
    put(row, 'document_path', doc.documentPath);
    put(row, 'reason', doc.reason);
    put(row, 'reason_ar', doc.reasonAr);

    // A legacy template id ('tpl-office') is not a uuid; see KNOWN LOSSES.
    put(row, 'template_id', doc.templateId, (v) => (isUuid(v) ? v : null));

    // One document field, two columns: a uuid is the profiles FK, anything else
    // is the ERP's free-text actor label.
    if (doc.createdBy !== undefined) {
      if (isUuid(doc.createdBy)) {
        row.created_by = doc.createdBy;
      } else {
        row.created_by_name = doc.createdBy === null ? null : String(doc.createdBy);
      }
    }
    put(row, 'created_by_name', doc.createdByName);
    put(row, 'created_by', doc.createdById, (v) => (isUuid(v) ? v : null));

    if (mode === 'create') {
      // contract_id, version and content are NOT NULL with no default.
      row.version ??= 1;
      row.content ??= '';
      if (!isUuid(row.contract_id)) {
        throw new Error(
          '[contract_versions -> public.contract_versions] cannot create a version: ' +
            'contractId -> contract_id must be a public.contracts uuid (NOT NULL, FK). ' +
            `Received ${JSON.stringify(doc.contractId ?? null)}.`
        );
      }
      if (!(Number(row.version) > 0)) {
        throw new Error(
          '[contract_versions -> public.contract_versions] version must be a positive ' +
            `integer (CHECK version > 0). Received ${JSON.stringify(doc.version ?? null)}.`
        );
      }
    }

    return row;
  },
};

export default mapping;
