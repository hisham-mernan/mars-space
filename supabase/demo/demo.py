# Mars Space — demo floor generator.
#
# Writes demo_seed.sql (the whole floor) and demo_seed_rollback.sql (its exact
# inverse). Deterministic: the same seed always produces the same floor, so the
# seed can be re-applied after a reset and every id stays stable.
#
# Two rules shape it:
#
#   REMOVABLE — every generated row uses a reserved uuid family, so the rollback
#   deletes precisely what was inserted and can never match a real row.
#     dc… company    dd… contract   de… office assignment   df… profile
#     da… booking    db… invoice    e1… repair              e2… event
#
#   UNDELIVERABLE — every address is @demo.mars.sa, a subdomain Mars Space owns
#   and has not created. Seeding plausible addresses at real domains is how a
#   demo dataset ends up emailing strangers the first time someone tests a
#   notification.
#
# Constraint values were read off the live CHECK constraints, not assumed:
# repairs use 'access_security'; credit_entries ties the sign of `hours` to the
# `reason`; bookings carry 'requested'/'quoted' for the community request flow.

import io, os, json, random, datetime as dt

HERE = os.path.dirname(os.path.abspath(__file__))
rnd = random.Random(20260820)
TODAY = dt.date(2026, 8, 20)
VAT = 0.15
EXISTING_COMPANY = 'd0000000-0000-4000-8000-000000000001'   # the real account's company
SUPA = 'https://xihjvfcjnkcjmgruxapu.supabase.co'

def q(s):
    if s is None:
        return 'NULL'
    if isinstance(s, bool):
        return 'true' if s else 'false'
    if isinstance(s, (int, float)):
        return str(s)
    return "'" + str(s).replace("'", "''") + "'"

def uid(p, n):
    return f'{p}000000-0000-4000-8000-{n:012d}'

def row(*vals):
    return '(' + ', '.join(q(v) for v in vals) + ')'

# ---------------------------------------------------------------------------
# Name pools
# ---------------------------------------------------------------------------
MALE = [('Abdullah','عبدالله'),('Mohammed','محمد'),('Faisal','فيصل'),('Omar','عمر'),
        ('Khalid','خالد'),('Yousef','يوسف'),('Sultan','سلطان'),('Ibrahim','إبراهيم'),
        ('Turki','تركي'),('Bandar','بندر'),('Majed','ماجد'),('Ziad','زياد'),
        ('Hassan','حسن'),('Anas','أنس'),('Rakan','راكان'),('Salman','سلمان'),
        ('Nawaf','نواف'),('Tariq','طارق'),('Basel','باسل'),('Waleed','وليد'),
        ('Mazen','مازن'),('Saud','سعود'),('Hamza','حمزة'),('Rayan','ريان')]
FEMALE = [('Noura','نورة'),('Sara','سارة'),('Lama','لمى'),('Reem','ريم'),
          ('Aisha','عائشة'),('Maha','مها'),('Dana','دانة'),('Hessa','حصة'),
          ('Jood','جود'),('Layan','ليان'),('Shatha','شذى'),('Ghada','غادة'),
          ('Amal','أمل'),('Rana','رنا'),('Bushra','بشرى'),('Wjdan','وجدان'),
          ('Haya','هيا'),('Mona','منى'),('Rawan','روان'),('Salma','سلمى')]
SURNAME = [('Alharbi','الحربي'),('Alqahtani','القحطاني'),('Alghamdi','الغامدي'),
           ('Alzahrani','الزهراني'),('Alshehri','الشهري'),('Aldosari','الدوسري'),
           ('Alotaibi','العتيبي'),('Alsubaie','السبيعي'),('Bamerdah','بامرده'),
           ('Nashar','نشار'),('Baeshen','باعشن'),('Jamjoom','جمجوم'),
           ('Alamoudi','العمودي'),('Zahid','زاهد'),('Fakieh','فقيه'),
           ('Alsaggaf','السقاف'),('Bagader','باقادر'),('Trabulsi','طرابلسي'),
           ('Nassief','ناصيف'),('Alireza','علي رضا')]
