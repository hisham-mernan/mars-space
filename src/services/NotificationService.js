import { notificationRepository } from '@/repositories';
import { eventBus, DOMAIN_EVENTS } from '@/core/events/EventBus';

export class NotificationService {
  constructor() {
    this._registerEventHandlers();
  }

  _registerEventHandlers() {
    eventBus.subscribe(DOMAIN_EVENTS.BOOKING_CREATED, async (event) => {
      const { booking } = event.payload;
      await this.sendNotification({
        userId: booking.customerId,
        recipient: booking.customerName,
        channel: 'In-App',
        title: 'Booking Confirmation Pass',
        titleAr: 'تأكيد الحجز وتمريرة الدخول',
        message: `Your booking for ${booking.resourceName} on ${booking.date} (${booking.startTime} - ${booking.endTime}) is confirmed.`,
        messageAr: `تم تأكيد حجزك في ${booking.resourceName} بتاريخ ${booking.date}`
      });
    });

    eventBus.subscribe(DOMAIN_EVENTS.INVOICE_GENERATED, async (event) => {
      const { invoice } = event.payload;
      await this.sendNotification({
        userId: invoice.customerId,
        recipient: invoice.customerName,
        channel: 'Email',
        title: `Invoice #${invoice.invoiceNumber} Issued`,
        titleAr: `تم إصدار الفاتورة #${invoice.invoiceNumber}`,
        message: `An invoice of ${invoice.total} SAR has been generated for your account.`,
        messageAr: `تم إصدار فاتورة بمبلغ ${invoice.total} ريال للحساب.`
      });
    });
  }

  async sendNotification(data) {
    return notificationRepository.create({
      status: 'Sent',
      read: false,
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  async getMemberNotifications(userId) {
    return notificationRepository.findAll(n => n.userId === userId || !n.userId);
  }
}

export const notificationService = new NotificationService();
