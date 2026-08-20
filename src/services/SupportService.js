import { supportRepository } from '@/repositories';
import { eventBus, DOMAIN_EVENTS } from '@/core/events/EventBus';
import { auditLogService } from './AuditLogService';

export class SupportService {
  async getTickets(customerId = null) {
    let tickets = await supportRepository.findAll();

    if (tickets.length === 0) {
      tickets = [
        {
          id: 'tick-2043',
          ticketNumber: 'MSP-2043',
          customerId: 'usr-01',
          customerName: 'Ahmed Alharbi',
          subject: 'Intermittent Wi-Fi coverage in Suite A-101',
          category: 'IT & Internet',
          priority: 'High',
          status: 'In Progress',
          createdAt: '2026-07-20T09:40:00Z',
          messages: [
            { sender: 'Ahmed Alharbi', text: 'Signal drops near the whiteboard area.', time: '09:40 AM' },
            { sender: 'Noura (IT Staff)', text: 'Our network engineer is deploying an extra mesh pod right now.', time: '10:15 AM' }
          ]
        }
      ];
    }

    if (customerId) {
      return tickets.filter(t => t.customerId === customerId);
    }
    return tickets;
  }

  async createTicket(ticketData, actor = 'Member') {
    const num = `MSP-${Math.floor(2000 + Math.random() * 8000)}`;
    const newTicket = await supportRepository.create({
      ticketNumber: num,
      customerId: ticketData.customerId || 'usr-01',
      customerName: ticketData.customerName || 'Ahmed Alharbi',
      subject: ticketData.subject,
      category: ticketData.category || 'General Support',
      priority: ticketData.priority || 'Medium',
      status: 'Open',
      // The thread is rows in public.support_messages, not a column on this
      // table. BaseRepository issues a single-table insert, so the mapping
      // salvages messages[0].text into `description` and drops everything else
      // (see the support_tickets mapping header).
      //
      // NO `time` IS SENT, for two reasons. It used to be
      // `new Date().toLocaleTimeString([], {...})` — the PROCESS's local zone
      // with no timeZone option, which is UTC on Vercel and so three hours
      // behind Asia/Riyadh (UTC+3, no DST) on every ticket the product actually
      // creates. And it was dead weight even when it was right: the field never
      // reached Postgres, while the read path derives each message's `time` from
      // support_messages.created_at through riyadhClock(). The instant belongs
      // in a timestamptz column; the clock string belongs to the reader.
      messages: [
        {
          sender: ticketData.customerName || 'Member',
          text: ticketData.description || ticketData.subject
        }
      ]
    });

    await auditLogService.recordAudit({
      actor,
      action: 'CREATE_SUPPORT_TICKET',
      module: 'SUPPORT',
      entityId: newTicket.id,
      afterState: newTicket
    });

    await eventBus.publish(DOMAIN_EVENTS.TICKET_CREATED, { ticket: newTicket });
    return newTicket;
  }

  async resolveTicket(id, resolutionNotes, actor = 'Staff') {
    const ticket = await supportRepository.findById(id);
    if (!ticket) throw new Error('Ticket not found');

    const updated = await supportRepository.update(id, {
      status: 'Resolved',
      resolutionNotes,
      resolvedAt: new Date().toISOString()
    });

    await eventBus.publish(DOMAIN_EVENTS.TICKET_RESOLVED, { ticket: updated });
    return updated;
  }
}

export const supportService = new SupportService();
