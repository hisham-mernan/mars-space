/**
 * MAPPING - collection "crm_leads"  ->  public.leads
 *
 * The CRM pipeline. This is the mapping with the largest vocabulary gap in the
 * whole directory: the document's `stage` and the column `status` are the same
 * thing under two different sets of names, and CrmService.getPipeline() buckets
 * on the DOCUMENT names.
 *
 * Consumers of this document (grepped, not guessed):
 *   src/services/CrmService.js       getPipeline() groups by lead.stage into the
 *                                    literal buckets 'Leads' | 'Contacted' |
 *                                    'Proposal Sent' | 'Won'.
 *                                    createLead() writes name, contact, email,
 *                                    phone, company, source, stage, value, notes.
 *                                    updateLeadStage() patches { stage } only.
 *   src/services/SearchService.js    l.name, l.company, l.contact, l.stage
 *   src/app/erp/crm/page.js          l.id, l.name, l.company, l.value, l.source,
 *                                    l.stage, l.email, l.phone, l.notes
 *   src/app/api/v1/erp/crm/route.js  GET pipeline / POST create / PUT stage
 *   src/app/api/v1/public/contact/route.js  POST -> crmService.createLead()
 *
 * STAGE <-> STATUS. leads.status is NOT NULL DEFAULT 'new' with
 *   CHECK (status IN ('new','contacted','qualified','converted','lost')).
 * The document vocabulary is the four kanban column headings the ERP renders,
 * plus 'Lost':
 *     'Leads'         <-> 'new'
 *     'Contacted'     <-> 'contacted'
 *     'Proposal Sent' <-> 'qualified'
 *     'Won'           <-> 'converted'
 *     'Lost'          <-> 'lost'
 * A lost lead reads back as stage 'Lost'. getPipeline() creates a bucket for it
 * (`if (!stages[stg]) stages[stg] = []`) and the kanban renders only the four
 * columns, so a lost lead stays in the API payload without reappearing as a live
 * opportunity - which is what activeFilter: none is meant to achieve.
 * An unrecognised stage on WRITE throws with the valid list rather than being
 * passed through to trip leads_status_check with an opaque Postgres message.
 *
 * NON-OBVIOUS TRANSLATIONS
 *   name    -> full_name     (renamed column; NOT NULL)
 *   company -> company_name  (renamed column; leads are pre-conversion, so this
 *                             is free text and NOT a companies FK)
 *   notes   -> message       (renamed column - the public contact form's message
 *                             body is the same field the ERP shows as "notes")
 *   stage   -> status        (see above)
 *   source  -> source        Title Case in the document, lowercase snake in the
 *                            column, per README section 2, so the ERP's
 *                            'Website Contact Form' round-trips through
 *                            'website_contact_form'. The column has no CHECK; it
 *                            is NOT NULL DEFAULT 'website'.
 *   email   -> email         citext, NOT NULL. Case-insensitive in SQL.
 *
 * KNOWN LOSSES (fields with no column)
 *   value   - public.leads has NO monetary column. Synthesised as 0 on read and
 *             dropped on write, per README section 8. VISIBLE CONSEQUENCE: the
 *             kanban cards render "0 SAR" and every column total is
 *             "Est: 0 SAR". Storing deal value needs a migration adding e.g.
 *             leads.estimated_value numeric(12,2).
 *   contact - no column. CrmService.createLead() sets
 *             `contact: leadData.name || leadData.contact || 'Inquirer'`, i.e.
 *             in every existing code path the contact IS the lead's own name, so
 *             `contact` is echoed back from full_name rather than nulled. That
 *             keeps SearchService's l.contact predicate working. A contact
 *             person genuinely DIFFERENT from the lead's name cannot be stored
 *             and is lost on write.
 *   `status` is deliberately NOT exposed as a document field: the document calls
 *   it `stage`, and carrying both would make the write path ambiguous.
 *
 * ALSO MAPPED, though no ERP service reads them yet: topic, preferredDate,
 * preferredTime, workspaceInterest and assignedTo are real columns written by
 * the public/mobile enquiry flows. toDocument must be honest about the row it
 * was handed (README section 4), and documents get persisted verbatim into audit
 * beforeState/afterState, so dropping them would lose real data.
 *
 * isDeleted / softDelete / activeFilter (README sections 5 and 8)
 *   softDelete    -> status = 'lost'
 *   activeFilter  -> none. A lost lead stays in the pipeline.
 *   isDeleted     -> derived, status === 'lost', so softDelete(id) followed by
 *                    findById(id) reports true.
 *
 * Live schema confirmed with information_schema.columns / pg_constraint:
 *   id uuid PK DEFAULT gen_random_uuid(), full_name text NOT NULL,
 *   email citext NOT NULL, phone text, company_name text, topic text,
 *   message text, source text NOT NULL DEFAULT 'website', preferred_date date,
 *   preferred_time text, workspace_interest text,
 *   status text NOT NULL DEFAULT 'new'
 *     CHECK ('new','contacted','qualified','converted','lost'),
 *   assigned_to uuid -> profiles(id) ON DELETE SET NULL,
 *   created_at timestamptz NOT NULL DEFAULT now(),
 *   updated_at timestamptz NOT NULL DEFAULT now().
 *   full_name and email are the only NOT NULL columns without a default.
 */

