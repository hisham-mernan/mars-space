'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BookingModal from '../components/BookingModal';

export default function Home() {
  const { language, mounted } = useLanguage();

  // Booking Modal State
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingFlow, setBookingFlow] = useState('book');
  const [initialSpaceIndex, setInitialSpaceIndex] = useState(0);
  const [initialOfficeIndex, setInitialOfficeIndex] = useState(0);
  const [initialPlanIndex, setInitialPlanIndex] = useState(0);

  // Explore Floor Interactive State
  const [selectedArea, setSelectedArea] = useState(0);

  // Testimonials Slider State
  const [activeQuote, setActiveQuote] = useState(0);

  // Animated Numbers State
  const [numsCounted, setNumsCounted] = useState(false);
  const [numValues, setNumValues] = useState([0, 0, 0, 0]);

  // Explore Areas Data (Matching v2 specification)
  const areas = [
    {
      name: language === 'ar' ? 'قاعات الاجتماعات' : 'Meeting rooms',
      ar: 'قاعات الاجتماعات',
      img: '/assets/photo-glass-offices.jpg',
      line: language === 'ar'
        ? 'أربع قاعات زجاجية متصلة بالصالة الفسيحة: فينتشرز، اللاب، VC، والقاعة المجتمعية، تتسع من ٤ أشخاص حتى ١٤ شخصاً مع شاشات فائقة الدقة.'
        : 'Four glass rooms off the open floor: Ventures, Lab, VC and Community Hall, from a six-seat huddle to a fourteen-seat boardroom with a video wall.',
      meta: language === 'ar' ? '٤ قاعات · شاشات وعقد مؤتمرات في كل قاعة' : '4 rooms · screens and conferencing in each',
      status: language === 'ar' ? '٣ قاعات متاحة الآن' : '3 of 4 free right now'
    },
    {
      name: language === 'ar' ? 'المكاتب الخاصة' : 'Private offices',
      ar: 'المكاتب الخاصة',
      img: '/assets/photo-glass-offices.jpg',
      line: language === 'ar'
        ? 'واحد وعشرون مكتباً خاصاً مغلقاً على الواجهات الزجاجية، تسع من شخصين حتى عشرة أشخاص. اسم شركتك على الباب وتأمين شبكة خاص ودخول ٢٤/٧.'
        : 'Twenty-one lockable offices around the perimeter, sized from two to ten. Your name on the door, your own network, and daylight on every desk.',
      meta: language === 'ar' ? '٢١ مكتباً · دخول على مدار الساعة' : '21 offices · 24/7 access',
      status: language === 'ar' ? '٣ مكاتب متاحة حالياً' : '3 open right now'
    },
    {
      name: language === 'ar' ? 'العمل المشترك' : 'Coworking',
      ar: 'العمل المشترك',
      img: '/assets/photo-coworking.jpg',
      line: language === 'ar'
        ? 'قلب الطابق المفتوح المضاء بنور الشمس من الجانبين. اختر أي مكتب بتصريح يومي أو حافظ على نفس المكتب يومياً بعضوية مخصصة.'
        : 'The open centre of the floor, lit from both sides. Take any desk with a day pass or keep the same one every morning with a membership.',
      meta: language === 'ar' ? 'مساحة مفتوحة · مكاتب مشتركة ومخصصة' : 'Open floor · hot and dedicated desks',
      status: language === 'ar' ? 'مكاتب متاحة اليوم' : 'desks free today'
    },
    {
      name: language === 'ar' ? 'القاعة المجتمعية' : 'Community hall',
      ar: 'القاعة المجتمعية',
      img: '/assets/photo-community-cinema.jpg',
      line: language === 'ar'
        ? 'القاعة الركنية المزودة بجدار شاشة عرض ومكبرات صوت. صفوف مسرحية للمحاضرات، دوائر لورش العمل، أو مساحة مفتوحة لليالي الإطلاق.'
        : 'The corner room with the screen wall. Theatre rows for a talk, loose circles for a workshop, cleared out for a launch night.',
      meta: language === 'ar' ? 'مرنة التجهيز · نظام صوتي كامل · ضيافة متكاملة' : 'Configurable · full AV · catering handled',
      status: language === 'ar' ? 'حجز بالساعة أو نصف يوم' : 'hourly or half-day'
    },
    {
      name: language === 'ar' ? 'ركن القهوة' : 'Coffee lounge',
      ar: 'ركن القهوة',
      img: '/assets/photo-lounge-velvet.jpg',
      line: language === 'ar'
        ? 'قهوة مختصة وجلسات مريحة للاستراحة وتبادل الأحاديث. متضمنة في جميع الباقات والحجوزات، ومعظم الشراكات تبدأ من هنا.'
        : 'Specialty coffee and low seating where the floor decompresses. Every plan and every booking includes it, and most introductions start here.',
      meta: language === 'ar' ? 'دخول مفتوح · باريستا يومياً' : 'Open access · barista hours daily',
      status: language === 'ar' ? 'مفتوح دائماً' : 'always open'
    },
    {
      name: language === 'ar' ? 'كبائن الهاتف' : 'Phone booths',
      ar: 'كبائن الهاتف',
      img: '/assets/photo-vip-lounge.jpg',
      line: language === 'ar'
        ? 'ثلاث كبائن معزولة صوتياً بجوار المدخل للمكالمات الفردية والتركيز العالي. بدون حجز أو مفتاح، اغلق الباب وابدأ.'
        : 'Three acoustic booths by the entrance for the call you need to take now. No booking, no key. Just close the door.',
      meta: language === 'ar' ? '٣ كبائن · شخص واحد لكل كبينة' : '3 booths · one person each',
      status: language === 'ar' ? 'كبينتان متاحتان الآن' : '2 free right now'
    }
  ];

  // Offices Data (Matching v2 spec)
  const officesList = [
    {
      id: 'office-04',
      name: language === 'ar' ? 'مكتب ٠٤' : 'Office 04',
      size: '22 m²',
      desks: language === 'ar' ? '٤ مكاتب' : '4 desks',
      loc: language === 'ar' ? 'الواجهة الشمالية، المطلة على الشارع' : 'North perimeter, window line',
      price: language === 'ar' ? 'من ٦,٥٠٠ ر.س / شهرياً' : 'from SAR 6,500 / month',
      img: '/assets/photo-glass-offices.jpg'
    },
    {
      id: 'office-11',
      name: language === 'ar' ? 'مكتب ١١' : 'Office 11',
      size: '32 m²',
      desks: language === 'ar' ? '٦ مكاتب' : '6 desks',
      loc: language === 'ar' ? 'الركن الشرقي، إضاءة من جانبين' : 'East corner, daylight on two sides',
      price: language === 'ar' ? 'من ٩,٠٠٠ ر.س / شهرياً' : 'from SAR 9,000 / month',
      img: '/assets/photo-vip-lounge.jpg'
    },
    {
      id: 'office-17',
      name: language === 'ar' ? 'مكتب ١٧' : 'Office 17',
      size: '48 m²',
      desks: language === 'ar' ? '١٠ مكاتب' : '10 desks',
      loc: language === 'ar' ? 'جناح الواجهة الجنوبية' : 'South perimeter suite',
      price: language === 'ar' ? 'من ١٤,٠٠٠ ر.س / شهرياً' : 'from SAR 14,000 / month',
      img: '/assets/photo-coworking.jpg'
    }
  ];

  // Testimonials Quotes Data
  const quotes = [
    {
      text: language === 'ar' 
        ? 'انتقلنا لثلاثة أشخاص ووقعنا الجولة الاستثمارية (Series A) من قاعة فينتشرز بعد عام. الطابق نما معنا طوال الطريق.'
        : 'We moved in with three people and signed our Series A from the Ventures room a year later. The floor grew with us the whole way.',
      who: language === 'ar' ? 'مؤسس شركة ناشئة' : 'Founder',
      role: language === 'ar' ? 'شركة تقنية مالية مقيمة' : 'Resident fintech startup'
    },
    {
      text: language === 'ar' 
        ? 'أحجز نفس القاعة لكل ورشة عمل مع عملائي. إنه المكان الوحيد في جدة حيث الشاشة والقهوة والهدوء تعمل معاً بلا ثغرة.'
        : 'I book the same room for every client workshop. It is the only space in Jeddah where the screen, the coffee and the quiet all just work.',
      who: language === 'ar' ? 'مستشار رئيسي' : 'Principal consultant',
      role: language === 'ar' ? 'ممارسة استراتيجية مستقلة' : 'Independent strategy practice'
    },
    {
      text: language === 'ar'
        ? 'الفارق هو من تجلس بجواره. نصف تعييناتنا وأول عميلين لنا جاءوا من محادثات عفوية في ركن القهوة.'
        : 'The difference is who you sit next to. Half our hires and our first two customers came from conversations in the coffee lounge.',
      who: language === 'ar' ? 'الرئيس التنفيذي' : 'CEO',
      role: language === 'ar' ? 'شركة برمجيات مقيمة' : 'Resident SaaS company'
    }
  ];

  // Counter numbers animation
  useEffect(() => {
    if (!mounted || numsCounted) return;
    const targetValues = [21, 4, 120, 24];
    const duration = 1500;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setNumValues(targetValues.map(t => Math.round(t * ease)));
      if (progress < 1) requestAnimationFrame(animate);
      else setNumsCounted(true);
    };

    requestAnimationFrame(animate);
  }, [mounted, numsCounted]);

  if (!mounted) return null;

  const currentArea = areas[selectedArea];

  // Modal Open Handlers matching v2 functions (openBook, openOffice, openTour, planPicks)
  const openBookFlow = (spaceIndex = 0) => {
    setBookingFlow('book');
    setInitialSpaceIndex(spaceIndex);
    setBookingOpen(true);
  };

  const openOfficeFlow = (officeIdx = 0) => {
    setBookingFlow('office');
    setInitialOfficeIndex(officeIdx);
    setBookingOpen(true);
  };

  const openTourFlow = () => {
    setBookingFlow('tour');
    setBookingOpen(true);
  };

  const openPlanFlow = (planIdx = 0) => {
    setBookingFlow('plan');
    setInitialPlanIndex(planIdx);
    setBookingOpen(true);
  };

  return (
    <>
      <Header />

      <main style={{ background: '#0B0B0F', color: '#F5F3EF' }}>
        {/* Section 1: Hero Section */}
        <section id="top" data-screen-label="Hero" style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'flex-end', background: '#0B0B0F', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            <img
              src="/assets/photo-vip-lounge.jpg"
              alt="The Mars Space lounge at dusk"
              style={{
                width: '100%',
                height: '118%',
                objectFit: 'cover',
                display: 'block',
                animation: 'slowZoom 2400ms cubic-bezier(0.16,1,0.30,1) both'
              }}
            />
          </div>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11,11,15,0.94) 0%, rgba(11,11,15,0.42) 45%, rgba(11,11,15,0.30) 100%)' }} />

          <div style={{ position: 'relative', width: '100%', maxWidth: '1600px', margin: '0 auto', padding: '200px clamp(24px, 4vw, 72px) clamp(96px, 14vh, 150px)', boxSizing: 'border-box' }}>
            <h1 style={{ margin: 0, fontSize: 'clamp(52px, 7.5vw, 124px)', fontWeight: 300, letterSpacing: '-0.035em', lineHeight: 1.0, maxWidth: '12ch', animation: 'heroRise 700ms cubic-bezier(0.16,1,0.30,1) 200ms both' }}>
              {language === 'ar' ? 'صُمِّم للذين يبنون.' : 'Built for the people who build.'}
            </h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '32px', marginTop: 'clamp(32px, 5vh, 56px)' }}>
              <p style={{ margin: 0, maxWidth: '44ch', fontSize: 'clamp(18px, 1.5vw, 22px)', fontWeight: 300, lineHeight: 1.65, color: 'rgba(245,243,239,0.9)', animation: 'heroRise 700ms cubic-bezier(0.16,1,0.30,1) 450ms both' }}>
                {language === 'ar'
                  ? 'طابق عمل خاص في جدة: مكاتب، قاعات اجتماعات وقاعة مجتمعية، تُدار بأسلوب وفلسفة حاضنة الأعمال التي تعمل هنا أيضاً.'
                  : 'A private working floor in Jeddah: offices, rooms and a community hall, run by the venture builder that works here too.'}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', animation: 'heroRise 700ms cubic-bezier(0.16,1,0.30,1) 650ms both' }}>
                <button
                  onClick={() => openBookFlow(0)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: '#F5F3EF',
                    color: '#0B0B0F',
                    border: 'none',
                    borderRadius: '999px',
                    padding: '18px 36px',
                    font: "500 16px 'Thmanyah Sans', sans-serif",
                    lineHeight: 1,
                    cursor: 'pointer',
                    transition: 'background 250ms, gap 250ms'
                  }}
                >
                  {language === 'ar' ? 'احجز مساحة' : 'Book a space'}
                  <span>→</span>
                </button>
                
                <button
                  onClick={openTourFlow}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: 'none',
                    border: '1px solid rgba(245,243,239,0.45)',
                    color: '#F5F3EF',
                    borderRadius: '999px',
                    padding: '18px 36px',
                    font: "500 16px 'Thmanyah Sans', sans-serif",
                    lineHeight: 1,
                    cursor: 'pointer',
                    transition: 'border-color 250ms, color 250ms'
                  }}
                >
                  {language === 'ar' ? 'احجز جولة' : 'Book a tour'}
                </button>
              </div>
            </div>

            <div dir="rtl" style={{ marginTop: 'clamp(40px, 6vh, 64px)', paddingTop: '28px', borderTop: '1px solid rgba(245,243,239,0.18)', fontSize: '17px', fontWeight: 300, color: 'rgba(245,243,239,0.75)', animation: 'fadeIn 900ms 900ms both' }}>
              مارس سبيس، جدة. طابقٌ خاص للعمل، من مارس فينتشرز.
            </div>
          </div>
        </section>

        {/* Section 2: Philosophy Statement */}
        <section data-screen-label="Philosophy" style={{ background: '#0B0B0F', padding: 'clamp(120px, 18vh, 220px) 0' }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)', boxSizing: 'border-box' }}>
            <p style={{ margin: '0 auto', maxWidth: '28ch', fontSize: 'clamp(30px, 3.6vw, 56px)', fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1.3, textAlign: 'center', textWrap: 'pretty' }}>
              {language === 'ar' ? (
                <>أغلب مساحات العمل تؤجرك مكتباً. <span style={{ color: '#C86B3C' }}>نحن بنينا الطابق الذي نحتاجه لبناء الشركات.</span> ثم فتحنا الباب.</>
              ) : (
                <>Most workspaces rent you a desk. <span style={{ color: '#C86B3C' }}>We built the floor we needed to build companies.</span> Then we opened the door.</>
              )}
            </p>
            <p style={{ margin: '48px auto 0', maxWidth: '52ch', textAlign: 'center', fontSize: '18px', fontWeight: 300, color: 'rgba(245,243,239,0.65)' }}>
              {language === 'ar'
                ? 'مارس فينتشرز تأخذ الشركات من الفكرة حتى الاستحواذ. مارس سبيس هو الطابق الذي يحدث فيه ذلك: مستوى واحد، ستة أنواع من القاعات، وكل شيء مُصمم للزخم والإنتاجية.'
                : 'Mars Ventures takes companies from idea to exit. Mars Space is the floor where that happens: one level, six kinds of room, and everything tuned for momentum rather than amenity theatre.'}
            </p>
          </div>
        </section>

        {/* Section 3: The Space */}
        <section id="space" data-screen-label="The Space" style={{ background: '#0B0B0F', padding: '0 0 clamp(120px, 16vh, 200px)' }}>
          <div style={{ position: 'relative', height: 'clamp(420px, 80vh, 860px)', overflow: 'hidden' }}>
            <img src="/assets/photo-community-cinema.jpg" alt="The community hall, screening night" style={{ width: '100%', height: '116%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11,11,15,0.55), rgba(11,11,15,0) 45%)' }} />
          </div>
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(40px, 6vw, 120px)', marginTop: 'clamp(-80px, -6vw, -120px)', position: 'relative' }}>
              <div style={{ flex: '1 1 480px', background: '#F5F3EF', color: '#0B0B0F', padding: 'clamp(40px, 4.5vw, 72px)', maxWidth: '640px', boxSizing: 'border-box' }}>
                <h2 style={{ margin: 0, fontSize: 'clamp(32px, 3.2vw, 48px)', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                  {language === 'ar' ? <>طابق واحد،<br />صغير عن قصد.</> : <>One floor,<br />deliberately small.</>}
                </h2>
                <p style={{ margin: '28px 0 0', fontSize: '17px', fontWeight: 300, lineHeight: 1.75, color: '#3D3A36' }}>
                  {language === 'ar'
                    ? 'خمس ثوانٍ من مكتبك إلى قاعة الاجتماعات. عشر ثوانٍ للقهوة. المكاتب تحيط بالنور الطبيعي على المحيط الخارجي، الصالة المفتوحة في المنتصف، والقاعة المجتمعية تأخذ الركن مع شاشة العرض.'
                    : 'Five seconds from your desk to a meeting room. Ten to coffee. Offices ring the daylight on the perimeter, the open floor holds the middle, and the community hall takes the corner with the screen wall.'}
                </p>
                <div dir="rtl" style={{ marginTop: '24px', fontSize: '16px', fontWeight: 300, color: '#6B675F' }}>
                  طابق واحد، صغير عن قصد. كل شيء على بُعد خطوات.
                </div>
              </div>

              <div style={{ flex: '1 1 380px', alignSelf: 'flex-end', paddingTop: 'clamp(96px, 10vw, 160px)' }}>
                <div style={{ overflow: 'hidden' }}>
                  <img src="/assets/photo-glass-offices.jpg" alt="Glass-walled offices along the perimeter" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                </div>
                <p style={{ margin: '18px 0 0', fontSize: '15px', fontWeight: 300, color: 'rgba(245,243,239,0.55)' }}>
                  {language === 'ar'
                    ? 'واحد وعشرون مكتباً زجاجياً تحيط بالمحيط الخارجي ليغمر الضوء الطبيعي الطابق بالكامل.'
                    : 'Twenty-one glass offices hold the perimeter, so the light crosses the whole floor.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Explore the Space */}
        <section id="explore" data-screen-label="Explore the space" style={{ background: '#111014', padding: 'clamp(100px, 14vh, 180px) 0' }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)', boxSizing: 'border-box' }}>
            <h2 style={{ margin: 0, fontSize: 'clamp(36px, 4vw, 64px)', fontWeight: 300, letterSpacing: '-0.025em', lineHeight: 1.1, maxWidth: '16ch' }}>
              {language === 'ar' ? 'تجول في الطابق من هنا.' : 'Walk the floor from here.'}
            </h2>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(40px, 5vw, 96px)', marginTop: 'clamp(48px, 6vh, 88px)', alignItems: 'stretch' }}>
              {/* Left Selector List */}
              <div style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {areas.map((a, idx) => {
                  const isSelected = idx === selectedArea;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedArea(idx)}
                      onMouseEnter={() => setSelectedArea(idx)}
                      style={{
                        cursor: 'pointer',
                        padding: '18px 0',
                        borderBottom: '1px solid rgba(245,243,239,0.1)',
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        gap: '20px',
                        paddingInlineStart: isSelected ? '12px' : '0px',
                        transition: 'all 300ms cubic-bezier(0.16, 1, 0.30, 1)'
                      }}
                    >
                      <span style={{ fontSize: 'clamp(24px, 2.2vw, 34px)', fontWeight: 400, letterSpacing: '-0.015em', color: isSelected ? '#C86B3C' : '#F5F3EF' }}>
                        {a.name}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 300, color: '#6B675F', whiteSpace: 'nowrap' }}>
                        {a.meta.split('·')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Right Dynamic Preview */}
              <div style={{ flex: '1.4 1 480px', minWidth: 0 }}>
                <div style={{ position: 'relative', aspectRatio: '16/10', overflow: 'hidden', borderRadius: '4px' }}>
                  <img
                    src={currentArea.img}
                    alt={currentArea.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      transition: 'opacity 500ms ease'
                    }}
                  />
                </div>
                <div style={{ marginTop: '28px' }}>
                  <h3 style={{ margin: 0, fontSize: 'clamp(22px, 1.8vw, 28px)', fontWeight: 500, letterSpacing: '-0.01em' }}>
                    {currentArea.name}
                    <span dir="rtl" style={{ fontSize: '0.7em', fontWeight: 300, color: '#6B675F', marginInlineStart: '10px' }}>
                      {currentArea.ar}
                    </span>
                  </h3>
                  <p style={{ margin: '10px 0 0', maxWidth: '60ch', fontSize: '16px', fontWeight: 300, lineHeight: 1.7, color: 'rgba(245,243,239,0.65)' }}>
                    {currentArea.line}
                  </p>
                  <p style={{ margin: '12px 0 0', fontSize: '15px', fontWeight: 300, color: '#A8A49D' }}>
                    {currentArea.meta} · <span style={{ color: '#C86B3C' }}>{currentArea.status}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: The Floor in Numbers */}
        <section data-screen-label="The floor in numbers" style={{ background: '#0B0B0F', padding: 'clamp(100px, 14vh, 180px) 0' }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(32px, 4vw, 64px)' }}>
              <div style={{ flex: '1 1 200px', borderTop: '1px solid rgba(245,243,239,0.15)', paddingTop: '28px' }}>
                <div style={{ fontSize: 'clamp(48px, 5vw, 84px)', fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {numValues[0]}
                </div>
                <p style={{ margin: '14px 0 0', fontSize: '16px', fontWeight: 300, color: '#A8A49D' }}>
                  {language === 'ar' ? 'مكاتب خاصة تسع من شخصين لـ ١٠ أشخاص' : 'private offices, two to ten people each'}
                </p>
              </div>

              <div style={{ flex: '1 1 200px', borderTop: '1px solid rgba(245,243,239,0.15)', paddingTop: '28px' }}>
                <div style={{ fontSize: 'clamp(48px, 5vw, 84px)', fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {numValues[1]}
                </div>
                <p style={{ margin: '14px 0 0', fontSize: '16px', fontWeight: 300, color: '#A8A49D' }}>
                  {language === 'ar' ? 'قاعات اجتماعات مجهزة بالساعة' : 'bookable rooms, by the hour'}
                </p>
              </div>

              <div style={{ flex: '1 1 200px', borderTop: '1px solid rgba(245,243,239,0.15)', paddingTop: '28px' }}>
                <div style={{ fontSize: 'clamp(48px, 5vw, 84px)', fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {numValues[2]}
                </div>
                <p style={{ margin: '14px 0 0', fontSize: '16px', fontWeight: 300, color: '#A8A49D' }}>
                  {language === 'ar' ? 'مقعد عبر الطابق من المكاتب للاستراحة' : 'seats across the floor, desks to lounge'}
                </p>
              </div>

              <div style={{ flex: '1 1 200px', borderTop: '1px solid rgba(245,243,239,0.15)', paddingTop: '28px' }}>
                <div style={{ fontSize: 'clamp(48px, 5vw, 84px)', fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {numValues[3]}<span style={{ fontSize: '0.55em', color: '#C86B3C' }}>/7</span>
                </div>
                <p style={{ margin: '14px 0 0', fontSize: '16px', fontWeight: 300, color: '#A8A49D' }}>
                  {language === 'ar' ? 'دخول للأعضاء، كل يوم في السنة' : 'member access, every day of the year'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Companies Marquee */}
        <section data-screen-label="Companies on the floor" style={{ background: '#0B0B0F', padding: '0 0 clamp(100px, 14vh, 180px)', overflow: 'hidden' }}>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 300, color: '#6B675F', textAlign: 'center' }}>
            {language === 'ar' ? 'الشركات التي تعمل من هذا الطابق' : 'The companies working from this floor'}
          </p>
          <div style={{ position: 'relative', marginTop: 'clamp(36px, 5vh, 56px)' }}>
            <div style={{ display: 'flex', gap: 'clamp(56px, 7vw, 120px)', width: 'max-content', animation: 'marquee 28s linear infinite' }}>
              <div style={{ display: 'flex', gap: 'clamp(56px, 7vw, 120px)', alignItems: 'center' }}>
                {[1, 2, 3, 4, 5, 6].map((_, i) => (
                  <img key={i} src="/assets/mars-wordmark-white.png" alt="Member company" style={{ height: '28px', opacity: 0.45, transition: 'opacity 300ms' }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 'clamp(56px, 7vw, 120px)', alignItems: 'center' }} aria-hidden="true">
                {[1, 2, 3, 4, 5, 6].map((_, i) => (
                  <img key={i} src="/assets/mars-wordmark-white.png" alt="Member company" style={{ height: '28px', opacity: 0.45 }} />
                ))}
              </div>
            </div>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 'clamp(60px, 10vw, 180px)', background: 'linear-gradient(to right, #0B0B0F, rgba(11,11,15,0))', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 'clamp(60px, 10vw, 180px)', background: 'linear-gradient(to left, #0B0B0F, rgba(11,11,15,0))', pointerEvents: 'none' }} />
          </div>
        </section>

        {/* Section 7: Offices */}
        <section id="offices" data-screen-label="Offices" style={{ background: '#111014', padding: 'clamp(100px, 14vh, 180px) 0' }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '32px' }}>
              <h2 style={{ margin: 0, fontSize: 'clamp(36px, 4vw, 64px)', fontWeight: 300, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
                {language === 'ar' ? 'المكاتب المتاحة حالياً.' : 'Offices open right now.'}
              </h2>
              <p style={{ margin: 0, maxWidth: '42ch', fontSize: '17px', fontWeight: 300, color: '#A8A49D' }}>
                {language === 'ar'
                  ? 'المكاتب يتم تعاقدها بفرعنا مباشرة وليس بالدفع الإلكتروني. أخبرنا عن المكتب المناسب وسنعود إليك خلال يوم عمل.'
                  : 'Offices are leased on contract, not booked online. Tell us which one fits and we come back to you within a working day to arrange it.'}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'clamp(24px, 3vw, 48px)', marginTop: 'clamp(48px, 6vh, 80px)' }}>
              {officesList.map((o, k) => (
                <div
                  key={o.id}
                  onClick={() => openOfficeFlow(k)}
                  style={{ cursor: 'pointer', minWidth: 0 }}
                >
                  <div style={{ overflow: 'hidden', aspectRatio: '4/3', background: '#1A191E', borderRadius: '4px' }}>
                    <img src={o.img} alt={o.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 900ms cubic-bezier(0.16,1,0.30,1)' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '16px', marginTop: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: 'clamp(21px, 1.8vw, 26px)', fontWeight: 500, letterSpacing: '-0.01em' }}>
                      {o.name}
                    </h3>
                    <span style={{ fontSize: '14px', fontWeight: 300, color: '#6B675F', whiteSpace: 'nowrap' }}>
                      {o.size}
                    </span>
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: '15px', fontWeight: 300, color: '#A8A49D' }}>
                    {o.desks} · {o.loc}
                  </p>
                  <p style={{ margin: '14px 0 0', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 500, color: '#C86B3C' }}>
                    {language === 'ar' ? 'عرض واستفسار' : 'View and enquire'}
                    <span>→</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 8: Community Hall Feature */}
        <section id="community" data-screen-label="Community" style={{ position: 'relative', background: '#0B0B0F', overflow: 'hidden' }}>
          <div style={{ position: 'relative', height: 'clamp(480px, 90vh, 900px)' }}>
            <img src="/assets/photo-lounge-velvet.jpg" alt="Evening gathering in the lounge" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(11,11,15,0.82) 0%, rgba(11,11,15,0.25) 65%, rgba(11,11,15,0.1) 100%)' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
              <div style={{ maxWidth: '1600px', width: '100%', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)', boxSizing: 'border-box' }}>
                <div style={{ maxWidth: '560px' }}>
                  <h2 style={{ margin: 0, fontSize: 'clamp(34px, 3.8vw, 60px)', fontWeight: 300, letterSpacing: '-0.025em', lineHeight: 1.12 }}>
                    {language === 'ar' ? 'القاعة التي يعرض فيها رواد المدينة أعمالهم.' : "The room where the city's builders show their work."}
                  </h2>
                  <p style={{ margin: '26px 0 0', fontSize: '17px', fontWeight: 300, lineHeight: 1.75, color: 'rgba(245,243,239,0.8)' }}>
                    {language === 'ar'
                      ? 'محاضرات، عروض أفلام، أيام استعراض المشاريع وعشاء هادئ. القاعة المجتمعية تعيد تشكيل نفسها لما يحتاجه الأسبوع، مع شاشة العرض والمقاعد والضيافة من قِبلنا.'
                      : 'Talks, screenings, demo days and quiet dinners. The community hall reconfigures around whatever the week needs, with the screen wall, seating and catering handled by us.'}
                  </p>
                  <button
                    onClick={() => openBookFlow(3)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginTop: '36px',
                      background: '#F5F3EF',
                      color: '#0B0B0F',
                      border: 'none',
                      borderRadius: '999px',
                      padding: '16px 32px',
                      font: "500 15px 'Thmanyah Sans', sans-serif",
                      lineHeight: 1,
                      cursor: 'pointer',
                      transition: 'background 250ms, gap 250ms'
                    }}
                  >
                    {language === 'ar' ? 'احجز القاعة المجتمعية' : 'Book the hall'}
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: 'clamp(64px, 8vh, 104px) clamp(24px, 4vw, 72px)', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(28px, 4vw, 72px)' }}>
              <div style={{ flex: '1 1 260px' }}>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 300, lineHeight: 1.75, color: 'rgba(245,243,239,0.65)' }}>
                  <span style={{ color: '#F5F3EF', fontWeight: 500 }}>
                    {language === 'ar' ? 'ألياف ضوئية فائقة السرعة.' : 'Fibre that disappears.'}
                  </span>{' '}
                  {language === 'ar'
                    ? 'إنترنت متماثل وسريع جداً على كل مقعد، لتنغمس في عملك دون انقطاع.'
                    : 'Symmetric fibre and clean Wi-Fi on every seat. The internet is only noticed when it\'s gone, so it never is.'}
                </p>
              </div>

              <div style={{ flex: '1 1 260px' }}>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 300, lineHeight: 1.75, color: 'rgba(245,243,239,0.65)' }}>
                  <span style={{ color: '#F5F3EF', fontWeight: 500 }}>
                    {language === 'ar' ? 'عنوان تجاري موثوق.' : 'A real address.'}
                  </span>{' '}
                  {language === 'ar'
                    ? 'عنوان تجاري مسجل، استقبال وتمرير البريد والطرود، واستقبال زوارك باسم شركتك.'
                    : 'Registered business address, mail and package handling, and a reception that greets your guests by company name.'}
                </p>
              </div>

              <div style={{ flex: '1 1 260px' }}>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 300, lineHeight: 1.75, color: 'rgba(245,243,239,0.65)' }}>
                  <span style={{ color: '#F5F3EF', fontWeight: 500 }}>
                    {language === 'ar' ? 'البنية التحتية المكتملة.' : 'The quiet infrastructure.'}
                  </span>{' '}
                  {language === 'ar'
                    ? 'مصلى في نفس الطابق، دورات مياه وخزائن، طباعة ومواقف سيارات بالأسفل لتتفرغ للعمل.'
                    : 'Prayer room on the floor, showers, lockers, printing, parking below, all arranged so you stop thinking about them.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 9: Membership Plans (Light Background Layout) */}
        <section id="membership" data-screen-label="Membership" style={{ background: '#F5F3EF', color: '#0B0B0F', padding: 'clamp(100px, 14vh, 180px) 0' }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '32px' }}>
              <h2 style={{ margin: 0, fontSize: 'clamp(36px, 4vw, 64px)', fontWeight: 300, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
                {language === 'ar' ? 'أربع طرق للانضمام.' : 'Four ways in.'}
              </h2>
              <p style={{ margin: 0, maxWidth: '40ch', fontSize: '17px', fontWeight: 300, color: '#6B675F' }}>
                {language === 'ar'
                  ? 'ابدأ بتصريح يومي، استمر بمكتب مشترك، وانمو إلى مكتب خاص. كل باقة تشمل الطابق بالكامل: الاستراحة، القهوة، والمجتمع.'
                  : 'Start with a day, stay for a desk, grow into an office. Every plan includes the whole floor: the lounge, the coffee, the community.'}
              </p>
            </div>

            <div style={{ marginTop: 'clamp(48px, 6vh, 80px)' }}>
              {/* Row 1: Day Pass */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '16px clamp(24px, 4vw, 64px)', padding: 'clamp(28px, 3vw, 40px) 0', borderTop: '1px solid rgba(11,11,15,0.15)', transition: 'all 300ms' }}>
                <h3 style={{ margin: 0, flex: '1 1 220px', fontSize: 'clamp(24px, 2.2vw, 34px)', fontWeight: 400, letterSpacing: '-0.015em' }}>
                  {language === 'ar' ? 'تصريح يومي' : 'Day pass'}
                </h3>
                <p style={{ margin: 0, flex: '2.2 1 320px', fontSize: '16px', fontWeight: 300, color: '#6B675F' }}>
                  {language === 'ar' ? 'أي مكتب مفتوح من ٨ صباحاً حتى ٨ مساءً، القهوة والاستراحة متضمنتان.' : 'Any open desk from eight to eight, coffee and lounge included. Come see how the floor works.'}
                </p>
                <div style={{ flex: 'none', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: 'clamp(20px, 1.6vw, 26px)', fontWeight: 700, letterSpacing: '-0.01em' }}>
                    <bdi>SAR 150</bdi>
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 300, color: '#6B675F' }}>{language === 'ar' ? '/ يومي' : '/ day'}</span>
                </div>
                <button
                  onClick={() => openPlanFlow(0)}
                  style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: "500 15px 'Thmanyah Sans', sans-serif", color: '#8A4120' }}
                >
                  {language === 'ar' ? 'احصل على تصريح' : 'Get a pass'}
                  <span>→</span>
                </button>
              </div>

              {/* Row 2: Open Desk */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '16px clamp(24px, 4vw, 64px)', padding: 'clamp(28px, 3vw, 40px) 0', borderTop: '1px solid rgba(11,11,15,0.15)', transition: 'all 300ms' }}>
                <h3 style={{ margin: 0, flex: '1 1 220px', fontSize: 'clamp(24px, 2.2vw, 34px)', fontWeight: 400, letterSpacing: '-0.015em' }}>
                  {language === 'ar' ? 'مكتب مشترك' : 'Open desk'}
                </h3>
                <p style={{ margin: 0, flex: '2.2 1 320px', fontSize: '16px', fontWeight: 300, color: '#6B675F' }}>
                  {language === 'ar' ? 'أي مكتب في أي وقت على مدار الساعة، مع ساعات قاعات اجتماعات شهرياً واستلام البريد.' : 'Any desk, any hour, 24/7, with monthly meeting-room hours and your mail handled at reception.'}
                </p>
                <div style={{ flex: 'none', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: 'clamp(20px, 1.6vw, 26px)', fontWeight: 700, letterSpacing: '-0.01em' }}>
                    <bdi>SAR 1,200</bdi>
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 300, color: '#6B675F' }}>{language === 'ar' ? '/ شهرياً' : '/ month'}</span>
                </div>
                <button
                  onClick={() => openPlanFlow(1)}
                  style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: "500 15px 'Thmanyah Sans', sans-serif", color: '#8A4120' }}
                >
                  {language === 'ar' ? 'انضم الآن' : 'Join'}
                  <span>→</span>
                </button>
              </div>

              {/* Row 3: Dedicated Desk */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '16px clamp(24px, 4vw, 64px)', padding: 'clamp(28px, 3vw, 40px) 0', borderTop: '1px solid rgba(11,11,15,0.15)', transition: 'all 300ms' }}>
                <h3 style={{ margin: 0, flex: '1 1 220px', fontSize: 'clamp(24px, 2.2vw, 34px)', fontWeight: 400, letterSpacing: '-0.015em' }}>
                  {language === 'ar' ? 'مكتب مخصص' : 'Dedicated desk'}
                </h3>
                <p style={{ margin: 0, flex: '2.2 1 320px', fontSize: '16px', fontWeight: 300, color: '#6B675F' }}>
                  {language === 'ar' ? 'نفس الكرسي كل صباح، خزانة شخصية، وعنوان تجاري مسجل لشركتك.' : 'The same chair every morning, a locker, a registered business address: a fixed point for a moving company.'}
                </p>
                <div style={{ flex: 'none', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: 'clamp(20px, 1.6vw, 26px)', fontWeight: 700, letterSpacing: '-0.01em' }}>
                    <bdi>SAR 2,200</bdi>
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 300, color: '#6B675F' }}>{language === 'ar' ? '/ شهرياً' : '/ month'}</span>
                </div>
                <button
                  onClick={() => openPlanFlow(2)}
                  style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: "500 15px 'Thmanyah Sans', sans-serif", color: '#8A4120' }}
                >
                  {language === 'ar' ? 'انضم الآن' : 'Join'}
                  <span>→</span>
                </button>
              </div>

              {/* Row 4: Private Office */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '16px clamp(24px, 4vw, 64px)', padding: 'clamp(28px, 3vw, 40px) 0', borderTop: '1px solid rgba(11,11,15,0.15)', borderBottom: '1px solid rgba(11,11,15,0.15)', transition: 'all 300ms' }}>
                <h3 style={{ margin: 0, flex: '1 1 220px', fontSize: 'clamp(24px, 2.2vw, 34px)', fontWeight: 400, letterSpacing: '-0.015em', color: '#8A4120' }}>
                  {language === 'ar' ? 'مكتب خاص' : 'Private office'}
                </h3>
                <p style={{ margin: 0, flex: '2.2 1 320px', fontSize: '16px', fontWeight: 300, color: '#6B675F' }}>
                  {language === 'ar' ? 'مكتب زجاجي مغلق لشخصين إلى عشرة أشخاص، اسمك على الباب وتأمين شبكي خاص.' : 'A lockable glass office for two to ten, your name on the door, your own network. Leased on contract, arranged in person.'}
                </p>
                <div style={{ flex: 'none', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: 'clamp(20px, 1.6vw, 26px)', fontWeight: 700, letterSpacing: '-0.01em' }}>
                    <bdi>SAR 6,500</bdi>
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 300, color: '#6B675F' }}>{language === 'ar' ? '/ شهرياً' : '/ month'}</span>
                </div>
                <button
                  onClick={() => openOfficeFlow(0)}
                  style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: "500 15px 'Thmanyah Sans', sans-serif", color: '#8A4120' }}
                >
                  {language === 'ar' ? 'عرض المكاتب' : 'See offices'}
                  <span>→</span>
                </button>
              </div>
            </div>

            <p style={{ margin: '28px 0 0', fontSize: '15px', fontWeight: 300, color: '#6B675F' }}>
              {language === 'ar'
                ? 'قاعات الاجتماعات والقاعة المجتمعية مفتوحة للجميع. الأعضاء والزوار يحجزون نفس المساحات بنفس الأسعار.'
                : 'Meeting rooms and the community hall are open to everyone. Members and visitors book the same spaces at the same rates.'}
            </p>
          </div>
        </section>

        {/* Section 10: Testimonials Slider */}
        <section data-screen-label="Testimonial" style={{ background: '#111014', padding: 'clamp(110px, 16vh, 200px) 0' }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)', boxSizing: 'border-box' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', transition: 'opacity 450ms ease' }}>
              <p style={{ margin: 0, fontSize: 'clamp(26px, 3vw, 44px)', fontWeight: 300, letterSpacing: '-0.015em', lineHeight: 1.4, textWrap: 'pretty' }}>
                “{quotes[activeQuote].text}”
              </p>
              <p style={{ margin: '36px 0 0', fontSize: '16px', fontWeight: 500, color: '#C86B3C' }}>
                {quotes[activeQuote].who}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: 300, color: '#6B675F' }}>
                {quotes[activeQuote].role}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '56px' }}>
              {[0, 1, 2].map((idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveQuote(idx)}
                  aria-label={`Quote ${idx + 1}`}
                  style={{
                    width: '32px',
                    height: '4px',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    background: activeQuote === idx ? '#C86B3C' : 'rgba(245,243,239,0.15)',
                    transition: 'background 300ms'
                  }}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Section 11: Visit / Book a Tour */}
        <section id="visit" data-screen-label="Book a tour" style={{ position: 'relative', background: '#0B0B0F', overflow: 'hidden' }}>
          <div style={{ position: 'relative', height: 'clamp(520px, 88vh, 860px)' }}>
            <img src="/assets/photo-coworking.jpg" alt="Morning light across the coworking floor" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(11,11,15,0.72)' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 'clamp(40px, 5.5vw, 88px)', fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
                  {language === 'ar' ? 'شاهده بنفسك.' : 'See it in person.'}
                </h2>
                <div dir="rtl" style={{ marginTop: '16px', fontSize: 'clamp(19px, 1.8vw, 26px)', fontWeight: 300, color: 'rgba(245,243,239,0.7)' }}>
                  تعال وشاهد الطابق بنفسك.
                </div>
                <p style={{ margin: '26px auto 0', maxWidth: '42ch', fontSize: '17px', fontWeight: 300, color: 'rgba(245,243,239,0.75)' }}>
                  {language === 'ar'
                    ? 'عشرون دقيقة، والقهوة علينا. نتجول في الطابق، تلتقي بالأعضاء، والمساحة تتحدث عن نفسها.'
                    : "Twenty minutes, coffee included. We'll walk the floor, you meet the people, and the space does the rest."}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '14px', marginTop: '44px' }}>
                  <button
                    onClick={openTourFlow}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: '#F5F3EF',
                      color: '#0B0B0F',
                      border: 'none',
                      borderRadius: '999px',
                      padding: '18px 38px',
                      font: "500 16px 'Thmanyah Sans', sans-serif",
                      lineHeight: 1,
                      cursor: 'pointer',
                      transition: 'background 250ms, gap 250ms'
                    }}
                  >
                    {language === 'ar' ? 'احجز جولة' : 'Book a tour'}
                    <span>→</span>
                  </button>

                  <button
                    onClick={() => openBookFlow(0)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      background: 'none',
                      border: '1px solid rgba(245,243,239,0.45)',
                      color: '#F5F3EF',
                      borderRadius: '999px',
                      padding: '18px 38px',
                      font: "500 16px 'Thmanyah Sans', sans-serif",
                      lineHeight: 1,
                      cursor: 'pointer',
                      transition: 'border-color 250ms, color 250ms'
                    }}
                  >
                    {language === 'ar' ? 'احجز مساحة' : 'Book a space'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Unified V2 Multi-Flow Booking Engine Modal */}
      <BookingModal
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        initialFlow={bookingFlow}
        initialSpaceIndex={initialSpaceIndex}
        initialOfficeIndex={initialOfficeIndex}
        initialPlanIndex={initialPlanIndex}
      />

      {/* Keyframe Animations */}
      <style jsx global>{`
        @keyframes pageIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes heroRise {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes slowZoom {
          from { transform: scale(1.08); }
          to { transform: scale(1); }
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </>
  );
}
