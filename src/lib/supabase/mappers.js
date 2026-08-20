/**
 * Row shape adapters: Postgres snake_case -> the camelCase shape the existing
 * pages already render.
 *
 * The database is snake_case because that is the SQL convention and because
 * PostgREST exposes column names verbatim. The website was written against the
 * old db.json, which used camelCase and a handful of names that no longer exist
 * (`image` is now `hero_image`, `gallery` is a separate resource_photos table,
 * `size` is `size_sqm`).
 *
 * Rather than rewrite every page's JSX, the API routes map here. That keeps the
 * migration to the data layer and leaves the UI untouched.
 *
 * New code — and the whole mobile app — should read the snake_case rows
 * directly via src/lib/supabase/queries.js and skip these adapters entirely.
 * They exist to retire the old shape, not to entrench it.
 */

export function mapResource(row) {
  if (!row) return null;

  const photos = Array.isArray(row.photos)
    ? [...row.photos].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((p) => p.url)
    : [];

  return {
    id: row.id,
    slug: row.slug,
    branchId: row.branch?.slug ?? row.branch_id,
    name: row.name,
    nameAr: row.name_ar,
    category: row.category,
    floor: row.floor,
    loc: row.location,
    locAr: row.location_ar,
    capacity: row.capacity,
    size: row.size_sqm != null ? Number(row.size_sqm) : null,
    rate: row.rate != null ? Number(row.rate) : null,
    rateUnit: row.rate_unit,
    // The old data used title-case status strings ('Available', 'Occupied')
    // and some pages compare against them.
    status: row.status ? row.status[0].toUpperCase() + row.status.slice(1) : null,
    isBookable: row.is_bookable,
    teaser: row.teaser,
    teaserAr: row.teaser_ar,
    features: row.features ?? [],
    featuresAr: row.features_ar ?? [],
    amenities: row.amenities ?? [],
    amenitiesAr: row.amenities_ar ?? [],
    image: row.hero_image,
    // Fall back to the hero image so a resource with no photo rows still
    // renders a gallery rather than an empty carousel.
    gallery: photos.length ? photos : (row.hero_image ? [row.hero_image] : []),
  };
}

export function mapBranch(row) {
  if (!row) return null;
  return {
    id: row.slug,
    uuid: row.id,
    name: row.name,
    nameAr: row.name_ar,
    code: row.code,
    // 'coming_soon' -> 'Coming Soon'
    status: row.status
      ? row.status.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
      : null,
    timeZone: row.time_zone,
    currency: row.currency,
    address: row.address,
    addressAr: row.address_ar,
    gps: row.latitude != null && row.longitude != null
      ? `${row.latitude}, ${row.longitude}`
      : null,
  };
}

export function mapFaq(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    category: row.category,
    question: row.question,
    questionAr: row.question_ar,
    answer: row.answer,
    answerAr: row.answer_ar,
    featured: row.is_featured,
  };
}

export function mapPlan(row) {
  if (!row) return null;
  return {
    id: row.slug,
    uuid: row.id,
    name: row.name,
    nameAr: row.name_ar,
    rate: row.rate != null ? Number(row.rate) : null,
    billingCycle: row.billing_cycle,
    creditHours: row.included_credit_hours != null ? Number(row.included_credit_hours) : 0,
    features: row.features ?? [],
    featuresAr: row.features_ar ?? [],
  };
}

export function mapAddon(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameAr: row.name_ar,
    price: row.price != null ? Number(row.price) : 0,
    quote: row.is_quote_only,
  };
}

/** Takes a row from the community_schedule view. */
export function mapEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleAr: row.title_ar,
    description: row.description,
    descriptionAr: row.description_ar,
    date: row.event_date,
    time: row.start_time && row.end_time ? `${row.start_time} - ${row.end_time}` : null,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    location: row.venue_name,
    locationAr: row.venue_name_ar,
    speakers: row.speakers,
    speakersAr: row.speakers_ar,
    capacity: row.capacity,
    attendeesCount: row.registered_count ?? 0,
    image: row.hero_image,
    status: row.status ? row.status[0].toUpperCase() + row.status.slice(1) : null,
  };
}

/** Takes a row from the booking_details view. */
export function mapBooking(row) {
  if (!row) return null;
  return {
    id: row.id,
    reference: row.reference,
    resourceId: row.resource_id,
    resourceName: row.resource_name,
    resourceNameAr: row.resource_name_ar,
    date: row.booking_date,
    startTime: row.start_time,
    endTime: row.end_time,
    hours: row.hours != null ? Number(row.hours) : null,
    status: row.status,
    customerName: row.guest_name,
    customerEmail: row.guest_email,
    customerPhone: row.guest_phone,
    creditHoursUsed: row.credit_hours_used != null ? Number(row.credit_hours_used) : 0,
    subtotal: row.subtotal != null ? Number(row.subtotal) : 0,
    vat: row.vat_amount != null ? Number(row.vat_amount) : 0,
    total: row.total != null ? Number(row.total) : 0,
    qrCode: row.qr_code,
    createdAt: row.created_at,
  };
}

export function mapInvoice(row) {
  if (!row) return null;
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    companyId: row.company_id,
    type: row.kind,
    description: row.description,
    descriptionAr: row.description_ar,
    date: row.issue_date,
    dueDate: row.due_date,
    subtotal: row.subtotal != null ? Number(row.subtotal) : 0,
    vat: row.vat_amount != null ? Number(row.vat_amount) : 0,
    total: row.total != null ? Number(row.total) : 0,
    amount: row.total != null ? Number(row.total) : 0,
    amountPaid: row.amount_paid != null ? Number(row.amount_paid) : 0,
    // Old data used 'Paid' / 'Unpaid'; some screens compare against those.
    status: row.status
      ? row.status.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
      : null,
    pdfPath: row.pdf_path,
    paidAt: row.paid_at,
    items: Array.isArray(row.line_items)
      ? row.line_items.map((li) => ({
          item: li.description,
          qty: Number(li.quantity),
          unitPrice: Number(li.unit_price),
          total: Number(li.line_total),
        }))
      : [],
  };
}