import { put, toTitleCase, toSnakeCase, toDateOnly } from './_helpers';

/** column value -> the stage name CrmService.getPipeline() buckets on. */
const STAGE_BY_STATUS = {
  new: 'Leads',
  contacted: 'Contacted',
  qualified: 'Proposal Sent',
  converted: 'Won',
  lost: 'Lost',
};

/**
 * The inverse, keyed by the lowercased stage so 'Proposal Sent', 'proposal sent'
 * and a raw column value like 'qualified' all resolve. Keeping the raw statuses
 * here means findWhere({ stage: 'lost' }) works as well as
 * findWhere({ stage: 'Lost' }).
 */
const STATUS_BY_STAGE = {
  leads: 'new',
  new: 'new',
  contacted: 'contacted',
  'proposal sent': 'qualified',
  qualified: 'qualified',
  won: 'converted',
  converted: 'converted',
  lost: 'lost',
};

/**
 * Stage -> a value leads_status_check will accept, or a thrown error naming the
 * valid stages. Silently writing an unmapped stage would either corrupt the
 * pipeline or surface as an unreadable CHECK violation.
 */
function stageToStatus(stage) {
  const key = String(stage).trim().toLowerCase();
  const status = STATUS_BY_STAGE[key];
  if (!status) {
    throw new Error(
      `crm_leads: unknown pipeline stage "${stage}". Valid stages are ` +
        `'Leads', 'Contacted', 'Proposal Sent', 'Won', 'Lost' ` +
        `(public.leads.status accepts new, contacted, qualified, converted, lost).`
    );
  }
  return status;
}

