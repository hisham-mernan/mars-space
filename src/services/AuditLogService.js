import { auditRepository } from '@/repositories';

export class AuditLogService {
  async recordAudit(params) {
    const { actor, action, module, entityId, beforeState = null, afterState = null, ip = '127.0.0.1' } = params;
    return auditRepository.create({
      actor,
      action,
      module,
      entityId,
      beforeState,
      afterState,
      ip,
      timestamp: new Date().toISOString()
    });
  }

  async getAuditLogs(filter = {}) {
    return auditRepository.findAll(item => {
      if (filter.module && item.module !== filter.module) return false;
      if (filter.actor && item.actor !== filter.actor) return false;
      return true;
    });
  }
}

export const auditLogService = new AuditLogService();
