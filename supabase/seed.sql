-- Mars Space — reference data
--
-- The real second floor of Kings Road Tower, transcribed from the Mars Space
-- company profile (13-page brochure). It replaces the invented inventory that
-- came from the old src/data/db.json ("Ventures Room", a 10-desk "Office 17").
--
-- The transcription was checked against the brochure's own stated totals:
-- 25 private offices, 324.1 sqm, 83 desks. Both reconcile exactly, which is
-- what gives confidence the areas and desk counts below are right.
--
-- Idempotent: every insert upserts on a natural key, so re-running refreshes
-- the catalogue rather than duplicating it.
--
-- STILL PLACEHOLDER, pending Mars Space:
--   * Community Space capacity (the brochure gives a 50 m stage and a 50 sqm
--     event kitchen, but no seated capacity) and its hourly/day rate.
--   * Private office rents. The price list says "upon request", so rate is 0
--     and the app shows "On request" rather than inventing a number.
--   * Meeting-room credit allowances per plan. The published price list sells
--     rooms as a separate paid product and mentions no included hours, so
--     every plan grants 0 until told otherwise.

-- ---------------------------------------------------------------------------
-- Branch
-- ---------------------------------------------------------------------------
insert into public.branches (slug, code, name, name_ar, address, address_ar,
                             latitude, longitude, status)
values
  ('jeddah', 'JED-01', 'Mars Space — Kings Road Tower', 'مارس سبيس — برج كينجز رود',
   'Second floor, Kings Road Tower, Jeddah, KSA',
   'الطابق الثاني، برج كينجز رود، جدة، المملكة العربية السعودية',
   21.543300, 39.172800, 'active')
on conflict (slug) do update set
  code = excluded.code, name = excluded.name, name_ar = excluded.name_ar,
  address = excluded.address, address_ar = excluded.address_ar,
  status = excluded.status;

-- Riyadh is not open. Kept so historical references resolve.
insert into public.branches (slug, code, name, name_ar, status)
values ('riyadh', 'RUH-01', 'Riyadh Branch', 'فرع الرياض', 'coming_soon')
on conflict (slug) do update set status = excluded.status;

-- ---------------------------------------------------------------------------
-- Private offices — 25 suites, 324.1 sqm, 83 desks
--
-- Offices 01-08 and 23-25 are team offices (4-8 desks); 09-22 are executive
-- suites (1-3 desks). Rent is "upon request", so rate stays 0 and is_bookable
-- is false: an office is assigned by contract, never self-booked.
-- ---------------------------------------------------------------------------
insert into public.resources (branch_id, slug, name, name_ar, category, floor,
                              capacity, size_sqm, rate, rate_unit, status,
                              is_bookable, teaser, teaser_ar)
select b.id, v.slug, v.name, v.name_ar, 'private_office', 'Second floor',
       v.desks, v.sqm, 0, 'month', 'available', false, v.config, v.config_ar