TITLES = [('Founder & CEO','المؤسس والرئيس التنفيذي'),
          ('Managing Director','العضو المنتدب'),
          ('Operations Manager','مدير العمليات'),
          ('Finance Manager','المدير المالي'),
          ('Product Manager','مدير المنتج'),
          ('Software Engineer','مهندس برمجيات'),
          ('Senior Engineer','مهندس أول'),
          ('Designer','مصمم'),
          ('Account Manager','مدير حسابات'),
          ('Marketing Lead','قائد التسويق'),
          ('Business Analyst','محلل أعمال'),
          ('Office Manager','مدير المكتب'),
          ('Consultant','مستشار'),
          ('Legal Counsel','مستشار قانوني'),
          ('Architect','مهندس معماري')]

# slug, EN, AR, industry EN, industry AR, headcount, domain
FLOOR = [
 ('office-02','Rihla Travel Tech','رحلة لتقنيات السفر','Travel Technology','تقنية السفر',6,'rihla.sa'),
 ('office-03','Nakheel Advisory','نخيل للاستشارات','Management Consulting','استشارات إدارية',5,'nakheel-advisory.sa'),
 ('office-04','Bayan Analytics','بيان للتحليلات','Data & Analytics','البيانات والتحليلات',6,'bayan.sa'),
 ('office-05','Sadeem Studio','سديم ستوديو','Design Studio','استوديو تصميم',5,'sadeem.studio'),
 ('office-06','Tamween Logistics','تموين للخدمات اللوجستية','Logistics','الخدمات اللوجستية',6,'tamween.sa'),
 ('office-07','Mizan Fintech','ميزان للتقنية المالية','Financial Technology','التقنية المالية',6,'mizan.finance'),
 ('office-08','Qamar Media','قمر ميديا','Media Production','إنتاج إعلامي',5,'qamarmedia.sa'),
 ('office-13','Nibras Architecture','نبراس للعمارة','Architecture','العمارة',3,'nibras.design'),
 ('office-14','Hikma Health','حكمة الصحية','Health Technology','التقنية الصحية',3,'hikma.health'),
 ('office-15','Sanad HR','سند للموارد البشرية','Human Resources','الموارد البشرية',3,'sanad-hr.sa'),
 ('office-23','Waseet Legal','وسيط للمحاماة','Legal Services','الخدمات القانونية',5,'waseet.legal'),
 ('office-24','Jood Interiors','جود للتصميم الداخلي','Interior Design','التصميم الداخلي',4,'joodinteriors.sa'),
 ('office-25','Athar Marketing','أثر للتسويق','Marketing','التسويق',4,'athar.marketing'),
 ('office-09','Faris Consulting','فارس للاستشارات','Strategy Consulting','استشارات استراتيجية',1,'faris.consulting'),
 ('office-10','Deem Ventures','ديم فينتشرز','Venture Capital','رأس المال الجريء',1,'deem.vc'),
 ('office-11','Rawaa Design','رواء للتصميم','Brand Design','تصميم العلامات',1,'rawaa.design'),
 ('office-12','Manara Capital','منارة كابيتال','Investment','الاستثمار',1,'manara.capital'),
 ('office-16','Turath Heritage','تراث للتطوير','Heritage Development','تطوير التراث',1,'turath.sa'),
 ('office-17','Noor Accounting','نور للمحاسبة','Accounting','المحاسبة',1,'noor-accounting.sa'),
 ('office-18','Sabil Translation','سبيل للترجمة','Translation','الترجمة',1,'sabil.translation'),
 ('office-19','Yaqeen Audit','يقين للتدقيق','Audit','التدقيق',1,'yaqeen.audit'),
 ('office-20','Barq Systems','برق للأنظمة','IT Systems','أنظمة تقنية',1,'barq.systems'),
 ('office-21','Wafra Investments','وفرة للاستثمار','Investment','الاستثمار',1,'wafra.sa'),
 ('office-22','Kayan Robotics','كيان للروبوتات','Robotics','الروبوتات',1,'kayan.tech'),
]

