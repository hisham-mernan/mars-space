'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const { language, mounted } = useLanguage();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('Mada');
  const [paymentError, setPaymentError] = useState('');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [paying, setPaying] = useState(false);

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
        } else {
          setPaymentError(json.error.message);
        }
      } catch (err) {
        setPaymentError('Failed to retrieve booking information.');
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
        <div style={{ color: 'var(--copper-400)', fontFamily: 'monospace' }}>LOADING CHECKOUT...</div>
      </div>
    );
  }

  if (!bookingId || !booking) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 24px', background: 'var(--mars-void)' }}>
        <h2 style={{ color: '#FFFFFF' }}>{language === 'ar' ? 'لم يتم العثور على أي حجز نشط' : 'No active booking session found'}</h2>
        <p style={{ color: 'var(--text-muted-dark)', margin: '12px 0 24px' }}>
          {language === 'ar' ? 'الرجاء تحديد قاعة واختيار وقت للبدء بالدفع.' : 'Please browse our workspaces and choose a slot to checkout.'}
        </p>
        <a href="/spaces" className="btn-pill-primary" style={{ padding: '12px 28px' }}>
          {language === 'ar' ? 'تصفح المساحات' : 'Browse Spaces'}
        </a>
      </div>
    );
  }

  const handlePayment = async (e) => {
    e.preventDefault();
    setPaying(true);
    setPaymentError('');

    try {
      // Simulate network lag
      await new Promise(resolve => setTimeout(resolve, 1200));

      if (simulateFailure) {
        // Redirect to failed page
        router.push(`/checkout/failed?bookingId=${bookingId}`);
        return;
      }

      const res = await fetch(`/api/v1/public/bookings/${bookingId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod })
      });

      const json = await res.json();
      if (json.success) {
        router.push(`/checkout/success?bookingId=${bookingId}`);
      } else {
        setPaymentError(json.error.message || 'Payment processing failed');
      }
    } catch (err) {
      setPaymentError('A gateway connection timeout occurred. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'start', marginTop: '40px' }}>
      {/* Left Column: Summary of Billable items */}
      <div style={{ background: 'var(--mars-slate)', padding: '36px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
        <h2 style={{ fontSize: '24px', color: '#FFFFFF', fontWeight: 300, borderBottom: '1px solid rgba(245, 245, 245, 0.08)', paddingBottom: '16px', margin: 0 }}>
          {language === 'ar' ? 'ملخص الحجز' : 'Booking Summary'}
        </h2>

        <div style={{ display: 'grid', gap: '20px', marginTop: '24px' }}>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'المساحة المحجوزة' : 'Workspace Space'}</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>{booking.resourceName}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'التاريخ المحدد' : 'Booking Date'}</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>{booking.date}</div>
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'الفترة الزمنية' : 'Reserved Slot'}</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>{booking.startTime} - {booking.endTime}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'المدة الإجمالية' : 'Duration'}</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>{booking.duration} {language === 'ar' ? 'ساعة' : 'hours'}</div>
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'اسم العميل' : 'Guest Name'}</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>{booking.customerName}</div>
            </div>
          </div>

          {/* Pricing Ledger summary card */}
          <div style={{ background: 'var(--mars-void)', padding: '24px', borderRadius: '6px', border: '1px solid var(--line-dark)', fontSize: '14px', marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'الإيجار الأساسي' : 'Base rent'}</span>
              <span>{booking.subtotal} SAR</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'ضريبة القيمة المضافة (15%)' : 'VAT (15%)'}</span>
              <span>{booking.vat} SAR</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(245, 245, 245, 0.08)', paddingTop: '12px', fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>
              <span>{language === 'ar' ? 'المجموع المستحق' : 'Amount Due'}</span>
              <span>{booking.totalAmount} SAR</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Payment Form Panel */}
      <div style={{ background: 'var(--mars-slate)', padding: '36px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
        <h2 style={{ fontSize: '24px', color: '#FFFFFF', fontWeight: 300, borderBottom: '1px solid rgba(245, 245, 245, 0.08)', paddingBottom: '16px', margin: 0 }}>
          {language === 'ar' ? 'طريقة الدفع الآمن' : 'Secure Checkout Payment'}
        </h2>

        {paymentError && (
          <div style={{ background: 'rgba(255, 0, 0, 0.08)', color: '#FF4A4A', padding: '12px', borderRadius: '4px', marginTop: '16px', fontSize: '13px', fontWeight: 500 }}>
            {paymentError}
          </div>
        )}

        <form onSubmit={handlePayment} style={{ display: 'grid', gap: '24px', marginTop: '24px' }}>
          
          {/* Payment Method select toggles */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted-dark)', marginBottom: '10px' }}>
              {language === 'ar' ? 'اختر وسيلة الدفع المناسبة' : 'Select Payment Method'}
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              {['Mada', 'Visa/Mastercard', 'Apple Pay', 'STC Pay'].map((method) => {
                const isActive = paymentMethod === method;
                return (
                  <div
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    style={{
                      border: isActive ? '1px solid var(--copper-400)' : '1px solid var(--line-dark)',
                      background: isActive ? 'var(--mars-void)' : 'rgba(245, 245, 245, 0.02)',
                      padding: '16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontWeight: isActive ? 600 : 'normal'
                    }}
                  >
                    <span>{method}</span>
                    <span style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: '2px solid var(--copper-400)',
                      background: isActive ? 'var(--copper-400)' : 'none',
                      display: 'inline-block'
                    }} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sandbox Toggle helper for testing errors */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            color: 'var(--copper-400)',
            background: 'rgba(200, 107, 60, 0.06)',
            padding: '10px 14px',
            borderRadius: '4px',
            border: '1px solid rgba(200, 107, 60, 0.2)',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={simulateFailure}
              onChange={(e) => setSimulateFailure(e.target.checked)}
            />
            {language === 'ar' ? 'محاكاة فشل عملية الدفع (لاختبار صفحة الخطأ)' : 'Simulate Payment Failure (to test error page)'}
          </label>

          {/* Pay Button */}
          <button
            type="submit"
            disabled={paying}
            className="btn-pill-primary"
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {paying 
              ? (language === 'ar' ? 'جاري معالجة الدفع...' : 'Processing Payment...')
              : (language === 'ar' ? `دفع ${booking.totalAmount} ريال بأمان` : `Pay ${booking.totalAmount} SAR Securely`)}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Checkout() {
  return (
    <>
      <Header />
      <main style={{ background: 'var(--mars-void)', minHeight: '100vh', paddingTop: '100px', paddingBottom: '120px', boxSizing: 'border-box' }}>
        <div className="container">
          <Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
              <div style={{ color: 'var(--copper-400)', fontFamily: 'monospace' }}>LOADING CHECKOUT...</div>
            </div>
          }>
            <CheckoutContent />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