from public.branches b, (values
  -- Team offices
  ('office-01', 'Office 01', 'مكتب ٠١', 8, 21.5, '8 desks',              '٨ مكاتب'),
  ('office-02', 'Office 02', 'مكتب ٠٢', 6, 17.8, '6 desks',              '٦ مكاتب'),
  ('office-03', 'Office 03', 'مكتب ٠٣', 6, 15.0, '6 desks',              '٦ مكاتب'),
  ('office-04', 'Office 04', 'مكتب ٠٤', 6, 17.2, '6 desks',              '٦ مكاتب'),
  ('office-05', 'Office 05', 'مكتب ٠٥', 6, 14.0, '6 desks',              '٦ مكاتب'),
  ('office-06', 'Office 06', 'مكتب ٠٦', 6, 15.2, '6 desks',              '٦ مكاتب'),
  ('office-07', 'Office 07', 'مكتب ٠٧', 6, 14.4, '6 desks',              '٦ مكاتب'),
  ('office-08', 'Office 08', 'مكتب ٠٨', 6, 17.0, '6 desks',              '٦ مكاتب'),
  ('office-23', 'Office 23', 'مكتب ٢٣', 5, 15.0, '5 desks',              '٥ مكاتب'),
  ('office-24', 'Office 24', 'مكتب ٢٤', 4, 11.0, '4 desks',              '٤ مكاتب'),
  ('office-25', 'Office 25', 'مكتب ٢٥', 4, 11.0, '4 desks',              '٤ مكاتب'),
  -- Executive suites
  ('office-09', 'Office 09', 'مكتب ٠٩', 1,  8.3, '1 executive desk',     'مكتب تنفيذي'),
  ('office-10', 'Office 10', 'مكتب ١٠', 1,  8.3, '1 executive desk',     'مكتب تنفيذي'),
  ('office-11', 'Office 11', 'مكتب ١١', 1,  8.3, '1 executive desk',     'مكتب تنفيذي'),
  ('office-12', 'Office 12', 'مكتب ١٢', 1, 10.4, '1 executive desk',     'مكتب تنفيذي'),
  ('office-13', 'Office 13', 'مكتب ١٣', 3, 12.6, '1 executive + 2 desks', 'مكتب تنفيذي + مكتبان'),
  ('office-14', 'Office 14', 'مكتب ١٤', 3, 13.2, '1 executive + 2 desks', 'مكتب تنفيذي + مكتبان'),
  ('office-15', 'Office 15', 'مكتب ١٥', 3, 13.5, '1 executive + 2 desks', 'مكتب تنفيذي + مكتبان'),
  ('office-16', 'Office 16', 'مكتب ١٦', 1, 18.5, '1 executive + 4 pax lounge', 'مكتب تنفيذي + جلسة لأربعة'),
  ('office-17', 'Office 17', 'مكتب ١٧', 1, 11.4, '1 executive desk',     'مكتب تنفيذي'),
  ('office-18', 'Office 18', 'مكتب ١٨', 1, 12.9, '1 executive desk',     'مكتب تنفيذي'),
  ('office-19', 'Office 19', 'مكتب ١٩', 1, 13.0, '1 executive desk',     'مكتب تنفيذي'),
  ('office-20', 'Office 20', 'مكتب ٢٠', 1,  8.2, '1 executive desk',     'مكتب تنفيذي'),
  ('office-21', 'Office 21', 'مكتب ٢١', 1,  8.2, '1 executive desk',     'مكتب تنفيذي'),
  ('office-22', 'Office 22', 'مكتب ٢٢', 1,  8.2, '1 executive desk',     'مكتب تنفيذي')
) as v(slug, name, name_ar, desks, sqm, config, config_ar)
where b.slug = 'jeddah'
on conflict (branch_id, slug) do update set
  name = excluded.name, name_ar = excluded.name_ar, category = excluded.category,
  capacity = excluded.capacity, size_sqm = excluded.size_sqm,
  rate = excluded.rate, rate_unit = excluded.rate_unit,
  is_bookable = excluded.is_bookable, floor = excluded.floor,
  teaser = excluded.teaser, teaser_ar = excluded.teaser_ar;

-- ---------------------------------------------------------------------------
-- Meeting rooms, co-working and the community space
-- ---------------------------------------------------------------------------
insert into public.resources (branch_id, slug, name, name_ar, category, floor,
                              capacity, size_sqm, rate, rate_unit, status,
                              is_bookable, teaser, teaser_ar,
                              includes, includes_ar, amenities, amenities_ar)
select b.id, v.* from public.branches b, (values
  ('meeting-room-small', 'Small Meeting Room', 'قاعة اجتماعات صغيرة',
   'meeting_room', 'Second floor', 6, null::numeric, 250.00, 'hour', 'available', true,
   'From 250 SAR per hour, with 4- and 8-hour rates.',
   'من ٢٥٠ ريال للساعة، مع أسعار ٤ و٨ ساعات.',
   array['Screen', 'Wi-Fi', 'Water and coffee', 'Room setup'],
   array['شاشة عرض', 'إنترنت', 'مياه وقهوة', 'تجهيز القاعة'],
   array['Screen', 'Wi-Fi', 'Water and coffee', 'Room setup'],
   array['شاشة عرض', 'إنترنت', 'مياه وقهوة', 'تجهيز القاعة']),

  ('meeting-room-large', 'Large Meeting Room', 'قاعة اجتماعات كبيرة',
   'meeting_room', 'Second floor', 12, null, 350.00, 'hour', 'available', true,
   'From 350 SAR per hour, with 4- and 8-hour rates.',
   'من ٣٥٠ ريال للساعة، مع أسعار ٤ و٨ ساعات.',
   array['Screen', 'Wi-Fi', 'Water and coffee', 'Room setup'],
   array['شاشة عرض', 'إنترنت', 'مياه وقهوة', 'تجهيز القاعة'],
   array['Screen', 'Wi-Fi', 'Water and coffee', 'Room setup'],
   array['شاشة عرض', 'إنترنت', 'مياه وقهوة', 'تجهيز القاعة']),

  ('co-working', 'Co-working', 'مساحة العمل المشتركة',
   'hot_desk', 'Second floor', 16, 62.3, 100.00, 'day', 'available', true,
   'Shared workspace and coffee lounge. 62.3 sqm for 16.',
   'مساحة عمل مشتركة ومقهى. ٦٢٫٣ متر مربع لـ ١٦ شخصاً.',
   array['Wi-Fi', 'Coffee lounge', 'Shared workspace'],
   array['إنترنت', 'المقهى', 'مساحة عمل مشتركة'],
   array['Wi-Fi', 'Coffee lounge'],
   array['إنترنت', 'المقهى']),

  -- Capacity and rate are placeholders: the brochure gives the stage and
  -- kitchen but no seated capacity or price.
  ('community-space', 'Community Space (Majlis)', 'المساحة المجتمعية (المجلس)',
   'community_hall', 'Second floor', 60, null, 0.00, 'day', 'available', true,
   'Sessions, seminars and workshops. 50 m entertainment stage and a 50 sqm plug-in event kitchen.',
   'جلسات وندوات وورش عمل. مسرح ترفيهي ٥٠ متراً ومطبخ فعاليات ٥٠ متراً مربعاً.',
   array['50 m entertainment stage', '50 sqm plug-in event kitchen', 'Hospitality from our restaurants'],
   array['مسرح ترفيهي ٥٠ متراً', 'مطبخ فعاليات ٥٠ متراً مربعاً', 'ضيافة من مطاعمنا'],
   array['Stage', 'Event kitchen', 'Hospitality'],
   array['مسرح', 'مطبخ فعاليات', 'ضيافة'])
) as v(slug, name, name_ar, category, floor, capacity, size_sqm, rate, rate_unit,
       status, is_bookable, teaser, teaser_ar, includes, includes_ar,
       amenities, amenities_ar)