DESC = {
 'Travel Technology': ("Booking and itinerary software for Saudi tour operators.","برمجيات الحجز وإدارة الرحلات لمشغلي السياحة في السعودية."),
 'Management Consulting': ("Operating-model and growth advisory for family businesses.","استشارات نماذج التشغيل والنمو للشركات العائلية."),
 'Data & Analytics': ("Dashboards and forecasting for retail and logistics.","لوحات المعلومات والتنبؤ لقطاعي التجزئة والخدمات اللوجستية."),
 'Design Studio': ("Brand identity and product design for early-stage companies.","الهوية البصرية وتصميم المنتجات للشركات الناشئة."),
 'Logistics': ("Last-mile delivery coordination across the Western Region.","تنسيق التوصيل للميل الأخير في المنطقة الغربية."),
 'Financial Technology': ("Payment reconciliation and treasury tooling.","أدوات تسوية المدفوعات وإدارة الخزينة."),
 'Media Production': ("Documentary and commercial production for regional brands.","إنتاج الأفلام الوثائقية والإعلانات للعلامات الإقليمية."),
 'Architecture': ("Residential and hospitality architecture along the Red Sea coast.","العمارة السكنية والضيافة على ساحل البحر الأحمر."),
 'Health Technology': ("Clinic scheduling and patient records for private practices.","جدولة العيادات وسجلات المرضى للعيادات الخاصة."),
 'Human Resources': ("Recruitment and payroll services for growing teams.","خدمات التوظيف والرواتب للفرق النامية."),
 'Legal Services': ("Corporate and commercial law, incorporation and contracts.","قانون الشركات والتجارة، التأسيس والعقود."),
 'Interior Design': ("Workplace and hospitality interiors.","التصميم الداخلي لأماكن العمل والضيافة."),
 'Marketing': ("Performance marketing and content for consumer brands.","التسويق الرقمي والمحتوى للعلامات الاستهلاكية."),
 'Strategy Consulting': ("Independent strategy advisory.","استشارات استراتيجية مستقلة."),
 'Venture Capital': ("Pre-seed and seed investment in Saudi software.","الاستثمار في مراحل التأسيس المبكرة في البرمجيات السعودية."),
 'Brand Design': ("Identity design and art direction.","تصميم الهوية والإخراج الفني."),
 'Investment': ("Private investment and asset management.","الاستثمار الخاص وإدارة الأصول."),
 'Heritage Development': ("Restoration consulting for historic Jeddah properties.","استشارات الترميم لعقارات جدة التاريخية."),
 'Accounting': ("Bookkeeping, VAT filing and financial statements.","مسك الدفاتر وإقرارات ضريبة القيمة المضافة والقوائم المالية."),
 'Translation': ("Certified Arabic-English legal and technical translation.","الترجمة القانونية والتقنية المعتمدة بين العربية والإنجليزية."),
 'Audit': ("External audit and internal controls review.","التدقيق الخارجي ومراجعة الضوابط الداخلية."),
 'IT Systems': ("Network and systems support for small offices.","دعم الشبكات والأنظمة للمكاتب الصغيرة."),
 'Robotics': ("Warehouse automation research and integration.","أبحاث وتكامل أتمتة المستودعات."),
}

REPAIRS = [
 ('hvac','Air conditioning not cooling','المكيف لا يبرد'),
 ('hvac','AC making a rattling noise','صوت اهتزاز من المكيف'),
 ('electrical','Flickering ceiling light','إضاءة السقف تومض'),
 ('electrical','Power socket not working','مقبس الكهرباء لا يعمل'),
 ('plumbing','Slow drain in the kitchenette','بطء تصريف المياه في المطبخ'),
 ('furniture','Desk drawer will not close','درج المكتب لا يغلق'),
 ('furniture','Chair gas lift has failed','مسند الكرسي لا يثبت'),
 ('it_network','Wi-Fi keeps dropping','انقطاع متكرر في الواي فاي'),
 ('it_network','Meeting room screen not detected','شاشة قاعة الاجتماعات لا تعمل'),
 ('cleaning','Bin not emptied','لم يتم إفراغ سلة المهملات'),
 ('access_security','Door keycode not accepted','رمز الباب لا يعمل'),
 ('other','Blind is stuck halfway','الستارة عالقة في المنتصف'),
]

