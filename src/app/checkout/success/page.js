'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

function SuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const { language, mounted } = useLanguage();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }

    async function loadBooking() {
      try {
        const res = await fetch(`/api/v1/public/bookings/${bookingId}`);
        const json = await res.json();
        if (json.success) {
          setBooking(json.data);
        }
      } catch (err) {
        console.error("Failed to load booking details:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBooking();
  }, [bookingId]);

  if (!mounted) return null;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ color: 'var(--copper-400)' }}>LOADING CONFIRMATION...</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <h2 style={{ color: '#FFFFFF' }}>{language === 'ar' ? 'حالة الحجز غير متوفرة' : 'Booking confirmation details unavailable'}</h2>
        <p style={{ color: 'var(--text-muted-dark)', margin: '12px 0 24px' }}>
          {language === 'ar' ? 'الرجاء التأكد من المعرّف أو مراجعة لوحة التحكم.' : 'Please verify your receipt identifier or visit your dashboard.'}
        </p>
        <a href="/" className="btn-pill-primary" style={{ padding: '12px 28px' }}>
          {language === 'ar' ? 'العودة للرئيسية' : 'Return Home'}
        </a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '720px', margin: '40px auto 0' }}>
      {/* Main confirmation card block */}
      <div style={{
        background: 'var(--mars-slate)',
        borderRadius: '8px',
        border: '1px solid var(--line-dark)',
        padding: '48px',
        boxSizing: 'border-box',
        textAlign: 'center'
      }}>
        
        {/* Large checkmark logo */}
        <div style={{
          width: '64px',
          height: '64px',
          background: 'rgba(200, 107, 60, 0.1)',
          border: '2px solid var(--copper-400)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px'
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--copper-400)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 300, color: '#FFFFFF', margin: 0 }}>
          {language === 'ar' ? 'تم تأكيد الحجز والدفع!' : 'Payment Confirmed!'}
        </h1>
        
        <p style={{ color: 'var(--text-muted-dark)', fontSize: '15px', marginTop: '12px', lineHeight: 1.6 }}>
          {language === 'ar'
            ? `شكراً لك، لقد تم تأكيد حجز قاعة "${booking.resourceName}" بنجاح. تم إرسال الفاتورة والتفاصيل لبريدك الإلكتروني.`
            : `Thank you! Your reservation for "${booking.resourceName}" is confirmed. Your receipt invoice and parking details are sent to your email.`}
        </p>

        {/* Info Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '16px',
          margin: '40px 0',
          padding: '24px 0',
          borderTop: '1px solid rgba(245, 245, 245, 0.08)',
          borderBottom: '1px solid rgba(245, 245, 245, 0.08)',
          textAlign: 'start'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'رقم الحجز المرجعي' : 'Booking Ref'}</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>{booking.reference}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'التاريخ' : 'Date'}</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>{booking.date}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'الوقت المحجوز' : 'Reserved Time'}</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>{booking.startTime} - {booking.endTime}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'المبلغ المدفوع' : 'Amount Paid'}</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--copper-400)', marginTop: '4px' }}>{booking.totalAmount} SAR</div>
          </div>
        </div>

        {/* QR Code Pass for check-in */}
        <div style={{
          background: 'var(--mars-void)',
          padding: '32px',
          borderRadius: '8px',
          border: '1px solid var(--line-dark)',
          maxWidth: '260px',
          margin: '0 auto 40px',
          textAlign: 'center'
        }}>
          {/* Mock QR Code in SVG */}
          <svg width="160" height="160" viewBox="0 0 29 29" style={{ display: 'block', margin: '0 auto', background: '#FFFFFF', padding: '12px', borderRadius: '4px' }}>
            <path d="M0 0h7v7H0zm1 1v5h5V1zm8 0h1v1H9zm1 1h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm4-6h7v7h-7zm1 1v5h5V1zm-13 8h1v1h-1zm1 1h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm-13 8h7v7H0zm1 1v5h5v-5zm8 0h1v1H9zm1 1h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm4-8h1v1h-1zm1 1h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1z" fill="#000" />
          </svg>
          <div style={{ marginTop: '14px', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted-dark)' }}>
            {language === 'ar' ? 'امسح الرمز لتسجيل الدخول في الاستقبال' : 'Scan pass at reception kiosk to check-in'}
          </div>
        </div>

        {/* Buttons list: Calendar / Receipt */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px' }}>
          <a
            href={`data:text/calendar;charset=utf-8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ASUMMARY:Booking at Mars Space%0ADTSTART:20260720T090000%0ADTEND:20260720T110000%0ADESCRIPTION:Meeting room Alpha%0AEND:VEVENT%0AEND:VCALENDAR`}
            download="mars-booking.ics"
            className="btn-pill-secondary"
            style={{ padding: '12px 28px', fontSize: '14px' }}
          >
            {language === 'ar' ? 'إضافة إلى التقويم' : 'Add to Calendar'}
          </a>
          <button
            onClick={() => window.print()}
            className="btn-pill-primary"
            style={{ padding: '12px 28px', fontSize: '14px', cursor: 'pointer', border: 'none' }}
          >
            {language === 'ar' ? 'طباعة الفاتورة والرمز' : 'Print Invoice & Pass'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Success() {
  return (
    <>
      <Header />
      <main style={{ background: 'var(--mars-void)', minHeight: '100vh', paddingTop: '100px', paddingBottom: '120px', boxSizing: 'border-box' }}>
        <div className="container">
          <Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
              <div style={{ color: 'var(--copper-400)' }}>LOADING CONFIRMATION...</div>
            </div>
          }>
            <SuccessContent />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