where b.slug = 'jeddah'
on conflict (branch_id, slug) do update set
  name = excluded.name, name_ar = excluded.name_ar, category = excluded.category,
  capacity = excluded.capacity, size_sqm = excluded.size_sqm,
  rate = excluded.rate, rate_unit = excluded.rate_unit,
  is_bookable = excluded.is_bookable, teaser = excluded.teaser,
  teaser_ar = excluded.teaser_ar, includes = excluded.includes,
  includes_ar = excluded.includes_ar, amenities = excluded.amenities,
  amenities_ar = excluded.amenities_ar;

-- Anything left over from the invented db.json inventory is retired rather
-- than deleted: bookings reference these rows and the history must survive.
update public.resources
   set status = 'retired', is_bookable = false
 where slug in ('ventures', 'lab', 'vc', 'community-hall');

-- ---------------------------------------------------------------------------
-- Rate tiers — the published price list
-- ---------------------------------------------------------------------------
insert into public.rate_tiers (resource_id, hours, price, label, label_ar)
select r.id, v.hours, v.price, v.label, v.label_ar
from public.resources r, (values
  (1, 250.00,  'Hourly',        'بالساعة'),
  (4, 750.00,  '4-hour rate',   'أربع ساعات'),
  (8, 1400.00, '8-hour rate',   'ثماني ساعات')
) as v(hours, price, label, label_ar)
where r.slug = 'meeting-room-small'
on conflict (resource_id, hours) do update set
  price = excluded.price, label = excluded.label, label_ar = excluded.label_ar;

insert into public.rate_tiers (resource_id, hours, price, label, label_ar)
select r.id, v.hours, v.price, v.label, v.label_ar
from public.resources r, (values
  (1, 350.00,  'Hourly',        'بالساعة'),
  (4, 1300.00, '4-hour rate',   'أربع ساعات'),
  (8, 2400.00, '8-hour rate',   'ثماني ساعات')
) as v(hours, price, label, label_ar)
where r.slug = 'meeting-room-large'
on conflict (resource_id, hours) do update set
  price = excluded.price, label = excluded.label, label_ar = excluded.label_ar;

-- ---------------------------------------------------------------------------
-- Availability rules for the bookable resources
-- ---------------------------------------------------------------------------
insert into public.availability_rules (resource_id, weekday, opens_at, closes_at,
                                       slot_minutes, min_duration_minutes,
                                       max_duration_minutes, buffer_minutes)
select r.id, null, '07:00', '23:00', 30,
       case when r.category = 'community_hall' then 240 else 60 end,
       480,
       case when r.category = 'community_hall' then 60 else 15 end
from public.resources r
where r.is_bookable and r.status = 'available'
  and not exists (select 1 from public.availability_rules a
                   where a.resource_id = r.id and a.weekday is null);

