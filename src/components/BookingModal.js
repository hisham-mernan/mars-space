'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useSession } from '@/context/SessionContext';
import { createClient } from '@/lib/supabase/client';

/**
 * ============================================================================
 * BookingModal — the public booking / tour / lease / membership flow
 * ============================================================================
 *
 * WHAT WAS WRONG
 * --------------
 * This component used to show the confirmation screen unconditionally. It
 * awaited `fetch` without reading `res.ok` and called `setDone(true)` in BOTH
 * the `try` and the `catch`, so a guest saw "Booking confirmed" whatever the
 * server said. And the server always said no, because the payload was built
 * from display strings:
 *
 *     resourceId: sp.name.toLowerCase()  ->  "small meeting room"
 *     date:       "Today, Thu 23 Jul"
 *     startTime:  "10 AM"
 *
 * POST /api/v1/public/bookings answered 404 "Requested resource does not
 * exist" to every one of them. Guests walked away believing they held rooms
 * that had never been reserved.
 *
 * WHAT IT DOES NOW
 * ----------------
 * 1. The catalogue is REAL. Rooms and add-ons are read from Supabase with the
 *    anon key (RLS applies; `resources_read` and `addons_read` permit exactly
 *    the active, non-retired rows a visitor may see). The hardcoded demo list
 *    named rooms — Ventures, Lab, VC — that are `retired` and `is_bookable =
 *    false` in the live database, so *no* payload built from it could ever
 *    have succeeded. The resource's uuid travels through selection; nothing
 *    parses a label back into an identifier.
 *
 * 2. Dates and times are REAL. A day is a `Date`, carried as `iso`
 *    ("2026-08-21") with a separately formatted label. An hour is an index,
 *    carried as `HH:00`. The display strings are derived from the values and
 *    never the other way round.
 *
 * 3. The price is the SERVER'S price. `price_booking()` is STABLE SECURITY
 *    DEFINER and granted to `anon` precisely so guest checkout can quote
 *    itself; it applies the 4- and 8-hour block rates that `rate x hours`
 *    would have got wrong. If the quote cannot be fetched the UI says the
 *    price is confirmed at checkout rather than inventing one.
 *
 * 4. Failure is VISIBLE. `res.ok` is checked, the response is parsed, and the
 *    confirmation renders only after a real success — showing the real
 *    `reference` the database issued. Validation, an already-taken slot (the
 *    exclusion-constraint 409), a withdrawn resource, rate limiting, server
 *    errors and network loss each get their own bilingual message.
 *
 * 5. The other flows no longer lie either. Tour, office and membership
 *    requests now POST to /api/v1/public/contact and only confirm on a 201.
 *    They used to render "Request received" without contacting anything.
 *
 * 6. THE CARD FORM IS GONE. It collected a card number, expiry and CVC and
 *    posted them nowhere: there is no payment processor in this application.
 *    /api/v1/public/bookings/[id]/payment says so explicitly — a guest
 *    booking raises no invoice and "online card payment is not available
 *    yet". Harvesting card details into a form that discards them, then
 *    telling the guest "Payment received", was the same lie as the fake
 *    confirmation with worse consequences. The final step is now an honest
 *    review, and the confirmation says the booking is settled with the team.
 *
 * WHAT IS STILL NOT TRUE, AND WHY IT CANNOT BE FIXED HERE
 * ------------------------------------------------------
 * The hour grid cannot show real availability. `bookings_read_own` scopes the
 * table to the caller's own company, so an anonymous visitor reads nothing —
 * there is no public free/busy surface to query. The old code papered over
 * that with `bookedMap`, a hardcoded pattern of fake "booked" hatching, which
 * told visitors that free hours were taken and taken hours were free. That has
 * been removed rather than replaced: the grid now marks only what this client
 * can actually know — hours already past today, and slots the server has just
 * refused as taken — and the database arbitrates the rest through its
 * exclusion constraint, whose 409 is surfaced verbatim to the user. Publishing
 * real availability needs a public availability endpoint or view; that is a
 * server change and belongs outside this file.
 *
 * This is a client component. It imports the browser Supabase client only —
 * nothing `server-only`, nothing holding the service-role key.
 */

// ---------------------------------------------------------------------------
// Time. Asia/Riyadh is UTC+3 year-round with no DST, but the formatters below
// still name the zone explicitly so the values do not drift with the viewer's
// own clock — someone booking from London must get Riyadh's "today".
// ---------------------------------------------------------------------------

const RIYADH_TZ = 'Asia/Riyadh';

/** First and last bookable hour of the day, 24-hour. 08:00 -> 20:00. */
const OPEN_HOUR = 8;
const HOUR_SLOTS = 12;

/** How many days forward the day picker offers. */
const DAYS_OFFERED = 3;

const ISO_DATE_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: RIYADH_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const RIYADH_HOUR_FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: RIYADH_TZ,
  hour: '2-digit',
  hour12: false,
});

/** "2026-08-21" in Riyadh, for whatever instant `d` is. */
function riyadhIsoDate(d) {
  return ISO_DATE_FMT.format(d);
}

/** The hour of day in Riyadh, 0-23. */
function riyadhHour(d) {
  return Number(RIYADH_HOUR_FMT.format(d)) % 24;
}

const pad2 = (n) => String(n).padStart(2, '0');

/** Slot index -> the 24-hour value the API wants. Slot 2 -> "10:00". */
const slotStartValue = (slot) => `${pad2(OPEN_HOUR + slot)}:00`;

/** The end of a run of `length` slots beginning at `slot`. */
const slotEndValue = (slot, length) => `${pad2(OPEN_HOUR + slot + length)}:00`;

/** Riyadh instant, matching what the API route builds for the tstzrange. */
const riyadhInstant = (isoDate, time) => `${isoDate}T${time}:00+03:00`;

/** 12-hour label for a slot, purely for display. */
function slotLabel(slot) {
  const h = OPEN_HOUR + slot;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve} ${suffix}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Local imagery, keyed by category. `resource_photos` is empty for every live
 * resource today, so without this the gallery would render nothing. The photo
 * is presentation; the identity is always the row's uuid.
 */
const CATEGORY_IMAGERY = {
  meeting_room: [
    '/assets/photo-glass-offices.jpg',
    '/assets/photo-vip-lounge.jpg',
    '/assets/photo-coworking.jpg',
  ],
  focus_pod: [
    '/assets/photo-vip-lounge.jpg',
    '/assets/photo-lounge-velvet.jpg',
    '/assets/photo-glass-offices.jpg',
  ],
  community_hall: [
    '/assets/photo-community-cinema.jpg',
    '/assets/photo-lounge-velvet.jpg',
    '/assets/photo-coworking.jpg',
  ],
};

const FALLBACK_IMAGERY = [
  '/assets/photo-coworking.jpg',
  '/assets/photo-glass-offices.jpg',
  '/assets/photo-vip-lounge.jpg',
];

/** Tour slots: the underlying HH:MM is the value, the label is derived. */
const TOUR_SLOTS = ['10:00', '11:30', '13:00', '15:00', '16:30'];

/** Membership plans are a lead-capture flow; the slug is what the API takes. */
const PLAN_SLUGS = ['day-pass', 'open-desk', 'dedicated-desk'];

