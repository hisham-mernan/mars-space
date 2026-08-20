/**
 * Member-facing data access.
 *
 * Every function takes a Supabase client so the same code runs in a Server
 * Component, a Client Component, a Route Handler, or the React Native app —
 * only the client differs. This module is the intended contents of the shared
 * @mars-space/shared package; keep it free of Next.js and browser imports.
 *
 * None of these functions filter by company for security. They pass a
 * company_id to narrow the result set, but Row Level Security is what actually
 * prevents one tenant reading another's rows. If a filter here were removed,
 * the query would return less — never more.
 */

/** Rows a member sees on their dashboard and bookings list. */
export async function listBookings(supabase, { companyId, scope = 'all', limit = 50 } = {}) {
  let q = supabase
    .from('booking_details')
    .select('*')
    .order('starts_at', { ascending: scope === 'upcoming' })
    .limit(limit);

  if (companyId) q = q.eq('company_id', companyId);

  if (scope === 'upcoming') {
    q = q.gte('starts_at', new Date().toISOString())
         .in('status', ['confirmed', 'checked_in']);
  } else if (scope === 'past') {
    q = q.lt('starts_at', new Date().toISOString());
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getBooking(supabase, id) {
  const { data, error } = await supabase
    .from('booking_details')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * The private office(s) a company occupies, current term first.
 * Powers the mobile app's My Office screen.
 */
export async function getMyOffices(supabase, companyId) {
  const { data, error } = await supabase
    .from('my_offices')
    .select('*')
    .eq('company_id', companyId)
    .order('is_current', { ascending: false })
    .order('starts_on', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getCurrentOffice(supabase, companyId) {
  const offices = await getMyOffices(supabase, companyId);
  return offices.find((o) => o.is_current) ?? null;
}

/**
 * Invoices. Returns [] rather than throwing when the member lacks the
 * view_invoices permission — RLS filters the rows out, which is the correct
 * outcome, not an error.
 */
export async function listInvoices(supabase, { companyId, status, limit = 100 } = {}) {
  let q = supabase
    .from('invoices')
    .select('*')
    .order('issue_date', { ascending: false })
    .limit(limit);

  if (companyId) q = q.eq('company_id', companyId);
  if (status && status !== 'all') q = q.eq('status', status);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getInvoice(supabase, id) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, line_items:invoice_line_items(*), payments(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Remaining meeting-room hours for the current period. */
export async function getCreditBalance(supabase, companyId) {
  const { data, error } = await supabase
    .from('credit_balances')
    .select('*')
    .eq('company_id', companyId)
    .order('period', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? { allocated_hours: 0, used_hours: 0, remaining_hours: 0 };
}

/** The community-space schedule. Upcoming events by default. */
export async function listCommunityEvents(supabase, { upcoming = true, limit = 50 } = {}) {
  let q = supabase
    .from('community_schedule')
    .select('*')
    .eq('status', 'scheduled')
    .order('starts_at', { ascending: true })
    .limit(limit);

  if (upcoming) q = q.gte('ends_at', new Date().toISOString());

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function listRepairRequests(supabase, { companyId, open = false, limit = 100 } = {}) {
  let q = supabase
    .from('repair_requests')
    .select('*, resource:resources(name, name_ar, slug)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (companyId) q = q.eq('company_id', companyId);
  if (open) q = q.in('status', ['submitted', 'acknowledged', 'in_progress', 'on_hold']);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createRepairRequest(supabase, input) {
  const { data, error } = await supabase
    .from('repair_requests')
    .insert({
      company_id: input.companyId,
      reported_by: input.reportedBy,
      branch_id: input.branchId,
      resource_id: input.resourceId ?? null,
      location_note: input.locationNote ?? null,
      category: input.category,
      priority: input.priority ?? 'normal',
      title: input.title,
      description: input.description ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** The employee roster, plus how many contracted seats remain. */
export async function listTeam(supabase, companyId) {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('company_id', companyId)
    .neq('status', 'removed')
    .order('role', { ascending: true })
    .order('full_name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getSeatUsage(supabase, companyId) {
  const [{ data: limit }, { data: used }] = await Promise.all([
    supabase.rpc('company_seat_limit', { p_company: companyId }),
    supabase.rpc('company_seats_used', { p_company: companyId }),
  ]);
  return { limit: limit ?? 0, used: used ?? 0, available: Math.max(0, (limit ?? 0) - (used ?? 0)) };
}

/** Toggle an employee's permissions. RLS requires manage_employees. */
export async function updateTeamMember(supabase, memberId, changes) {
  const { data, error } = await supabase
    .from('company_members')
    .update(changes)
    .eq('id', memberId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Bookable inventory for the booking flow. Public — no session needed. */
export async function listResources(supabase, { category, branchSlug, bookableOnly = true } = {}) {
  let q = supabase
    .from('resources')
    .select('*, branch:branches(slug, name, name_ar), photos:resource_photos(url, sort_order)')
    .eq('status', 'available')
    .order('rate', { ascending: true });

  if (bookableOnly) q = q.eq('is_bookable', true);
  if (category) q = q.eq('category', category);

  const { data, error } = await q;
  if (error) throw error;

  const rows = data ?? [];
  return branchSlug ? rows.filter((r) => r.branch?.slug === branchSlug) : rows;
}

export async function getResourceBySlug(supabase, slug) {
  const { data, error } = await supabase
    .from('resources')
    .select('*, branch:branches(*), photos:resource_photos(url, alt, alt_ar, sort_order)')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listMembershipPlans(supabase) {
  const { data, error } = await supabase
    .from('membership_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listAddons(supabase) {
  const { data, error } = await supabase
    .from('addons')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * What a slot would cost, without reserving anything. Both clients quote from
 * this so a member cannot be shown one price and charged another.
 */
export async function quoteBooking(supabase, { resourceId, startsAt, endsAt, companyId, addons = [] }) {
  const { data, error } = await supabase.rpc('price_booking', {
    p_resource_id: resourceId,
    p_time_range: `[${new Date(startsAt).toISOString()},${new Date(endsAt).toISOString()})`,
    p_company_id: companyId ?? null,
    p_addons: addons,
  });
  if (error) throw error;
  return data;
}

/**
 * Create a booking.
 *
 * The slot is arbitrated by a database exclusion constraint, so a losing race
 * surfaces here as SQLSTATE 23P01. Callers should catch `SlotTakenError` and
 * offer alternatives rather than showing a raw error — spec 8.3 is explicit
 * that a bare failure is not acceptable.
 */
export class SlotTakenError extends Error {
  constructor(message) {
    super(message || 'That slot has just been taken. Please choose another time.');
    this.name = 'SlotTakenError';
    this.code = 'SLOT_TAKEN';
  }
}

export async function createBooking(supabase, {
  resourceId, startsAt, endsAt, companyId, addons = [], notes,
  guestName, guestEmail, guestPhone, holdOnly = false, holdSessionId,
}) {
  const { data, error } = await supabase.rpc('create_booking', {
    p_resource_id: resourceId,
    p_time_range: `[${new Date(startsAt).toISOString()},${new Date(endsAt).toISOString()})`,
    p_company_id: companyId ?? null,
    p_addons: addons,
    p_notes: notes ?? null,
    p_guest_name: guestName ?? null,
    p_guest_email: guestEmail ?? null,
    p_guest_phone: guestPhone ?? null,
    p_hold_only: holdOnly,
    p_hold_session_id: holdSessionId ?? null,
  });

  if (error) {
    if (error.code === '23P01' || /just been taken/i.test(error.message ?? '')) {
      throw new SlotTakenError(error.message);
    }
    throw error;
  }
  return data;
}

export async function cancelBooking(supabase, bookingId, reason) {
  const { data, error } = await supabase.rpc('cancel_booking', {
    p_booking_id: bookingId,
    p_reason: reason ?? null,
  });
  if (error) throw error;
  return data;
}

export async function listNotifications(supabase, { unreadOnly = false, limit = 50 } = {}) {
  let q = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (unreadOnly) q = q.is('read_at', null);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(supabase, id) {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
