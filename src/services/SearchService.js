import {
  userRepository,
  bookingRepository,
  invoiceRepository,
  workspaceRepository,
  crmRepository,
  inventoryRepository,
  supportRepository
} from '@/repositories';

export class SearchService {
  async globalSearch(query) {
    if (!query || !query.trim()) return [];
    const q = query.toLowerCase().trim();

    const results = [];

    // Search Users / Members
    const users = await userRepository.findAll(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.company?.toLowerCase().includes(q));
    users.forEach(u => results.push({ category: 'Member', name: u.name, sub: `${u.email} · ${u.company || 'Member'}`, link: '/member' }));

    // Search Workspaces
    const spaces = await workspaceRepository.findAll(w => w.name?.toLowerCase().includes(q) || w.category?.toLowerCase().includes(q));
    spaces.forEach(s => results.push({ category: 'Workspace', name: s.name, sub: `${s.floor} · ${s.capacity} Pax`, link: `/erp/workspaces/${s.id}` }));

    // Search Bookings
    const bookings = await bookingRepository.findAll(b => b.reference?.toLowerCase().includes(q) || b.customerName?.toLowerCase().includes(q) || b.resourceName?.toLowerCase().includes(q));
    bookings.forEach(b => results.push({ category: 'Booking', name: `${b.reference} - ${b.resourceName}`, sub: `${b.customerName} · ${b.status}`, link: '/erp/workspaces' }));

    // Search Invoices
    const invoices = await invoiceRepository.findAll(i => i.invoiceNumber?.toLowerCase().includes(q) || i.customerName?.toLowerCase().includes(q));
    invoices.forEach(inv => results.push({ category: 'Invoice', name: inv.invoiceNumber, sub: `${inv.customerName} · ${inv.amount} SAR (${inv.status})`, link: '/erp/invoices' }));

    // Search CRM Leads
    const leads = await crmRepository.findAll(l => l.name?.toLowerCase().includes(q) || l.company?.toLowerCase().includes(q) || l.contact?.toLowerCase().includes(q));
    leads.forEach(l => results.push({ category: 'CRM Lead', name: l.name, sub: `${l.contact} · ${l.stage}`, link: '/erp/crm' }));

    // Search Inventory
    const invItems = await inventoryRepository.findAll(item => item.name?.toLowerCase().includes(q) || item.category?.toLowerCase().includes(q));
    invItems.forEach(i => results.push({ category: 'Inventory', name: i.name, sub: `${i.quantity} in stock (${i.category})`, link: '/erp/inventory' }));

    // Search Support Tickets
    const tickets = await supportRepository.findAll(t => t.ticketNumber?.toLowerCase().includes(q) || t.subject?.toLowerCase().includes(q) || t.customerName?.toLowerCase().includes(q));
    tickets.forEach(t => results.push({ category: 'Ticket', name: `${t.ticketNumber} - ${t.subject}`, sub: `${t.customerName} · ${t.status}`, link: '/erp' }));

    return results;
  }
}

export const searchService = new SearchService();
