import { workspaceRepository } from '@/repositories';
import { eventBus, DOMAIN_EVENTS } from '@/core/events/EventBus';
import { auditLogService } from './AuditLogService';

export class WorkspaceService {
  async getWorkspaces(filters = {}) {
    return workspaceRepository.findAll(w => {
      if (filters.category && w.category !== filters.category) return false;
      if (filters.branchId && w.branchId !== filters.branchId) return false;
      if (filters.capacity && w.capacity < Number(filters.capacity)) return false;
      return true;
    });
  }

  async getWorkspaceById(id) {
    return workspaceRepository.findById(id);
  }

  async getWorkspaceBySlug(slug) {
    return workspaceRepository.findBySlug(slug);
  }

  async createWorkspace(data, actor = 'Admin Staff') {
    const newSpace = await workspaceRepository.create({
      branchId: data.branchId || 'jeddah',
      name: data.name,
      nameAr: data.nameAr || data.name,
      slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
      category: data.category || 'private_office',
      floor: data.floor || 'Floor 1',
      capacity: Number(data.capacity) || 4,
      size: data.size || 25,
      rate: Number(data.rate) || 4500,
      status: data.status || 'Available',
      amenities: data.amenities || ["High-Speed Wi-Fi", "Ergonomic Chairs", "Keyless Entry"],
      amenitiesAr: data.amenitiesAr || ["إنترنت فائق السرعة", "كراسي مريحة", "دخول بدون مفتاح"],
      image: data.image || '/assets/photo-glass-offices.jpg',
      gallery: data.gallery || ['/assets/photo-glass-offices.jpg']
    });

    await auditLogService.recordAudit({
      actor,
      action: 'CREATE_WORKSPACE',
      module: 'WORKSPACES',
      entityId: newSpace.id,
      afterState: newSpace
    });

    await eventBus.publish(DOMAIN_EVENTS.WORKSPACE_UPDATED, { workspace: newSpace, action: 'CREATE' });
    return newSpace;
  }

  async updateWorkspace(id, updates, actor = 'Admin Staff') {
    const beforeState = await workspaceRepository.findById(id);
    if (!beforeState) throw new Error('Workspace not found');

    const updatedSpace = await workspaceRepository.update(id, updates);

    await auditLogService.recordAudit({
      actor,
      action: 'UPDATE_WORKSPACE',
      module: 'WORKSPACES',
      entityId: id,
      beforeState,
      afterState: updatedSpace
    });

    await eventBus.publish(DOMAIN_EVENTS.WORKSPACE_UPDATED, { workspace: updatedSpace, action: 'UPDATE' });
    return updatedSpace;
  }

  async deleteWorkspace(id, actor = 'Admin Staff') {
    const beforeState = await workspaceRepository.findById(id);
    if (!beforeState) throw new Error('Workspace not found');

    await workspaceRepository.softDelete(id);

    await auditLogService.recordAudit({
      actor,
      action: 'DELETE_WORKSPACE',
      module: 'WORKSPACES',
      entityId: id,
      beforeState
    });

    await eventBus.publish(DOMAIN_EVENTS.WORKSPACE_UPDATED, { workspaceId: id, action: 'DELETE' });
    return true;
  }
}

export const workspaceService = new WorkspaceService();
