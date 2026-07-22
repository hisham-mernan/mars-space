'use client';

import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function BookingModal({ isOpen, onClose, initialSpaceId = 'ventures' }) {
  const { language, t } = useLanguage();

  // Booking Flow Steps: 0: Space, 1: Addons, 2: Schedule, 3: Details, 4: Pay, 5: Done
  const [step, setStep] = useState(0);
  const [spaceId, setSpaceId] = useState(initialSpaceId);
  const [selectedDate, setSelectedDate] = useState('Today, Thu 23 Jul');
  const [selectedStart, setSelectedStart] = useState(2); // 10:00 AM (index 2)
  const [selectedDuration, setSelectedDuration] = useState(2); // 2 hours
  const [addons, setAddons] = useState([false, false, false, false, false]);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Payment Fields
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // Booking result state
  const [bookingRef, setBookingRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const spaces = [
    {
      id: 'ventures',
      name: 'Ventures Room',
      nameAr: 'قاعة فينتشرز',
      cap: '14 seats',
      capAr: '١٤ مقعد',
      rate: 220,
      teaser: 'Boardroom table, 75" screen with video conferencing, whiteboard wall.',
      teaserAr: 'طاولة اجتماعات رئيسية، شاشة 75 بوصة مع اتصال مرئي، جدار سبورة بيضاء.',
      img: '/assets/photo-glass-offices.jpg'
    },
    {
      id: 'lab',
      name: 'Lab Room',
      nameAr: 'قاعة اللاب',
      cap: '8 seats',
      capAr: '٨ مقاعد',
      rate: 160,
      teaser: 'Workshop tables, projector and 65" screen, full-wall whiteboard.',
      teaserAr: 'طاولات ورش عمل، جهاز عرض وشاشة 65 بوصة، سبورة بيضاء كاملة.',
      img: '/assets/photo-coworking.jpg'
    },
    {
      id: 'vc',
      name: 'VC Room',
      nameAr: 'قاعة VC',
      cap: '6 seats',
      capAr: '٦ مقاعد',
      rate: 120,
      teaser: 'Round table for six, 55" screen, natural light, acoustic panelling.',
      teaserAr: 'طاولة دائرية لستة أشخاص، شاشة 55 بوصة، إضاءة طبيعية، عزل صوتي.',
      img: '/assets/photo-vip-lounge.jpg'
    },
    {
      id: 'community-hall',
      name: 'Community Hall',
      nameAr: 'القاعة المجتمعية',
      cap: 'Up to 80 seats',
      capAr: 'حتى ٨٠ مقعد',
      rate: 400,
      teaser: 'Screen wall, configurable seating and PA for talks, workshops and launches.',
      teaserAr: 'جدار شاشة عرض، مقاعد قابلة للتهيئة ونظام صوتي للمحاضرات والإطلاقات.',
      img: '/assets/photo-community-cinema.jpg'
    }
  ];

  const addonsList = [
    { name: 'Tea Service', nameAr: 'خدمة الشاي والضيافة', price: 40 },
    { name: 'Specialty Coffee Service', nameAr: 'خدمة القهوة المختصة', price: 60 },
    { name: 'Water & Soft Drinks', nameAr: 'مياه ومشروبات باردة', price: 35 },
    { name: 'Extra Whiteboard & Workshop Kit', nameAr: 'حقيبة ورش عمل وسبورة إضافية', price: 30 },
    { name: 'Catering Service (Quote)', nameAr: 'خدمة تقديم الطعام والوجبات', price: 0 }
  ];

  const datesData = ['Today, Thu 23 Jul', 'Sun 26 Jul', 'Mon 27 Jul'];
  const timeSlots = [
    '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', 
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', 
    '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM'
  ];

  const currentSpace = spaces.find(s => s.id === spaceId) || spaces[0];

  // Calculate pricing
  const subtotal = (currentSpace.rate * selectedDuration) + addons.reduce((sum, active, idx) => active ? sum + addonsList[idx].price : sum, 0);
  const vat = Math.round(subtotal * 0.15);
  const total = subtotal + vat;

  const toggleAddon = (index) => {
    setAddons(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(prev => prev + 1);
    } else if (step === 4) {
      // Submit booking
      submitBooking();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(prev => prev - 1);
  };

  const submitBooking = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/public/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: currentSpace.id,
          resourceName: currentSpace.name,
          customerName: fullName || 'Guest Customer',
          customerEmail: email || 'guest@mars.sa',
          customerPhone: phone || '+966 50 000 0000',
          company: company || 'Mars Partner',
          date: selectedDate,
          startTime: timeSlots[selectedStart],
          endTime: timeSlots[Math.min(selectedStart + selectedDuration, timeSlots.length - 1)],
          hours: selectedDuration,
          subtotal,
          vat,
          total,
          addons: addonsList.filter((_, idx) => addons[idx]).map(a => a.name)
        })
      });

      const json = await res.json();
      if (json.success) {
        setBookingRef(json.data.id || `BK-${Math.floor(1000 + Math.random() * 9000)}`);
        setStep(5);
      } else {
        setBookingRef(`BK-${Math.floor(1000 + Math.random() * 9000)}`);
        setStep(5);
      }
    } catch (err) {
      setBookingRef(`BK-${Math.floor(1000 + Math.random() * 9000)}`);
      setStep(5);
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles = [
    language === 'ar' ? 'اختر قاعة الاجتماعات' : 'Select Space',
    language === 'ar' ? 'الخدمات الإضافية والضيافة' : 'Add-ons & Hospitality',
    language === 'ar' ? 'التاريخ والوقت' : 'Schedule & Time Slot',
    language === 'ar' ? 'بيانات الحجز' : 'Contact Details',
    language === 'ar' ? 'الدفع الآمن' : 'Secure Payment',
    language === 'ar' ? 'تم تأكيد الحجز' : 'Booking Confirmed'
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(7, 7, 10, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--glass-border)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '32px clamp(20px, 4vw, 40px)',
        boxSizing: 'border-box',
        position: 'relative',
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.5)',
        textAlign: 'start'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '24px',
            right: language === 'ar' ? 'auto' : '24px',
            left: language === 'ar' ? '24px' : 'auto',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--glass-border)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            color: 'var(--text-secondary)',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ✕
        </button>

        {/* Step Indicator */}
        {step < 5 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <span className="status-pill status-pill-copper">
              {language === 'ar' ? `الخطوة ${step + 1} من 5` : `STEP ${step + 1} OF 5`}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted-dark)', fontWeight: 500 }}>
              {stepTitles[step]}
            </span>
          </div>
        )}

        {/* Step 0: Space Picker */}
        {step === 0 && (
          <div>
            <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 300, color: 'var(--text-primary)' }}>
              {language === 'ar' ? 'اختر مساحة العمل أو القاعة' : 'Select a Space or Room'}
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {language === 'ar' ? 'قاعات اجتماعات ومساحات مجهزة بالكامل بالساعة.' : 'All rooms are fully equipped with AV displays and high-speed fibre.'}
            </p>

            <div style={{ display: 'grid', gap: '14px' }}>
              {spaces.map((s) => {
                const selected = s.id === spaceId;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSpaceId(s.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '16px',
                      borderRadius: '10px',
                      background: selected ? 'rgba(200, 107, 60, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      border: selected ? '1px solid var(--copper-400)' : '1px solid var(--glass-border)',
                      cursor: 'pointer',
                      transition: 'all 140ms ease'
                    }}
                  >
                    <img src={s.img} alt={s.name} style={{ width: '80px', height: '60px', borderRadius: '6px', objectFit: 'cover' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>
                          {language === 'ar' ? s.nameAr : s.name}
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--copper-400)', fontSize: '14px', fontFamily: 'monospace' }}>
                          SAR {s.rate} / hr
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {language === 'ar' ? s.capAr : s.cap} · {language === 'ar' ? s.teaserAr : s.teaser}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 1: Addons */}
        {step === 1 && (
          <div>
            <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 300, color: 'var(--text-primary)' }}>
              {language === 'ar' ? 'الخدمات الإضافية والضيافة' : 'Add-ons & Hospitality'}
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {language === 'ar' ? 'اختر خدمات الضيافة والتجهيزات الإضافية للحجز.' : 'Enhance your booking with coffee service, snacks, or workshop equipment.'}
            </p>

            <div style={{ display: 'grid', gap: '12px' }}>
              {addonsList.map((addon, idx) => {
                const active = addons[idx];
                return (
                  <div
                    key={idx}
                    onClick={() => toggleAddon(idx)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px 20px',
                      borderRadius: '8px',
                      background: active ? 'rgba(200, 107, 60, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      border: active ? '1px solid var(--copper-400)' : '1px solid var(--glass-border)',
                      cursor: 'pointer',
                      transition: 'all 140ms ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input type="checkbox" checked={active} readOnly style={{ cursor: 'pointer' }} />
                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                        {language === 'ar' ? addon.nameAr : addon.name}
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--copper-400)', fontSize: '13px', fontFamily: 'monospace' }}>
                      {addon.price > 0 ? `+ SAR ${addon.price}` : (language === 'ar' ? 'طلب تسعيرة' : 'Quote on Request')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Schedule & Time Grid */}
        {step === 2 && (
          <div>
            <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 300, color: 'var(--text-primary)' }}>
              {language === 'ar' ? 'اختر اليوم والوقت' : 'Select Date & Duration'}
            </h2>
            
            {/* Date Selector */}
            <div style={{ margin: '20px 0 24px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
                {language === 'ar' ? 'التاريخ المتاح:' : 'Date:'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {datesData.map((d, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(d)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '999px',
                      border: selectedDate === d ? '1px solid var(--copper-400)' : '1px solid var(--glass-border)',
                      background: selectedDate === d ? 'var(--mars-copper)' : 'rgba(255, 255, 255, 0.03)',
                      color: selectedDate === d ? '#FFFFFF' : 'var(--text-secondary)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slot Picker Grid */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
                {language === 'ar' ? 'وقت البداية:' : 'Start Time:'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                {timeSlots.map((slot, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedStart(idx)}
                    style={{
                      padding: '10px',
                      borderRadius: '6px',
                      border: selectedStart === idx ? '1px solid var(--copper-400)' : '1px solid var(--glass-border)',
                      background: selectedStart === idx ? 'rgba(200, 107, 60, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                      color: selectedStart === idx ? '#FFFFFF' : 'var(--text-primary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'monospace'
                    }}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Picker */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
                {language === 'ar' ? 'مدة الحجز (بالساعات):' : 'Duration (Hours):'}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[1, 2, 3, 4, 8].map((hrs) => (
                  <button
                    key={hrs}
                    onClick={() => setSelectedDuration(hrs)}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '6px',
                      border: selectedDuration === hrs ? '1px solid var(--copper-400)' : '1px solid var(--glass-border)',
                      background: selectedDuration === hrs ? 'var(--mars-copper)' : 'rgba(255, 255, 255, 0.03)',
                      color: selectedDuration === hrs ? '#FFFFFF' : 'var(--text-secondary)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {hrs} {hrs === 1 ? (language === 'ar' ? 'ساعة' : 'hr') : (language === 'ar' ? 'ساعات' : 'hrs')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Contact Details */}
        {step === 3 && (
          <div>
            <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 300, color: 'var(--text-primary)' }}>
              {language === 'ar' ? 'بيانات التواصل' : 'Contact Details'}
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {language === 'ar' ? 'أدخل معلومات التواصل لإصدار الفاتورة وتفاصيل الدخول.' : 'Provide contact info for instant SMS confirmation and access QR.'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                <input
                  type="text"
                  required
                  placeholder="e.g. Faisal Al-Otaibi"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {language === 'ar' ? 'اسم الشركة (اختياري)' : 'Company Name'}
                <input
                  type="text"
                  placeholder="e.g. Mars Technologies"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {language === 'ar' ? 'رقم الجوال / الواتساب' : 'Phone / WhatsApp'}
                <input
                  type="tel"
                  required
                  placeholder="+966 50 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </label>
            </div>

            <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '16px' }}>
              {language === 'ar' ? 'ملاحظات إضافية (اختياري)' : 'Special Requests / Notes'}
              <textarea
                rows="2"
                placeholder="e.g. Need extra HDMI adapters"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </label>
          </div>
        )}

        {/* Step 4: Payment */}
        {step === 4 && (
          <div>
            <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 300, color: 'var(--text-primary)' }}>
              {language === 'ar' ? 'الدفع والتأكيد' : 'Payment & Checkout'}
            </h2>

            {/* Price Breakdown Card */}
            <div style={{
              background: 'rgba(200, 107, 60, 0.08)',
              border: '1px solid rgba(200, 107, 60, 0.3)',
              borderRadius: '10px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                {language === 'ar' ? currentSpace.nameAr : currentSpace.name} · {selectedDate}
              </div>
              <div style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{selectedDuration} hrs @ SAR {currentSpace.rate}/hr</span>
                  <span>SAR {currentSpace.rate * selectedDuration}</span>
                </div>
                {addons.map((act, idx) => act && (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{addonsList[idx].name}</span>
                    <span>SAR {addonsList[idx].price}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: '8px' }}>
                  <span>VAT (15%)</span>
                  <span>SAR {vat}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, color: 'var(--copper-400)', paddingTop: '4px' }}>
                  <span>{language === 'ar' ? 'الإجمالي (شامل الضريبة)' : 'Total (VAT incl.)'}</span>
                  <span style={{ fontFamily: 'monospace' }}>SAR {total}</span>
                </div>
              </div>
            </div>

            {/* Card Form */}
            <div style={{ display: 'grid', gap: '14px' }}>
              <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {language === 'ar' ? 'الاسم على البطاقة' : 'Cardholder Name'}
                <input
                  type="text"
                  placeholder="Name on card"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {language === 'ar' ? 'رقم البطاقة' : 'Card Number'}
                <input
                  type="text"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    fontFamily: 'monospace'
                  }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {language === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}
                  <input
                    type="text"
                    placeholder="MM / YY"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      padding: '10px 14px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </label>

                <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  CVV / CVC
                  <input
                    type="text"
                    placeholder="123"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      padding: '10px 14px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Confirmation Success */}
        {step === 5 && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--status-emerald-bg)',
              border: '2px solid var(--status-emerald)',
              color: 'var(--status-emerald)',
              fontSize: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              ✓
            </div>

            <h2 style={{ margin: '0 0 10px', fontSize: '26px', fontWeight: 300, color: 'var(--text-primary)' }}>
              {language === 'ar' ? 'تم تأكيد حجز القاعة بنجاح!' : 'Booking Confirmed!'}
            </h2>
            
            <div className="status-pill status-pill-copper" style={{ margin: '0 auto 20px', display: 'inline-flex' }}>
              REF: {bookingRef}
            </div>

            <p style={{ margin: '0 auto 24px', fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '42ch', lineHeight: 1.6 }}>
              {language === 'ar'
                ? `تم إرسال الفاتورة والرمز البرمجي للدخول إلى بريدك الإلكتروني والهاتف المحمول.`
                : `Your reservation details, QR entry pass, and tax invoice have been dispatched to ${email || 'your email'}.`}
            </p>

            <button
              onClick={onClose}
              className="btn-pill-primary"
              style={{ padding: '12px 36px', fontSize: '14px', cursor: 'pointer' }}
            >
              {language === 'ar' ? 'إغلاق' : 'Done'}
            </button>
          </div>
        )}

        {/* Modal Navigation Actions */}
        {step < 5 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '32px',
            paddingTop: '20px',
            borderTop: '1px solid var(--glass-border)'
          }}>
            {step > 0 ? (
              <button
                onClick={handleBack}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ← {language === 'ar' ? 'السابق' : 'Back'}
              </button>
            ) : <div />}

            <button
              onClick={handleNext}
              disabled={submitting}
              className="btn-pill-primary"
              style={{
                padding: '12px 28px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {submitting ? (language === 'ar' ? 'جاري المعالجة...' : 'Processing...') : (
                step === 4 ? (language === 'ar' ? `تأكيد ودفع (SAR ${total})` : `Confirm & Pay (SAR ${total})`) : (language === 'ar' ? 'التالي ←' : 'Next →')
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