-- ---------------------------------------------------------------------------
-- Membership plans — the published price list
-- ---------------------------------------------------------------------------
insert into public.membership_plans (slug, name, name_ar, rate, billing_cycle,
                                     included_credit_hours, features, features_ar,
                                     sort_order)
values
  ('day-pass', 'Day Pass', 'تصريح يومي', 100.00, 'daily', 0,
   array['One day in the shared workspace', 'Coffee lounge access', 'Wi-Fi'],
   array['يوم واحد في مساحة العمل المشتركة', 'دخول المقهى', 'إنترنت'], 1),

  ('ten-day-pass', '10-Day Pass', 'تصريح ١٠ أيام', 750.00, 'daily', 0,
   array['Ten days in the shared workspace', 'Use them whenever you like', 'Coffee lounge access'],
   array['عشرة أيام في مساحة العمل المشتركة', 'استخدمها متى شئت', 'دخول المقهى'], 2),

  ('monthly-flex', 'Monthly Flex', 'الاشتراك الشهري المرن', 1300.00, 'monthly', 0,
   array['Monthly access to the shared workspace', 'Coffee lounge access', 'Professional environment'],
   array['دخول شهري لمساحة العمل المشتركة', 'دخول المقهى', 'بيئة عمل احترافية'], 3),

  ('dedicated-desk', 'Dedicated Desk', 'مكتب مخصص', 1800.00, 'monthly', 0,
   array['Your own desk', '24/7 access', 'Common areas and amenities'],
   array['مكتبك الخاص', 'دخول على مدار الساعة', 'المرافق والمساحات المشتركة'], 4),

  ('private-office', 'Private Office', 'مكتب خاص', 0.00, 'monthly', 0,
   array['A private office on the second floor', '8.2 to 21.5 sqm', 'Premium amenities', 'Priced on request'],
   array['مكتب خاص في الطابق الثاني', 'من ٨٫٢ إلى ٢١٫٥ متر مربع', 'مرافق متميزة', 'السعر عند الطلب'], 5)
on conflict (slug) do update set
  name = excluded.name, name_ar = excluded.name_ar, rate = excluded.rate,
  billing_cycle = excluded.billing_cycle,
  included_credit_hours = excluded.included_credit_hours,
  features = excluded.features, features_ar = excluded.features_ar,
  sort_order = excluded.sort_order;

-- The invented tiers from db.json.
update public.membership_plans set is_active = false
 where slug in ('daypass', 'opendesk', 'dedicated', 'office');

-- ---------------------------------------------------------------------------
-- Add-ons
-- ---------------------------------------------------------------------------
insert into public.addons (slug, name, name_ar, price, is_quote_only)
values
  ('catering', 'Catering', 'خدمة الضيافة', 0.00, true),
  ('extra-setup', 'Additional room setup', 'تجهيز إضافي للقاعة', 0.00, true)
on conflict (slug) do update set
  name = excluded.name, name_ar = excluded.name_ar,
  price = excluded.price, is_quote_only = excluded.is_quote_only;

-- Screen, Wi-Fi, water and coffee are included in the room rate, so the old
-- paid tea/coffee/whiteboard add-ons no longer apply.
update public.addons set is_active = false
 where slug in ('tea', 'coffee', 'drinks', 'kit');

-- ---------------------------------------------------------------------------
-- FAQs
-- ---------------------------------------------------------------------------
insert into public.faqs (slug, category, question, question_ar, answer, answer_ar,
                         is_featured, sort_order)
values
  ('what-is-included', 'general',
   'What is included when I book a meeting room?',
   'ما الذي تشمله قاعة الاجتماعات عند الحجز؟',
   'Every meeting room booking includes a screen, Wi-Fi, water and coffee, and room setup.',
   'يشمل كل حجز لقاعة اجتماعات شاشة عرض وإنترنت ومياه وقهوة وتجهيز القاعة.',
   true, 1),
  ('office-sizes', 'general',
   'What sizes are the private offices?',
   'ما هي مساحات المكاتب الخاصة؟',
   'There are 25 private offices on the second floor, from 8.2 to 21.5 sqm, holding 1 to 8 desks. Pricing is on request.',
   'يوجد ٢٥ مكتباً خاصاً في الطابق الثاني، من ٨٫٢ إلى ٢١٫٥ متر مربع، تتسع من مكتب واحد إلى ثمانية. السعر عند الطلب.',
   true, 2)
on conflict (slug) do update set
  category = excluded.category, question = excluded.question,
  question_ar = excluded.question_ar, answer = excluded.answer,
  answer_ar = excluded.answer_ar, is_featured = excluded.is_featured,
  sort_order = excluded.sort_order;
