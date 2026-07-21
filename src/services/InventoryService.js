import { inventoryRepository } from '@/repositories';
import { eventBus, DOMAIN_EVENTS } from '@/core/events/EventBus';
import { auditLogService } from './AuditLogService';

export class InventoryService {
  async getInventory(category = null) {
    let items = await inventoryRepository.findAll();
    
    if (items.length === 0) {
      // Default seeded inventory
      items = [
        { id: 'inv-01', name: 'MacBook Pro 14"', category: 'Electronics', quantity: 8, minStock: 3, branch: 'Jeddah', cost: 7200 },
        { id: 'inv-02', name: 'LG 27" 4K Monitor', category: 'Electronics', quantity: 15, minStock: 5, branch: 'Jeddah', cost: 1800 },
        { id: 'inv-03', name: 'Ergonomic Office Chair', category: 'Furniture', quantity: 24, minStock: 8, branch: 'Jeddah', cost: 950 },
        { id: 'inv-04', name: 'Arabica Coffee Beans (5kg)', category: 'Pantry', quantity: 2, minStock: 4, branch: 'Jeddah', cost: 350 },
        { id: 'inv-05', name: 'HDMI to USB-C Adapter', category: 'Electronics', quantity: 30, minStock: 10, branch: 'Jeddah', cost: 90 },
        { id: 'inv-06', name: 'A4 Printing Paper (box)', category: 'Office Supplies', quantity: 12, minStock: 5, branch: 'Jeddah', cost: 180 }
      ];
    }

    if (category && category !== 'all') {
      return items.filter(i => i.category === category);
    }
    return items;
  }

  async addItem(data, actor = 'Inventory Admin') {
    const newItem = await inventoryRepository.create({
      name: data.name,
      category: data.category || 'Electronics',
      quantity: Number(data.quantity) || 1,
      minStock: Number(data.minStock) || 1,
      branch: data.branch || 'Jeddah',
      cost: Number(data.cost) || 100
    });

    await auditLogService.recordAudit({
      actor,
      action: 'ADD_INVENTORY_ITEM',
      module: 'INVENTORY',
      entityId: newItem.id,
      afterState: newItem
    });

    await eventBus.publish(DOMAIN_EVENTS.INVENTORY_UPDATED, { item: newItem, action: 'ADD' });
    return newItem;
  }

  async updateItem(id, updates, actor = 'Inventory Admin') {
    const beforeState = await inventoryRepository.findById(id);
    const updated = await inventoryRepository.update(id, updates);

    await auditLogService.recordAudit({
      actor,
      action: 'UPDATE_INVENTORY_ITEM',
      module: 'INVENTORY',
      entityId: id,
      beforeState,
      afterState: updated
    });

    await eventBus.publish(DOMAIN_EVENTS.INVENTORY_UPDATED, { item: updated, action: 'UPDATE' });
    return updated;
  }

  async deleteItem(id, actor = 'Inventory Admin') {
    const beforeState = await inventoryRepository.findById(id);
    await inventoryRepository.softDelete(id);

    await auditLogService.recordAudit({
      actor,
      action: 'DELETE_INVENTORY_ITEM',
      module: 'INVENTORY',
      entityId: id,
      beforeState
    });

    await eventBus.publish(DOMAIN_EVENTS.INVENTORY_UPDATED, { itemId: id, action: 'DELETE' });
    return true;
  }
}

export const inventoryService = new InventoryService();
