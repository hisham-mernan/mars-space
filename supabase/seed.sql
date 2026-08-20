-- Mars Space — reference data
--
-- Migrated from the legacy src/data/db.json. This file holds only real
-- catalogue data (branches, rooms, add-ons, plans, FAQs) and is safe to run
-- against production. Demo companies, members and bookings live in
-- seed_demo.sql instead.
--
-- Idempotent: every insert is ON CONFLICT DO UPDATE on a natural key, so
-- re-running it refreshes the catalogue rather than duplicating it.
--
-- PLAN NAMING: db.json, translations.js and the member portal disagreed
-- ("Open Desk" / "Hot Desk" / "Business Plan (Premium)"). db.json is taken as
-- canonical here because it is the only source carrying prices. The fifth
-- tier hardcoded in member/membership/page.js at SAR 2,400 is dropped - it
-- exists nowhere else.

-- ---------------------------------------------------------------------------
-- Branches
-- ---------------------------------------------------------------------------
insert into public.branches (slug, code, name, name_ar, address, address_ar,
                             latitude, longitude, status)
values
  ('jeddah', 'JED-01', 'Jeddah Branch', 'فرع جدة',
   'Jeddah Tower, King Abdulaziz Rd, Jeddah', 'برج جدة، طريق الملك عبدالعزيز، جدة',
   21.543300, 39.172800, 'active'),
  ('riyadh', 'RUH-01', 'Riyadh Branch', 'فرع الرياض',
   'Olaya Towers, Olaya District, Riyadh', 'أبراج العليا، حي العليا، الرياض',
   24.713600, 46.675300, 'coming_soon')
on conflict (slug) do update set
  code = excluded.code, name = excluded.name, name_ar = excluded.name_ar,
  address = excluded.address, address_ar = excluded.address_ar,
  latitude = excluded.latitude, longitude = excluded.longitude,
  status = excluded.status;

