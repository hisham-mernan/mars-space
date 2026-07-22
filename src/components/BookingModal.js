'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function BookingModal({
  isOpen,
  onClose,
  initialFlow = 'book',
  initialSpaceIndex = 0,
  initialOfficeIndex = 0,
  initialPlanIndex = 0
}) {
  const { language } = useLanguage();

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
  const [addons, setAddons] = useState([false, false, false, false, false]);

  // Form Details State
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Payment State
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      setAddons([false, false, false, false, false]);
      setFullName('');
      setCompany('');
      setEmail('');
      setPhone('');
      setNotes('');
      setCardName('');
      setCardNumber('');
      setCardExpiry('');
      setCardCvc('');
    }
  }, [isOpen, initialFlow, initialSpaceIndex, initialOfficeIndex, initialPlanIndex]);

  if (!isOpen) return null;

  // Flows Step Sequences (Matching exact v2 flowsDef)
  const flowsDef = {
    book: ['space', 'options', 'schedule', 'details', 'pay'],
    office: ['office', 'oview', 'details'],
    tour: ['time', 'details'],
    plan: ['plan', 'details']
  };

  const steps = flowsDef[flow] || flowsDef.book;
  const currentStepKind = done ? 'done' : steps[step];
  const isLastStep = step === steps.length - 1;

  // Resource Inventory Data (Matching v2 dataset)
  const spaces = [
    {
      name: language === 'ar' ? 'فينتشرز' : 'Ventures',
      kind: 'room',
      cap: language === 'ar' ? '١٤ مقعد' : '14 seats',
      rate: 220,
      imgs: ['/assets/photo-glass-offices.jpg', '/assets/photo-vip-lounge.jpg', '/assets/photo-coworking.jpg'],
      teaser: language === 'ar' ? 'طاولة اجتماعات رئيسية، شاشة 75 بوصة مع اتصال مرئي، جدار سبورة بيضاء.' : 'Boardroom table, 75" screen with video conferencing, whiteboard wall.',
      features: language === 'ar' ? [
        'طاولة اجتماعات تتسع لـ 14 شخصاً',
        'شاشة 75 بوصة مع نظام اتصالات مرئية',
        'مكبرات صوت وميكروفون للمؤتمرات',
        'جدار سبورة بيضاء مع أقلام',
        'أدوات مكتبية ومحولات وصلات'
      ] : [
        'Boardroom table seating 14',
        '75" screen with video conferencing',
        'Conference microphone and audio',
        'Whiteboard wall with markers',
        'Stationery, adapters and clickers'
      ]
    },
    {
      name: language === 'ar' ? 'اللاب' : 'Lab',
      kind: 'room',
      cap: language === 'ar' ? '٨ مقاعد' : '8 seats',
      rate: 160,
      imgs: ['/assets/photo-coworking.jpg', '/assets/photo-glass-offices.jpg', '/assets/photo-lounge-velvet.jpg'],
      teaser: language === 'ar' ? 'طاولات ورش عمل، جهاز عرض وشاشة 65 بوصة، سبورة بيضاء كاملة.' : 'Workshop tables, projector and 65" screen, full-wall whiteboard.',
      features: language === 'ar' ? [
        'طاولات مرنة لورش العمل تتسع لـ 8 أشخاص',
        'شاشة 65 بوصة وجهاز عرض ضوئي',
        'سبورة بيضاء على كامل الجدار',
        'حقيبة ورش العمل: أوراق ملاحظات، أقلام، مؤقت',
        'حامل تعليق للملاحظات والرسومات'
      ] : [
        'Movable workshop tables for 8',
        '65" screen and projector',
        'Full-wall whiteboard',
        'Workshop kit: sticky notes, markers, timer',
        'Standing rail for pin-ups'
      ]
    },
    {
      name: language === 'ar' ? 'VC' : 'VC',
      kind: 'room',
      cap: language === 'ar' ? '٦ مقاعد' : '6 seats',
      rate: 120,
      imgs: ['/assets/photo-vip-lounge.jpg', '/assets/photo-lounge-velvet.jpg', '/assets/photo-glass-offices.jpg'],
      teaser: language === 'ar' ? 'طاولة دائرية لستة أشخاص، شاشة 55 بوصة، إضاءة طبيعية، عزل صوتي.' : 'Round table for six, 55" screen, natural light, the quiet room.',
      features: language === 'ar' ? [
        'طاولة دائرية تتسع لـ 6 أشخاص',
        'شاشة 55 بوصة مع بث لاسلكي',
        'إضاءة طبيعية مع ستائر عتمة',
        'عزل صوتي متقدم',
        'صينية المستلزمات المكتبية'
      ] : [
        'Round table seating 6',
        '55" screen with wireless casting',
        'Natural light, blackout blind',
        'Acoustic panelling',
        'Office essentials tray'
      ]
    },
    {
      name: language === 'ar' ? 'القاعة المجتمعية' : 'Community hall',
      kind: 'hall',
      cap: language === 'ar' ? 'حتى ٨٠ مقعد' : 'up to 80',
      rate: 400,
      imgs: ['/assets/photo-community-cinema.jpg', '/assets/photo-lounge-velvet.jpg', '/assets/photo-coworking.jpg'],
      teaser: language === 'ar' ? 'جدار شاشة عرض، مقاعد قابلة للتهيئة ونظام صوتي للمحاضرات والإطلاقات.' : 'Screen wall, configurable seating and PA for talks, workshops and launches.',
      features: language === 'ar' ? [
        'جدار شاشة عرض وجهاز عرض ضوئي',
        'ترتيب مقاعد مسرحي أو تدريبي أو دائري',
        'نظام صوتي مكبر وميكروفونين',
        'إعدادات إضاءة المسرح',
        'إمكانية الوصول للمطبخ للضيافة'
      ] : [
        'Screen wall and projector',
        'Theatre, classroom or circle seating',
        'PA system and two microphones',
        'Stage lighting presets',
        'Pantry access for catering'
      ]
    }
  ];

  const addonsData = [
    { name: language === 'ar' ? 'خدمة الشاي والضيافة' : 'Tea service', price: 40 },
    { name: language === 'ar' ? 'خدمة القهوة المختصة' : 'Coffee service', price: 60 },
    { name: language === 'ar' ? 'مياه ومشروبات باردة' : 'Water and soft drinks', price: 35 },
    { name: language === 'ar' ? 'حقيبة ورش عمل وسبورة إضافية' : 'Extra whiteboard and workshop kit', price: 30 },
    { name: language === 'ar' ? 'خدمة تقديم الطعام والوجبات' : 'Catering', price: 0 }
  ];

  const offices = [
    {
      name: language === 'ar' ? 'مكتب ٠٤' : 'Office 04',
      size: '22 m²',
      desks: language === 'ar' ? '٤ مكاتب' : '4 desks',
      loc: language === 'ar' ? 'الواجهة الشمالية، المطلة على الشارع' : 'North perimeter, window line',
      price: language === 'ar' ? 'من ٦,٥٠٠ ر.س / شهرياً' : 'from SAR 6,500 / month',
      imgs: ['/assets/photo-glass-offices.jpg', '/assets/photo-coworking.jpg', '/assets/photo-vip-lounge.jpg'],
      features: language === 'ar' ? [
        '٤ مكاتب قابلة لتعديل الارتفاع مع كراسي',
        'واجهة زجاجية قابلة للقفل مع شريط خصوصية',
        'جدار تخزين وخزائن شخصية',
        'شبكة مستقلة وطباعة خاصة'
      ] : [
        '4 height-adjustable desks with chairs',
        'Lockable glass front, frosted band',
        'Storage wall and personal lockers',
        'Own network segment and printing'
      ]
    },
    {
      name: language === 'ar' ? 'مكتب ١١' : 'Office 11',
      size: '32 m²',
      desks: language === 'ar' ? '٦ مكاتب' : '6 desks',
      loc: language === 'ar' ? 'الركن الشرقي، إضاءة من جانبين' : 'East corner, daylight on two sides',
      price: language === 'ar' ? 'من ٩,٠٠٠ ر.س / شهرياً' : 'from SAR 9,000 / month',
      imgs: ['/assets/photo-vip-lounge.jpg', '/assets/photo-glass-offices.jpg', '/assets/photo-lounge-velvet.jpg'],
      features: language === 'ar' ? [
        '٦ مكاتب مزودة بحوامل شاشات',
        'زوايا زجاجية مزدوجة الإضاءة',
        'ركن اجتماعات مصغر داخل المكتب لـ ٣ أشخاص',
        'شبكة مستقلة وتخزين خاص'
      ] : [
        '6 desks with monitor arms',
        'Corner glazing, double aspect',
        'In-office meeting nook for 3',
        'Own network segment and storage'
      ]
    },
    {
      name: language === 'ar' ? 'مكتب ١٧' : 'Office 17',
      size: '48 m²',
      desks: language === 'ar' ? '١٠ مكاتب' : '10 desks',
      loc: language === 'ar' ? 'جناح الواجهة الجنوبية' : 'South perimeter suite',
      price: language === 'ar' ? 'من ١٤,٠٠٠ ر.س / شهرياً' : 'from SAR 14,000 / month',
      imgs: ['/assets/photo-coworking.jpg', '/assets/photo-vip-lounge.jpg', '/assets/photo-community-cinema.jpg'],
      features: language === 'ar' ? [
        '١٠ مكاتب مقسمة على مجموعتين',
        'مكتب مدير مستقل قابل للفصل',
        'غرفة تخزين مخصصة',
        'شبكة خاصة وتحكم مستقل بالتكييف'
      ] : [
        '10 desks in two banks',
        'Separable manager cabin',
        'Dedicated storage room',
        'Own network, AC zone control'
      ]
    }
  ];

  const plansData = [
    { name: language === 'ar' ? 'تصريح يومي' : 'Day pass', meta: language === 'ar' ? '١٥٠ ر.س / يومي' : 'SAR 150 / day' },
    { name: language === 'ar' ? 'مكتب مشترك' : 'Open desk', meta: language === 'ar' ? '١,٢٠٠ ر.س / شهرياً' : 'SAR 1,200 / month' },
    { name: language === 'ar' ? 'مكتب مخصص' : 'Dedicated desk', meta: language === 'ar' ? '٢,٢٠٠ ر.س / شهرياً' : 'SAR 2,200 / month' }
  ];

  const datesData = [
    language === 'ar' ? 'اليوم، الخميس ٢٣ يوليو' : 'Today, Thu 23 Jul',
    language === 'ar' ? 'الأحد ٢٦ يوليو' : 'Sun 26 Jul',
    language === 'ar' ? 'الاثنين ٢٧ يوليو' : 'Mon 27 Jul'
  ];

  const hourLabels = ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM'];
  const endLabels = ['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM'];

  // Booked Slots Simulation Map (Matching v2 dataset)
  const bookedMap = {
    0: [[2, 3, 7], [0, 1, 6], [5, 6, 11]],
    1: [[4, 5, 10], [8, 9], [1, 2]],
    2: [[0, 1, 9], [3, 4, 11], [6, 7]],
    3: [[6, 7, 8, 9], [0, 1, 2], [10, 11]]
  };

  const tourTimes = ['10:00 AM', '11:30 AM', '1:00 PM', '3:00 PM', '4:30 PM'];

  // Active Selected Entity References
  const sp = spaces[spaceIndex] || spaces[0];
  const off = offices[officeIndex] || offices[0];
  const activeGalleryImgs = flow === 'office' ? off.imgs : sp.imgs;
  const currentGalImg = activeGalleryImgs[Math.min(galIndex, activeGalleryImgs.length - 1)];

  const bookedSlots = bookedMap[spaceIndex] ? (bookedMap[spaceIndex][dateIndex] || []) : [];

  // Hours Selection Logic (Matching v2 pickHour algorithm)
  const handlePickHour = (h) => {
    if (bookedSlots.includes(h)) return;

    if (selStart < 0 || selLen === 0) {
      setSelStart(h);
      setSelLen(1);
      return;
    }

    const end = selStart + selLen - 1;
    const isBlocked = (a, b) => {
      for (let i = a; i <= b; i++) {
        if (bookedSlots.includes(i)) return true;
      }
      return false;
    };

    if (h === end + 1 && !isBlocked(selStart, h)) {
      setSelLen(prev => prev + 1);
    } else if (h === selStart - 1 && !isBlocked(h, end)) {
      setSelStart(h);
      setSelLen(prev => prev + 1);
    } else if (h >= selStart && h <= end) {
      if (h === end && selLen > 1) {
        setSelLen(prev => prev - 1);
      } else {
        setSelStart(h);
        setSelLen(1);
      }
    } else {
      setSelStart(h);
      setSelLen(1);
    }
  };

  // Add-on Toggle
  const handleToggleAddon = (index) => {
    setAddons(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  // Pricing Calculation
  const roomPriceSubtotal = sp.rate * selLen;
  let totalAddonsPrice = 0;
  addonsData.forEach((ad, i) => {
    if (addons[i]) totalAddonsPrice += ad.price;
  });
  const subtotal = roomPriceSubtotal + totalAddonsPrice;
  const vat = Math.round(subtotal * 0.15);
  const total = subtotal + vat;

  const priceRows = [];
  if (flow === 'book') {
    if (selLen > 0) {
      priceRows.push({
        label: `${sp.name} · ${selLen}${selLen === 1 ? ' hour' : ' hours'} × SAR ${sp.rate}`,
        amount: `SAR ${(sp.rate * selLen).toLocaleString()}`
      });
    }
    addonsData.forEach((ad, i) => {
      if (addons[i]) {
        priceRows.push({
          label: ad.name,
          amount: ad.price > 0 ? `SAR ${ad.price.toLocaleString()}` : (language === 'ar' ? 'طلب تسعيرة' : 'quoted separately')
        });
      }
    });
  }

  // Range and Summary String
  const rangeStr = (selStart >= 0 && selLen > 0)
    ? `${hourLabels[selStart]} to ${endLabels[selStart + selLen - 1]}`
    : '';

  const dateLabel = datesData[dateIndex];

  const flowSummary = flow === 'book'
    ? `${sp.name} · ${dateLabel}${rangeStr ? ` · ${rangeStr}` : ''}`
    : flow === 'office'
    ? `${off.name} · ${off.size} · ${off.desks}`
    : flow === 'tour'
    ? `Tour of the floor · ${dateLabel} · ${tourTimes[tourTimeIndex]}`
    : `${plansData[planIndex].name} membership`;

  const isScheduleOk = currentStepKind !== 'schedule' || (selStart >= 0 && selLen > 0);

  // Flow Title and Step Labels (Matching v2 exactly)
  const flowTitle = flow === 'book'
    ? (language === 'ar' ? 'حجز مساحة أو قاعة' : 'Book a space')
    : flow === 'office'
    ? (language === 'ar' ? 'تعاقد مكتب خاص' : 'Lease an office')
    : flow === 'tour'
    ? (language === 'ar' ? 'احجز جولة مع قهوة' : 'Book a tour')
    : (language === 'ar' ? 'الانضمام لمارس سبيس' : 'Join Mars Space');

  const flowStepLabel = done ? '' : `Step ${step + 1} of ${steps.length}`;

  const backLabel = step === 0 ? (language === 'ar' ? 'إلغاء' : 'Cancel') : (language === 'ar' ? 'السابق' : 'Back');

  const nextButtonLabel = !isScheduleOk
    ? (language === 'ar' ? 'اختر الساعات' : 'Select your hours')
    : isLastStep
    ? (flow === 'book'
        ? (language === 'ar' ? `دفع SAR ${total.toLocaleString()}` : `Pay SAR ${total.toLocaleString()}`)
        : flow === 'office'
        ? (language === 'ar' ? 'إرسال الطلب' : 'Send request')
        : (language === 'ar' ? 'طلب الجولة' : 'Request tour'))
    : (language === 'ar' ? 'متابعة ←' : 'Continue');

  const handleNext = () => {
    if (!isScheduleOk) return;
    if (isLastStep) {
      submitBooking();
    } else {
      setStep(prev => prev + 1);
      setGalIndex(0);
    }
  };

  const handleBack = () => {
    if (step === 0) {
      onClose();
    } else {
      setStep(prev => prev - 1);
      setGalIndex(0);
    }
  };

  const submitBooking = async () => {
    setSubmitting(true);
    try {
      if (flow === 'book') {
        await fetch('/api/v1/public/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resourceId: sp.name.toLowerCase(),
            resourceName: sp.name,
            customerName: fullName || 'Guest',
            customerEmail: email || 'guest@mars.sa',
            customerPhone: phone || '+966',
            company,
            date: dateLabel,
            startTime: selStart >= 0 ? hourLabels[selStart] : '10 AM',
            endTime: (selStart >= 0 && selLen > 0) ? endLabels[selStart + selLen - 1] : '12 PM',
            hours: selLen || 1,
            subtotal,
            vat,
            total,
            addons: addonsData.filter((_, i) => addons[i]).map(a => a.name)
          })
        });
      }
      setDone(true);
    } catch (err) {
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  const getSelStyles = (isSelected) => ({
    border: isSelected ? '1px solid #8A4120' : '1px solid rgba(11, 11, 15, 0.18)',
    background: isSelected ? 'rgba(138, 65, 32, 0.07)' : 'transparent',
    color: isSelected ? '#8A4120' : '#0B0B0F'
  });

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
        boxSizing: 'border-box'
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
          animation: 'fadeIn 280ms ease both'
        }}
      />

      {/* Main Light Modal Container (#F5F3EF Background) */}
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
          textAlign: 'start'
        }}
      >
        {/* Header Title & Subtitle Row */}
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
            aria-label="Close"
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
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* STEP 1: Space Selection (fSpace) */}
        {currentStepKind === 'space' && (
          <div style={{ marginTop: '32px' }}>
            <p style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 500, color: '#6B675F' }}>
              {language === 'ar' ? 'قاعات الاجتماعات' : 'Meeting rooms'}
            </p>
            <div style={{ display: 'grid', gap: '12px' }}>
              {spaces.filter(s => s.kind === 'room').map((s) => {
                const k = spaces.indexOf(s);
                const isSelected = k === spaceIndex;
                const sel = getSelStyles(isSelected);
                return (
                  <div
                    key={k}
                    onClick={() => { setSpaceIndex(k); setSelStart(-1); setSelLen(0); }}
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      gap: '18px',
                      alignItems: 'center',
                      padding: '14px',
                      border: sel.border,
                      background: sel.background,
                      transition: 'border-color 250ms, background 250ms'
                    }}
                  >
                    <img src={s.imgs[0]} alt={s.name} style={{ width: '118px', height: '82px', flex: 'none', objectFit: 'cover', display: 'block', backgroundColor: '#E5E1DA' }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 14px' }}>
                        <span style={{ fontSize: '19px', fontWeight: 500, color: sel.color }}>{s.name}</span>
                        <span style={{ fontSize: '14px', fontWeight: 300, color: '#6B675F' }}>{s.cap} · SAR {s.rate} / hr</span>
                      </div>
                      <p style={{ margin: '6px 0 0', fontSize: '14px', fontWeight: 300, color: '#6B675F', lineHeight: 1.55 }}>{s.teaser}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <p style={{ margin: '28px 0 14px', fontSize: '14px', fontWeight: 500, color: '#6B675F' }}>
              {language === 'ar' ? 'المساحة المجتمعية' : 'Community space'}
            </p>
            <div style={{ display: 'grid', gap: '12px' }}>
              {spaces.filter(s => s.kind === 'hall').map((s) => {
                const k = spaces.indexOf(s);
                const isSelected = k === spaceIndex;
                const sel = getSelStyles(isSelected);
                return (
                  <div
                    key={k}
                    onClick={() => { setSpaceIndex(k); setSelStart(-1); setSelLen(0); }}
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      gap: '18px',
                      alignItems: 'center',
                      padding: '14px',
                      border: sel.border,
                      background: sel.background,
                      transition: 'border-color 250ms, background 250ms'
                    }}
                  >
                    <img src={s.imgs[0]} alt={s.name} style={{ width: '118px', height: '82px', flex: 'none', objectFit: 'cover', display: 'block', backgroundColor: '#E5E1DA' }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 14px' }}>
                        <span style={{ fontSize: '19px', fontWeight: 500, color: sel.color }}>{s.name}</span>
                        <span style={{ fontSize: '14px', fontWeight: 300, color: '#6B675F' }}>{s.cap} · SAR {s.rate} / hr</span>
                      </div>
                      <p style={{ margin: '6px 0 0', fontSize: '14px', fontWeight: 300, color: '#6B675F', lineHeight: 1.55 }}>{s.teaser}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: Options & Addons (fOptions) */}
        {currentStepKind === 'options' && (
          <div style={{ marginTop: '32px' }}>
            {/* Gallery Main Banner */}
            <div style={{ aspectRatio: '16/9', backgroundColor: '#E5E1DA', overflow: 'hidden' }}>
              <img src={currentGalImg} alt={sp.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>

            {/* Gallery Thumbs */}
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
                    transition: 'opacity 250ms'
                  }}
                />
              ))}
            </div>

            {/* Two-Column Features & Add-ons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', marginTop: '28px' }}>
              {/* In this room */}
              <div style={{ flex: '1.2 1 280px' }}>
                <p style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 500, color: '#6B675F' }}>
                  {language === 'ar' ? 'مميزات هذه القاعة' : 'In this room'}
                </p>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {sp.features.map((f, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'baseline', fontSize: '15px', fontWeight: 300, color: '#3D3A36' }}>
                      <span style={{ width: '6px', height: '6px', background: '#8A4120', flex: 'none', transform: 'translateY(-2px)' }} />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              {/* Add to your booking */}
              <div style={{ flex: '1 1 280px' }}>
                <p style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 500, color: '#6B675F' }}>
                  {language === 'ar' ? 'إضافة إلى حجزك' : 'Add to your booking'}
                </p>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {addonsData.map((ad, k) => {
                    const on = addons[k];
                    return (
                      <div
                        key={k}
                        onClick={() => handleToggleAddon(k)}
                        style={{
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '11px 14px',
                          border: on ? '1px solid #8A4120' : '1px solid rgba(11,11,15,0.14)',
                          background: on ? 'rgba(138,65,32,0.06)' : 'transparent',
                          transition: 'border-color 250ms, background 250ms'
                        }}
                      >
                        <span style={{
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
                          transition: 'background 200ms'
                        }}>
                          {on ? '✓' : ''}
                        </span>
                        <span style={{ flex: 1, fontSize: '15px', fontWeight: 400, color: '#0B0B0F' }}>{ad.name}</span>
                        <span style={{ fontSize: '14px', fontWeight: 300, color: '#6B675F', whiteSpace: 'nowrap' }}>
                          {ad.price > 0 ? `SAR ${ad.price}` : (language === 'ar' ? 'طلب تسعيرة' : 'quoted')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Schedule Hours Timeline Block Grid (fSchedule) */}
        {currentStepKind === 'schedule' && (
          <div style={{ marginTop: '32px' }}>
            <p style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 500, color: '#6B675F' }}>
              {language === 'ar' ? 'اليوم' : 'Day'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {datesData.map((d, k) => {
                const sel = getSelStyles(k === dateIndex);
                return (
                  <button
                    key={k}
                    onClick={() => { setDateIndex(k); setSelStart(-1); setSelLen(0); }}
                    style={{
                      border: sel.border,
                      background: sel.background,
                      color: sel.color,
                      borderRadius: '999px',
                      padding: '12px 22px',
                      font: "400 15px 'Thmanyah Sans', sans-serif",
                      lineHeight: 1,
                      cursor: 'pointer',
                      transition: 'border-color 250ms, background 250ms, color 250ms'
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            <p style={{ margin: '32px 0 12px', fontSize: '14px', fontWeight: 500, color: '#6B675F' }}>
              {language === 'ar' ? 'الساعات · اختر البداية واسحب الكتلة' : 'Hours · pick a start and stretch the block'}
            </p>

            {/* 12 Hour Block Columns Timeline Bar */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {hourLabels.map((lb, h) => {
                const isBooked = bookedSlots.includes(h);
                const isSel = selStart >= 0 && h >= selStart && h < selStart + selLen;
                const tileBg = isSel ? '#8A4120' : (isBooked ? 'rgba(11,11,15,0.05)' : '#FFFFFF');
                const tileBd = isSel ? '#8A4120' : 'rgba(11,11,15,0.18)';
                const textFg = isBooked ? '#A8A49D' : (isSel ? '#8A4120' : '#6B675F');

                return (
                  <div key={h} onClick={() => handlePickHour(h)} style={{ flex: 1, minWidth: 0, cursor: isBooked ? 'not-allowed' : 'pointer' }}>
                    <div style={{ height: '52px', background: tileBg, border: `1px solid ${tileBd}`, position: 'relative', transition: 'background 200ms, border-color 200ms' }}>
                      {isBooked && (
                        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, rgba(11,11,15,0.10) 0 5px, transparent 5px 10px)' }} />
                      )}
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: 400, color: textFg, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      {lb}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hours Grid Legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 28px', marginTop: '18px', fontSize: '13px', fontWeight: 300, color: '#6B675F' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', border: '1px solid rgba(11,11,15,0.25)', background: '#FFFFFF' }} />
                {language === 'ar' ? 'متاح' : 'Available'}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', background: 'repeating-linear-gradient(45deg, rgba(11,11,15,0.18) 0 3px, rgba(11,11,15,0.06) 3px 6px)' }} />
                {language === 'ar' ? 'محجوز' : 'Booked'}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', background: '#8A4120' }} />
                {language === 'ar' ? 'حجزك' : 'Your booking'}
              </span>
            </div>

            {/* Selection Summary Display */}
            <p style={{ margin: '22px 0 0', fontSize: '16px', fontWeight: 400, color: '#0B0B0F' }}>
              {(selStart >= 0 && selLen > 0)
                ? `${sp.name} · ${dateLabel} · ${rangeStr} · ${selLen}${selLen === 1 ? ' hour' : ' hours'} · SAR ${(sp.rate * selLen).toLocaleString()}`
                : (language === 'ar' ? 'لم يتم اختيار ساعات حتى الآن.' : 'No hours selected yet.')}
            </p>
          </div>
        )}

        {/* STEP: Office List Selection (fOffice) */}
        {currentStepKind === 'office' && (
          <div style={{ display: 'grid', gap: '12px', marginTop: '32px' }}>
            {offices.map((o, k) => {
              const sel = getSelStyles(k === officeIndex);
              return (
                <div
                  key={k}
                  onClick={() => { setOfficeIndex(k); setGalIndex(0); }}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    gap: '18px',
                    alignItems: 'center',
                    padding: '14px',
                    border: sel.border,
                    background: sel.background,
                    transition: 'border-color 250ms, background 250ms'
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

        {/* STEP: Office View Details (fOfficeView) */}
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
                    transition: 'opacity 250ms'
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', marginTop: '28px' }}>
              <div style={{ flex: '1.2 1 280px' }}>
                <p style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 500, color: '#6B675F' }}>
                  {language === 'ar' ? `داخل ${off.name}` : `Inside ${off.name}`}
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
                  <span style={{ fontWeight: 300, color: '#6B675F' }}>{language === 'ar' ? 'الموقع' : 'Location'}</span>
                  <span style={{ fontWeight: 400, textAlign: 'end', color: '#0B0B0F' }}>{off.loc}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '12px 0', borderTop: '1px solid rgba(11,11,15,0.12)', fontSize: '15px' }}>
                  <span style={{ fontWeight: 300, color: '#6B675F' }}>{language === 'ar' ? 'المساحة' : 'Size'}</span>
                  <span style={{ fontWeight: 400, color: '#0B0B0F' }}>{off.size}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '12px 0', borderTop: '1px solid rgba(11,11,15,0.12)', fontSize: '15px' }}>
                  <span style={{ fontWeight: 300, color: '#6B675F' }}>{language === 'ar' ? 'محطات العمل' : 'Workstations'}</span>
                  <span style={{ fontWeight: 400, color: '#0B0B0F' }}>{off.desks}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '12px 0', borderTop: '1px solid rgba(11,11,15,0.12)', borderBottom: '1px solid rgba(11,11,15,0.12)', fontSize: '15px' }}>
                  <span style={{ fontWeight: 300, color: '#6B675F' }}>{language === 'ar' ? 'قيمة التعاقد' : 'Lease'}</span>
                  <span style={{ fontWeight: 500, color: '#8A4120' }}>{off.price}</span>
                </div>
                <p style={{ margin: '16px 0 0', fontSize: '13px', fontWeight: 300, color: '#6B675F' }}>
                  {language === 'ar'
                    ? 'المكاتب يتم تعاقدها مباشرة مع فريقنا دون سداد إلكتروني.'
                    : 'Offices are contracted directly with our team. No payment is taken online.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP: Tour Time Selection (fTime) */}
        {currentStepKind === 'time' && (
          <div style={{ marginTop: '32px' }}>
            <p style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 500, color: '#6B675F' }}>
              {language === 'ar' ? 'اليوم' : 'Day'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {datesData.map((d, k) => {
                const sel = getSelStyles(k === dateIndex);
                return (
                  <button
                    key={k}
                    onClick={() => setDateIndex(k)}
                    style={{
                      border: sel.border,
                      background: sel.background,
                      color: sel.color,
                      borderRadius: '999px',
                      padding: '12px 22px',
                      font: "400 15px 'Thmanyah Sans', sans-serif",
                      lineHeight: 1,
                      cursor: 'pointer'
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            <p style={{ margin: '28px 0 12px', fontSize: '14px', fontWeight: 500, color: '#6B675F' }}>
              {language === 'ar' ? 'الوقت' : 'Time'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {tourTimes.map((t, k) => {
                const sel = getSelStyles(k === tourTimeIndex);
                return (
                  <button
                    key={k}
                    onClick={() => setTourTimeIndex(k)}
                    style={{
                      border: sel.border,
                      background: sel.background,
                      color: sel.color,
                      borderRadius: '999px',
                      padding: '12px 20px',
                      font: "400 15px 'Thmanyah Sans', sans-serif",
                      lineHeight: 1,
                      cursor: 'pointer'
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP: Membership Plan Selection (fPlanStep) */}
        {currentStepKind === 'plan' && (
          <div style={{ display: 'grid', gap: '12px', marginTop: '32px' }}>
            {plansData.map((p, k) => {
              const sel = getSelStyles(k === planIndex);
              return (
                <div
                  key={k}
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
                    transition: 'border-color 250ms, background 250ms'
                  }}
                >
                  <span style={{ fontSize: '19px', fontWeight: 500, color: sel.color }}>{p.name}</span>
                  <span style={{ fontSize: '14px', fontWeight: 300, color: '#6B675F' }}>{p.meta}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* STEP: Details Contact Form (fDetails) */}
        {currentStepKind === 'details' && (
          <div style={{ marginTop: '32px' }}>
            <div style={{ background: 'rgba(11, 11, 15, 0.05)', padding: '20px 24px', borderRadius: '4px' }}>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 500, color: '#0B0B0F' }}>{flowSummary}</p>
              
              {flow === 'book' && priceRows.length > 0 && (
                <div style={{ marginTop: '14px' }}>
                  {priceRows.map((pr, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '7px 0', fontSize: '14px', fontWeight: 300, color: '#3D3A36' }}>
                      <span>{pr.label}</span>
                      <span><bdi>{pr.amount}</bdi></span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '10px 0 0', marginTop: '6px', borderTop: '1px solid rgba(11, 11, 15, 0.15)', fontSize: '16px', fontWeight: 700, color: '#0B0B0F' }}>
                    <span>{language === 'ar' ? 'الإجمالي شاملاً الضريبة (15%)' : 'Total, VAT included'}</span>
                    <span><bdi>SAR {total.toLocaleString()}</bdi></span>
                  </div>
                </div>
              )}
            </div>

            {/* Minimalist Floating Underline Input Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px 28px', marginTop: '28px' }}>
              <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 500, color: '#6B675F' }}>
                {language === 'ar' ? 'الاسم الكامل' : 'Full name'}
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'اسمك' : 'Your name'}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ border: 'none', borderBottom: '1px solid rgba(11, 11, 15, 0.25)', background: 'none', padding: '10px 2px', font: "300 16px 'Thmanyah Sans', sans-serif", color: '#0B0B0F', outline: 'none' }}
                />
              </label>

              <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 500, color: '#6B675F' }}>
                {language === 'ar' ? 'الشركة (اختياري)' : 'Company'}
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'اختياري' : 'Optional'}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  style={{ border: 'none', borderBottom: '1px solid rgba(11, 11, 15, 0.25)', background: 'none', padding: '10px 2px', font: "300 16px 'Thmanyah Sans', sans-serif", color: '#0B0B0F', outline: 'none' }}
                />
              </label>

              <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 500, color: '#6B675F' }}>
                {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ border: 'none', borderBottom: '1px solid rgba(11, 11, 15, 0.25)', background: 'none', padding: '10px 2px', font: "300 16px 'Thmanyah Sans', sans-serif", color: '#0B0B0F', outline: 'none' }}
                />
              </label>

              <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 500, color: '#6B675F' }}>
                {language === 'ar' ? 'الهاتف / الواتساب' : 'Phone / WhatsApp'}
                <input
                  type="tel"
                  placeholder="+966"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ border: 'none', borderBottom: '1px solid rgba(11, 11, 15, 0.25)', background: 'none', padding: '10px 2px', font: "300 16px 'Thmanyah Sans', sans-serif", color: '#0B0B0F', outline: 'none' }}
                />
              </label>
            </div>

            <label style={{ display: 'grid', gap: '6px', marginTop: '24px', fontSize: '13px', fontWeight: 500, color: '#6B675F' }}>
              {language === 'ar' ? 'هل هناك متطلبات خاصة تريد إخبارنا بها؟' : 'Anything we should know?'}
              <textarea
                rows="2"
                placeholder={language === 'ar' ? 'اختياري' : 'Optional'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ border: 'none', borderBottom: '1px solid rgba(11, 11, 15, 0.25)', background: 'none', padding: '10px 2px', font: "300 16px 'Thmanyah Sans', sans-serif", color: '#0B0B0F', resize: 'vertical', outline: 'none' }}
              />
            </label>
          </div>
        )}

        {/* STEP: Payment (fPay) */}
        {currentStepKind === 'pay' && (
          <div style={{ marginTop: '32px' }}>
            <div style={{ background: 'rgba(11, 11, 15, 0.05)', padding: '20px 24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
              <span style={{ fontSize: '15px', fontWeight: 400, color: '#0B0B0F' }}>{flowSummary}</span>
              <span style={{ fontSize: '22px', fontWeight: 700, color: '#0B0B0F' }}><bdi>SAR {total.toLocaleString()}</bdi></span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px 28px', marginTop: '28px' }}>
              <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 500, color: '#6B675F', gridColumn: '1 / -1' }}>
                {language === 'ar' ? 'الاسم كما هو مطبوع على البطاقة' : 'Name on card'}
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'الاسم على البطاقة' : 'As printed on the card'}
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  style={{ border: 'none', borderBottom: '1px solid rgba(11, 11, 15, 0.25)', background: 'none', padding: '10px 2px', font: "300 16px 'Thmanyah Sans', sans-serif", color: '#0B0B0F', outline: 'none' }}
                />
              </label>

              <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 500, color: '#6B675F', gridColumn: '1 / -1' }}>
                {language === 'ar' ? 'رقم البطاقة' : 'Card number'}
                <input
                  type="text"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  style={{ border: 'none', borderBottom: '1px solid rgba(11, 11, 15, 0.25)', background: 'none', padding: '10px 2px', font: "300 16px 'Thmanyah Sans', sans-serif", color: '#0B0B0F', outline: 'none' }}
                />
              </label>

              <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 500, color: '#6B675F' }}>
                {language === 'ar' ? 'تاريخ الانتهاء' : 'Expiry'}
                <input
                  type="text"
                  placeholder="MM / YY"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  style={{ border: 'none', borderBottom: '1px solid rgba(11, 11, 15, 0.25)', background: 'none', padding: '10px 2px', font: "300 16px 'Thmanyah Sans', sans-serif", color: '#0B0B0F', outline: 'none' }}
                />
              </label>

              <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 500, color: '#6B675F' }}>
                CVC
                <input
                  type="text"
                  placeholder="123"
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value)}
                  style={{ border: 'none', borderBottom: '1px solid rgba(11, 11, 15, 0.25)', background: 'none', padding: '10px 2px', font: "300 16px 'Thmanyah Sans', sans-serif", color: '#0B0B0F', outline: 'none' }}
                />
              </label>
            </div>

            <p style={{ margin: '22px 0 0', fontSize: '13px', fontWeight: 300, color: '#6B675F' }}>
              {language === 'ar'
                ? 'تتم معالجة المدفوعات بأمان تام. نقبل مدى، فيزا، ماستركارد و Apple Pay.'
                : 'Payments are processed securely. mada, Visa, Mastercard and Apple Pay accepted.'}
            </p>
          </div>
        )}

        {/* STEP: Done Confirmation (fDone) */}
        {currentStepKind === 'done' && (
          <div style={{ marginTop: '44px', textAlign: 'center', paddingBottom: '12px' }}>
            <div style={{ width: '64px', height: '64px', border: '1.5px solid #8A4120', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: '24px', color: '#8A4120' }}>
              ✓
            </div>
            
            <h4 style={{ margin: '28px 0 0', fontSize: 'clamp(24px, 2vw, 32px)', fontWeight: 400, letterSpacing: '-0.015em', color: '#0B0B0F' }}>
              {flow === 'book'
                ? (language === 'ar' ? 'تم تأكيد حجز القاعة' : 'Booking confirmed')
                : flow === 'office'
                ? (language === 'ar' ? 'تم استلام طلب المعاينة' : 'Request received')
                : flow === 'tour'
                ? (language === 'ar' ? 'تم طلب الجولة بنجاح' : 'Tour requested')
                : (language === 'ar' ? 'تم استلام طلب العضوية' : 'Request received')}
            </h4>

            <p style={{ margin: '14px auto 0', maxWidth: '46ch', fontSize: '16px', fontWeight: 300, color: '#6B675F' }}>
              {flow === 'book'
                ? `${flowSummary}. ${language === 'ar' ? 'تم استلام الدفعة وإرسال الفاتورة وتفاصيل الدخول إلى بريدك الإلكتروني.' : 'Payment received, and your confirmation with the invoice is on its way to your email. The room will be ready when you are.'}`
                : flow === 'office'
                ? `${language === 'ar' ? `شكراً لك. لدينا معلوماتك لمكتب ${off.name} وسنتواصل معك خلال يوم عمل واحد لترتيب الجولة والتعاقد.` : `Thank you. We have your details for ${off.name} and will contact you within one working day to arrange a visit and the contract.`}`
                : flow === 'tour'
                ? `${language === 'ar' ? 'سنؤكد لك موعد الجولة عبر الواتساب قريباً. عشرون دقيقة والقهوة علينا.' : 'We will confirm your slot on WhatsApp shortly. Twenty minutes, coffee on us.'}`
                : `${language === 'ar' ? `شكراً لك. سيتواصل معك فريقنا خلال يوم عمل واحد لإكمال عضوية ${plansData[planIndex].name}.` : `Thank you. Our team will come back to you within one working day to set up your ${plansData[planIndex].name.toLowerCase()}.`}`}
            </p>

            <button
              onClick={onClose}
              style={{ marginTop: '32px', display: 'inline-flex', alignItems: 'center', background: '#8A4120', color: '#FFFFFF', border: 'none', borderRadius: '999px', padding: '15px 34px', font: "500 15px 'Thmanyah Sans', sans-serif", lineHeight: 1, cursor: 'pointer', transition: 'background 250ms' }}
            >
              {language === 'ar' ? 'تم' : 'Done'}
            </button>
          </div>
        )}

        {/* Bottom Navigation Control Bar (fNav) */}
        {!done && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', marginTop: '40px', paddingTop: '24px', borderTop: '1px solid rgba(11, 11, 15, 0.12)' }}>
            <button
              onClick={handleBack}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: "400 15px 'Thmanyah Sans', sans-serif", color: '#6B675F', transition: 'color 200ms' }}
            >
              {backLabel}
            </button>

            <button
              onClick={handleNext}
              disabled={!isScheduleOk || submitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                background: isScheduleOk ? '#8A4120' : '#A8A49D',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '999px',
                padding: '15px 32px',
                font: "500 15px 'Thmanyah Sans', sans-serif",
                lineHeight: 1,
                cursor: isScheduleOk ? 'pointer' : 'not-allowed',
                transition: 'background 250ms, gap 250ms'
              }}
            >
              {submitting ? (language === 'ar' ? 'جاري الإرسال...' : 'Processing...') : nextButtonLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
