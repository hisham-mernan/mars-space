import { activityRepository } from '@/repositories';
import { eventBus, DOMAIN_EVENTS } from '@/core/events/EventBus';

export class ActivityService {
  constructor() {
    this._registerEventHandlers();
  }

  _registerEventHandlers() {
    // Automatically log domain events to the universal timeline
    eventBus.subscribe(DOMAIN_EVENTS.BOOKING_CREATED, async (event) => {
      const { booking } = event.payload;
      await this.logActivity({
        type: 'booking',
        title: `New Booking ${booking.reference}`,
        titleAr: `تم إنشاء حجز جديد ${booking.reference}`,
        description: `${booking.customerName} reserved ${booking.resourceName} for ${booking.date}`,
        descriptionAr: `قام ${booking.customerName} بحجز ${booking.resourceName} بتاريخ ${booking.date}`,
        entityId: booking.id,
        actor: booking.customerName
      });
    });

    eventBus.subscribe(DOMAIN_EVENTS.INVOICE_PAID, async (event) => {
      const { invoice } = event.payload;
      await this.logActivity({
        type: 'finance',
        title: `Invoice Paid ${invoice.invoiceNumber}`,
        titleAr: `تم تم سداد الفاتورة ${invoice.invoiceNumber}`,
        description: `Payment of ${invoice.total} SAR processed for ${invoice.customerName}`,
        descriptionAr: `تم تحصيل مبلغ ${invoice.total} ريال لصالح ${invoice.customerName}`,
        entityId: invoice.id,
        actor: invoice.customerName
      });
    });

    eventBus.subscribe(DOMAIN_EVENTS.CRM_LEAD_CREATED, async (event) => {
      const { lead } = event.payload;
      await this.logActivity({
        type: 'crm',
        title: `New Lead ${lead.name}`,
        titleAr: `تم تسجيل عميل محتمل جديد ${lead.name}`,
        description: `Lead from ${lead.source || 'Website'} added to sales pipeline`,
        descriptionAr: `عميل مهتم جديد عبر ${lead.source || 'الموقع الإكتروني'}`,
        entityId: lead.id,
        actor: lead.name
      });
    });

    eventBus.subscribe(DOMAIN_EVENTS.TICKET_CREATED, async (event) => {
      const { ticket } = event.payload;
      await this.logActivity({
        type: 'support',
        title: `Ticket Submitted ${ticket.ticketNumber}`,
        titleAr: `تم فتح تذكرة دعم جديدة ${ticket.ticketNumber}`,
        description: `${ticket.customerName}: ${ticket.subject}`,
        descriptionAr: `${ticket.customerName}: ${ticket.subject}`,
        entityId: ticket.id,
        actor: ticket.customerName
      });
    });
  }

  /**
   * Append one entry to the universal timeline.
   *
   * NO CLOCK IS FORMATTED HERE, AND THAT IS THE FIX.
   *
   * This used to store `time: new Date().toLocaleTimeString([], {...})` — the
   * PROCESS's local zone, with no timeZone option. On a developer's machine in
   * Jeddah that is Riyadh time by luck; on Vercel, which runs in UTC, every
   * entry was frozen into the row three hours behind the floor it describes.
   * Mars Space is Asia/Riyadh, UTC+3, no DST, always.
   *
   * The fix is not a timeZone option. `public.audit_log.created_at` is a
   * timestamptz defaulted to now(), so the instant is already stored, correctly,
   * by Postgres; a second rendering of that same instant is derived state whose
   * only possible future is to disagree with it. It already did: live row 29
   * carries after->>'time' = '01:29 PM' against a created_at of 01:30 PM Riyadh,
   * because the string was formatted a beat before the INSERT landed.
   *
   * So the display string is not written at all. The activities mapping renders
   * `time` from created_at through riyadhClock() -> riyadhParts(), the single
   * Asia/Riyadh implementation in the repository layer, which is the same path
   * that already serves the rows written by database triggers and by the mobile
   * app. Format is unchanged ('01:44 PM'), so the ERP dashboard's time pill
   * renders exactly as before — but it now renders the instant, not the zone of
   * whichever machine happened to write the row.
   *
   * A caller that genuinely has its own timestamp may still pass `time` in
   * activityData and the mapper will prefer it; nothing in the app does.
   */
  async logActivity(activityData) {
    return activityRepository.create({
      desc: activityData.description,
      descAr: activityData.descriptionAr || activityData.description,
      ...activityData
    });
  }

  async getTimeline(limit = 20) {
    const activities = await activityRepository.getRecent(limit);
    if (activities.length === 0) {
      // Return default initial seeded activities
      return [
        { id: 'act-1', time: '09:32 AM', desc: 'Ahmed Alharbi checked in at Reception', descAr: 'تم تسجيل دخول أحمد الحربي في الاستقبال', type: 'reception' },
        { id: 'act-2', time: '09:40 AM', desc: 'Sarah Khan submitted Support Ticket MSP-2043', descAr: 'قامت سارة خان برفع تذكرة الدعم MSP-2043', type: 'support' },
        { id: 'act-3', time: '10:05 AM', desc: 'Invoice INV-2026-001288 paid securely via Mada', descAr: 'تم سداد الفاتورة INV-2026-001288 بنجاح عبر مدى', type: 'finance' },
        { id: 'act-4', time: '11:12 AM', desc: 'Booking MS-BK-1002 generated for Office A-101', descAr: 'تم إنشاء حجز مخصص للمكتب A-101 برقم MS-BK-1002', type: 'booking' }
      ];
    }
    return activities;
  }
}

export const activityService = new ActivityService();
