import { crmRepository } from '@/repositories';
import { eventBus, DOMAIN_EVENTS } from '@/core/events/EventBus';
import { auditLogService } from './AuditLogService';

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