EVENTS = [
 ('Founders Breakfast','فطور المؤسسين','A monthly breakfast for founders on the floor.','فطور شهري لمؤسسي الشركات في الطابق.',True),
 ('Arabic UX Meetup','ملتقى تجربة المستخدم العربية','Designing interfaces that read right in Arabic.','تصميم واجهات تُقرأ بشكل صحيح بالعربية.',True),
 ('VAT & ZATCA Clinic','عيادة الضريبة والفوترة','Practical session on e-invoicing compliance.','جلسة عملية حول الامتثال للفوترة الإلكترونية.',True),
 ('Investor Office Hours','ساعات مكتب المستثمرين','Fifteen-minute slots with visiting investors.','مواعيد قصيرة مع مستثمرين زائرين.',True),
 ('Ramadan Iftar','إفطار رمضان','Floor-wide iftar in the Majlis.','إفطار جماعي في المجلس.',True),
 ('Quarterly Town Hall','اللقاء الفصلي','Mars Space updates for all members.','تحديثات مارس سبيس لجميع الأعضاء.',True),
]

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
used = set()
def person():
    while True:
        pool = MALE if rnd.random() < 0.62 else FEMALE
        f_en, f_ar = rnd.choice(pool)
        s_en, s_ar = rnd.choice(SURNAME)
        if (f_en, s_en) not in used:
            used.add((f_en, s_en))
            return f_en, f_ar, s_en, s_ar

companies, profiles, members, contracts, assigns, credits = [], [], [], [], [], []
invoices, lines, repairs, rep_updates, bookings, events = [], [], [], [], [], []
people_of = {}
pid = 0
inv_n = 0
rep_n = 0

RATE = {1: 3500, 3: 7800, 4: 9600, 5: 11500, 6: 13200, 8: 17000}
CREDIT = {1: 4, 3: 8, 4: 10, 5: 12, 6: 16, 8: 20}

