'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BookingModal from '../components/BookingModal';

export default function Home() {
  const { language, t, mounted } = useLanguage();

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

  // Explore Areas Data (§2.3 - Six kinds of space)
  const areas = [
    {
      name: t?.spacesOverview?.zones?.privateOffices?.name || (language === 'ar' ? 'مكاتب خاصة' : 'Private Offices'),
      ar: 'مكاتب خاصة',
      img: '/assets/photo-glass-offices.jpg',
      line: t?.spacesOverview?.zones?.privateOffices?.desc || (language === 'ar'
        ? 'مكاتب قابلة للإغلاق للفرق، مُجهّزة بمستوىً راقٍ ومُسجّلة باسمك. مساحتك الخاصة، جاهزة من اليوم الأول.'
        : 'Lockable offices for teams, finished to a standard and registered to your name. Your own space, ready from day one.'),
      meta: language === 'ar' ? 'مكاتب خاصة · تسجيل باسم المنشأة' : 'Private offices · registered to your name',
      status: language === 'ar' ? 'جاهزة من اليوم الأول' : 'ready from day one'
    },
    {
      name: t?.spacesOverview?.zones?.coworkingDesks?.name || (language === 'ar' ? 'مكاتب مشتركة' : 'Coworking Desks'),
      ar: 'مكاتب مشتركة',
      img: '/assets/photo-coworking.jpg',
      line: t?.spacesOverview?.zones?.coworkingDesks?.desc || (language === 'ar'
        ? 'طابقٌ مشتركٌ مدروس — مكاتب مرنة باليوم، ومكاتب مُخصّصة بالشهر. هادئ ومريح وغير مزدحم أبداً.'
        : 'A considered shared floor — hot desks by the day, dedicated desks by the month. Quiet, comfortable, never overcrowded.'),
      meta: language === 'ar' ? 'مكاتب مرنة ومخصصة' : 'Hot & dedicated desks',
      status: language === 'ar' ? 'غير مزدحم أبداً' : 'never overcrowded'
    },
    {
      name: t?.spacesOverview?.zones?.meetingRooms?.name || (language === 'ar' ? 'قاعات اجتماعات' : 'Meeting Rooms'),
      ar: 'قاعات اجتماعات',
      img: '/assets/photo-glass-offices.jpg',
      line: t?.spacesOverview?.zones?.meetingRooms?.desc || (language === 'ar'
        ? 'قاعاتٌ مُجهّزة كما ينبغي وجاهزة فعلاً. احجز بالساعة — عضواً كنت أو ضيفاً، القاعات نفسها والأسعار نفسها.'
        : 'Rooms that are properly equipped and genuinely ready. Book by the hour — member or guest, same rooms, same rates.'),
      meta: language === 'ar' ? 'حجز بالساعة · للأعضاء والضيوف' : 'Hourly booking · members & guests',
      status: language === 'ar' ? 'تحديث لحظي للتوفّر' : 'real-time availability'
    },
    {
      name: t?.spacesOverview?.zones?.focusPods?.name || (language === 'ar' ? 'غرف تركيز' : 'Focus Pods'),
      ar: 'غرف تركيز',
      img: '/assets/photo-vip-lounge.jpg',
      line: t?.spacesOverview?.zones?.focusPods?.desc || (language === 'ar'
        ? 'غرفٌ لشخص واحد للمكالمات والعمل العميق، حين يتطلّب اليوم هدوءاً.'
        : 'Single-occupancy rooms for calls and deep work, for when the day needs quiet.'),
      meta: language === 'ar' ? 'شخص واحد · عزل صوتي' : 'Single-occupancy · acoustic design',
      status: language === 'ar' ? 'هدوء تـام' : 'quiet work'
    },
    {
      name: t?.spacesOverview?.zones?.communitySpace?.name || (language === 'ar' ? 'مساحة مجتمعية' : 'Community Space'),
      ar: 'مساحة مجتمعية',
      img: '/assets/photo-community-cinema.jpg',
      line: t?.spacesOverview?.zones?.communitySpace?.desc || (language === 'ar'
        ? 'مساحةٌ صُمّمت للّقاءات — محاضرات، وورش، وإطلاقات، تُنظَّم وتُستضاف كما ينبغي.'
        : 'A room made for gatherings — talks, workshops and launches, arranged and hosted properly.'),
      meta: language === 'ar' ? 'محاضرات وورش وإطلاقات' : 'Talks, workshops & launches',
      status: language === 'ar' ? 'تجهيز واستضافة كاملة' : 'full setup & hosting'
    },
    {
      name: t?.spacesOverview?.zones?.cafeLounge?.name || (language === 'ar' ? 'المقهى والاستراحة' : 'Café & Lounge'),
      ar: 'المقهى والاستراحة',
      img: '/assets/photo-lounge-velvet.jpg',
      line: t?.spacesOverview?.zones?.cafeLounge?.desc || (language === 'ar'
        ? 'قهوةٌ جيدة وجلساتٌ هادئة، ضمن كل باقة. الجزء من الطابق الذي لا يحتاج إلى موعد.'
        : 'Good coffee and quiet seating, included with every plan. The part of the floor nobody has to schedule.'),
      meta: language === 'ar' ? 'مشمول في كل باقة' : 'Included with every plan',
      status: language === 'ar' ? 'دون مواعيد' : 'no schedule needed'
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
        {/* Section 1: Hero Section (§2.1) */}
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
            <div style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.12em', color: '#C86B3C', textTransform: 'uppercase', marginBottom: '16px' }}>
              {t?.hero?.eyebrow || (language === 'ar' ? 'مارس سبيس — جدة' : 'MARS SPACE — JEDDAH')}
            </div>

            <h1 style={{ margin: 0, fontSize: 'clamp(48px, 6.5vw, 110px)', fontWeight: 300, letterSpacing: '-0.035em', lineHeight: 1.0, maxWidth: '14ch', animation: 'heroRise 700ms cubic-bezier(0.16,1,0.30,1) 200ms both' }}>
              {t?.hero?.headline || (language === 'ar' ? 'مساحةٌ مدروسة لعملٍ جاد.' : 'Considered space for serious work.')}
            </h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '32px', marginTop: 'clamp(32px, 5vh, 56px)' }}>
              <p style={{ margin: 0, maxWidth: '46ch', fontSize: 'clamp(18px, 1.5vw, 22px)', fontWeight: 300, lineHeight: 1.65, color: 'rgba(245,243,239,0.9)', animation: 'heroRise 700ms cubic-bezier(0.16,1,0.30,1) 450ms both' }}>
                {t?.hero?.subHeadline || (language === 'ar'
                  ? 'طابقٌ واحدٌ منتقى في جدة — مكاتب خاصة، وقاعات اجتماعات، ومساحات هادئة، اختير كُلٌّ منها وأُدير بعناية. احجز قاعةً اليوم، أو اتّخذ الطابق مقراً لك.'
                  : 'A single, curated floor in Jeddah — private offices, meeting rooms and quiet space, each one chosen and run with care. Book a room today, or make the floor your own.')}
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
                    font: "500 16px var(--font-sans)",
                    lineHeight: 1,
                    cursor: 'pointer',
                    transition: 'background 250ms, gap 250ms'
                  }}
                >
                  {t?.hero?.bookCta || (language === 'ar' ? 'احجز قاعة' : 'Book a room')}
                  <span>→</span>
                </button>
                
                <button
                  onClick={() => {
                    const el = document.getElementById('space');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: 'none',
                    border: '1px solid rgba(245,243,239,0.45)',
                    color: '#F5F3EF',
                    borderRadius: '999px',
                    padding: '18px 36px',
                    font: "500 16px var(--font-sans)",
                    lineHeight: 1,
                    cursor: 'pointer',
                    transition: 'border-color 250ms, color 250ms'
                  }}
                >
                  {t?.hero?.seeFloorCta || (language === 'ar' ? 'استعرض الطابق' : 'See the floor')}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Curated Floor Section (§2.2 - Replaces "One floor, deliberately small") */}
        <section id="space" data-screen-label="The Space" style={{ background: '#0B0B0F', padding: 'clamp(100px, 14vh, 180px) 0 0' }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)', boxSizing: 'border-box' }}>
            <div style={{ flex: '1 1 480px', background: '#F5F3EF', color: '#0B0B0F', padding: 'clamp(40px, 4.5vw, 72px)', borderRadius: '8px', boxSizing: 'border-box' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', color: '#8A4120', textTransform: 'uppercase' }}>
                {t?.curatedFloor?.eyebrow || (language === 'ar' ? 'بعناية فائقة' : 'CURATED')}
              </span>
              
              <h2 style={{ margin: '16px 0 0', fontSize: 'clamp(32px, 3.2vw, 48px)', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                {t?.curatedFloor?.headline || (language === 'ar' ? 'طابقٌ مُصمَّم حول طريقتك في العمل.' : 'A floor arranged around how you work.')}
              </h2>
              
              <p style={{ margin: '24px 0 0', fontSize: '17px', fontWeight: 300, lineHeight: 1.75, color: '#3D3A36' }}>
                {t?.curatedFloor?.body || (language === 'ar'
                  ? 'لا شيء هنا عامٌّ أو اعتباطي. كل مكتب، وكل قاعة، وكل ركنٍ هادئ اختير لأسلوب عملٍ محدَّد — وعضويتك تُهيَّأ بالطريقة نفسها. أخبرنا كيف يسير يومك، ونرّتب الطابق حولك: المكتب الذي يناسبك، والقاعات التي ستستخدمها فعلاً، وساعات الدخول التي تلائم جدولك، والتفاصيل التي نتكفّل بها قبل أن تطلبها.'
                  : 'Nothing here is generic. Every desk, every room and every quiet corner was chosen for a specific way of working — and your membership is set up the same way. Tell us how your day runs, and we arrange the floor around it: the desk that suits you, the rooms you\'ll actually use, the access hours that fit your schedule, and the details handled before you have to ask.')}
              </p>

              {/* Three Supporting Pillars (§2.2) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginTop: '40px', paddingTop: '32px', borderTop: '1px solid rgba(11,11,15,0.15)' }}>
                {(t?.curatedFloor?.pillars || [
                  { title: language === 'ar' ? 'اختيار لا حشو' : 'Chosen, not filled', line: language === 'ar' ? 'نُقدّم مساحاتٍ أقل ومُتقنة، لا طابقاً محشواً حتى الجدران.' : 'We offer fewer spaces done properly, never a floor packed to the walls.' },
                  { title: language === 'ar' ? 'مُهيَّأ لك' : 'Set up to you', line: language === 'ar' ? 'باقتك، ودخولك، وقاعاتك مضبوطة على أسلوب عملك الحقيقي.' : 'Your plan, your access and your rooms are tuned to how you actually work.' },
                  { title: language === 'ar' ? 'يُدار بعناية' : 'Run with care', line: language === 'ar' ? 'فريقٌ يحافظ على الطابق بأكمله بمستوىً واحد، كل يوم.' : 'A team keeps the whole floor to one standard, every single day.' }
                ]).map((p, pIdx) => (
                  <div key={pIdx}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#8A4120', marginBottom: '6px' }}>0{pIdx + 1}</div>
                    <h4 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 600, color: '#0B0B0F' }}>{p.title}</h4>
                    <p style={{ margin: 0, fontSize: '14px', color: '#55524D', lineHeight: 1.5 }}>{p.line}</p>
                  </div>
                ))}
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

        {/* Section 8: Community Hall Feature (§2.6 & §7) */}
        <section id="community" data-screen-label="Community" style={{ position: 'relative', background: '#0B0B0F', overflow: 'hidden' }}>
          <div style={{ position: 'relative', height: 'clamp(480px, 90vh, 900px)' }}>
            <img src="/assets/photo-lounge-velvet.jpg" alt="Evening gathering in the lounge" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(11,11,15,0.82) 0%, rgba(11,11,15,0.25) 65%, rgba(11,11,15,0.1) 100%)' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
              <div style={{ maxWidth: '1600px', width: '100%', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)', boxSizing: 'border-box' }}>
                <div style={{ maxWidth: '580px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', color: '#C86B3C', textTransform: 'uppercase' }}>
                    {language === 'ar' ? 'المساحة المجتمعية' : 'COMMUNITY SPACE'}
                  </span>

                  <h2 style={{ margin: '16px 0 0', fontSize: 'clamp(34px, 3.8vw, 60px)', fontWeight: 300, letterSpacing: '-0.025em', lineHeight: 1.12 }}>
                    {t?.communityBand?.headline || (language === 'ar' ? 'استضفها على طابقنا.' : 'Host it on our floor.')}
                  </h2>

                  <p style={{ margin: '20px 0 0', fontSize: '17px', fontWeight: 300, lineHeight: 1.75, color: 'rgba(245,243,239,0.85)' }}>
                    {t?.communityBand?.body || (language === 'ar'
                      ? 'المساحة المجتمعية مُهيّأة للمحاضرات والورش والإطلاقات — حتى [N] ضيف، مع تكفّلنا بالتجهيز والصوتيات والاستضافة.'
                      : 'The community space is arranged for talks, workshops and launches — up to [N] guests, with the setup, AV and hosting handled by us.')}
                  </p>

                  <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(245,243,239,0.12)' }}>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 500, color: '#F5F3EF' }}>
                      {t?.communityBand?.whatWeHandle?.title || (language === 'ar' ? 'أنت تُحضر الضيوف، ونحن نتكفّل بالباقي.' : 'You bring the guests. We handle the rest.')}
                    </h4>
                    <p style={{ margin: '8px 0 0', fontSize: '15px', fontWeight: 300, color: 'rgba(245,243,239,0.65)', lineHeight: 1.6 }}>
                      {t?.communityBand?.whatWeHandle?.body || (language === 'ar'
                        ? 'التهيئة، والصوتيات، والجلوس، والضيافة، والاستقبال — كلها مُرتّبةٌ لك. أخبرنا بطبيعة الفعالية، وتكون المساحة جاهزةً قبل وصول أول ضيف.'
                        : 'Configuration, AV, seating, catering and front-of-house are all arranged for you. Tell us the shape of the event, and the room is ready before your first guest arrives.')}
                    </p>
                  </div>

                  <button
                    onClick={() => openBookFlow(3)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginTop: '32px',
                      background: '#F5F3EF',
                      color: '#0B0B0F',
                      border: 'none',
                      borderRadius: '999px',
                      padding: '16px 32px',
                      font: "500 15px var(--font-sans)",
                      lineHeight: 1,
                      cursor: 'pointer',
                      transition: 'background 250ms, gap 250ms'
                    }}
                  >
                    {t?.communityBand?.cta || (language === 'ar' ? 'تحقّق من المواعيد' : 'Check dates')}
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Amenities Strip (§2.7) */}
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: 'clamp(64px, 8vh, 104px) clamp(24px, 4vw, 72px)', boxSizing: 'border-box' }}>
            <h3 style={{ margin: '0 0 32px', fontSize: 'clamp(24px, 2.5vw, 36px)', fontWeight: 300, color: '#F5F3EF' }}>
              {t?.amenitiesStrip?.headline || (language === 'ar' ? 'التفاصيل، مُدارة سلفاً.' : 'The details, already handled.')}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              {(t?.amenitiesStrip?.items || [
                language === 'ar' ? 'إنترنت ليفي فائق السرعة' : 'High-speed fibre',
                language === 'ar' ? 'طباعة ومسح ضوئي' : 'Printing & scanning',
                language === 'ar' ? 'مصلّى في الطابق' : 'Prayer room on the floor',
                language === 'ar' ? 'موقف سيارات [N]' : '[N] parking bays',
                language === 'ar' ? 'دخول للأعضاء على مدار الساعة' : '24/7 member access',
                language === 'ar' ? 'عنوان تجاري مُسجّـل' : 'Registered business address',
                language === 'ar' ? 'استلام البريد والطرود' : 'Mail & package handling',
                language === 'ar' ? 'تنظيف يومي' : 'Daily housekeeping',
                language === 'ar' ? 'مطبخ مُجهّز بالكامل' : 'Fully equipped kitchen',
                language === 'ar' ? 'استقبال واستضافة الزوار' : 'Reception & guest handling'
              ]).map((item, itemIdx) => (
                <div key={itemIdx} style={{ padding: '16px 20px', background: '#111014', border: '1px solid rgba(245,243,239,0.08)', borderRadius: '6px', fontSize: '15px', color: 'rgba(245,243,239,0.85)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#C86B3C', fontSize: '12px' }}>✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 9: Membership Band (§2.5 & §6) */}
        <section id="membership" data-screen-label="Membership" style={{ background: '#F5F3EF', color: '#0B0B0F', padding: 'clamp(100px, 14vh, 180px) 0' }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '32px' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', color: '#8A4120', textTransform: 'uppercase' }}>
                  {t?.membershipBand?.eyebrow || (language === 'ar' ? 'العضوية' : 'MEMBERSHIP')}
                </span>
                <h2 style={{ margin: '12px 0 0', fontSize: 'clamp(36px, 4vw, 64px)', fontWeight: 300, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
                  {t?.membershipBand?.headline || (language === 'ar' ? 'عضويةٌ مضبوطة على طريقتك في العمل.' : 'A membership set to how you work.')}
                </h2>
              </div>
              <p style={{ margin: 0, maxWidth: '40ch', fontSize: '17px', fontWeight: 300, color: '#6B675F' }}>
                {t?.membershipBand?.body || (language === 'ar'
                  ? 'أربع باقات، طابقٌ واحدٌ منتقى، دون ارتباطات طويلة. تشمل كل باقة رصيداً من ساعات القاعات، والمقهى، ودخولاً على مدار الساعة.'
                  : 'Four plans, one curated floor, no long lock-ins. Every plan includes meeting-room credits, the café, and around-the-clock access.')}
              </p>
            </div>

            <div style={{ marginTop: 'clamp(48px, 6vh, 80px)' }}>
              {/* Row 1: Day Pass */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '16px clamp(24px, 4vw, 64px)', padding: 'clamp(28px, 3vw, 40px) 0', borderTop: '1px solid rgba(11,11,15,0.15)' }}>
                <h3 style={{ margin: 0, flex: '1 1 220px', fontSize: 'clamp(24px, 2.2vw, 34px)', fontWeight: 400, letterSpacing: '-0.015em' }}>
                  {language === 'ar' ? 'بطاقة يوم' : 'Day Pass'}
                </h3>
                <p style={{ margin: 0, flex: '2.2 1 320px', fontSize: '16px', fontWeight: 300, color: '#6B675F' }}>
                  {language === 'ar' ? 'يومٌ كاملٌ على الطابق — يشمل المقهى والمساحات الهادئة.' : 'A full day on the floor — café and quiet space included.'}
                </p>
                <button
                  onClick={() => openPlanFlow(0)}
                  style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: "500 15px var(--font-sans)", color: '#8A4120' }}
                >
                  {t?.membershipBand?.cta || (language === 'ar' ? 'قارن الباقات' : 'Compare plans')}
                  <span>→</span>
                </button>
              </div>

              {/* Row 2: Hot Desk */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '16px clamp(24px, 4vw, 64px)', padding: 'clamp(28px, 3vw, 40px) 0', borderTop: '1px solid rgba(11,11,15,0.15)' }}>
                <h3 style={{ margin: 0, flex: '1 1 220px', fontSize: 'clamp(24px, 2.2vw, 34px)', fontWeight: 400, letterSpacing: '-0.015em' }}>
                  {language === 'ar' ? 'مكتب مرن' : 'Hot Desk'}
                </h3>
                <p style={{ margin: 0, flex: '2.2 1 320px', fontSize: '16px', fontWeight: 300, color: '#6B675F' }}>
                  {language === 'ar' ? 'أي مكتبٍ متاح، وقتما حضرت، مع رصيدٍ شهري من ساعات القاعات.' : 'Any open desk, whenever you come in, plus monthly meeting-room credits.'}
                </p>
                <button
                  onClick={() => openPlanFlow(1)}
                  style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: "500 15px var(--font-sans)", color: '#8A4120' }}
                >
                  {t?.membershipBand?.cta || (language === 'ar' ? 'قارن الباقات' : 'Compare plans')}
                  <span>→</span>
                </button>
              </div>

              {/* Row 3: Dedicated Desk */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '16px clamp(24px, 4vw, 64px)', padding: 'clamp(28px, 3vw, 40px) 0', borderTop: '1px solid rgba(11,11,15,0.15)' }}>
                <h3 style={{ margin: 0, flex: '1 1 220px', fontSize: 'clamp(24px, 2.2vw, 34px)', fontWeight: 400, letterSpacing: '-0.015em' }}>
                  {language === 'ar' ? 'مكتب مخصص' : 'Dedicated Desk'}
                </h3>
                <p style={{ margin: 0, flex: '2.2 1 320px', fontSize: '16px', fontWeight: 300, color: '#6B675F' }}>
                  {language === 'ar' ? 'مكتبك الخاص، يبقى كما تركته، مع رصيدٍ أكبر وخزانة.' : 'Your own desk, kept as you left it, with more credits and a locker.'}
                </p>
                <button
                  onClick={() => openPlanFlow(2)}
                  style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: "500 15px var(--font-sans)", color: '#8A4120' }}
                >
                  {t?.membershipBand?.cta || (language === 'ar' ? 'قارن الباقات' : 'Compare plans')}
                  <span>→</span>
                </button>
              </div>

              {/* Row 4: Private Office */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '16px clamp(24px, 4vw, 64px)', padding: 'clamp(28px, 3vw, 40px) 0', borderTop: '1px solid rgba(11,11,15,0.15)', borderBottom: '1px solid rgba(11,11,15,0.15)' }}>
                <h3 style={{ margin: 0, flex: '1 1 220px', fontSize: 'clamp(24px, 2.2vw, 34px)', fontWeight: 400, letterSpacing: '-0.015em', color: '#8A4120' }}>
                  {language === 'ar' ? 'مكتب خاص' : 'Private Office'}
                </h3>
                <p style={{ margin: 0, flex: '2.2 1 320px', fontSize: '16px', fontWeight: 300, color: '#6B675F' }}>
                  {language === 'ar' ? 'مكتبٌ قابلٌ للإغلاق لفريقك — مُجهّزٌ ومُسجَّلٌ باسمك.' : 'A lockable office for your team — finished and registered to your name.'}
                </p>
                <button
                  onClick={() => openOfficeFlow(0)}
                  style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: "500 15px var(--font-sans)", color: '#8A4120' }}
                >
                  {t?.membershipBand?.cta || (language === 'ar' ? 'قارن الباقات' : 'Compare plans')}
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* Included in every plan (§6) */}
            <div style={{ marginTop: '48px', padding: '32px', background: '#EAE6E1', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600, color: '#0B0B0F' }}>
                {t?.membershipBand?.includedInEveryPlan?.title || (language === 'ar' ? 'مشمولٌ في كل باقة' : 'Included in every plan')}
              </h4>
              <p style={{ margin: 0, fontSize: '15px', color: '#4A4742', lineHeight: 1.6 }}>
                {t?.membershipBand?.includedInEveryPlan?.body || (language === 'ar'
                  ? 'رصيدٌ من ساعات القاعات، والمقهى، ودخولٌ على مدار الساعة، وعنوانٌ تجاري مُسجّل، واستلام البريد، وخصمٌ على المساحة المجتمعية. دون رسوم تجهيز، ودون مفاجآت.'
                  : 'Meeting-room credits, the café, 24/7 access, a registered business address, mail handling, and a discount on the community space. No setup fees, no surprises.')}
              </p>
              <p style={{ margin: '16px 0 0', fontSize: '14px', color: '#7A756F' }}>
                {t?.membershipBand?.reassuranceLine || (language === 'ar' ? 'تشمل الأسعار ضريبة القيمة المضافة 15%. يمكنك تغيير باقتك أو إلغاؤها بإشعارٍ قبل [30] يوماً.' : 'Prices include 15% VAT. Change or cancel your plan with [30] days\' notice.')}
              </p>
            </div>
          </div>
        </section>

        {/* Section 10: Mars Ecosystem (§2.9) */}
        <section id="ecosystem" data-screen-label="Mars Ecosystem" style={{ background: '#0B0B0F', padding: 'clamp(100px, 14vh, 180px) 0' }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)', boxSizing: 'border-box' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', color: '#C86B3C', textTransform: 'uppercase' }}>
              {t?.ecosystem?.eyebrow || (language === 'ar' ? 'جزء من مارس' : 'PART OF MARS')}
            </span>

            <h2 style={{ margin: '16px 0 0', fontSize: 'clamp(36px, 4vw, 64px)', fontWeight: 300, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
              {t?.ecosystem?.headline || (language === 'ar' ? 'بدعمٍ من مارس فينتشرز.' : 'Backed by Mars Ventures.')}
            </h2>

            <p style={{ margin: '24px 0 0', maxWidth: '64ch', fontSize: '18px', fontWeight: 300, lineHeight: 1.7, color: 'rgba(245,243,239,0.75)' }}>
              {t?.ecosystem?.body || (language === 'ar'
                ? 'مارس فينتشرز تبني الشركات من الفكرة حتى التخارج. مارس سبيس هي المكان الذي يجري فيه ذلك العمل — وهي مفتوحةٌ لكل من يبني شيئاً يستحق البناء.'
                : 'Mars Ventures builds companies from idea to exit. Mars Space is where that work happens — and it\'s open to everyone building something worth building.')}
            </p>

            {/* Marquee of five lockups (§2.9) */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', marginTop: '48px', paddingTop: '32px', borderTop: '1px solid rgba(245,243,239,0.1)' }}>
              {(t?.ecosystem?.marquee || ["MARS Ventures", "MARS Lab", "MARS VC", "MARS Consultancy", "MARS Space"]).map((item, idx) => (
                <div key={idx} style={{ fontSize: '16px', fontWeight: 500, letterSpacing: '0.08em', color: idx === 4 ? '#C86B3C' : 'rgba(245,243,239,0.5)', textTransform: 'uppercase' }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 11: Closing CTA (§2.10) */}
        <section id="visit" data-screen-label="Book a tour" style={{ position: 'relative', background: '#111014', padding: 'clamp(100px, 14vh, 180px) 0' }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)', boxSizing: 'border-box', textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 'clamp(40px, 5.5vw, 88px)', fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
              {t?.closingCta?.headline || (language === 'ar' ? 'تعال وشاهد الطابق.' : 'Come see the floor.')}
            </h2>

            <p style={{ margin: '24px auto 0', maxWidth: '44ch', fontSize: '18px', fontWeight: 300, color: 'rgba(245,243,239,0.75)' }}>
              {t?.closingCta?.body || (language === 'ar'
                ? 'احجز جولةً خاصة، أو احجز قاعةً وجرّبها بنفسك.'
                : 'Book a private tour, or reserve a room and experience it for yourself.')}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px', marginTop: '44px' }}>
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
                  font: "500 16px var(--font-sans)",
                  lineHeight: 1,
                  cursor: 'pointer',
                  transition: 'background 250ms, gap 250ms'
                }}
              >
                {t?.closingCta?.bookTour || (language === 'ar' ? 'احجز جولة' : 'Book a tour')}
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
                  font: "500 16px var(--font-sans)",
                  lineHeight: 1,
                  cursor: 'pointer',
                  transition: 'border-color 250ms, color 250ms'
                }}
              >
                {t?.closingCta?.bookRoom || (language === 'ar' ? 'احجز قاعة' : 'Book a room')}
              </button>
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