-- ---------------------------------------------------------------------------
-- Resources
-- ---------------------------------------------------------------------------
insert into public.resources (
  branch_id, slug, name, name_ar, category, floor, location, location_ar,
  capacity, size_sqm, rate, rate_unit, status, is_bookable,
  teaser, teaser_ar, features, features_ar, amenities, amenities_ar, hero_image
)
select b.id, v.* from public.branches b, (values
  ('ventures', 'Ventures Room', 'قاعة فينتشرز', 'meeting_room', 'Floor 1',
   null::text, null::text, 14, 35.0, 220.00, 'hour', 'available', true,
   'Boardroom table, 75" screen with video conferencing, whiteboard wall.',
   'طاولة اجتماعات رئيسية، شاشة 75 بوصة مع اتصال مرئي، جدار سبورة بيضاء.',
   array['Boardroom table seating 14', '75" screen with video conferencing',
         'Conference microphone and audio', 'Whiteboard wall with markers',
         'Stationery, adapters and clickers'],
   array['طاولة اجتماعات تتسع لـ 14 شخصاً', 'شاشة 75 بوصة مع نظام اتصالات مرئية',
         'مكبرات صوت وميكروفون للمؤتمرات', 'جدار سبورة بيضاء مع أقلام',
         'أدوات مكتبية ومحولات وصلات'],
   array['75" Screen', 'Video Conference', 'Whiteboard Wall', 'Audio System', 'Adapters'],
   array['شاشة 75 بوصة', 'اتصال مرئي', 'جدار سبورة بيضاء', 'نظام صوتي', 'محولات'],
   '/assets/photo-glass-offices.jpg'),

  ('lab', 'Lab Room', 'قاعة اللاب', 'meeting_room', 'Floor 1',
   null, null, 8, 24.0, 160.00, 'hour', 'available', true,
   'Workshop tables, projector and 65" screen, full-wall whiteboard.',
   'طاولات ورش عمل، جهاز عرض وشاشة 65 بوصة، سبورة بيضاء كاملة.',
   array['Movable workshop tables for 8', '65" screen and projector',
         'Full-wall whiteboard', 'Workshop kit: sticky notes, markers, timer',
         'Standing rail for pin-ups'],
   array['طاولات مرنة لورش العمل تتسع لـ 8 أشخاص', 'شاشة 65 بوصة وجهاز عرض ضوئي',
         'سبورة بيضاء على كامل الجدار', 'حقيبة ورش العمل: أوراق ملاحظات، أقلام، مؤقت',
         'حامل تعليق للملاحظات والرسومات'],
   array['65" Screen', 'Projector', 'Full Whiteboard', 'Workshop Kit', 'Flexible Tables'],
   array['شاشة 65 بوصة', 'جهاز عرض', 'سبورة جدارية', 'حقيبة ورش عمل', 'طاولات مرنة'],
   '/assets/photo-coworking.jpg'),

  ('vc', 'VC Room', 'قاعة VC', 'meeting_room', 'Floor 1',
   null, null, 6, 18.0, 120.00, 'hour', 'available', true,
   'Round table for six, 55" screen, natural light, the quiet room.',
   'طاولة دائرية لستة أشخاص، شاشة 55 بوصة، إضاءة طبيعية، غرفة هادئة.',
   array['Round table seating 6', '55" screen with wireless casting',
         'Natural light, blackout blind', 'Acoustic panelling',
         'Office essentials tray'],
   array['طاولة دائرية تتسع لـ 6 أشخاص', 'شاشة 55 بوصة مع بث لاسلكي',
         'إضاءة طبيعية مع ستائر عتمة', 'عزل صوتي متقدم', 'صينية المستلزمات المكتبية'],
   array['55" Screen', 'Wireless Casting', 'Natural Light', 'Acoustic Panels', 'Round Table'],
   array['شاشة 55 بوصة', 'بث لاسلكي', 'إضاءة طبيعية', 'عزل صوتي', 'طاولة دائرية'],
   '/assets/photo-vip-lounge.jpg'),

  ('community-hall', 'Community Hall', 'القاعة المجتمعية', 'community_hall', 'Floor 1',
   null, null, 80, 120.0, 400.00, 'day', 'available', true,
   'Screen wall, configurable seating and PA for talks, workshops and launches.',
   'جدار شاشة عرض، مقاعد قابلة للتهيئة ونظام صوتي للمحاضرات والإطلاقات.',
   array['Screen wall and projector', 'Theatre, classroom or circle seating',
         'PA system and two microphones', 'Stage lighting presets',
         'Pantry access for catering'],
   array['جدار شاشة عرض وجهاز عرض ضوئي', 'ترتيب مقاعد مسرحي أو تدريبي أو دائري',
         'نظام صوتي مكبر وميكروفونين', 'إعدادات إضاءة المسرح',
         'إمكانية الوصول للمطبخ للضيافة'],
   array['Screen Wall', 'Projector', 'PA Sound System', 'Microphones', 'Stage Lighting'],
   array['جدار شاشات', 'بروجكتر', 'نظام صوتي', 'ميكروفونات', 'إضاءة مسرح'],
   '/assets/photo-community-cinema.jpg'),

  -- Private offices: assigned by contract, never self-booked.
  ('office-04', 'Office 04', 'مكتب ٠٤', 'private_office', 'Floor 1',
   'North perimeter, window line', 'الواجهة الشمالية، المطلة على الشارع',
   4, 22.0, 6500.00, 'month', 'available', false,
   null, null,
   array['4 height-adjustable desks with chairs', 'Lockable glass front, frosted band',
         'Storage wall and personal lockers', 'Own network segment and printing'],
   array['٤ مكاتب قابلة لتعديل الارتفاع مع كراسي', 'واجهة زجاجية قابلة للقفل مع شريط خصوصية',
         'جدار تخزين وخزائن شخصية', 'شبكة مستقلة وطباعة خاصة'],
   array['4 Adjustable Desks', 'Private Glass Office', 'Storage Lockers', '24/7 Access'],
   array['٤ مكاتب قابلة للتعديل', 'مكتب زجاجي خاص', 'خزائن تخزين', 'دخول ٢٤/٧'],
   '/assets/photo-glass-offices.jpg'),

  ('office-11', 'Office 11', 'مكتب ١١', 'private_office', 'Floor 1',
   'East corner, daylight on two sides', 'الركن الشرقي، إضاءة من جانبين',
   6, 32.0, 9000.00, 'month', 'available', false,
   null, null,
   array['6 desks with monitor arms', 'Corner glazing, double aspect',
         'In-office meeting nook for 3', 'Own network segment and storage'],
   array['٦ مكاتب مزودة بحوامل شاشات', 'زوايا زجاجية مزدوجة الإضاءة',
         'ركن اجتماعات مصغر داخل المكتب لـ ٣ أشخاص', 'شبكة مستقلة وتخزين خاص'],
   array['6 Workstations', 'Double Aspect Daylight', 'Mini Meeting Nook', '24/7 Access'],
   array['٦ محطات عمل', 'إضاءة من جانبين', 'ركن اجتماعات مصغر', 'دخول ٢٤/٧'],
   '/assets/photo-vip-lounge.jpg'),

  ('office-17', 'Office 17', 'مكتب ١٧', 'private_office', 'Floor 1',
   'South perimeter suite', 'جناح الواجهة الجنوبية',
   10, 48.0, 14000.00, 'month', 'occupied', false,
   null, null,
   array['10 desks in two banks', 'Separable manager cabin',
         'Dedicated storage room', 'Own network, AC zone control'],
   array['١٠ مكاتب مقسمة على مجموعتين', 'مكتب مدير مستقل قابل للفصل',
         'غرفة تخزين مخصصة', 'شبكة خاصة وتحكم مستقل بالتكييف'],
   array['10 Workstations', 'Manager Cabin', 'Private Storage Room', 'Dedicated AC'],
   array['١٠ محطات عمل', 'مكتب مدير خاص', 'غرفة تخزين خاصة', 'تكييف مستقل'],
   '/assets/photo-coworking.jpg')
) as v(slug, name, name_ar, category, floor, location, location_ar,
       capacity, size_sqm, rate, rate_unit, status, is_bookable,
       teaser, teaser_ar, features, features_ar, amenities, amenities_ar, hero_image)
