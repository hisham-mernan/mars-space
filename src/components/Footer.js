'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function Footer() {
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <footer
      data-screen-label="Footer"
      style={{
        background: '#0B0B0F',
        borderTop: '1px solid rgba(245, 243, 239, 0.1)',
        padding: 'clamp(64px, 9vh, 104px) 0 48px',
        color: '#F5F3EF',
        position: 'relative',
        zIndex: 10,
      }}
    >
      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(40px, 6vw, 120px)', justifyContent: 'space-between' }}>
          
          {/* Brand Info & Tagline */}
          <div style={{ flex: '1 1 300px', maxWidth: '420px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
              <img src="/assets/mars-lockup-white.png" alt="MARS مارس" style={{ height: '52px', display: 'block' }} />
              <span style={{ fontSize: '13px', fontWeight: 500, letterSpacing: '0.1em', color: '#A8A49D', paddingBottom: '4px' }}>
                {language === 'ar' ? 'سبيس' : 'SPACE'}
              </span>
            </div>

            <p style={{ margin: '16px 0 0', fontSize: '16px', fontWeight: 300, color: 'rgba(245,243,239,0.9)', fontStyle: 'italic' }}>
              {t?.footer?.tagline || (language === 'ar' ? 'مساحةٌ مدروسة لعملٍ جاد.' : 'Considered space for serious work.')}
            </p>
            
            <p style={{ margin: '20px 0 0', fontSize: '15px', fontWeight: 300, color: '#A8A49D', lineHeight: 1.8 }}>
              {language === 'ar' ? 'جدة، المملكة العربية السعودية ،[المبنى، الشارع، الحي]' : '[Building, street, district], Jeddah, Saudi Arabia'}<br />
              <bdi>+966 __ ___ ____</bdi> · WhatsApp [____]<br />
              hello@mars.sa
            </p>
            
            <p style={{ margin: '18px 0 0', fontSize: '14px', fontWeight: 300, color: '#6B675F' }}>
              {language === 'ar' ? 'الأحد – الخميس [08:00 – 20:00] · الأعضاء 24/7' : 'Sunday to Thursday [08:00–20:00] · Members 24/7'}
            </p>
          </div>

          {/* Navigation Links Columns (§11 & §15) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(40px, 5vw, 96px)' }}>
            
            {/* Column 1: The Space / المساحة */}
            <div style={{ display: 'grid', gap: '14px', alignContent: 'start', justifyItems: 'start', fontSize: '15px', fontWeight: 300 }}>
              <span style={{ fontWeight: 500, color: '#F5F3EF', marginBottom: '4px' }}>
                {language === 'ar' ? 'المساحة' : 'The Space'}
              </span>
              <a href="/spaces?category=private_office" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'مكاتب خاصة' : 'Private Offices'}</a>
              <a href="/spaces?category=coworking" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'مكاتب مشتركة' : 'Coworking Desks'}</a>
              <a href="/spaces?category=meeting_room" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'قاعات اجتماعات' : 'Meeting Rooms'}</a>
              <a href="/spaces?category=focus_pod" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'غرف تركيز' : 'Focus Pods'}</a>
              <a href="/events" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'المساحة المجتمعية' : 'Community Space'}</a>
              <a href="/spaces?category=cafe" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'المقهى والاستراحة' : 'Café & Lounge'}</a>
            </div>

            {/* Column 2: Book / الحجز */}
            <div style={{ display: 'grid', gap: '14px', alignContent: 'start', justifyItems: 'start', fontSize: '15px', fontWeight: 300 }}>
              <span style={{ fontWeight: 500, color: '#F5F3EF', marginBottom: '4px' }}>
                {language === 'ar' ? 'الحجز' : 'Book'}
              </span>
              <a href="/spaces?category=meeting_room" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'احجز قاعة' : 'Book a room'}</a>
              <a href="/spaces?category=focus_pod" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'احجز كابينة' : 'Take a booth'}</a>
              <a href="/events" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'خطط لفعالية' : 'Plan an event'}</a>
              <a href="/pricing" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'بطاقة يومية' : 'Day pass'}</a>
              <a href="/contact" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'احجز جولة' : 'Book a tour'}</a>
            </div>

            {/* Column 3: Company / الشركة */}
            <div style={{ display: 'grid', gap: '14px', alignContent: 'start', justifyItems: 'start', fontSize: '15px', fontWeight: 300 }}>
              <span style={{ fontWeight: 500, color: '#F5F3EF', marginBottom: '4px' }}>
                {language === 'ar' ? 'الشركة' : 'Company'}
              </span>
              <a href="/about" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'عن مارس سبيس' : 'About'}</a>
              <a href="/events" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'الفعاليات' : 'Events'}</a>
              <a href="/spaces" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'المعرض' : 'Gallery'}</a>
              <a href="/contact" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'تواصل معنا' : 'Contact'}</a>
              <a href="https://mars.sa" target="_blank" rel="noreferrer" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'جزء من مارس فينتشرز ↗' : 'Part of Mars Ventures ↗'}</a>
            </div>

            {/* Column 4: Legal / القانوني */}
            <div style={{ display: 'grid', gap: '14px', alignContent: 'start', justifyItems: 'start', fontSize: '15px', fontWeight: 300 }}>
              <span style={{ fontWeight: 500, color: '#F5F3EF', marginBottom: '4px' }}>
                {language === 'ar' ? 'القانوني' : 'Legal'}
              </span>
              <a href="#top" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'الشروط' : 'Terms'}</a>
              <a href="#top" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'الخصوصية' : 'Privacy'}</a>
              <a href="#top" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'سياسة الحجز' : 'Booking Policy'}</a>
              <a href="#top" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'قواعد الاستخدام' : 'House Rules'}</a>
            </div>

          </div>

        </div>

        {/* Bottom Bar (§11 & §15) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 32px', justifyContent: 'space-between', alignItems: 'center', marginTop: 'clamp(48px, 7vh, 80px)', paddingTop: '24px', borderTop: '1px solid rgba(245, 243, 239, 0.08)', fontSize: '13px', fontWeight: 300, color: '#6B675F' }}>
          <span>
            {language === 'ar' 
              ? '© 2026 مارس سبيس، إحدى شركات مارس فينتشرز. س.ت [] · الرقم الضريبي [].'
              : '© 2026 Mars Space, a Mars Ventures company. CR [] · VAT [].'}
          </span>
          
          <div
            onClick={toggleLanguage}
            style={{
              display: 'flex',
              border: '1px solid rgba(245, 243, 239, 0.15)',
              borderRadius: '999px',
              overflow: 'hidden',
              fontWeight: 500,
              lineHeight: 1,
              cursor: 'pointer'
            }}
          >
            <span style={{ padding: '6px 11px', color: language === 'ar' ? '#0B0B0F' : '#A8A49D', background: language === 'ar' ? '#F5F3EF' : 'transparent' }}>
              عربي
            </span>
            <span style={{ padding: '6px 11px', color: language === 'en' ? '#0B0B0F' : '#A8A49D', background: language === 'en' ? '#F5F3EF' : 'transparent' }}>
              EN
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
