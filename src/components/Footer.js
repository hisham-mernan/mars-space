'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function Footer() {
  const { language, toggleLanguage } = useLanguage();

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
          
          {/* Brand Info */}
          <div style={{ flex: '1 1 300px', maxWidth: '420px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
              <img src="/assets/mars-lockup-white.png" alt="MARS مارس" style={{ height: '52px', display: 'block' }} />
              <span style={{ fontSize: '13px', fontWeight: 500, letterSpacing: '0.1em', color: '#A8A49D', paddingBottom: '4px' }}>
                {language === 'ar' ? 'سبيس' : 'SPACE'}
              </span>
            </div>
            
            <p style={{ margin: '26px 0 0', fontSize: '15px', fontWeight: 300, color: '#A8A49D', lineHeight: 1.8 }}>
              King Abdulaziz Rd, Al Shati District<br />
              Jeddah, Saudi Arabia<br />
              <bdi>+966 50 123 4567</bdi> · WhatsApp<br />
              hello@space.mars.sa
            </p>
            
            <p style={{ margin: '18px 0 0', fontSize: '14px', fontWeight: 300, color: '#6B675F' }}>
              {language === 'ar' ? 'الأحد إلى الخميس [08:00 – 20:00] · الأعضاء 24/7' : 'Sunday to Thursday [08:00–20:00] · members 24/7'}
            </p>
          </div>

          {/* Navigation Links Columns */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(40px, 5vw, 96px)' }}>
            
            <div style={{ display: 'grid', gap: '14px', alignContent: 'start', justifyItems: 'start', fontSize: '15px', fontWeight: 300 }}>
              <span style={{ fontWeight: 500, color: '#F5F3EF', marginBottom: '4px' }}>
                {language === 'ar' ? 'الطابق' : 'The floor'}
              </span>
              <a href="#offices" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'المكاتب الخاصة' : 'Private offices'}</a>
              <a href="#explore" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'العمل المشترك' : 'Coworking'}</a>
              <a href="#explore" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'قاعات الاجتماعات' : 'Meeting rooms'}</a>
              <a href="#community" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'القاعة المجتمعية' : 'Community hall'}</a>
            </div>

            <div style={{ display: 'grid', gap: '14px', alignContent: 'start', justifyItems: 'start', fontSize: '15px', fontWeight: 300 }}>
              <span style={{ fontWeight: 500, color: '#F5F3EF', marginBottom: '4px' }}>
                {language === 'ar' ? 'الزيارة والتواصل' : 'Visit'}
              </span>
              <a href="#visit" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'احجز جولة' : 'Book a tour'}</a>
              <a href="#top" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'احجز مساحة' : 'Book a space'}</a>
              <a href="#membership" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'تصريح يومي' : 'Day pass'}</a>
              <a href="#offices" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'تعاقد مكاتب' : 'Lease an office'}</a>
            </div>

            <div style={{ display: 'grid', gap: '14px', alignContent: 'start', justifyItems: 'start', fontSize: '15px', fontWeight: 300 }}>
              <span style={{ fontWeight: 500, color: '#F5F3EF', marginBottom: '4px' }}>
                {language === 'ar' ? 'منظومة مارس' : 'Mars'}
              </span>
              <a href="https://mars.sa" target="_blank" rel="noreferrer" style={{ color: '#A8A49D' }}>Mars Ventures ↗</a>
              <a href="#top" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'الشروط والأحكام' : 'Terms'}</a>
              <a href="#top" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'سياسة الخصوصية' : 'Privacy'}</a>
              <a href="#top" style={{ color: '#A8A49D' }}>{language === 'ar' ? 'قواعد الطابق' : 'House rules'}</a>
            </div>

          </div>

        </div>

        {/* Bottom Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 32px', justifyContent: 'space-between', alignItems: 'center', marginTop: 'clamp(48px, 7vh, 80px)', paddingTop: '24px', borderTop: '1px solid rgba(245, 243, 239, 0.08)', fontSize: '13px', fontWeight: 300, color: '#6B675F' }}>
          <span>© 2026 Mars Space · part of Mars Ventures · CR 4030123456 · VAT 310001234500003</span>
          
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