where b.slug = 'jeddah'
on conflict (branch_id, slug) do update set
  name = excluded.name, name_ar = excluded.name_ar, category = excluded.category,
  capacity = excluded.capacity, size_sqm = excluded.size_sqm,
  rate = excluded.rate, rate_unit = excluded.rate_unit, status = excluded.status,
  is_bookable = excluded.is_bookable, teaser = excluded.teaser,
  teaser_ar = excluded.teaser_ar, features = excluded.features,
  features_ar = excluded.features_ar, amenities = excluded.amenities,
  amenities_ar = excluded.amenities_ar, hero_image = excluded.hero_image;

-- Galleries. Only five interior photos exist and db.json reused them across
-- all seven resources; that is carried over rather than invented around.
insert into public.resource_photos (resource_id, url, sort_order)
select r.id, p.url, p.sort_order
from public.resources r
join (values
  ('ventures', '/assets/photo-glass-offices.jpg', 0),
  ('ventures', '/assets/photo-vip-lounge.jpg', 1),
  ('ventures', '/assets/photo-coworking.jpg', 2),
  ('lab', '/assets/photo-coworking.jpg', 0),
  ('lab', '/assets/photo-glass-offices.jpg', 1),
  ('lab', '/assets/photo-lounge-velvet.jpg', 2),
  ('vc', '/assets/photo-vip-lounge.jpg', 0),
  ('vc', '/assets/photo-lounge-velvet.jpg', 1),
  ('vc', '/assets/photo-glass-offices.jpg', 2),
  ('community-hall', '/assets/photo-community-cinema.jpg', 0),
  ('community-hall', '/assets/photo-lounge-velvet.jpg', 1),
  ('community-hall', '/assets/photo-coworking.jpg', 2),
  ('office-04', '/assets/photo-glass-offices.jpg', 0),
  ('office-04', '/assets/photo-coworking.jpg', 1),
  ('office-11', '/assets/photo-vip-lounge.jpg', 0),
  ('office-11', '/assets/photo-glass-offices.jpg', 1),
  ('office-17', '/assets/photo-coworking.jpg', 0),
  ('office-17', '/assets/photo-vip-lounge.jpg', 1)
) as p(slug, url, sort_order) on p.slug = r.slug
where not exists (
  select 1 from public.resource_photos rp
  where rp.resource_id = r.id and rp.url = p.url
);

-- ---------------------------------------------------------------------------
-- Availability rules: one default row per bookable resource.
-- Spec 8.4 wants these configurable; staff refine them per weekday in Studio.
-- ---------------------------------------------------------------------------
insert into public.availability_rules (resource_id, weekday, opens_at, closes_at,
                                       slot_minutes, min_duration_minutes,
                                       max_duration_minutes, buffer_minutes)
select r.id, null, '07:00', '23:00', 30,
       case when r.category = 'community_hall' then 240 else 60 end,
       480,
       case when r.category = 'community_hall' then 60 else 15 end
from public.resources r
where r.is_bookable
  and not exists (
    select 1 from public.availability_rules a
    where a.resource_id = r.id and a.weekday is null
  );

