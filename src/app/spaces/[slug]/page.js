'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function SpaceDetail() {
  const { slug } = useParams();
  const router = useRouter();
  const { language, t, mounted } = useLanguage();

  const [space, setSpace] = useState(null);
  const [relatedSpaces, setRelatedSpaces] = useState([]);
  const [loading, setLoading] = useState(true);

  // Booking state
  const [bookingDate, setBookingDate] = useState('2026-07-20');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [guestCount, setGuestCount] = useState(1);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);

  // Add-ons selected
  const [addOns, setAddOns] = useState({
    coffee: false,
    projector: false,
    chairs: false,
  });

  // User input details (for guest checkout)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [bookingError, setBookingError] = useState('');

  // Timeline slots (Mock availability for interactive timeline)
  const [timeline, setTimeline] = useState([
    { time: '08:00', status: 'Available' },
    { time: '09:00', status: 'Available' },
    { time: '10:00', status: 'Available' },
    { time: '11:00', status: 'Available' },
    { time: '12:00', status: 'Reserved' },
    { time: '13:00', status: 'Reserved' },
    { time: '14:00', status: 'Available' },
    { time: '15:00', status: 'Available' },
    { time: '16:00', status: 'Available' },
    { time: '17:00', status: 'Available' },
  ]);

  // Load details
  useEffect(() => {
    async function loadDetails() {
      try {
        const res = await fetch('/api/v1/public/workspaces');
        const json = await res.json();
        if (json.success) {
          const match = json.data.find(s => s.slug === slug);
          if (match) {
            setSpace(match);
            // Related: same category or same branch
            setRelatedSpaces(json.data.filter(s => s.id !== match.id).slice(0, 3));
          }
        }
      } catch (err) {
        console.error("Failed to load details:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDetails();
  }, [slug]);

  if (!mounted) return null;

  if (loading) {
    return (
      <div style={{ background: '#0B0B0F', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#C86B3C', fontSize: '18px', fontFamily: 'monospace' }}>LOADING SPACE...</div>
      </div>
    );
  }

  if (!space) {
    return (
      <div style={{ background: '#0B0B0F', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ color: '#FFFFFF' }}>Space Not Found</h2>
        <a href="/spaces" className="btn-pill-primary" style={{ padding: '12px 28px' }}>Back to Spaces</a>
      </div>
    );
  }

  // Calculate pricing dynamically
  const parseTime = (tStr) => {
    const [h, m] = tStr.split(':').map(Number);
    return h + m / 60;
  };

  const startH = parseTime(startTime);
  const endH = parseTime(endTime);
  const duration = Math.max(0.5, endH - startH);

  const basePrice = space.category === 'community_hall' ? space.rate : space.rate * duration;
  
  // Add-on prices
  const coffeeCost = addOns.coffee ? 15 * guestCount : 0;
  const projectorCost = addOns.projector ? 50 : 0;
  const extraChairsCost = addOns.chairs ? 10 * guestCount : 0;
  const addOnsTotal = coffeeCost + projectorCost + extraChairsCost;

  // Total pricing
  const subtotalBeforePromo = basePrice + addOnsTotal;
  const discountAmount = promoApplied ? subtotalBeforePromo * 0.10 : 0; // 10% promo discount
  const subtotal = Math.round((subtotalBeforePromo - discountAmount) * 100) / 100;
  const vat = Math.round((subtotal * 0.15) * 100) / 100;
  const total = Math.round((subtotal + vat) * 100) / 100;

  const handleApplyPromo = () => {
    if (promoCode.trim().toLowerCase() === 'mars10') {
      setPromoApplied(true);
      setBookingError('');
    } else {
      setBookingError(language === 'ar' ? 'رمز ترويجي غير صالح' : 'Invalid promo code');
    }
  };

  const handleTimelineClick = (timeSlot) => {
    if (timeSlot.status === 'Reserved') return;
    setStartTime(timeSlot.time);
    // Auto set end time 2 hours later
    const [h, m] = timeSlot.time.split(':').map(Number);
    const newEndHour = String(h + 2).padStart(2, '0');
    setEndTime(`${newEndHour}:00`);
  };

  const handleBookNow = async (e) => {
    e.preventDefault();
    setBookingError('');

    if (!fullName || !email || !mobile) {
      setBookingError(language === 'ar' ? 'يرجى تعبئة جميع معلومات الاتصال' : 'Please fill all contact details');
      return;
    }

    try {
      const res = await fetch('/api/v1/public/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: space.id,
          date: bookingDate,
          startTime,
          endTime,
          customerName: fullName,
          email,
          mobile
        })
      });

      const json = await res.json();
      if (json.success) {
        // Redirect to checkout with booking ID
        router.push(`/checkout?bookingId=${json.data.id}`);
      } else {
        setBookingError(json.error.message || 'Booking failed');
      }
    } catch (err) {
      setBookingError('Network error, please try again.');
    }
  };

  return (
    <>
      <Header />

      <main style={{ background: 'var(--mars-void)', minHeight: '100vh', paddingTop: '100px', paddingBottom: '120px', boxSizing: 'border-box' }}>
        <div className="container">
          
          {/* Back button */}
          <div style={{ marginBottom: '24px' }}>
            <a href="/spaces" style={{ fontSize: '14px', color: 'var(--copper-400)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              ← {language === 'ar' ? 'العودة للمساحات' : 'Back to spaces'}
            </a>
          </div>

          {/* Title & Eyebrow */}
          <div style={{ marginBottom: '32px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--copper-400)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {space.category.replace('_', ' ')}
            </span>
            <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 300, color: '#FFFFFF', marginTop: '6px' }}>
              {language === 'ar' ? space.nameAr : space.name}
            </h1>
          </div>

          {/* Main Content Layout Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
            gap: '48px',
            alignItems: 'start'
          }}>
            
            {/* Left Column (2/3 width equivalent) */}
            <div style={{ gridColumn: 'span 2' }}>
              {/* Gallery Image */}
              <div style={{ aspectRatio: '16/9', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--line-dark)' }}>
                <img
                  src={space.image || '/assets/photo-glass-offices.jpg'}
                  alt={space.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              {/* Thumbnails strip */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                {(space.gallery || []).map((img, idx) => (
                  <div key={idx} style={{ width: '80px', height: '60px', borderRadius: '4px', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--line-dark)' }}>
                    <img src={img} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>

              {/* Specifications Block */}
              <div style={{ marginTop: '48px', background: 'var(--mars-slate)', padding: '28px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#FFFFFF', borderBottom: '1px solid rgba(245, 245, 245, 0.08)', paddingBottom: '16px' }}>
                  {language === 'ar' ? 'المواصفات والتفاصيل' : 'Space Specifications'}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '20px', marginTop: '20px' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'السعة القصوى' : 'Max Capacity'}</div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>{space.capacity} {language === 'ar' ? 'أشخاص' : 'People'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'المساحة' : 'Area Size'}</div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>{space.size} sqm</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'الطابق' : 'Floor Location'}</div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>{space.floor}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'الحالة اليوم' : 'Status Today'}</div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--copper-400)', marginTop: '4px' }}>
                      {space.status === 'Available' ? (language === 'ar' ? 'متاح' : 'Available') : (language === 'ar' ? 'محجوز' : 'Occupied')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Amenities Grid */}
              <div style={{ marginTop: '48px' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '22px', fontWeight: 600, color: '#FFFFFF' }}>
                  {language === 'ar' ? 'الميزات المتوفرة' : 'What this space offers'}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  {(language === 'ar' ? space.amenitiesAr : space.amenities || []).map((am, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px' }}>
                      <span style={{ width: '8px', height: '8px', background: 'var(--mars-copper)', borderRadius: '50%' }} />
                      {am}
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Availability Timeline (Instead of standard calendar picker) */}
              <div style={{ marginTop: '48px' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 600, color: '#FFFFFF' }}>
                  {language === 'ar' ? 'جدول التوفر الحي اليوم' : 'Live Availability Timeline'}
                </h3>
                <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--text-muted-dark)' }}>
                  {language === 'ar' 
                    ? 'انقر على أي فترة زمنية متاحة لضبط أوقات بدء الحجز.' 
                    : 'Click any available slot to quickly set your starting reservation hour.'}
                </p>
                
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px' }}>
                  {timeline.map((slot, idx) => {
                    const isReserved = slot.status === 'Reserved';
                    const activeSelected = startTime === slot.time;
                    const bg = isReserved 
                      ? 'rgba(255, 0, 0, 0.08)' 
                      : activeSelected 
                        ? 'var(--mars-copper)' 
                        : 'var(--mars-slate)';
                    const border = isReserved
                      ? '1px dashed rgba(255, 0, 0, 0.3)'
                      : activeSelected
                        ? '1px solid var(--copper-400)'
                        : '1px solid var(--line-dark)';
                    const color = isReserved ? 'var(--text-muted-dark)' : '#FFFFFF';
                    const label = language === 'ar' 
                      ? (isReserved ? 'محجوز' : 'متاح') 
                      : slot.status;

                    return (
                      <div
                        key={idx}
                        onClick={() => handleTimelineClick(slot)}
                        style={{
                          flex: 'none',
                          width: '100px',
                          padding: '16px 8px',
                          textAlign: 'center',
                          borderRadius: '6px',
                          background: bg,
                          border,
                          color,
                          cursor: isReserved ? 'not-allowed' : 'pointer',
                          userSelect: 'none',
                          transition: 'all 120ms ease'
                        }}
                      >
                        <div style={{ fontSize: '16px', fontWeight: 700 }}>{slot.time}</div>
                        <div style={{ fontSize: '11px', marginTop: '6px', opacity: 0.8 }}>{label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Policies and Cancellation Rules */}
              <div style={{ marginTop: '48px', borderTop: '1px solid var(--line-dark)', paddingTop: '32px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 600, color: '#FFFFFF' }}>
                  {language === 'ar' ? 'سياسة الحجز والإلغاء' : 'Cancellation & Booking Policies'}
                </h3>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: 'var(--text-muted-dark)', display: 'grid', gap: '8px' }}>
                  <li>{language === 'ar' ? 'إلغاء مجاني قبل 24 ساعة من موعد بدء الحجز.' : 'Free cancellation up to 24 hours before the booking starts.'}</li>
                  <li>{language === 'ar' ? 'خصم 50% في حال الإلغاء خلال أقل من 12 ساعة.' : '50% refund value if cancelled within 12 hours.'}</li>
                  <li>{language === 'ar' ? 'يمنع التدخين منعاً باتاً داخل المكاتب والقاعات.' : 'Strictly no smoking inside any workspace or meeting room suites.'}</li>
                </ul>
              </div>

            </div>

            {/* Right Column / Sticky Booking Sidebar Panel */}
            <div>
              <div style={{
                position: 'sticky',
                top: '110px',
                background: 'var(--mars-slate)',
                padding: '32px',
                borderRadius: '8px',
                border: '1px solid var(--line-dark)',
                boxSizing: 'border-box'
              }}>
                <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 600, color: '#FFFFFF', borderBottom: '1px solid rgba(245, 245, 245, 0.08)', paddingBottom: '16px' }}>
                  {language === 'ar' ? 'حجز مساحة العمل' : 'Reserve Workspace'}
                </h3>

                {bookingError && (
                  <div style={{ background: 'rgba(255, 0, 0, 0.08)', color: '#FF4A4A', padding: '12px', borderRadius: '4px', marginTop: '16px', fontSize: '13px', fontWeight: 500 }}>
                    {bookingError}
                  </div>
                )}

                <form onSubmit={handleBookNow} style={{ display: 'grid', gap: '20px', marginTop: '24px' }}>
                  {/* Select Date */}
                  <label style={{ display: 'grid', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted-dark)' }}>
                    {language === 'ar' ? 'التاريخ المحدد' : 'Selected Date'}
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      style={{
                        background: 'var(--mars-void)',
                        border: '1px solid var(--line-dark)',
                        borderRadius: '4px',
                        padding: '12px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </label>

                  {/* Start & End Times */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <label style={{ display: 'grid', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted-dark)' }}>
                      {language === 'ar' ? 'من الساعة' : 'Start Time'}
                      <select
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        style={{
                          background: 'var(--mars-void)',
                          border: '1px solid var(--line-dark)',
                          borderRadius: '4px',
                          padding: '12px',
                          color: '#FFFFFF',
                          fontSize: '14px',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="08:00">08:00 AM</option>
                        <option value="09:00">09:00 AM</option>
                        <option value="10:00">10:00 AM</option>
                        <option value="11:00">11:00 AM</option>
                        <option value="12:00">12:00 PM</option>
                        <option value="13:00">01:00 PM</option>
                        <option value="14:00">02:00 PM</option>
                        <option value="15:00">03:00 PM</option>
                        <option value="16:00">04:00 PM</option>
                        <option value="17:00">05:00 PM</option>
                      </select>
                    </label>

                    <label style={{ display: 'grid', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted-dark)' }}>
                      {language === 'ar' ? 'إلى الساعة' : 'End Time'}
                      <select
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        style={{
                          background: 'var(--mars-void)',
                          border: '1px solid var(--line-dark)',
                          borderRadius: '4px',
                          padding: '12px',
                          color: '#FFFFFF',
                          fontSize: '14px',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="10:00">10:00 AM</option>
                        <option value="11:00">11:00 AM</option>
                        <option value="12:00">12:00 PM</option>
                        <option value="13:00">01:00 PM</option>
                        <option value="14:00">02:00 PM</option>
                        <option value="15:00">03:00 PM</option>
                        <option value="16:00">04:00 PM</option>
                        <option value="17:00">05:00 PM</option>
                        <option value="18:00">06:00 PM</option>
                        <option value="19:00">07:00 PM</option>
                      </select>
                    </label>
                  </div>

                  {/* Guest Count */}
                  <label style={{ display: 'grid', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted-dark)' }}>
                    {language === 'ar' ? 'عدد الحضور المتوقع' : 'Expected Guests'}
                    <input
                      type="number"
                      min="1"
                      max={space.capacity}
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                      style={{
                        background: 'var(--mars-void)',
                        border: '1px solid var(--line-dark)',
                        borderRadius: '4px',
                        padding: '12px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </label>

                  {/* Add-on Services selector */}
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted-dark)' }}>
                      {language === 'ar' ? 'خدمات إضافية اختيارية' : 'Optional Add-ons'}
                    </div>
                    
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={addOns.coffee}
                        onChange={(e) => setAddOns({ ...addOns, coffee: e.target.checked })}
                      />
                      {language === 'ar' ? 'خدمة القهوة والشاي (15 ريال/شخص)' : 'Coffee & Tea service (15 SAR/person)'}
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={addOns.projector}
                        onChange={(e) => setAddOns({ ...addOns, projector: e.target.checked })}
                      />
                      {language === 'ar' ? 'جهاز عرض ضوئي إضافي (50 ريال)' : 'Extra Projector (50 SAR)'}
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={addOns.chairs}
                        onChange={(e) => setAddOns({ ...addOns, chairs: e.target.checked })}
                      />
                      {language === 'ar' ? 'كراسي إضافية (10 ريال/شخص)' : 'Extra Seats/Chairs (10 SAR/person)'}
                    </label>
                  </div>

                  {/* Contact Information (Guest Checkout Onboarding) */}
                  <div style={{ borderTop: '1px solid rgba(245, 245, 245, 0.08)', paddingTop: '20px', display: 'grid', gap: '16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
                      {language === 'ar' ? 'معلومات الاتصال بالعميل' : 'Contact Information'}
                    </div>
                    <input
                      type="text"
                      placeholder={language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      style={{
                        background: 'var(--mars-void)',
                        border: '1px solid var(--line-dark)',
                        borderRadius: '4px',
                        padding: '12px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                    <input
                      type="email"
                      placeholder={language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{
                        background: 'var(--mars-void)',
                        border: '1px solid var(--line-dark)',
                        borderRadius: '4px',
                        padding: '12px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                    <input
                      type="tel"
                      placeholder={language === 'ar' ? 'رقم الهاتف الجوال' : 'Mobile Number'}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      required
                      style={{
                        background: 'var(--mars-void)',
                        border: '1px solid var(--line-dark)',
                        borderRadius: '4px',
                        padding: '12px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Promo Code box */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder={language === 'ar' ? 'الرمز الترويجي (مثال: mars10)' : 'Promo Code (e.g. mars10)'}
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      style={{
                        flex: 1,
                        background: 'var(--mars-void)',
                        border: '1px solid var(--line-dark)',
                        borderRadius: '4px',
                        padding: '10px 12px',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      style={{
                        background: 'none',
                        border: '1px solid var(--copper-400)',
                        color: 'var(--copper-400)',
                        borderRadius: '4px',
                        padding: '10px 16px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {language === 'ar' ? 'تطبيق' : 'Apply'}
                    </button>
                  </div>
                  {promoApplied && (
                    <div style={{ color: 'var(--copper-400)', fontSize: '13px', fontWeight: 500 }}>
                      ✓ {language === 'ar' ? 'تم تطبيق خصم 10% بنجاح!' : '10% promo discount applied successfully!'}
                    </div>
                  )}

                  {/* Live Booking Summary Card */}
                  <div style={{ background: 'var(--mars-void)', padding: '20px', borderRadius: '6px', border: '1px solid var(--line-dark)', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'سعر الإيجار الأساسي' : 'Base rent'}</span>
                      <span style={{ fontWeight: 600 }}>{basePrice} SAR</span>
                    </div>
                    {addOnsTotal > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'الخدمات الإضافية' : 'Add-ons total'}</span>
                        <span style={{ fontWeight: 600 }}>+{addOnsTotal} SAR</span>
                      </div>
                    )}
                    {discountAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--copper-400)' }}>
                        <span>{language === 'ar' ? 'الخصم الترويجي' : 'Promo discount'}</span>
                        <span>-{discountAmount} SAR</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'ضريبة القيمة المضافة (15%)' : 'VAT (15%)'}</span>
                      <span style={{ fontWeight: 600 }}>{vat} SAR</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(245, 245, 245, 0.08)', paddingTop: '12px', fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>
                      <span>{language === 'ar' ? 'المجموع النهائي' : 'Grand Total'}</span>
                      <span>{total} SAR</span>
                    </div>
                  </div>

                  {/* Primary CTA */}
                  <button
                    type="submit"
                    className="btn-pill-primary"
                    style={{
                      width: '100%',
                      padding: '16px',
                      fontSize: '16px',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {language === 'ar' ? 'احجز الآن واشترك' : 'Book Now & Sign'}
                  </button>
                </form>
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
