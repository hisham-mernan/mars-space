'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AnnouncementBar from '@/components/AnnouncementBar';
import { useLanguage } from '@/context/LanguageContext';

export default function PricingPage() {
  const { language, t, mounted } = useLanguage();
  if (!mounted) return null;

  const plans = [
    {
      title: t?.membershipBand?.plans?.[0]?.arName && language === 'ar' ? t.membershipBand.plans[0].arName : (t?.membershipBand?.plans?.[0]?.name || 'Day Pass'),
      line: t?.membershipBand?.plans?.[0]?.line || (language === 'ar' ? 'يومٌ كاملٌ على الطابق — يشمل المقهى والمساحات الهادئة.' : 'A full day on the floor — café and quiet space included.'),
      href: '/checkout?plan=daypass'
    },
    {
      title: t?.membershipBand?.plans?.[1]?.arName && language === 'ar' ? t.membershipBand.plans[1].arName : (t?.membershipBand?.plans?.[1]?.name || 'Hot Desk'),
      line: t?.membershipBand?.plans?.[1]?.line || (language === 'ar' ? 'أي مكتبٍ متاح، وقتما حضرت، مع رصيدٍ شهري من ساعات القاعات.' : 'Any open desk, whenever you come in, plus monthly meeting-room credits.'),
      href: '/checkout?plan=opendesk',
      popular: true
    },
    {
      title: t?.membershipBand?.plans?.[2]?.arName && language === 'ar' ? t.membershipBand.plans[2].arName : (t?.membershipBand?.plans?.[2]?.name || 'Dedicated Desk'),
      line: t?.membershipBand?.plans?.[2]?.line || (language === 'ar' ? 'مكتبك الخاص، يبقى كما تركته، مع رصيدٍ أكبر وخزانة.' : 'Your own desk, kept as you left it, with more credits and a locker.'),
      href: '/checkout?plan=dedicated'
    },
    {
      title: t?.membershipBand?.plans?.[3]?.arName && language === 'ar' ? t.membershipBand.plans[3].arName : (t?.membershipBand?.plans?.[3]?.name || 'Private Office'),
      line: t?.membershipBand?.plans?.[3]?.line || (language === 'ar' ? 'مكتبٌ قابلٌ للإغلاق لفريقك — مُجهّزٌ ومُسجَّلٌ باسمك.' : 'A lockable office for your team — finished and registered to your name.'),
      href: '/contact?type=private_office'
    }
  ];

  return (
    <>
      <AnnouncementBar />
      <Header />

      <main style={{ minHeight: '100vh', background: 'var(--mars-void)', color: 'var(--text-primary)', paddingTop: '140px', paddingBottom: '120px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)' }}>
          {/* Header Section (§6) */}
          <div style={{ maxWidth: '750px', marginBottom: '64px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--copper-400)', textTransform: 'uppercase' }}>
              {t?.membershipBand?.eyebrow || (language === 'ar' ? 'العضوية' : 'MEMBERSHIP')}
            </span>

            <h1 style={{ fontSize: 'clamp(36px, 4.5vw, 68px)', fontWeight: 200, margin: '16px 0 20px' }}>
              {t?.membershipBand?.headline || (language === 'ar' ? 'اختر طريقتك في العمل.' : 'Choose how you work.')}
            </h1>

            <p style={{ fontSize: '18px', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              {t?.membershipBand?.body || (language === 'ar'
                ? 'أربع باقات على طابقٍ واحدٍ منتقى. ابدأ بيومٍ واحد، وتوسّع إلى مكتبٍ خاص — وبدّل متى تبدّل عملك.'
                : 'Four plans on one curated floor. Start with a single day, scale to a private office — and switch whenever your work does.')}
            </p>
          </div>

          {/* 4 Plans Table / Cards List (§6) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginBottom: '64px' }}>
            {plans.map((p, idx) => (
              <div
                key={idx}
                style={{
                  background: p.popular ? 'var(--surface-2)' : 'var(--surface-1)',
                  border: p.popular ? '2px solid var(--copper-400)' : '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  padding: '36px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative'
                }}
              >
                {p.popular && (
                  <span style={{
                    position: 'absolute',
                    top: '-12px',
                    right: language === 'ar' ? 'auto' : '24px',
                    left: language === 'ar' ? '24px' : 'auto',
                    background: 'var(--copper-400)',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 12px',
                    borderRadius: '999px',
                    textTransform: 'uppercase'
                  }}>
                    {language === 'ar' ? 'موصى به' : 'RECOMMENDED'}
                  </span>
                )}

                <h3 style={{ fontSize: '24px', fontWeight: 400, margin: '0 0 12px', color: '#FFFFFF' }}>{p.title}</h3>
                <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: '0 0 32px', lineHeight: 1.6, flex: 1 }}>{p.line}</p>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <a
                    href={p.href}
                    className="btn-pill-primary"
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'center',
                      padding: '14px',
                      fontSize: '14px',
                      borderRadius: '999px',
                      textDecoration: 'none'
                    }}
                  >
                    {t?.membershipBand?.cta || (language === 'ar' ? 'قارن الباقات' : 'Compare plans')} →
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Included in Every Plan Section (§6) */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--glass-border)', padding: '40px', borderRadius: '12px', marginBottom: '40px' }}>
            <h3 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--copper-400)', margin: '0 0 12px' }}>
              {t?.membershipBand?.includedInEveryPlan?.title || (language === 'ar' ? 'مشمولٌ في كل باقة' : 'Included in every plan')}
            </h3>
            <p style={{ fontSize: '16px', color: '#FFFFFF', lineHeight: 1.7, margin: 0 }}>
              {t?.membershipBand?.includedInEveryPlan?.body || (language === 'ar'
                ? 'رصيدٌ من ساعات القاعات، والمقهى، ودخولٌ على مدار الساعة، وعنوانٌ تجاري مُسجّل، واستلام البريد، وخصمٌ على المساحة المجتمعية. دون رسوم تجهيز، ودون مفاجآت.'
                : 'Meeting-room credits, the café, 24/7 access, a registered business address, mail handling, and a discount on the community space. No setup fees, no surprises.')}
            </p>
          </div>

          {/* Reassurance Line & CTAs (§6) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '24px', paddingTop: '24px', borderTop: '1px solid var(--line-dark)' }}>
            <p style={{ fontSize: '15px', color: 'var(--text-muted-dark)', margin: 0 }}>
              {t?.membershipBand?.reassuranceLine || (language === 'ar'
                ? 'تشمل الأسعار ضريبة القيمة المضافة 15%. يمكنك تغيير باقتك أو إلغاؤها بإشعارٍ قبل [30] يوماً.'
                : 'Prices include 15% VAT. Change or cancel your plan with [30] days\' notice.')}
            </p>

            <div style={{ display: 'flex', gap: '16px' }}>
              <a href="/contact" style={{ color: 'var(--copper-400)', fontSize: '15px', fontWeight: 600, textDecoration: 'underline' }}>
                {t?.membershipBand?.ctas?.tour || (language === 'ar' ? 'احجز جولة' : 'Book a tour')} →
              </a>
              <a href="/contact" style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: 600, textDecoration: 'underline' }}>
                {t?.membershipBand?.ctas?.talk || (language === 'ar' ? 'تحدّث إلينا' : 'Talk to us')} →
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