-- ---------------------------------------------------------------------------
-- Add-ons
-- ---------------------------------------------------------------------------
insert into public.addons (slug, name, name_ar, price, is_quote_only)
values
  ('tea',      'Tea Service',                       'خدمة الشاي والضيافة',        40.00, false),
  ('coffee',   'Specialty Coffee Service',          'خدمة القهوة المختصة',        60.00, false),
  ('drinks',   'Water & Soft Drinks',               'مياه ومشروبات باردة',        35.00, false),
  ('kit',      'Extra Whiteboard & Workshop Kit',   'حقيبة ورش عمل وسبورة إضافية', 30.00, false),
  ('catering', 'Catering Service',                  'خدمة تقديم الطعام والوجبات',  0.00,  true)
on conflict (slug) do update set
  name = excluded.name, name_ar = excluded.name_ar,
  price = excluded.price, is_quote_only = excluded.is_quote_only;

-- ---------------------------------------------------------------------------
-- Membership plans
-- ---------------------------------------------------------------------------
insert into public.membership_plans (slug, name, name_ar, rate, billing_cycle,
                                     included_credit_hours, features, features_ar, sort_order)
values
  ('daypass', 'Day Pass', 'تصريح يومي', 150.00, 'daily', 1,
   array['Single day access to hot desks', 'High-speed Wi-Fi & Cafe access',
         '1 hr meeting room credit'],
   array['دخول يومي للمكاتب المشتركة', 'إنترنت فائق السرعة ودخول المقهى',
         'ساعة واحدة رصيد قاعات اجتماعات'], 1),

  ('opendesk', 'Open Desk', 'مكتب مشترك', 1200.00, 'monthly', 5,
   array['24/7 Access to hot desking area', '5 hrs meeting room credits / mo',
         'Member directory & events access'],
   array['دخول ٢٤/٧ لمساحة المكاتب المشتركة', '٥ ساعات رصيد قاعات اجتماعات شهرياً',
         'دخول دليل الأعضاء والفعاليات'], 2),

  ('dedicated', 'Dedicated Desk', 'مكتب مخصص', 2200.00, 'monthly', 10,
   array['Reserved desk with lockable storage', '10 hrs meeting room credits / mo',
         'Business address & mail handling'],
   array['مكتب مخصص دائم مع وحدة تخزين قابلة للقفل', '١٠ ساعات رصيد قاعات اجتماعات شهرياً',
         'عنوان تجاري واستلام البريد'], 3),

  ('office', 'Private Office', 'مكتب خاص', 6500.00, 'monthly', 20,
   array['Lockable glass office suite', '20 hrs meeting room credits / mo',
         'Branded door sign & 24/7 access'],
   array['جناح مكتب زجاجي خاص قابل للقفل', '٢٠ ساعة رصيد قاعات اجتماعات شهرياً',
         'لوحة اسم الشركة على الباب ودخول ٢٤/٧'], 4)
on conflict (slug) do update set
  name = excluded.name, name_ar = excluded.name_ar, rate = excluded.rate,
  billing_cycle = excluded.billing_cycle,
  included_credit_hours = excluded.included_credit_hours,
  features = excluded.features, features_ar = excluded.features_ar,
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- FAQs
-- ---------------------------------------------------------------------------
insert into public.faqs (slug, category, question, question_ar, answer, answer_ar,
                         is_featured, sort_order)
values
  ('membership-includes', 'general',
   'What is included in a Mars Space membership?',
   'ما الذي تشتمل عليه عضوية مارس سبيس؟',
   'All memberships include 24/7 access to the floor, high-speed symmetric fiber Wi-Fi, unlimited specialty coffee, print/scan credits, prayer room, and member lounge access.',
   'تشمل جميع العضويات دخولاً على مدار الساعة للطابق، إنترنت ألياف ضوئية فائقة السرعة، قهوة مختصة غير محدودة، رصيد طباعة ومسح ضوئي، دخول المصلى واستراحة الأعضاء.',
   true, 1),
  ('non-members-can-book', 'bookings',
   'Can non-members book meeting rooms and community space?',
   'هل يمكن لغير الأعضاء حجز قاعات الاجتماعات والقاعة المجتمعية؟',
   'Yes! Meeting rooms and the community hall are open to both members and visitors at transparent rates.',
   'نعم! قاعات الاجتماعات والقاعة المجتمعية متاحة للأعضاء والزوار بأسعار واضحة ومحددة.',
   true, 2)
on conflict (slug) do update set
  category = excluded.category, question = excluded.question,
  question_ar = excluded.question_ar, answer = excluded.answer,
  answer_ar = excluded.answer_ar, is_featured = excluded.is_featured,
  sort_order = excluded.sort_order;
