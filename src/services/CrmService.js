import { crmRepository } from '@/repositories';
import { eventBus, DOMAIN_EVENTS } from '@/core/events/EventBus';
import { auditLogService } from './AuditLogService';
import crmLeadsMapping from '@/repositories/mappings/crm_leads';

/**
 * CRM.
 *
 * TWO WRITE PATHS, ON PURPOSE:
 *
 *   createLead()        STAFF. Goes through crmRepository, i.e. through
 *                       BaseRepository, i.e. through the SERVICE-ROLE client
 *                       with RLS bypassed. Only reachable from
 *                       /api/v1/erp/crm, which is behind requireStaff().
 *
 *   createPublicLead()  ANONYMOUS VISITORS. Deliberately does NOT touch a
 *                       repository. See the long note on that method.
 *
 * They are separate functions rather than a flag because the difference is a
 * trust boundary, and a boolean parameter is far too easy to get wrong at a
 * call site.
 */
export class CrmService {
  async getPipeline() {
    let leads = await crmRepository.findAll();

    if (leads.length === 0) {
      // Return default initial seeded leads
      leads = [
        { id: 'deal-1', name: 'Zain Tech Team', contact: 'Kariem Said', stage: 'Leads', value: 12000, company: 'Zain', email: 'kariem@zain.com' },
        { id: 'deal-2', name: 'Red Sea Logistics', contact: 'Omar Bakr', stage: 'Contacted', value: 48000, company: 'RSL', email: 'omar@rsl.com' },
        { id: 'deal-3', name: 'Aramco Innovation Lab', contact: 'Mona Al-Ghamdi', stage: 'Proposal Sent', value: 96000, company: 'Aramco', email: 'mona@aramco.com' },
        { id: 'deal-4', name: 'Neom Ventures', contact: 'Yousef Hassan', stage: 'Won', value: 140000, company: 'Neom', email: 'yousef@neom.com' }
      ];
    }

    // Group leads into pipeline stages
    const stages = {
      'Leads': [],
      'Contacted': [],
      'Proposal Sent': [],
      'Won': []
    };

    leads.forEach(lead => {
      const stg = lead.stage || 'Leads';
      if (!stages[stg]) stages[stg] = [];
      stages[stg].push(lead);
    });

    return stages;
  }

  /**
   * STAFF lead creation. Service-role write, plus an audit row.
   *
   * `actor` is a staff identity ('Sales Admin'), which is the whole reason the
   * audit row is worth writing: it records that a named human created this
   * lead. Do NOT call this from a public route — the audit trail is a record of
   * staff actions, and there is no anonymous "actor" to name.
   * Anonymous submissions go through createPublicLead() below.
   */
  async createLead(leadData, actor = 'System') {
    const newLead = await crmRepository.create({
      name: leadData.name || leadData.fullName || 'New Lead',
      contact: leadData.name || leadData.contact || 'Inquirer',
      email: leadData.email,
      phone: leadData.phone || leadData.mobile,
      company: leadData.company || 'Individual',
      source: leadData.source || 'Website Contact Form',
      stage: 'Leads',
      value: Number(leadData.value || 12000),
      notes: leadData.message || leadData.notes || 'Interested in workspace solutions.'
    });

    await auditLogService.recordAudit({
      actor: actor || leadData.name,
      action: 'CREATE_CRM_LEAD',
      module: 'CRM',
      entityId: newLead.id,
      afterState: newLead
    });

    await eventBus.publish(DOMAIN_EVENTS.CRM_LEAD_CREATED, { lead: newLead });
    return newLead;
  }

