/**
 * Decoupled Domain Event Bus for Mars Space Enterprise SaaS Platform
 * Allows services to emit events and react asynchronously without tight coupling.
 */

class EventBus {
  constructor() {
    this.listeners = {};
  }

  /**
   * Subscribe a callback listener to a domain event name
   * @param {string} eventName 
   * @param {Function} callback 
   */
  subscribe(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
    };
  }

  /**
   * Publish a domain event to all subscribers asynchronously
   * @param {string} eventName 
   * @param {Object} payload 
   */
  async publish(eventName, payload = {}) {
    if (!this.listeners[eventName]) return;

    const eventData = {
      eventName,
      timestamp: new Date().toISOString(),
      payload
    };

    // Execute handlers
    const promises = this.listeners[eventName].map(async (callback) => {
      try {
        await callback(eventData);
      } catch (err) {
        console.error(`[EventBus Error] Failed handling ${eventName}:`, err);
      }
    });

    await Promise.all(promises);
  }
}

// Global Singleton Instance
export const eventBus = new EventBus();

// Defined Domain Event Constants
export const DOMAIN_EVENTS = {
  MEMBER_REGISTERED: 'MEMBER_REGISTERED',
  BOOKING_CREATED: 'BOOKING_CREATED',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
  INVOICE_GENERATED: 'INVOICE_GENERATED',
  INVOICE_PAID: 'INVOICE_PAID',
  CONTRACT_SENT: 'CONTRACT_SENT',
  CONTRACT_VIEWED: 'CONTRACT_VIEWED',
  CONTRACT_SIGNED: 'CONTRACT_SIGNED',
  CONTRACT_COUNTERSIGNED: 'CONTRACT_COUNTERSIGNED',
  CONTRACT_ACTIVATED: 'CONTRACT_ACTIVATED',
  CONTRACT_AMENDED: 'CONTRACT_AMENDED',
  CONTRACT_RENEWED: 'CONTRACT_RENEWED',
  TICKET_CREATED: 'TICKET_CREATED',
  TICKET_RESOLVED: 'TICKET_RESOLVED',
  INVENTORY_UPDATED: 'INVENTORY_UPDATED',
  CRM_LEAD_CREATED: 'CRM_LEAD_CREATED',
  CRM_LEAD_STAGE_CHANGED: 'CRM_LEAD_STAGE_CHANGED',
  WORKSPACE_UPDATED: 'WORKSPACE_UPDATED'
};