for ci, (slug, en, ar, ind_en, ind_ar, head, site) in enumerate(FLOOR, start=1):
    cid = uid('dc', ci)
    d_en, d_ar = DESC[ind_en]
    companies.append(row(cid, en, ar, f'70{rnd.randint(10**7,10**8-1)}',
                         f'3{rnd.randint(10**13,10**14-1)}', f'billing@{site}',
                         f'+9661{rnd.randint(20000000,29999999)}', 'active',
                         d_en, d_ar, ind_en, f'https://{site}',
                         f'{cid}/logo.png', rnd.random() < 0.85))

    team = []
    for k in range(head):
        pid += 1
        f_en, f_ar, s_en, s_ar = person()
        p = uid('df', pid)
        email = f'{f_en.lower()}.{s_en.lower()}@demo.mars.sa'
        if k == 0:
            t_en, t_ar = TITLES[0] if head > 1 else TITLES[12]
            role, perms = 'company_admin', (True, True, True, True)
        else:
            t_en, t_ar = rnd.choice(TITLES[2:])
            role = 'employee'
            perms = (rnd.random() < 0.9, rnd.random() < 0.35,
                     rnd.random() < 0.8, rnd.random() < 0.15)
        profiles.append(dict(
            id=p, email=email, name=f'{f_en} {s_en}', name_ar=f'{f_ar} {s_ar}',
            phone=f'+9665{rnd.randint(10000000,59999999)}',
            avatar=f'{SUPA}/storage/v1/object/public/avatars/{p}/avatar.png',
            lang='ar' if rnd.random() < 0.7 else 'en',
            show=rnd.random() < 0.55, title=t_en,
            bio=f'{t_en} at {en}.'))
        members.append(row(cid, p, role, 'active', t_ar, *perms,
                           TODAY - dt.timedelta(days=rnd.randint(20, 700))))
        team.append(p)
    people_of[cid] = team

    start = TODAY - dt.timedelta(days=rnd.randint(60, 900))
    end = start + dt.timedelta(days=365 * rnd.choice([1, 1, 2]))
    monthly = RATE.get(head, 3500 + head * 1900)
    credit = CREDIT.get(head, 8)
    ctr = uid('dd', ci)
    contracts.append((ctr, f'MS-CON-{2000+ci}', cid, start, end, monthly, credit))
    assigns.append((uid('de', ci), slug, cid, ctr, start, end, f'MS-{1000+ci*7}'))
    credits.append((cid, ctr, credit))

    # Three months of membership invoices: two settled, the most recent open.
    for m in range(3):
        inv_n += 1
        issue = dt.date(TODAY.year, TODAY.month, 1) - dt.timedelta(days=30 * m)
        due = issue + dt.timedelta(days=14)
        total = float(monthly)
        sub = round(total / (1 + VAT), 2)
        vat = round(total - sub, 2)
        if m == 0:
            status, paid, paid_at = ('unpaid', 0.0, None) if rnd.random() < 0.6 else ('overdue', 0.0, None)
            if due < TODAY and status == 'unpaid':
                status = 'overdue'
        else:
            status, paid, paid_at = 'paid', total, due - dt.timedelta(days=rnd.randint(1, 10))
        iid = uid('db', inv_n)
        invoices.append(row(iid, f'INV-2026-{3000+inv_n}', cid, ctr, 'membership',
                            f'Monthly membership — {issue.strftime("%B %Y")}',
                            f'الاشتراك الشهري — {issue.strftime("%Y-%m")}',
                            issue, due, sub, VAT, vat, total, paid, 'SAR', status, paid_at))
        lines.append(row(iid, f'Private office {slug[-2:]} — {head} desks',
                         f'مكتب خاص {slug[-2:]} — {head} مكاتب', 1, sub, sub, 1))

    # Repairs: most companies have raised one or two.
    for _ in range(rnd.choice([0, 1, 1, 2])):
        rep_n += 1
        cat, t_en, t_ar = rnd.choice(REPAIRS)
        st = rnd.choice(['submitted','acknowledged','in_progress','resolved','resolved','closed'])
        made = TODAY - dt.timedelta(days=rnd.randint(1, 90))
        rid = uid('e1', rep_n)
        resolved = made + dt.timedelta(days=rnd.randint(1, 5)) if st in ('resolved','closed') else None
        repairs.append(row(rid, f'RQ-{5000+rep_n}', cid, rnd.choice(team), slug,
                           cat, rnd.choice(['low','normal','normal','high']), st,
                           t_en, t_ar, made, resolved))
        rep_updates.append(row(rid, None, 'submitted', 'Request received.', made))
        if st in ('acknowledged','in_progress','resolved','closed'):
            rep_updates.append(row(rid, 'submitted', 'acknowledged',
                                   'Facilities team notified.',
                                   made + dt.timedelta(hours=3)))
        if st in ('resolved','closed'):
            rep_updates.append(row(rid, 'in_progress', 'resolved',
                                   'Work completed and checked.', resolved))

# Community events across the Majlis.
for ei, (t_en, t_ar, d_en, d_ar, pub) in enumerate(EVENTS, start=1):
    offset = [-38, -12, 6, 20, 41, 62][ei - 1]
    day = TODAY + dt.timedelta(days=offset)
    status = 'completed' if offset < 0 else 'scheduled'
    events.append(row(uid('e2', ei), f'demo-event-{ei}', t_en, t_ar, d_en, d_ar,
                      day, 18, 20, status, pub, 20))

data = dict(companies=companies, profiles=profiles, members=members,
            contracts=[list(map(str, c)) for c in contracts],
            assigns=[list(map(str, a)) for a in assigns],
            credits=[list(map(str, c)) for c in credits],
            invoices=invoices, lines=lines, repairs=repairs,
            rep_updates=rep_updates, events=events)
json.dump(data, io.open(os.path.join(HERE, 'demo_data.json'), 'w', encoding='utf-8'),
          ensure_ascii=False)

print(f'companies   {len(companies)}')
print(f'people      {len(profiles)}')
print(f'members     {len(members)}')
print(f'contracts   {len(contracts)}')
print(f'assignments {len(assigns)}')
print(f'invoices    {len(invoices)}  lines {len(lines)}')
print(f'repairs     {len(repairs)}  updates {len(rep_updates)}')
print(f'events      {len(events)}')
print(f'desks let   {sum(r[5] for r in FLOOR)} across {len(FLOOR)} offices (+ office-01 existing)')