  /**
   * ==========================================================================
   * ANONYMOUS lead creation, for the public contact and tour forms.
   * ==========================================================================
   *
   * WHY THIS DOES NOT USE crmRepository. Every repository write goes through
   * BaseRepository, which uses createAdminClient() — the service-role key, with
   * Row Level Security switched off. That is right for the ERP and wrong here:
   * it means the route handler's own validation is the *only* thing standing
   * between an unauthenticated stranger and a write, with nothing underneath it
   * if that validation has a hole.
   *
   * public.leads does not need the service role. Checked against the live
   * database:
   *
   *   GRANT INSERT ON public.leads TO anon;
   *   CREATE POLICY leads_public_insert ON public.leads
   *     FOR INSERT TO public WITH CHECK (true);
   *
   * and anon has INSERT and *nothing else* on that table — no SELECT, no
   * UPDATE, no DELETE. So this method uses the anon client from
   * src/lib/supabase/server.js, and the worst a total compromise of the route
   * above can now achieve is inserting a row into one table. It cannot read a
   * lead back, cannot touch another table, and cannot escalate. That is a real
   * second line of defence, which the service-role version had none of.
   *
   * The consequence to design around: with no SELECT grant, PostgREST cannot
   * return the inserted row. `.insert()` is therefore called WITHOUT `.select()`
   * (supabase-js then sends `Prefer: return=minimal`), and this method returns
   * nothing but success. That is a feature — a public endpoint has no business
   * echoing a database row, its uuid or its internal shape back to whoever
   * posted the form.
   *
   * WHY THERE IS NO AUDIT ROW. The previous implementation called
   * auditLogService.recordAudit() for every anonymous submission. That was
   * wrong three times over:
   *
   *   1. It was only possible at all because of the service role. anon holds no
   *      INSERT grant on public.audit_log and no INSERT policy exists for it, so
   *      RLS was not "allowing" that write — it was being bypassed. Nothing about
   *      the security model ever intended anonymous writes to the ledger.
   *   2. audit_log answers "which staff member did this, and to what". An
   *      anonymous form has no actor to name; the rows it produced were labelled
   *      with the constant string 'Public Contact Form'. That is not an audit
   *      entry, it is a log line.
   *   3. It stored NOTHING that the lead row does not already store. The
   *      envelope's afterState was the freshly created lead document, duplicated
   *      verbatim — including every attacker-controlled string — into the ledger
   *      staff read. Two rows written per submission, one of them pure
   *      amplification, in a table that is append-only by design and has no
   *      delete path to clean up with.
   *
   * The record of a public enquiry IS the lead row: it carries the submitted
   * fields, its `source` names the form, and created_at is the timestamp.
   * Nothing is lost by not duplicating it. Staff actions ON that lead
   * (updateLeadStage) still audit normally, and that trail is now free of
   * anonymous text.
   *
   * WHAT THIS METHOD ASSUMES. That `lead` has ALREADY been validated, length-
   * bounded and normalised by the caller. This is not the validation layer —
   * src/app/api/v1/public/contact/route.js is, and it is the only caller.
   *
   * @param {{ name: string, email: string, phone?: string, company?: string,
   *           topic?: string, message?: string, source?: string,
   *           preferredDate?: string, preferredTime?: string,
   *           workspaceInterest?: string }} lead
   *   Clean, camelCase, in the same document vocabulary the rest of the CRM
   *   speaks. `name` and `email` are required (full_name and email are the only
   *   NOT NULL columns on public.leads without a default).
   * @returns {Promise<{ created: true }>} Deliberately opaque.
   */
  async createPublicLead(lead) {
    // The column translation (name -> full_name, company -> company_name,
    // notes -> message, source -> snake_case, ...) lives in exactly one place:
    // the mapping module the repository also uses. Reimplementing it here would
    // let the two write paths drift apart the first time a column is renamed.
    // toRow() in 'create' mode also enforces the two NOT NULL columns.
    const row = crmLeadsMapping.toRow(
      {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        topic: lead.topic,
        notes: lead.message,
        source: lead.source || 'Website Contact Form',
        preferredDate: lead.preferredDate,
        preferredTime: lead.preferredTime,
        workspaceInterest: lead.workspaceInterest,
        // `stage` is left unset so public.leads.status takes its DEFAULT 'new'.
        // A public form must never be able to choose the pipeline stage, and
        // `assigned_to` is likewise never accepted from a visitor.
      },
      'create'
    );

    // Belt and braces: strip anything undefined so PostgREST is not asked to
    // insert a literal `undefined`, and make sure nothing an attacker could
    // smuggle through a future refactor sets these.
    delete row.assigned_to;
    delete row.status;
    for (const key of Object.keys(row)) {
      if (row[key] === undefined) delete row[key];
    }

    // Imported lazily, the same way src/lib/supabase/admin.js does it: the
    // module reaches for next/headers, and pulling that into the top level of
    // CrmService would drag it into every module that imports '@/services'.
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    // No .select(): anon has no SELECT grant on public.leads (see above), so
    // asking for the row back would turn a successful insert into an error.
    const { error } = await supabase.from('leads').insert(row);

    if (error) {
      // Attach the PostgREST code so the route can log it, and keep the message
      // free of the submitted values — BaseRepository#_error() echoes the whole
      // row into its message, and that string has a habit of ending up in
      // response bodies.
      const err = new Error(
        `public lead insert failed (${error.code || 'no code'}): ${error.message}`
      );
      err.cause = error;
      err.code = error.code;
      throw err;
    }

    // ------------------------------------------------------------------------
    // NO eventBus.publish(CRM_LEAD_CREATED) HERE, AND THAT IS THE POINT.
    //
    // Follow the only subscriber. ActivityService's constructor registers a
    // handler for CRM_LEAD_CREATED (src/services/ActivityService.js), and that
    // handler calls logActivity() -> activityRepository.create() -> the
    // `activities` mapping -> public.audit_log via the SERVICE-ROLE client. It
    // interpolates the payload straight into the stored text:
    //
    //     title:   `New Lead ${lead.name}`
    //     titleAr: `تم تسجيل عميل محتمل جديد ${lead.name}`
    //     actor:   lead.name
    //
    // So publishing from here would put back, one indirection further away,
    // exactly what removing the recordAudit() call took out: a second
    // RLS-bypassing insert into the append-only audit_log table per anonymous
    // submission, carrying the visitor's own string. The singleton is
    // constructed as a side effect of importing '@/services', so the
    // subscription is always live — there is no configuration in which this
    // event goes nowhere.
    //
    // Sanitising the payload instead was considered and rejected: it would
    // still be an anonymous request driving a service-role write, it would
    // still double the row growth per submission, and it would leave the ERP
    // timeline showing a placeholder rather than anything useful.
    //
    // DELIBERATE BEHAVIOUR CHANGE: public enquiries no longer appear on the ERP
    // activity feed. They appear in the CRM pipeline, which is where sales
    // actually works them, with `source` naming the form and created_at the
    // timestamp. If the timeline entry is genuinely wanted back, the right
    // shape is a database trigger on public.leads or a staff-side sweep — not
    // an anonymous HTTP request reaching the service-role key.
    // ------------------------------------------------------------------------

    return { created: true };
  }

  async updateLeadStage(id, newStage, actor = 'Sales Admin') {
    const lead = await crmRepository.findById(id);

    const updated = await crmRepository.update(id, { stage: newStage });

    await auditLogService.recordAudit({
      actor,
      action: 'UPDATE_LEAD_STAGE',
      module: 'CRM',
      entityId: id,
      beforeState: lead,
      afterState: updated
    });

    await eventBus.publish(DOMAIN_EVENTS.CRM_LEAD_STAGE_CHANGED, { lead: updated, newStage });
    return updated;
  }
}

export const crmService = new CrmService();
