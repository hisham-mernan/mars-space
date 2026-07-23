'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

function FailedContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const { language, mounted } = useLanguage();

  if (!mounted) return null;

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto 0' }}>
      <div style={{
        background: 'var(--mars-slate)',
        borderRadius: '8px',
        border: '1px solid var(--line-dark)',
        padding: '48px',
        boxSizing: 'border-box',
        textAlign: 'center'
      }}>
        
        {/* Error/Warning cross icon */}
        <div style={{
          width: '64px',
          height: '64px',
          background: 'rgba(255, 0, 0, 0.08)',
          border: '2px solid #FF4A4A',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px'
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF4A4A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>

        <h1 style={{ fontSize: '30px', fontWeight: 300, color: '#FFFFFF', margin: 0 }}>
          {language === 'ar' ? 'فشلت عملية الدفع' : 'Payment Failed'}
        </h1>
        
        <p style={{ color: 'var(--text-muted-dark)', fontSize: '15px', marginTop: '16px', lineHeight: 1.6 }}>
          {language === 'ar'
            ? 'عذراً، لم نتمكن من معالجة دفعتك. قد يكون هذا بسبب عدم كفاية الرصيد أو توقف مؤقت من المصرف المصدر للبطاقة.'
            : 'We were unable to process your payment transaction. This may be due to insufficient funds, incorrect card details, or a temporary block from your bank.'}
        </p>

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '40px' }}>
          <a
            href={bookingId ? `/checkout?bookingId=${bookingId}` : '/spaces'}
            className="btn-pill-primary"
            style={{ padding: '12px 28px', fontSize: '14px' }}
          >
            {language === 'ar' ? 'إعادة المحاولة وتغيير البطاقة' : 'Retry Payment'}
          </a>
          <a
            href="/spaces"
            className="btn-pill-secondary"
            style={{ padding: '12px 28px', fontSize: '14px' }}
          >
            {language === 'ar' ? 'إلغاء والعودة للمساحات' : 'Cancel booking'}
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Failed() {
  return (
    <>
      <Header />
      <main style={{ background: 'var(--mars-void)', minHeight: '100vh', paddingTop: '100px', paddingBottom: '120px', boxSizing: 'border-box' }}>
        <div className="container">
          <Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
              <div style={{ color: 'var(--copper-400)' }}>LOADING...</div>
            </div>
          }>
            <FailedContent />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