export default function BookingModal({
  isOpen,
  onClose,
  initialFlow = 'book',
  initialSpaceIndex = 0,
  initialOfficeIndex = 0,
  initialPlanIndex = 0,
}) {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const { user, activeCompany, hasPerm } = useSession();

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  /**
   * A member booking must name a company they hold `book_rooms` on —
   * create_booking() refuses a signed-in caller who passes no company
   * ("Select a company to book for"). A signed-out visitor books as a guest
   * with name and email, which is the path this modal is mostly used on.
   *
   * Computed before the hooks below because the quote effect needs it: the
   * price differs when a company's credit allowance covers part of the hours.
   */
  const bookingCompanyId =
    user && activeCompany?.id && hasPerm('book_rooms') ? activeCompany.id : null;
  const signedInWithoutBookableCompany = Boolean(user) && !bookingCompanyId;

  // Active Flow State
  const [flow, setFlow] = useState(initialFlow);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  // Selection Trackers
  const [spaceIndex, setSpaceIndex] = useState(initialSpaceIndex);
  const [officeIndex, setOfficeIndex] = useState(initialOfficeIndex);
  const [planIndex, setPlanIndex] = useState(initialPlanIndex);

  // Gallery Active Image Index
  const [galIndex, setGalIndex] = useState(0);

  // Schedule & Booking Selection State
  const [dateIndex, setDateIndex] = useState(0);
  const [selStart, setSelStart] = useState(-1);
  const [selLen, setSelLen] = useState(0);
  const [tourTimeIndex, setTourTimeIndex] = useState(1);
  const [selectedAddonIds, setSelectedAddonIds] = useState([]);

  // Form Details State
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Live catalogue, read straight from Supabase under RLS.
  const [resourceRows, setResourceRows] = useState([]);
  const [addonRows, setAddonRows] = useState([]);
  const [catalogueState, setCatalogueState] = useState('idle'); // idle|loading|ready|error

  // The server's quote for the current selection.
  const [quote, setQuote] = useState(null);
  const [quoteState, setQuoteState] = useState('idle'); // idle|loading|ready|error

  // Outcome. `confirmation` is only ever set from a successful response.
  const [submitError, setSubmitError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  /**
   * Slots the server has told us are gone, keyed `${resourceId}|${isoDate}`.
   * This is the only "unavailable" marking that reflects reality — it is
   * populated from an actual 409, never guessed.
   */
  const [takenSlots, setTakenSlots] = useState({});

  /**
   * The instant the modal opened. Fixing it here keeps "today" and "hours
   * already past" stable for the life of the flow instead of shifting under
   * the user mid-selection.
   */
  const [openedAt, setOpenedAt] = useState(null);

  // Reset or initialize state when modal opens or initial props change
  useEffect(() => {
    if (isOpen) {
      setFlow(initialFlow);
      setStep(0);
      setDone(false);
      setSpaceIndex(initialSpaceIndex);
      setOfficeIndex(initialOfficeIndex);
      setPlanIndex(initialPlanIndex);
      setGalIndex(0);
      setDateIndex(0);
      setSelStart(-1);
      setSelLen(0);
      setTourTimeIndex(1);
      setSelectedAddonIds([]);
      setFullName(user?.name || '');
      setCompany(activeCompany?.name || '');
      setEmail(user?.email || '');
      setPhone(user?.phone || '');
      setNotes('');
      setSubmitError(null);
      setConfirmation(null);
      setQuote(null);
      setQuoteState('idle');
      setTakenSlots({});
      setOpenedAt(new Date());
    }
  }, [
    isOpen,
    initialFlow,
    initialSpaceIndex,
    initialOfficeIndex,
    initialPlanIndex,
    user?.name,
    user?.email,
    user?.phone,
    activeCompany?.name,
  ]);

  // ---- catalogue ----------------------------------------------------------
  // Read with the anon key. `resources_read` hides retired rows and
  // `addons_read` hides inactive ones, so what comes back is exactly what a
  // visitor is allowed to see — and, unlike the old hardcoded array, exactly
  // what the booking RPC will accept.
  useEffect(() => {
    if (!isOpen) return undefined;
    if (!supabase) {
      setCatalogueState('error');
      return undefined;
    }

    let cancelled = false;
    setCatalogueState('loading');

    (async () => {
      const [resources, addons] = await Promise.all([
        supabase
          .from('resources')
          .select(
            'id, slug, name, name_ar, category, capacity, rate, rate_unit, ' +
              'teaser, teaser_ar, features, features_ar, amenities, amenities_ar, hero_image'
          )
          .eq('is_bookable', true)
          .eq('status', 'available')
          .in('category', ['meeting_room', 'focus_pod', 'community_hall'])
          .order('rate', { ascending: true }),
        supabase
          .from('addons')
          .select('id, slug, name, name_ar, price, is_quote_only')
          .eq('is_active', true)
          .order('price', { ascending: true }),
      ]);

      if (cancelled) return;

      if (resources.error || addons.error) {
        // The detail belongs in the console, not in front of a visitor.
        console.error('[BookingModal] catalogue load failed', resources.error || addons.error);
        setCatalogueState('error');
        return;
      }

      setResourceRows(resources.data ?? []);
      setAddonRows(addons.data ?? []);
      setCatalogueState('ready');
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, supabase]);

  // ---- derived catalogue, localised --------------------------------------
  const num = useCallback(
    (n) => new Intl.NumberFormat(ar ? 'ar-EG' : 'en-US').format(n),
    [ar]
  );

  /**
   * Money always carries its halalas when it has any. `price_booking` returns
   * numeric(10,2), so 805 and 402.5 both arrive — showing the second as
   * "402.5" reads like a truncation of a real amount.
   */
  const amount = useCallback(
    (n) =>
      new Intl.NumberFormat(ar ? 'ar-EG' : 'en-US', {
        minimumFractionDigits: Number.isInteger(Number(n)) ? 0 : 2,
        maximumFractionDigits: 2,
      }).format(Number(n)),
    [ar]
  );

  const spaces = useMemo(
    () =>
      resourceRows
        // Rooms before halls, so index 0 is a meeting room. The picker renders
        // the two groups in that order and `initialSpaceIndex` — which the
        // homepage passes as a plain number — indexes into this array; sorting
        // by rate alone put the free community hall at 0 and pre-selected it
        // under the "Meeting rooms" heading.
        .slice()
        .sort((a, b) => {
          const rank = (r) => (r.category === 'community_hall' ? 1 : 0);
          return rank(a) - rank(b) || Number(a.rate) - Number(b.rate);
        })
        .map((row) => {
        const features =
          (ar ? row.features_ar : row.features)?.filter(Boolean) ??
          [];
        const amenities =
          (ar ? row.amenities_ar : row.amenities)?.filter(Boolean) ?? [];
        return {
          id: row.id,
          slug: row.slug,
          category: row.category,
          kind: row.category === 'community_hall' ? 'hall' : 'room',
          name: (ar ? row.name_ar || row.name : row.name) || row.slug,
          cap: row.capacity
            ? ar
              ? `${num(row.capacity)} مقعد`
              : `${row.capacity} seats`
            : '',
          rate: Number(row.rate) || 0,
          rateUnit: row.rate_unit,
          teaser: (ar ? row.teaser_ar || row.teaser : row.teaser) || '',
          features: features.length ? features : amenities,
          imgs: row.hero_image
            ? [row.hero_image]
            : CATEGORY_IMAGERY[row.category] || FALLBACK_IMAGERY,
        };
      }),
    [resourceRows, ar, num]
  );

  const addonsData = useMemo(
    () =>
      addonRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: (ar ? row.name_ar || row.name : row.name) || row.slug,
        price: Number(row.price) || 0,
        quoteOnly: Boolean(row.is_quote_only),
      })),
    [addonRows, ar]
  );

  // ---- days ---------------------------------------------------------------
  // Real dates. `iso` is what travels to the API; `label` is only ever shown.
  const dates = useMemo(() => {
    if (!openedAt) return [];

    const todayIso = riyadhIsoDate(openedAt);
    const hourNow = riyadhHour(openedAt);
    // If the floor has already closed, today is not on offer.
    const skipToday = hourNow >= OPEN_HOUR + HOUR_SLOTS - 1;

    // Gregorian, and Arabic-Indic digits, to match the numerals the rest of
    // the Arabic UI uses. Plain 'ar-SA' would render the Hijri date.
    const labelFmt = new Intl.DateTimeFormat(ar ? 'ar-u-ca-gregory-nu-arab' : 'en-GB', {
      timeZone: RIYADH_TZ,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    const out = [];
    for (let offset = skipToday ? 1 : 0; out.length < DAYS_OFFERED; offset += 1) {
      const d = new Date(openedAt.getTime() + offset * 86400000);
      const iso = riyadhIsoDate(d);
      const isToday = iso === todayIso;
      out.push({
        iso,
        isToday,
        label: isToday
          ? ar
            ? `اليوم، ${labelFmt.format(d)}`
            : `Today, ${labelFmt.format(d)}`
          : labelFmt.format(d),
        // Hours already gone in Riyadh cannot be booked on today's date.
        firstOpenSlot: isToday ? Math.max(0, hourNow + 1 - OPEN_HOUR) : 0,
      });
    }
    return out;
  }, [openedAt, ar]);

  const activeDate = dates[Math.min(dateIndex, Math.max(dates.length - 1, 0))] || null;

  // ---- selection ----------------------------------------------------------
  const activeSpace =
    spaces.length > 0 ? spaces[Math.min(spaceIndex, spaces.length - 1)] : null;

  const selectedAddons = useMemo(
    () => addonsData.filter((a) => selectedAddonIds.includes(a.id)),
    [addonsData, selectedAddonIds]
  );

  /**
   * Hours this client can honestly mark unavailable: already past today, or
   * refused by the server as taken. Nothing here is invented.
   */
  const blockedSlots = useMemo(() => {
    if (!activeDate) return [];
    const past = [];
    for (let i = 0; i < activeDate.firstOpenSlot && i < HOUR_SLOTS; i += 1) past.push(i);
    const key = activeSpace ? `${activeSpace.id}|${activeDate.iso}` : null;
    const refused = key ? takenSlots[key] || [] : [];
    return [...new Set([...past, ...refused])];
  }, [activeDate, activeSpace, takenSlots]);

  const startTimeValue = selStart >= 0 ? slotStartValue(selStart) : null;
  const endTimeValue = selStart >= 0 && selLen > 0 ? slotEndValue(selStart, selLen) : null;

  // ---- the server's quote -------------------------------------------------
  // price_booking() is granted to anon for exactly this: quoting a guest
  // checkout. It knows the 4h/8h block rates, so it is the only figure that
  // will match what the booking is actually created with.
  useEffect(() => {
    if (!isOpen || flow !== 'book' || done) return undefined;
    if (!supabase || !activeSpace || !activeDate || !startTimeValue || !endTimeValue) {
      setQuote(null);
      setQuoteState('idle');
      return undefined;
    }

    let cancelled = false;
    setQuoteState('loading');

    supabase
      .rpc('price_booking', {
        p_resource_id: activeSpace.id,
        p_time_range:
          `[${riyadhInstant(activeDate.iso, startTimeValue)},` +
          `${riyadhInstant(activeDate.iso, endTimeValue)})`,
        p_company_id: bookingCompanyId,
        p_addons: selectedAddons.map((a) => ({ addon_id: a.id, quantity: 1 })),
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          console.error('[BookingModal] quote failed', error);
          setQuote(null);
          setQuoteState('error');
          return;
        }
        setQuote(data);
        setQuoteState('ready');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    flow,
    done,
    supabase,
    activeSpace?.id,
    activeDate?.iso,
    startTimeValue,
    endTimeValue,
    bookingCompanyId,
    selectedAddonIds.join(','),
  ]);

  if (!isOpen) return null;

  // Flows Step Sequences
  const flowsDef = {
    book: ['space', 'options', 'schedule', 'details', 'review'],
    office: ['office', 'oview', 'details'],
    tour: ['time', 'details'],
    plan: ['plan', 'details'],
  };

  const steps = flowsDef[flow] || flowsDef.book;
  const currentStepKind = done ? 'done' : steps[step];
  const isLastStep = step === steps.length - 1;

  // Offices and plans are lead-capture content, not bookable inventory: the
  // private-office rows in the database are `is_bookable = false` and are
  // assigned by contract, so nothing here is submitted as a booking.
  const offices = [
    {
      slug: 'office-04',
      name: ar ? 'مكتب ٠٤' : 'Office 04',
      size: '22 m²',
      desks: ar ? '٤ مكاتب' : '4 desks',
      loc: ar ? 'الواجهة الشمالية، المطلة على الشارع' : 'North perimeter, window line',
      price: ar ? 'من ٦,٥٠٠ ر.س / شهرياً' : 'from SAR 6,500 / month',
      imgs: ['/assets/photo-glass-offices.jpg', '/assets/photo-coworking.jpg', '/assets/photo-vip-lounge.jpg'],
      features: ar
        ? [
            '٤ مكاتب قابلة لتعديل الارتفاع مع كراسي',
            'واجهة زجاجية قابلة للقفل مع شريط خصوصية',
            'جدار تخزين وخزائن شخصية',
            'شبكة مستقلة وطباعة خاصة',
          ]
        : [
            '4 height-adjustable desks with chairs',
            'Lockable glass front, frosted band',
            'Storage wall and personal lockers',
            'Own network segment and printing',
          ],
    },
    {
      slug: 'office-11',
      name: ar ? 'مكتب ١١' : 'Office 11',
      size: '32 m²',
      desks: ar ? '٦ مكاتب' : '6 desks',
      loc: ar ? 'الركن الشرقي، إضاءة من جانبين' : 'East corner, daylight on two sides',
      price: ar ? 'من ٩,٠٠٠ ر.س / شهرياً' : 'from SAR 9,000 / month',
      imgs: ['/assets/photo-vip-lounge.jpg', '/assets/photo-glass-offices.jpg', '/assets/photo-lounge-velvet.jpg'],
      features: ar
        ? [
            '٦ مكاتب مزودة بحوامل شاشات',
            'زوايا زجاجية مزدوجة الإضاءة',
            'ركن اجتماعات مصغر داخل المكتب لـ ٣ أشخاص',
            'شبكة مستقلة وتخزين خاص',
          ]
        : [
            '6 desks with monitor arms',
            'Corner glazing, double aspect',
            'In-office meeting nook for 3',
            'Own network segment and storage',
          ],
    },
    {
      slug: 'office-17',
      name: ar ? 'مكتب ١٧' : 'Office 17',
      size: '48 m²',
      desks: ar ? '١٠ مكاتب' : '10 desks',
      loc: ar ? 'جناح الواجهة الجنوبية' : 'South perimeter suite',
      price: ar ? 'من ١٤,٠٠٠ ر.س / شهرياً' : 'from SAR 14,000 / month',
      imgs: ['/assets/photo-coworking.jpg', '/assets/photo-vip-lounge.jpg', '/assets/photo-community-cinema.jpg'],
      features: ar
        ? [
            '١٠ مكاتب مقسمة على مجموعتين',
            'مكتب مدير مستقل قابل للفصل',
            'غرفة تخزين مخصصة',
            'شبكة خاصة وتحكم مستقل بالتكييف',
          ]
        : [
            '10 desks in two banks',
            'Separable manager cabin',
            'Dedicated storage room',
            'Own network, AC zone control',
          ],
    },
  ];

  const plansData = [
    { name: ar ? 'تصريح يومي' : 'Day pass', meta: ar ? '١٥٠ ر.س / يومي' : 'SAR 150 / day' },
    { name: ar ? 'مكتب مشترك' : 'Open desk', meta: ar ? '١,٢٠٠ ر.س / شهرياً' : 'SAR 1,200 / month' },
    { name: ar ? 'مكتب مخصص' : 'Dedicated desk', meta: ar ? '٢,٢٠٠ ر.س / شهرياً' : 'SAR 2,200 / month' },
  ];

  const off = offices[Math.min(officeIndex, offices.length - 1)];
  const activeGalleryImgs =
    flow === 'office' ? off.imgs : activeSpace?.imgs || FALLBACK_IMAGERY;
  const currentGalImg = activeGalleryImgs[Math.min(galIndex, activeGalleryImgs.length - 1)];

  const rooms = spaces.filter((s) => s.kind === 'room');
  const halls = spaces.filter((s) => s.kind === 'hall');

  const rateLabel = (s) => {
    if (!s) return '';
    const unit =
      s.rateUnit === 'hour'
        ? ar
          ? 'ساعة'
          : 'hr'
        : s.rateUnit === 'day'
        ? ar
          ? 'يوم'
          : 'day'
        : s.rateUnit;
    if (!s.rate) return ar ? 'بدون رسوم' : 'no charge';
    return ar ? `${num(s.rate)} ر.س / ${unit}` : `SAR ${num(s.rate)} / ${unit}`;
  };

  // Hours Selection Logic
  const handlePickHour = (h) => {
    if (blockedSlots.includes(h)) return;

    if (selStart < 0 || selLen === 0) {
      setSelStart(h);
      setSelLen(1);
      return;
    }

    const end = selStart + selLen - 1;
    const isBlocked = (a, b) => {
      for (let i = a; i <= b; i += 1) {
        if (blockedSlots.includes(i)) return true;
      }
      return false;
    };

    if (h === end + 1 && !isBlocked(selStart, h)) {
      setSelLen((prev) => prev + 1);
    } else if (h === selStart - 1 && !isBlocked(h, end)) {
      setSelStart(h);
      setSelLen((prev) => prev + 1);
    } else if (h >= selStart && h <= end) {
      if (h === end && selLen > 1) {
        setSelLen((prev) => prev - 1);
      } else {
        setSelStart(h);
        setSelLen(1);
      }
    } else {
      setSelStart(h);
      setSelLen(1);
    }
  };

  const handleToggleAddon = (id) => {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ---- pricing, as quoted by the database --------------------------------
  const quoted = quoteState === 'ready' && quote ? quote : null;
  const quotedSubtotal = quoted ? Number(quoted.subtotal) : null;
  const quotedVat = quoted ? Number(quoted.vat_amount) : null;
  const quotedTotal = quoted ? Number(quoted.total) : null;
  const quotedHours = quoted ? Number(quoted.hours) : selLen;
  const quotedBase = quoted ? Number(quoted.base) : null;
  const hasQuoteOnlyAddon = selectedAddons.some((a) => a.quoteOnly);

  const money = (v) => (ar ? `${amount(v)} ر.س` : `SAR ${amount(v)}`);

  const priceRows = [];
  if (flow === 'book' && quoted && activeSpace) {
    priceRows.push({
      label: `${activeSpace.name} · ${num(quotedHours)}${
        ar ? ' ساعة' : quotedHours === 1 ? ' hour' : ' hours'
      }`,
      amount: money(quotedBase ?? 0),
    });
    if (Number(quoted.credit_hours_used) > 0) {
      priceRows.push({
        label: ar
          ? `مخصوم من رصيد الساعات (${num(Number(quoted.credit_hours_used))})`
          : `Covered by credit allowance (${Number(quoted.credit_hours_used)} h)`,
        amount: ar ? 'مشمول' : 'included',
      });
    }
    selectedAddons.forEach((a) => {
      priceRows.push({
        label: a.name,
        amount: a.quoteOnly
          ? ar
            ? 'طلب تسعيرة'
            : 'quoted separately'
          : money(a.price),
      });
    });
  }

  const rangeStr =
    selStart >= 0 && selLen > 0
      ? `${slotLabel(selStart)} — ${slotLabel(selStart + selLen)}`
      : '';

  const dateLabel = activeDate?.label || '';

  const flowSummary =
    flow === 'book'
      ? `${activeSpace?.name || ''} · ${dateLabel}${rangeStr ? ` · ${rangeStr}` : ''}`
      : flow === 'office'
      ? `${off.name} · ${off.size} · ${off.desks}`
      : flow === 'tour'
      ? `${ar ? 'جولة في الطابق' : 'Tour of the floor'} · ${dateLabel} · ${
          TOUR_SLOTS[tourTimeIndex]
        }`
      : `${plansData[planIndex].name}`;

  // ---- per-step gating ----------------------------------------------------
  const trimmedName = fullName.trim();
  const trimmedEmail = email.trim();
  const detailsOk = trimmedName.length >= 2 && EMAIL_RE.test(trimmedEmail);
  const scheduleOk = Boolean(activeDate) && selStart >= 0 && selLen > 0;
  const spaceOk = Boolean(activeSpace);

  const stepBlockedReason = (() => {
    if (currentStepKind === 'space' && !spaceOk) {
      return catalogueState === 'loading'
        ? ar
          ? 'جاري تحميل القاعات...'
          : 'Loading rooms...'
        : ar
        ? 'لا توجد قاعات متاحة'
        : 'No rooms available';
    }
    if (currentStepKind === 'schedule' && !scheduleOk) {
      return ar ? 'اختر الساعات' : 'Select your hours';
    }
    if (currentStepKind === 'details' && !detailsOk) {
      return ar ? 'أدخل الاسم والبريد' : 'Add your name and email';
    }
    return null;
  })();

  const canAdvance = !stepBlockedReason;

  // ---- copy ---------------------------------------------------------------
  const flowTitle =
    flow === 'book'
      ? ar
        ? 'حجز مساحة أو قاعة'
        : 'Book a space'
      : flow === 'office'
      ? ar
        ? 'تعاقد مكتب خاص'
        : 'Lease an office'
      : flow === 'tour'
      ? ar
        ? 'احجز جولة مع قهوة'
        : 'Book a tour'
      : ar
      ? 'الانضمام لمارس سبيس'
      : 'Join Mars Space';

  const flowStepLabel = done
    ? ''
    : ar
    ? `الخطوة ${num(step + 1)} من ${num(steps.length)}`
    : `Step ${step + 1} of ${steps.length}`;

  const backLabel = step === 0 ? (ar ? 'إلغاء' : 'Cancel') : ar ? 'السابق' : 'Back';

  const submitLabel =
    flow === 'book'
      ? quotedTotal != null
        ? ar
          ? `تأكيد الحجز · ${money(quotedTotal)}`
          : `Confirm booking · ${money(quotedTotal)}`
        : ar
        ? 'تأكيد الحجز'
        : 'Confirm booking'
      : flow === 'office'
      ? ar
        ? 'إرسال الطلب'
        : 'Send request'
      : flow === 'tour'
      ? ar
        ? 'طلب الجولة'
        : 'Request tour'
      : ar
      ? 'إرسال الطلب'
      : 'Send request';

  const nextButtonLabel = stepBlockedReason
    ? stepBlockedReason
    : isLastStep
    ? submitLabel
    : ar
    ? 'متابعة ←'
    : 'Continue';

  // ---- failure vocabulary -------------------------------------------------
  //
  // Every message a failure can produce, in both languages, keyed by what
  // actually went wrong. `detail` carries the server's own sentence where it
  // is useful; the route already curates that text and names no table or
  // policy.
  const failure = (kind, extra = {}) => ({ kind, ...extra });

  const FAILURE_COPY = {
    validation: {
      title: ar ? 'تحقق من البيانات' : 'Check your details',
      body: ar
        ? 'يُرجى إدخال الاسم وبريد إلكتروني صحيح حتى نتمكن من إرسال التأكيد إليك.'
        : 'Please add your name and a valid email so we can send you the confirmation.',
    },
    incomplete: {
      title: ar ? 'الحجز غير مكتمل' : 'Booking incomplete',
      body: ar
        ? 'يُرجى اختيار القاعة واليوم وساعة واحدة على الأقل.'
        : 'Please choose a room, a day and at least one hour.',
    },
    slot_taken: {
      title: ar ? 'تم حجز هذا الموعد للتو' : 'That slot has just been taken',
      body: ar
        ? 'حجز شخص آخر هذه الساعات أثناء إتمامك للطلب. اختر وقتاً آخر — لم يتم إنشاء أي حجز ولم يُخصم أي مبلغ.'
        : 'Someone booked these hours while you were checking out. Pick another time — nothing was booked and nothing was charged.',
    },
    unavailable: {
      title: ar ? 'هذا الوقت غير متاح' : 'That time is not available',
      body: ar
        ? 'هذه الفترة محجوزة للصيانة أو لفعالية خاصة. يُرجى اختيار وقت آخر.'
        : 'That period is closed for maintenance or private hire. Please choose another time.',
    },
    not_found: {
      title: ar ? 'لم تعد هذه المساحة متاحة' : 'That space is no longer bookable',
      body: ar
        ? 'تم سحب هذه المساحة من الحجز. يُرجى إعادة فتح النموذج واختيار مساحة أخرى.'
        : 'This space has been withdrawn from booking. Please reopen the form and choose another.',
    },
    company_required: {
      title: ar ? 'الحجز باسم منشأتك' : 'Book through your company',
      body: ar
        ? 'حسابك مرتبط بمنشأة، ولا يملك صلاحية حجز القاعات. يُرجى التواصل مع مسؤول الحساب في منشأتك، أو تسجيل الخروج والحجز كضيف.'
        : 'Your account is tied to a company that has not granted you room-booking permission. Ask your company admin, or sign out and book as a guest.',
    },
    rejected: {
      title: ar ? 'تعذّر تأكيد الحجز' : 'We could not confirm this booking',
      body: ar
        ? 'رفض النظام هذا الطلب ولم يتم إنشاء أي حجز.'
        : 'The booking was rejected and nothing was reserved.',
    },
    rate_limited: {
      title: ar ? 'عدد كبير من المحاولات' : 'Too many attempts',
      body: ar
        ? 'يُرجى الانتظار بضع دقائق ثم المحاولة مرة أخرى.'
        : 'Please wait a few minutes and try again.',
    },
    server: {
      title: ar ? 'خطأ لدينا' : 'Something went wrong on our side',
      body: ar
        ? 'حدث خطأ غير متوقع ولم يتم إنشاء أي حجز. يُرجى المحاولة مرة أخرى.'
        : 'An unexpected error occurred and nothing was booked. Please try again.',
    },
    network: {
      title: ar ? 'تعذّر الاتصال' : 'We could not reach Mars Space',
      body: ar
        ? 'تحقق من اتصالك بالإنترنت وحاول مرة أخرى. لم يتم إنشاء أي حجز.'
        : 'Check your connection and try again. Nothing was booked.',
    },
  };

  /**
   * Turn an HTTP status + parsed body into one of the cases above.
   *
   * The `error.code` is the primary key, not the status: three different
   * situations come back as 409 — the exclusion-constraint race (SLOT_TAKEN),
   * a resource withdrawn from booking (RESOURCE_NOT_BOOKABLE) and a blackout
   * or maintenance window (SLOT_UNAVAILABLE). Reading the status alone called
   * all three "someone just took your slot" and, worse, fed the last two into
   * markSelectionTaken(), greying out hours that were never taken by anyone.
   * The message text is only a fallback for a body that arrived without a code.
   */
  const CODE_TO_FAILURE = {
    SLOT_TAKEN: 'slot_taken',
    RESOURCE_NOT_FOUND: 'not_found',
    RESOURCE_NOT_BOOKABLE: 'not_found',
    SLOT_UNAVAILABLE: 'unavailable',
    GUEST_CONTACT_REQUIRED: 'validation',
    COMPANY_REQUIRED: 'company_required',
    COMPANY_BOOKING_FORBIDDEN: 'company_required',
    RATE_LIMITED: 'rate_limited',
  };

  const classifyBookingFailure = (status, payload) => {
    const code = payload?.error?.code;
    const message = payload?.error?.message || '';
    // The route localises its own refusals; show the guest the right one.
    const detail = (ar ? payload?.error?.messageAr : payload?.error?.message) || null;

    if (code && CODE_TO_FAILURE[code]) {
      return failure(CODE_TO_FAILURE[code]);
    }
    if (status === 429) return failure('rate_limited');
    if (status >= 500) return failure('server');

    // No recognised code. Fall back to the sentence, most specific first.
    if (/just been taken/i.test(message)) return failure('slot_taken');
    if (/resource does not exist|not bookable|not available for booking/i.test(message)) {
      return failure('not_found');
    }
    if (/unavailable for this|blackout/i.test(message)) return failure('unavailable');
    if (/select a company|permission to book/i.test(message)) {
      return failure('company_required');
    }
    if (status === 404) return failure('not_found');
    if (status === 409) return failure('slot_taken');

    // A 400 we cannot name: MISSING_FIELDS, INVALID_DATE_TIME,
    // INVALID_TIME_RANGE and BOOKING_FAILED all land here. Every one of them
    // means the payload was refused, so say so and quote the server's reason.
    return failure('rejected', { detail });
  };

  /** Record a refusal so the grid stops offering hours the server just denied. */
  const markSelectionTaken = () => {
    if (!activeSpace || !activeDate || selStart < 0) return;
    const key = `${activeSpace.id}|${activeDate.iso}`;
    const hours = Array.from({ length: selLen }, (_, i) => selStart + i);
    setTakenSlots((prev) => ({
      ...prev,
      [key]: [...new Set([...(prev[key] || []), ...hours])],
    }));
  };

  const composedNotes = () => {
    const parts = [];
    if (company.trim()) parts.push(`${ar ? 'الجهة' : 'Company'}: ${company.trim()}`);
    if (notes.trim()) parts.push(notes.trim());
    if (selectedAddons.length) {
      parts.push(
        `${ar ? 'إضافات' : 'Add-ons'}: ${selectedAddons.map((a) => a.name).join(', ')}`
      );
    }
    return parts.length ? parts.join(' — ') : null;
  };

  // ---- submit: a real booking --------------------------------------------
  const submitBooking = async () => {
    setSubmitError(null);

    if (!detailsOk) {
      setSubmitError(failure('validation'));
      setStep(steps.indexOf('details'));
      return;
    }
    if (!activeSpace || !activeDate || !startTimeValue || !endTimeValue) {
      setSubmitError(failure('incomplete'));
      setStep(steps.indexOf('schedule'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/public/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // The resource's real primary key, carried from the row we fetched.
          resourceId: activeSpace.id,
          // A calendar date, not a label.
          date: activeDate.iso,
          // 24-hour times, derived from the slot indices the user clicked.
          startTime: startTimeValue,
          endTime: endTimeValue,
          companyId: bookingCompanyId,
          customerName: trimmedName,
          customerEmail: trimmedEmail,
          customerPhone: phone.trim() || null,
          notes: composedNotes(),
          // Add-on ids, not display labels.
          addons: selectedAddons.map((a) => ({ addon_id: a.id, quantity: 1 })),
        }),
      });

      let payload = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      // THE CHECK THAT WAS MISSING. No confirmation without a real success.
      if (!res.ok || !payload?.success) {
        const problem = classifyBookingFailure(res.status, payload);
        setSubmitError(problem);
        if (problem.kind === 'slot_taken') {
          markSelectionTaken();
          setStep(steps.indexOf('schedule'));
          setSelStart(-1);
          setSelLen(0);
        }
        return;
      }

      const booking = payload.data || payload.booking || {};
      setConfirmation({
        kind: 'booking',
        reference: booking.reference || null,
        id: booking.id || null,
        total: booking.total != null ? Number(booking.total) : quotedTotal,
        resourceName: activeSpace.name,
        dateLabel,
        rangeStr,
      });
      setDone(true);
    } catch (err) {
      // A thrown fetch is a transport failure — the request may never have
      // left the browser. It is emphatically not a success.
      console.error('[BookingModal] booking request failed', err);
      setSubmitError(failure('network'));
    } finally {
      setSubmitting(false);
    }
  };

  // ---- submit: tour / office / membership enquiries -----------------------
  // These used to confirm without contacting anything at all.
  const submitLead = async () => {
    setSubmitError(null);

    if (!detailsOk) {
      setSubmitError(failure('validation'));
      setStep(steps.indexOf('details'));
      return;
    }

    const workspaceInterest =
      flow === 'office' ? off.slug : flow === 'plan' ? PLAN_SLUGS[planIndex] : 'tour';

    const messageParts = [flowSummary];
    const extra = composedNotes();
    if (extra) messageParts.push(extra);

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          phone: phone.trim() || undefined,
          company: company.trim() || undefined,
          topic: flow === 'office' ? 'private-office' : flow === 'plan' ? 'membership' : 'tour',
          workspaceInterest,
          message: messageParts.join(' — '),
          source:
            flow === 'tour' ? 'website tour request form' : 'website contact form',
          ...(flow === 'tour' && activeDate
            ? { preferredDate: activeDate.iso, preferredTime: TOUR_SLOTS[tourTimeIndex] }
            : {}),
        }),
      });

      let payload = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      if (!res.ok || !payload?.success) {
        if (res.status === 429) {
          setSubmitError(failure('rate_limited'));
        } else if (res.status >= 500) {
          setSubmitError(failure('server'));
        } else {
          setSubmitError(
            failure('rejected', { detail: ar ? payload?.error?.messageAr : payload?.error?.message })
          );
        }
        return;
      }

      setConfirmation({
        kind: 'lead',
        message: (ar ? payload.messageAr : payload.message) || null,
      });
      setDone(true);
    } catch (err) {
      console.error('[BookingModal] lead request failed', err);
      setSubmitError(failure('network'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!canAdvance || submitting) return;
    if (isLastStep) {
      if (flow === 'book') submitBooking();
      else submitLead();
    } else {
      setSubmitError(null);
      setStep((prev) => prev + 1);
      setGalIndex(0);
    }
  };

  const handleBack = () => {
    setSubmitError(null);
    if (step === 0) {
      onClose();
    } else {
      setStep((prev) => prev - 1);
      setGalIndex(0);
    }
  };

  const getSelStyles = (isSelected) => ({
    border: isSelected ? '1px solid #8A4120' : '1px solid rgba(11, 11, 15, 0.18)',
    background: isSelected ? 'rgba(138, 65, 32, 0.07)' : 'transparent',
    color: isSelected ? '#8A4120' : '#0B0B0F',
  });

  const inputStyle = {
    border: 'none',
    borderBottom: '1px solid rgba(11, 11, 15, 0.25)',
    background: 'none',
    padding: '10px 2px',
    font: '300 16px var(--font-sans)',
    color: '#0B0B0F',
    outline: 'none',
  };

  const spaceCard = (s) => {
    const k = spaces.indexOf(s);
    const isSelected = k === Math.min(spaceIndex, spaces.length - 1);
    const sel = getSelStyles(isSelected);
    return (
      <div
        key={s.id}
        onClick={() => {
          setSpaceIndex(k);
          setSelStart(-1);
          setSelLen(0);
          setSubmitError(null);
        }}
        style={{
          cursor: 'pointer',
          display: 'flex',
          gap: '18px',
          alignItems: 'center',
          padding: '14px',
          border: sel.border,
          background: sel.background,
          transition: 'border-color 250ms, background 250ms',
        }}
      >
        <img
          src={s.imgs[0]}
          alt={s.name}
          style={{ width: '118px', height: '82px', flex: 'none', objectFit: 'cover', display: 'block', backgroundColor: '#E5E1DA' }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 14px' }}>
            <span style={{ fontSize: '19px', fontWeight: 500, color: sel.color }}>{s.name}</span>
            <span style={{ fontSize: '14px', fontWeight: 300, color: '#6B675F' }}>
              {[s.cap, rateLabel(s)].filter(Boolean).join(' · ')}
            </span>
          </div>
          {s.teaser && (
            <p style={{ margin: '6px 0 0', fontSize: '14px', fontWeight: 300, color: '#6B675F', lineHeight: 1.55 }}>
              {s.teaser}
            </p>
          )}
        </div>
      </div>
    );
  };

  const notice = (text, tone = 'muted') => (
    <p
      style={{
        margin: '16px 0 0',
        fontSize: '14px',
        fontWeight: 300,
        color: tone === 'warn' ? '#8A4120' : '#6B675F',
      }}
    >
      {text}
    </p>
  );

  return (
    <div
      data-screen-label="Booking flow"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(0px, 3vw, 32px)',
        boxSizing: 'border-box',
      }}
    >
      {/* Dark Overlay Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(11, 11, 15, 0.74)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          animation: 'fadeIn 280ms ease both',
        }}
      />

      {/* Main Light Modal Container */}
      <div
        style={{
          position: 'relative',
          width: 'min(880px, 100%)',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: '#F5F3EF',
          color: '#0B0B0F',
          padding: 'clamp(28px, 4.5vw, 56px)',
          boxSizing: 'border-box',
          animation: 'heroRise 480ms cubic-bezier(0.16, 1, 0.30, 1) both',
          borderRadius: '4px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.35)',
          textAlign: 'start',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 'clamp(26px, 2.4vw, 36px)', fontWeight: 400, letterSpacing: '-0.02em', color: '#0B0B0F' }}>
              {flowTitle}
            </h3>
            <p style={{ margin: '8px 0 0', fontSize: '14px', fontWeight: 300, color: '#6B675F' }}>
              {flowStepLabel}
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label={ar ? 'إغلاق' : 'Close'}
            style={{
              flex: 'none',
              border: '1px solid rgba(11, 11, 15, 0.2)',
              background: 'none',
              borderRadius: '999px',
              width: '42px',
              height: '42px',
              fontSize: '15px',
              cursor: 'pointer',
              color: '#0B0B0F',
              transition: 'border-color 250ms',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* STEP: Space Selection */}
        {currentStepKind === 'space' && (
          <div style={{ marginTop: '32px' }}>
            {catalogueState === 'loading' && notice(ar ? 'جاري تحميل القاعات المتاحة...' : 'Loading available rooms...')}

            {catalogueState === 'error' &&
              notice(
                ar
                  ? 'تعذّر تحميل قائمة القاعات. يُرجى إغلاق النموذج والمحاولة مرة أخرى.'
                  : 'We could not load the room list. Please close this and try again.',
                'warn'
              )}

            {catalogueState === 'ready' && spaces.length === 0 &&
              notice(
                ar
                  ? 'لا توجد مساحات متاحة للحجز حالياً. تواصل معنا وسنرتب لك.'
                  : 'No spaces are open for booking right now. Contact us and we will arrange it.',
                'warn'
              )}

            {rooms.length > 0 && (
              <>
                <p style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 500, color: '#6B675F' }}>
                  {ar ? 'قاعات الاجتماعات' : 'Meeting rooms'}
                </p>
                <div style={{ display: 'grid', gap: '12px' }}>{rooms.map(spaceCard)}</div>
              </>
            )}

            {halls.length > 0 && (
              <>
                <p style={{ margin: '28px 0 14px', fontSize: '14px', fontWeight: 500, color: '#6B675F' }}>
                  {ar ? 'المساحة المجتمعية' : 'Community space'}
                </p>
                <div style={{ display: 'grid', gap: '12px' }}>{halls.map(spaceCard)}</div>
              </>
            )}
          </div>
        )}

        {/* STEP: Options & Add-ons */}
        {currentStepKind === 'options' && activeSpace && (
          <div style={{ marginTop: '32px' }}>
            <div style={{ aspectRatio: '16/9', backgroundColor: '#E5E1DA', overflow: 'hidden' }}>
              <img src={currentGalImg} alt={activeSpace.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              {activeGalleryImgs.map((im, k) => (
                <img
                  key={k}
                  src={im}
                  alt=""
                  onClick={() => setGalIndex(k)}
                  style={{
                    width: '88px',
                    height: '60px',
                    flex: 'none',
                    objectFit: 'cover',
                    cursor: 'pointer',
                    opacity: k === galIndex ? 1 : 0.55,
                    outline: k === galIndex ? '2px solid #8A4120' : 'none',
                    outlineOffset: '-2px',
                    transition: 'opacity 250ms',
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', marginTop: '28px' }}>
              <div style={{ flex: '1.2 1 280px' }}>
                <p style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 500, color: '#6B675F' }}>
                  {ar ? 'مميزات هذه القاعة' : 'In this room'}
                </p>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {activeSpace.features.map((f, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'baseline', fontSize: '15px', fontWeight: 300, color: '#3D3A36' }}>
                      <span style={{ width: '6px', height: '6px', background: '#8A4120', flex: 'none', transform: 'translateY(-2px)' }} />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ flex: '1 1 280px' }}>
                <p style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 500, color: '#6B675F' }}>
                  {ar ? 'إضافة إلى حجزك' : 'Add to your booking'}
                </p>
                {addonsData.length === 0 &&
                  notice(ar ? 'لا توجد إضافات متاحة حالياً.' : 'No add-ons are available right now.')}
                <div style={{ display: 'grid', gap: '8px' }}>
                  {addonsData.map((ad) => {
                    const on = selectedAddonIds.includes(ad.id);
                    return (
                      <div
                        key={ad.id}
                        onClick={() => handleToggleAddon(ad.id)}
                        style={{
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '11px 14px',
                          border: on ? '1px solid #8A4120' : '1px solid rgba(11,11,15,0.14)',
                          background: on ? 'rgba(138,65,32,0.06)' : 'transparent',
                          transition: 'border-color 250ms, background 250ms',
                        }}
                      >
                        <span
                          style={{
                            width: '18px',
                            height: '18px',
                            flex: 'none',
                            border: on ? '1.5px solid #8A4120' : '1.5px solid rgba(11,11,15,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            color: '#FFFFFF',
                            background: on ? '#8A4120' : 'transparent',
                            transition: 'background 200ms',
                          }}
                        >
                          {on ? '✓' : ''}
                        </span>
                        <span style={{ flex: 1, fontSize: '15px', fontWeight: 400, color: '#0B0B0F' }}>{ad.name}</span>
                        <span style={{ fontSize: '14px', fontWeight: 300, color: '#6B675F', whiteSpace: 'nowrap' }}>
                          {ad.quoteOnly ? (ar ? 'طلب تسعيرة' : 'quoted') : money(ad.price)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP: Schedule */}
        {currentStepKind === 'schedule' && (
          <div style={{ marginTop: '32px' }}>
            <p style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 500, color: '#6B675F' }}>
              {ar ? 'اليوم' : 'Day'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {dates.map((d, k) => {
                const sel = getSelStyles(k === dateIndex);
                return (
                  <button
                    key={d.iso}
                    onClick={() => {
                      setDateIndex(k);
                      setSelStart(-1);
                      setSelLen(0);
                      setSubmitError(null);
                    }}
                    style={{
                      border: sel.border,
                      background: sel.background,
                      color: sel.color,
                      borderRadius: '999px',
                      padding: '12px 22px',
                      font: '400 15px var(--font-sans)',
                      lineHeight: 1,
                      cursor: 'pointer',
                      transition: 'border-color 250ms, background 250ms, color 250ms',
                    }}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>

            <p style={{ margin: '32px 0 12px', fontSize: '14px', fontWeight: 500, color: '#6B675F' }}>
              {ar ? 'الساعات · اختر البداية واسحب الكتلة' : 'Hours · pick a start and stretch the block'}
            </p>

            <div style={{ display: 'flex', gap: '4px' }}>
              {Array.from({ length: HOUR_SLOTS }, (_, h) => {
                const isBlocked = blockedSlots.includes(h);
                const isSel = selStart >= 0 && h >= selStart && h < selStart + selLen;
                const tileBg = isSel ? '#8A4120' : isBlocked ? 'rgba(11,11,15,0.05)' : '#FFFFFF';
                const tileBd = isSel ? '#8A4120' : 'rgba(11,11,15,0.18)';
                const textFg = isBlocked ? '#A8A49D' : isSel ? '#8A4120' : '#6B675F';

                return (
                  <div
                    key={h}
                    onClick={() => handlePickHour(h)}
                    style={{ flex: 1, minWidth: 0, cursor: isBlocked ? 'not-allowed' : 'pointer' }}
                  >
                    <div style={{ height: '52px', background: tileBg, border: `1px solid ${tileBd}`, position: 'relative', transition: 'background 200ms, border-color 200ms' }}>
                      {isBlocked && (
                        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, rgba(11,11,15,0.10) 0 5px, transparent 5px 10px)' }} />
                      )}
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: 400, color: textFg, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      {slotLabel(h)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 28px', marginTop: '18px', fontSize: '13px', fontWeight: 300, color: '#6B675F' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', border: '1px solid rgba(11,11,15,0.25)', background: '#FFFFFF' }} />
                {ar ? 'قابل للاختيار' : 'Selectable'}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', background: 'repeating-linear-gradient(45deg, rgba(11,11,15,0.18) 0 3px, rgba(11,11,15,0.06) 3px 6px)' }} />
                {ar ? 'غير متاح' : 'Unavailable'}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', background: '#8A4120' }} />
                {ar ? 'اختيارك' : 'Your selection'}
              </span>
            </div>

            {/*
              Said plainly rather than faked. An anonymous visitor cannot read
              the bookings table, so this client genuinely does not know which
              hours are free; the database decides when the booking is placed.
            */}
            {notice(
              ar
                ? 'يتم تأكيد توفّر الساعات عند إتمام الحجز. إذا حجز شخص آخر نفس الوقت قبلك سنخبرك فوراً ولن يتم أي حجز.'
                : 'Availability is confirmed when you place the booking. If someone takes the same hours first we will tell you straight away, and nothing will be booked.'
            )}

            <p style={{ margin: '22px 0 0', fontSize: '16px', fontWeight: 400, color: '#0B0B0F' }}>
              {scheduleOk && activeSpace
                ? `${activeSpace.name} · ${dateLabel} · ${rangeStr}${
                    quotedTotal != null ? ` · ${money(quotedTotal)}` : ''
                  }`
                : ar
                ? 'لم يتم اختيار ساعات حتى الآن.'
                : 'No hours selected yet.'}
            </p>
          </div>
        )}

        {/* STEP: Office List */}
        {currentStepKind === 'office' && (
          <div style={{ display: 'grid', gap: '12px', marginTop: '32px' }}>
            {offices.map((o, k) => {
              const sel = getSelStyles(k === officeIndex);
              return (
                <div
                  key={o.slug}
                  onClick={() => {
                    setOfficeIndex(k);
                    setGalIndex(0);
                  }}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    gap: '18px',
                    alignItems: 'center',
                    padding: '14px',
                    border: sel.border,
                    background: sel.background,
                    transition: 'border-color 250ms, background 250ms',
                  }}
                >
                  <img src={o.imgs[0]} alt={o.name} style={{ width: '118px', height: '82px', flex: 'none', objectFit: 'cover', display: 'block', backgroundColor: '#E5E1DA' }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 14px' }}>
                      <span style={{ fontSize: '19px', fontWeight: 500, color: sel.color }}>{o.name}</span>
                      <span style={{ fontSize: '14px', fontWeight: 300, color: '#6B675F' }}>{o.size} · {o.desks}</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '14px', fontWeight: 300, color: '#6B675F' }}>{o.loc} · {o.price}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* STEP: Office View */}
        {currentStepKind === 'oview' && (
          <div style={{ marginTop: '32px' }}>
            <div style={{ aspectRatio: '16/9', backgroundColor: '#E5E1DA', overflow: 'hidden' }}>
              <img src={currentGalImg} alt={off.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              {off.imgs.map((im, k) => (
                <img
                  key={k}
                  src={im}
                  alt=""
                  onClick={() => setGalIndex(k)}
                  style={{
                    width: '88px',
                    height: '60px',
                    flex: 'none',
                    objectFit: 'cover',
                    cursor: 'pointer',
                    opacity: k === galIndex ? 1 : 0.55,
                    outline: k === galIndex ? '2px solid #8A4120' : 'none',
                    outlineOffset: '-2px',
                    transition: 'opacity 250ms',
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', marginTop: '28px' }}>
              <div style={{ flex: '1.2 1 280px' }}>
                <p style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 500, color: '#6B675F' }}>
                  {ar ? `داخل ${off.name}` : `Inside ${off.name}`}
                </p>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {off.features.map((f, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'baseline', fontSize: '15px', fontWeight: 300, color: '#3D3A36' }}>
                      <span style={{ width: '6px', height: '6px', background: '#8A4120', flex: 'none', transform: 'translateY(-2px)' }} />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ flex: '1 1 240px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '12px 0', borderTop: '1px solid rgba(11,11,15,0.12)', fontSize: '15px' }}>
                  <span style={{ fontWeight: 300, color: '#6B675F' }}>{ar ? 'الموقع' : 'Location'}</span>
                  <span style={{ fontWeight: 400, textAlign: 'end', color: '#0B0B0F' }}>{off.loc}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '12px 0', borderTop: '1px solid rgba(11,11,15,0.12)', fontSize: '15px' }}>
                  <span style={{ fontWeight: 300, color: '#6B675F' }}>{ar ? 'المساحة' : 'Size'}</span>
                  <span style={{ fontWeight: 400, color: '#0B0B0F' }}>{off.size}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '12px 0', borderTop: '1px solid rgba(11,11,15,0.12)', fontSize: '15px' }}>
                  <span style={{ fontWeight: 300, color: '#6B675F' }}>{ar ? 'محطات العمل' : 'Workstations'}</span>
                  <span style={{ fontWeight: 400, color: '#0B0B0F' }}>{off.desks}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '12px 0', borderTop: '1px solid rgba(11,11,15,0.12)', borderBottom: '1px solid rgba(11,11,15,0.12)', fontSize: '15px' }}>
                  <span style={{ fontWeight: 300, color: '#6B675F' }}>{ar ? 'قيمة التعاقد' : 'Lease'}</span>
                  <span style={{ fontWeight: 500, color: '#8A4120' }}>{off.price}</span>
                </div>
                <p style={{ margin: '16px 0 0', fontSize: '13px', fontWeight: 300, color: '#6B675F' }}>
                  {ar
                    ? 'المكاتب يتم تعاقدها مباشرة مع فريقنا دون سداد إلكتروني.'
                    : 'Offices are contracted directly with our team. No payment is taken online.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP: Tour Time */}
        {currentStepKind === 'time' && (
          <div style={{ marginTop: '32px' }}>
            <p style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 500, color: '#6B675F' }}>
              {ar ? 'اليوم' : 'Day'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {dates.map((d, k) => {
                const sel = getSelStyles(k === dateIndex);
                return (
                  <button
                    key={d.iso}
                    onClick={() => setDateIndex(k)}
                    style={{
                      border: sel.border,
                      background: sel.background,
                      color: sel.color,
                      borderRadius: '999px',
                      padding: '12px 22px',
                      font: '400 15px var(--font-sans)',
                      lineHeight: 1,
                      cursor: 'pointer',
                    }}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>

            <p style={{ margin: '28px 0 12px', fontSize: '14px', fontWeight: 500, color: '#6B675F' }}>
              {ar ? 'الوقت' : 'Time'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {TOUR_SLOTS.map((t, k) => {
                const sel = getSelStyles(k === tourTimeIndex);
                return (
                  <button
                    key={t}
                    onClick={() => setTourTimeIndex(k)}
                    style={{
                      border: sel.border,
                      background: sel.background,
                      color: sel.color,
                      borderRadius: '999px',
                      padding: '12px 20px',
                      font: '400 15px var(--font-sans)',
                      lineHeight: 1,
                      cursor: 'pointer',
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP: Membership Plan */}
        {currentStepKind === 'plan' && (
          <div style={{ display: 'grid', gap: '12px', marginTop: '32px' }}>
            {plansData.map((p, k) => {
              const sel = getSelStyles(k === planIndex);
              return (
                <div
                  key={PLAN_SLUGS[k]}
                  onClick={() => setPlanIndex(k)}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: '8px 20px',
                    padding: '20px 22px',
                    border: sel.border,
                    background: sel.background,
                    transition: 'border-color 250ms, background 250ms',
                  }}
                >
                  <span style={{ fontSize: '19px', fontWeight: 500, color: sel.color }}>{p.name}</span>
                  <span style={{ fontSize: '14px', fontWeight: 300, color: '#6B675F' }}>{p.meta}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* STEP: Details */}
        {currentStepKind === 'details' && (
          <div style={{ marginTop: '32px' }}>
            <div style={{ background: 'rgba(11, 11, 15, 0.05)', padding: '20px 24px', borderRadius: '4px' }}>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 500, color: '#0B0B0F' }}>{flowSummary}</p>

              {flow === 'book' && (
                <div style={{ marginTop: '14px' }}>
                  {priceRows.map((pr, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '7px 0', fontSize: '14px', fontWeight: 300, color: '#3D3A36' }}>
                      <span>{pr.label}</span>
                      <span><bdi>{pr.amount}</bdi></span>
                    </div>
                  ))}

                  {quotedTotal != null ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '10px 0 0', marginTop: '6px', borderTop: '1px solid rgba(11, 11, 15, 0.15)', fontSize: '16px', fontWeight: 700, color: '#0B0B0F' }}>
                      <span>{ar ? 'الإجمالي شاملاً الضريبة (١٥٪)' : 'Total, VAT included'}</span>
                      <span><bdi>{money(quotedTotal)}</bdi></span>
                    </div>
                  ) : (
                    <p style={{ margin: '10px 0 0', fontSize: '14px', fontWeight: 300, color: '#6B675F' }}>
                      {quoteState === 'loading'
                        ? ar
                          ? 'جاري حساب السعر...'
                          : 'Calculating the price...'
                        : ar
                        ? 'سيتم تأكيد السعر النهائي عند إتمام الحجز.'
                        : 'The final price is confirmed when the booking is placed.'}
                    </p>
                  )}

                  {hasQuoteOnlyAddon &&
                    notice(
                      ar
                        ? 'الإضافات المعلّمة بـ «طلب تسعيرة» تُسعّر بشكل منفصل ولا تدخل في هذا الإجمالي.'
                        : 'Add-ons marked "quoted separately" are priced by the team and are not in this total.'
                    )}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px 28px', marginTop: '28px' }}>
              <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 500, color: '#6B675F' }}>
                {ar ? 'الاسم الكامل *' : 'Full name *'}
                <input
                  type="text"
                  required
                  placeholder={ar ? 'اسمك' : 'Your name'}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={inputStyle}
                />
              </label>

              <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 500, color: '#6B675F' }}>
                {ar ? 'الشركة (اختياري)' : 'Company'}
                <input
                  type="text"
                  placeholder={ar ? 'اختياري' : 'Optional'}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  style={inputStyle}
                />
              </label>

              <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 500, color: '#6B675F' }}>
                {ar ? 'البريد الإلكتروني *' : 'Email *'}
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                />
              </label>

              <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 500, color: '#6B675F' }}>
                {ar ? 'الهاتف / الواتساب' : 'Phone / WhatsApp'}
                <input
                  type="tel"
                  placeholder="+966"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={inputStyle}
                />
              </label>
            </div>

            <label style={{ display: 'grid', gap: '6px', marginTop: '24px', fontSize: '13px', fontWeight: 500, color: '#6B675F' }}>
              {ar ? 'هل هناك متطلبات خاصة تريد إخبارنا بها؟' : 'Anything we should know?'}
              <textarea
                rows="2"
                placeholder={ar ? 'اختياري' : 'Optional'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </label>

            {!detailsOk &&
              notice(
                ar
                  ? 'الاسم والبريد الإلكتروني مطلوبان — التأكيد يُرسل إليهما.'
                  : 'Name and email are required — the confirmation is sent to them.'
              )}
          </div>
        )}

        {/*
          STEP: Review & confirm.

          This replaced a card form (name on card, PAN, expiry, CVC) that
          submitted to nothing. There is no payment gateway in this
          application: create_booking() raises an invoice only for a company
          booking, and the payment route tells anonymous callers outright that
          "online card payment is not available yet". Asking a guest for a card
          number here collected sensitive data for no purpose and then claimed
          "Payment received". The step now says what actually happens.
        */}
        {currentStepKind === 'review' && (
          <div style={{ marginTop: '32px' }}>
            <div style={{ background: 'rgba(11, 11, 15, 0.05)', padding: '20px 24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
              <span style={{ fontSize: '15px', fontWeight: 400, color: '#0B0B0F' }}>{flowSummary}</span>
              <span style={{ fontSize: '22px', fontWeight: 700, color: '#0B0B0F' }}>
                <bdi>
                  {quotedTotal != null
                    ? money(quotedTotal)
                    : ar
                    ? 'يُحدَّد عند التأكيد'
                    : 'confirmed on booking'}
                </bdi>
              </span>
            </div>

            <div style={{ marginTop: '24px' }}>
              {[
                [ar ? 'المساحة' : 'Space', activeSpace?.name || '—'],
                [ar ? 'اليوم' : 'Day', dateLabel || '—'],
                [ar ? 'الساعات' : 'Hours', rangeStr || '—'],
                [
                  ar ? 'باسم' : 'Booked for',
                  [trimmedName, trimmedEmail].filter(Boolean).join(' · ') || '—',
                ],
                ...(selectedAddons.length
                  ? [[ar ? 'الإضافات' : 'Add-ons', selectedAddons.map((a) => a.name).join('، ')]]
                  : []),
                ...(quotedSubtotal != null
                  ? [
                      [ar ? 'المجموع قبل الضريبة' : 'Subtotal', money(quotedSubtotal)],
                      [ar ? 'ضريبة القيمة المضافة ١٥٪' : 'VAT 15%', money(quotedVat)],
                    ]
                  : []),
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '12px 0', borderTop: '1px solid rgba(11,11,15,0.12)', fontSize: '15px' }}>
                  <span style={{ fontWeight: 300, color: '#6B675F' }}>{k}</span>
                  <span style={{ fontWeight: 400, color: '#0B0B0F', textAlign: 'end' }}><bdi>{v}</bdi></span>
                </div>
              ))}
            </div>

            <p style={{ margin: '22px 0 0', fontSize: '14px', fontWeight: 300, color: '#3D3A36', lineHeight: 1.6 }}>
              {ar
                ? 'الدفع الإلكتروني بالبطاقة غير متاح بعد. عند التأكيد يتم حجز القاعة باسمك فوراً، ويتواصل معك فريق مارس سبيس لإتمام السداد قبل موعدك.'
                : 'Online card payment is not available yet. Confirming reserves the room in your name straight away, and the Mars Space team will contact you to settle payment before your slot.'}
            </p>

            {signedInWithoutBookableCompany &&
              notice(
                ar
                  ? 'أنت مسجّل الدخول بحساب مرتبط بمنشأة. إذا لم يكن لديك صلاحية حجز القاعات فقد يُرفض الطلب — تواصل مع مسؤول الحساب لديك.'
                  : 'You are signed in with a company-linked account. If you do not hold room-booking permission this request may be refused — ask your company admin.',
                'warn'
              )}
          </div>
        )}

        {/* STEP: Done — reached only after a verified success */}
        {currentStepKind === 'done' && confirmation && (
          <div style={{ marginTop: '44px', textAlign: 'center', paddingBottom: '12px' }}>
            <div style={{ width: '64px', height: '64px', border: '1.5px solid #8A4120', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: '24px', color: '#8A4120' }}>
              ✓
            </div>

            <h4 style={{ margin: '28px 0 0', fontSize: 'clamp(24px, 2vw, 32px)', fontWeight: 400, letterSpacing: '-0.015em', color: '#0B0B0F' }}>
              {confirmation.kind === 'booking'
                ? ar
                  ? 'تم تأكيد الحجز'
                  : 'Booking confirmed'
                : flow === 'tour'
                ? ar
                  ? 'تم إرسال طلب الجولة'
                  : 'Tour requested'
                : ar
                ? 'تم استلام طلبك'
                : 'Request received'}
            </h4>

            {confirmation.kind === 'booking' && confirmation.reference && (
              <p style={{ margin: '18px 0 0', fontSize: '15px', fontWeight: 300, color: '#6B675F' }}>
                {ar ? 'رقم الحجز' : 'Booking reference'}
                <br />
                <bdi style={{ fontSize: '22px', fontWeight: 500, color: '#8A4120', letterSpacing: '0.04em' }}>
                  {confirmation.reference}
                </bdi>
              </p>
            )}

            <p style={{ margin: '14px auto 0', maxWidth: '46ch', fontSize: '16px', fontWeight: 300, color: '#6B675F', lineHeight: 1.6 }}>
              {confirmation.kind === 'booking'
                ? `${confirmation.resourceName} · ${confirmation.dateLabel} · ${confirmation.rangeStr}${
                    confirmation.total != null ? ` · ${money(confirmation.total)}` : ''
                  }. ${
                    ar
                      ? 'القاعة محجوزة باسمك. سيتواصل معك فريق مارس سبيس لإتمام السداد قبل موعدك.'
                      : 'The room is reserved in your name. The Mars Space team will be in touch to settle payment before your slot.'
                  }`
                : confirmation.message ||
                  (ar
                    ? 'شكراً لتواصلك معنا. سيعود إليك فريقنا خلال يوم عمل واحد.'
                    : 'Thank you. Our team will come back to you within one working day.')}
            </p>

            <button
              onClick={onClose}
              style={{ marginTop: '32px', display: 'inline-flex', alignItems: 'center', background: '#8A4120', color: '#FFFFFF', border: 'none', borderRadius: '999px', padding: '15px 34px', font: '500 15px var(--font-sans)', lineHeight: 1, cursor: 'pointer', transition: 'background 250ms' }}
            >
              {ar ? 'تم' : 'Done'}
            </button>
          </div>
        )}

        {/* Failure banner — the thing this component used to have no way of saying */}
        {!done && submitError && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              marginTop: '28px',
              padding: '16px 18px',
              border: '1px solid rgba(138, 65, 32, 0.45)',
              background: 'rgba(138, 65, 32, 0.07)',
              borderRadius: '4px',
            }}
          >
            <p style={{ margin: 0, fontSize: '15px', fontWeight: 500, color: '#8A4120' }}>
              {FAILURE_COPY[submitError.kind]?.title || FAILURE_COPY.rejected.title}
            </p>
            <p style={{ margin: '6px 0 0', fontSize: '14px', fontWeight: 300, color: '#3D3A36', lineHeight: 1.6 }}>
              {FAILURE_COPY[submitError.kind]?.body || FAILURE_COPY.rejected.body}
            </p>
            {submitError.detail && (
              <p style={{ margin: '8px 0 0', fontSize: '13px', fontWeight: 300, color: '#6B675F' }}>
                <bdi>{submitError.detail}</bdi>
              </p>
            )}
          </div>
        )}

        {/* Bottom Navigation */}
        {!done && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', marginTop: '40px', paddingTop: '24px', borderTop: '1px solid rgba(11, 11, 15, 0.12)' }}>
            <button
              onClick={handleBack}
              disabled={submitting}
              style={{ background: 'none', border: 'none', padding: 0, cursor: submitting ? 'not-allowed' : 'pointer', font: '400 15px var(--font-sans)', color: '#6B675F', transition: 'color 200ms' }}
            >
              {backLabel}
            </button>

            <button
              onClick={handleNext}
              disabled={!canAdvance || submitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                background: canAdvance && !submitting ? '#8A4120' : '#A8A49D',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '999px',
                padding: '15px 32px',
                font: '500 15px var(--font-sans)',
                lineHeight: 1,
                cursor: canAdvance && !submitting ? 'pointer' : 'not-allowed',
                transition: 'background 250ms, gap 250ms',
              }}
            >
              {submitting ? (ar ? 'جاري الإرسال...' : 'Sending...') : nextButtonLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