const mapping = {
  table: 'leads',
  // No embeds: company_name is free text (a lead has no companies FK yet) and
  // assigned_to is only ever read back as an id.
  selectColumns: '*',
  idColumn: 'id',
  defaultOrder: { column: 'created_at', ascending: false },

  toDocument(row) {
    if (!row) return null;

    return {
      id: row.id,
      name: row.full_name ?? null,
      // No column. Echoed from full_name - see the header.
      contact: row.full_name ?? null,
      email: row.email ?? null,
      phone: row.phone ?? null,
      company: row.company_name ?? null,
      // 'website_contact_form' -> 'Website Contact Form'.
      source: toTitleCase(row.source) ?? null,
      // The bucket key CrmService.getPipeline() groups on. Unknown values from a
      // future CHECK relaxation fall back to 'Leads' rather than throwing:
      // toDocument must be total (README section 4).
      stage: STAGE_BY_STATUS[row.status] ?? 'Leads',
      // No monetary column on public.leads. Always 0; see the header.
      value: 0,
      notes: row.message ?? null,

      // Real columns, written by the public/mobile enquiry flows.
      topic: row.topic ?? null,
      preferredDate: toDateOnly(row.preferred_date),
      preferredTime: row.preferred_time ?? null,
      workspaceInterest: row.workspace_interest ?? null,
      assignedTo: row.assigned_to ?? null,

      // No isDeleted column exists; softDelete() is status='lost', so derive the
      // flag from the same status (README section 5a).
      isDeleted: row.status === 'lost',
      createdAt: row.created_at ?? null,
      updatedAt: row.updated_at ?? null,
    };
  },

  toRow(doc, mode) {
    const row = {};

    // CrmService.createLead() reads leadData.name || leadData.fullName, so both
    // spellings reach this point; accept either, `name` wins.
    put(row, 'full_name', doc.name !== undefined ? doc.name : doc.fullName);
    put(row, 'email', doc.email);
    put(row, 'phone', doc.phone);
    put(row, 'company_name', doc.company);
    // 'Website Contact Form' -> 'website_contact_form'. No CHECK on this column,
    // but keeping it lowercase snake matches the mobile app's rows and makes the
    // toTitleCase read a lossless round trip.
    put(row, 'source', doc.source, toSnakeCase);
    // stageToStatus THROWS on an unknown stage rather than writing it.
    put(row, 'status', doc.stage, stageToStatus);
    // The document calls it notes; the column is message.
    put(row, 'message', doc.notes);

    put(row, 'topic', doc.topic);
    put(row, 'preferred_date', doc.preferredDate);
    put(row, 'preferred_time', doc.preferredTime);
    put(row, 'workspace_interest', doc.workspaceInterest);
    put(row, 'assigned_to', doc.assignedTo);

    if (mode === 'create') {
      // full_name and email are the only NOT NULL columns with no default.
      // CrmService.createLead() defaults the name but passes leadData.email
      // straight through, so a contact form posted without an email lands here.
      // Name the field instead of letting a bare 23502 escape.
      if (row.full_name === undefined || row.full_name === null || row.full_name === '') {
        throw new Error(
          'crm_leads.create() requires a name: public.leads.full_name is NOT NULL ' +
            'with no default.'
        );
      }
      if (row.email === undefined || row.email === null || row.email === '') {
        throw new Error(
          'crm_leads.create() requires an email: public.leads.email is NOT NULL ' +
            'with no default. The enquiry form must collect one before the lead ' +
            'can be stored.'
        );
      }
      // status and source have defaults ('new', 'website'), so an omitted stage
      // correctly lands in the 'Leads' column.
    }

    // Deliberately NOT written, and listed in the header as known losses:
    //   doc.value   - public.leads has no monetary column.
    //   doc.contact - no column; it is echoed from full_name on read.
    //   id / created_at / updated_at / isDeleted - BaseRepository's job, or no
    //     such column at all (README section 3).
    return row;
  },

  /**
   * Document field -> column equality, pushed into Postgres by findWhere().
   * `stage` backs CrmRepository#findByStage and does the vocabulary translation
   * in SQL, so the pipeline query stays a single indexed equality.
   */
  filters: {
    id: 'id',
    name: 'full_name',
    // citext: case-insensitive equality in SQL.
    email: 'email',
    phone: 'phone',
    company: 'company_name',
    stage: { column: 'status', toColumn: stageToStatus },
    source: { column: 'source', toColumn: toSnakeCase },
    topic: 'topic',
    workspaceInterest: 'workspace_interest',
    assignedTo: 'assigned_to',
    preferredDate: 'preferred_date',
    // NOTE: `value` and `contact` are intentionally absent - neither is a
    // column, so an .eq() against them would be a lie. findWhere throws for
    // unmapped keys, which is the correct outcome.
  },

  // A lost lead stays in the pipeline (README section 8).
  activeFilter: undefined,

  softDelete: { column: 'status', value: 'lost' },
};

export default mapping;
