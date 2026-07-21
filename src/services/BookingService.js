import { bookingRepository, workspaceRepository } from '@/repositories';
import { checkAvailability, calculatePrice } from '@/lib/db';
import { eventBus, DOMAIN_EVENTS } from '@/core/events/EventBus';
import { auditLogService } from './AuditLogService';

export class BookingService {
  async getBookings(filters = {}) {
    return bookingRepository.findAll(b => {
      if (filters.customerId && b.customerId !== filters.customerId) return false;
      if (filters.resourceId && b.resourceId !== filters.resourceId) return false;
      if (filters.status && b.status !== filters.status) return false;
      return true;
    });
  }

  async checkRoomAvailability(resourceId, date, startTime, endTime, excludeBookingId = null) {
    return checkAvailability(resourceId, date, startTime, endTime, excludeBookingId);
  }

  async computePricing(resourceId, date, startTime, endTime, userId = null) {
    return calculatePrice(resourceId, date, startTime, endTime, userId);
  }

  async createBooking(bookingData, actor = 'System') {
    const { resourceId, date, startTime, endTime, customerId, customerName, customerEmail } = bookingData;

    // 1. Conflict validation check
    const availability = await this.checkRoomAvailability(resourceId, date, startTime, endTime);
    if (!availability.available) {
      throw new Error(availability.reason || 'Resource unavailable for requested time');
    }

    // 2. Resource details
    const resource = await workspaceRepository.findById(resourceId);
    if (!resource) throw new Error('Requested resource does not exist');

    // 3. Compute pricing
    const pricing = await this.computePricing(resourceId, date, startTime, endTime, customerId);

    // 4. Create booking entity
    const refNumber = `MS-BK-${Math.floor(1000 + Math.random() * 9000)}`;
    const newBooking = await bookingRepository.create({
      reference: refNumber,
      customerId: customerId || 'usr-guest',
      customerName: customerName || 'Guest Customer',
      customerEmail: customerEmail || 'guest@example.com',
      resourceId: resource.id,
      resourceName: resource.name,
      resourceNameAr: resource.nameAr,
      date,
      startTime,
      endTime,
      duration: pricing.hours,
      status: 'Confirmed',
      paymentStatus: 'Pending',
      totalAmount: pricing.total,
      subtotal: pricing.subtotal,
      vat: pricing.vat
    });

    // 5. Log audit trail
    await auditLogService.recordAudit({
      actor: actor || customerName || 'Customer',
      action: 'CREATE_BOOKING',
      module: 'BOOKINGS',
      entityId: newBooking.id,
      afterState: newBooking
    });

    // 6. Emit Domain Event -> Decoupled subscribers will trigger Invoice Creation, Notifications, Activity Timeline
    await eventBus.publish(DOMAIN_EVENTS.BOOKING_CREATED, { booking: newBooking });

    return newBooking;
  }
}

export const bookingService = new BookingService();
