'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AnnouncementBar from '@/components/AnnouncementBar';
import { useLanguage } from '@/context/LanguageContext';

export default function PricingPage() {
  const { language, mounted } = useLanguage();
  if (!mounted) return null;

  const plans = [
    {
      title: language === 'ar' ? 'تصريح يومي' : 'Day Pass',
      price: 'SAR 150',
      period: language === 'ar' ? '/ يومي' : '/ day',
      desc: language === 'ar' ? 'للمستقلين والزوار الراغبين في تجربة الطابق' : 'For freelancers and visitors testing the floor',
      features: [
        language === 'ar' ? 'دخول من ٨ ص حتى ٨ م' : '8 AM to 8 PM Access',
        language === 'ar' ? 'أي مكتب في الصالة المفتوحة' : 'Any Open Lounge Desk',
        language === 'ar' ? 'قهوة مختصة وشاي غير محدود' : 'Unlimited Specialty Coffee',
        language === 'ar' ? 'إنترنت ألياف ضوئية فائقة السرعة' : 'High-Speed Fiber Wi-Fi'
      ],
      cta: language === 'ar' ? 'احصل على تصريح' : 'Get Pass',
      href: '/checkout?plan=daypass'
    },
    {
      title: language === 'ar' ? 'مكتب مشترك' : 'Open Desk',
      price: 'SAR 1,200',
      period: language === 'ar' ? '/ شهرياً' : '/ month',
      desc: language === 'ar' ? 'للمؤسسين والفرق الناشئة المرنة' : 'For founders and flexible agile teams',
      features: [
        language === 'ar' ? 'دخول 24/7 على مدار الساعة' : '24/7 Full Floor Access',
        language === 'ar' ? '5 ساعات قاعات اجتماعات شهرياً' : '5 Free Meeting Room Hours',
        language === 'ar' ? 'استقبال وتمرير البريد والطرود' : 'Mail & Package Handling',
        language === 'ar' ? 'خصم على حجز القاعة المجتمعية' : 'Community Hall Booking Discounts'
      ],
      cta: language === 'ar' ? 'اشترك الآن' : 'Subscribe Now',
      href: '/checkout?plan=opendesk',
      popular: true
    },
    {
      title: language === 'ar' ? 'مكتب مخصص' : 'Dedicated Desk',
      price: 'SAR 2,200',
      period: language === 'ar' ? '/ شهرياً' : '/ month',
      desc: language === 'ar' ? 'نفس الكرسي والمكتب لك كل صباح' : 'Your fixed desk and ergonomics daily',
      features: [
        language === 'ar' ? 'مكتب مخصص ثابت مع خزانة شخصية' : 'Fixed Reserved Desk & Locker',
        language === 'ar' ? 'عنوان تجاري مسجل لشركتك' : 'Registered Commercial Address',
        language === 'ar' ? '12 ساعة قاعات اجتماعات شهرياً' : '12 Free Meeting Room Hours',
        language === 'ar' ? 'رصيد طباعة ومسح ضوئي مجاني' : 'Free Print & Scan Credits'
      ],
      cta: language === 'ar' ? 'اشترك الآن' : 'Subscribe Now',
      href: '/checkout?plan=dedicated'
    },
    {
      title: language === 'ar' ? 'مكتب خاص' : 'Private Office',
      price: 'SAR 6,500',
      period: language === 'ar' ? '/ شهرياً' : '/ month',
      desc: language === 'ar' ? 'أجنحة زجاجية مغلقة لشخصين إلى عشرين شخصاً' : 'Enclosed glass offices for 2 to 20 people',
      features: [
        language === 'ar' ? 'مكتب زجاجي مغلق بقفل ذكي' : 'Private Office with Smart Lock',
        language === 'ar' ? 'اسم وشعار شركتك على الباب' : 'Company Branding on Door',
        language === 'ar' ? 'شبكة Wi-Fi وخادم مخصص' : 'Dedicated Network & Server Rack',
        language === 'ar' ? 'ساعات قاعات اجتماعات غير محدودة' : 'Priority Meeting Room Allocation'
      ],
      cta: language === 'ar' ? 'احجز معاينة' : 'Book Visit',
      href: '/book-tour?type=private_office'
    }
  ];

  return (
    <>
      <AnnouncementBar />
      <Header />

      <main style={{ minHeight: '100vh', background: 'var(--mars-void)', color: 'var(--text-primary)', paddingTop: '140px', paddingBottom: '120px' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)' }}>
          <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 64px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--copper-400)', textTransform: 'uppercase' }}>
              {language === 'ar' ? 'الأسعار والباقات' : 'MEMBERSHIP & PRICING'}
            </span>
            <h1 style={{ fontSize: 'clamp(36px, 4.5vw, 68px)', fontWeight: 200, margin: '16px 0' }}>
              {language === 'ar' ? 'أسعار واضحة، بدون تكاليف خفية.' : 'Clear pricing. No hidden fees.'}
            </h1>
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
              {language === 'ar'
                ? 'جميع الباقات تشمل ضريبة القيمة المضافة 15٪ والتغطية الشاملة للخدمات والقهوة والإنترنت.'
                : 'All plans include 15% VAT, internet, specialty coffee, and full floor amenities.'}
            </p>
          </div>

          {/* Pricing Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
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
                    {language === 'ar' ? 'الأكثر طلباً' : 'MOST POPULAR'}
                  </span>
                )}

                <h3 style={{ fontSize: '24px', fontWeight: 300, margin: '0 0 8px', color: '#FFFFFF' }}>{p.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted-dark)', margin: '0 0 24px', minHeight: '36px' }}>{p.desc}</p>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '28px' }}>
                  <span style={{ fontSize: '36px', fontWeight: 700, color: '#FFFFFF' }}>{p.price}</span>
                  <span style={{ fontSize: '14px', color: 'var(--text-muted-dark)' }}>{p.period}</span>
                </div>

                <div style={{ flex: 1, display: 'grid', gap: '12px', marginBottom: '36px' }}>
                  {p.features.map((f, fi) => (
                    <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--copper-400)', fontWeight: 700 }}>✓</span>
                      {f}
                    </div>
                  ))}
                </div>

                <a
                  href={p.href}
                  className="btn-pill-primary"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '14px',
                    fontSize: '15px',
                    borderRadius: '999px',
                    textDecoration: 'none'
                  }}
                >
                  {p.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
