'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function Footer() {
  const { language, t } = useLanguage();
  const f = t?.footer;

  return (
    <footer style={{ background: '#07070A', color: '#F5F3EF', borderTop: '1px solid rgba(245, 243, 239, 0.08)', padding: 'clamp(64px, 10vh, 120px) 0 clamp(32px, 5vh, 48px)' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)', boxSizing: 'border-box' }}>
        
        {/* Top Brand Banner */}
        <div style={{ paddingBottom: 'clamp(48px, 6vh, 80px)', borderBottom: '1px solid rgba(245, 243, 239, 0.08)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '24px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 'clamp(28px, 3.5vw, 48px)', fontWeight: 300, letterSpacing: '-0.02em', color: '#F5F3EF' }}>
                {f?.brand || (language === 'ar' ? 'مارس سبيس' : 'Mars Space')}
              </h2>
              <p style={{ margin: '12px 0 0', fontSize: 'clamp(16px, 1.8vw, 22px)', fontWeight: 300, color: 'rgba(245, 243, 239, 0.65)' }}>
                {f?.tagline || (language === 'ar' ? 'مساحة تليق بطريقة عملك.' : 'A better place to work.')}
              </p>
            </div>

            <div style={{ fontSize: '15px', fontWeight: 400, color: '#C86B3C', letterSpacing: '0.04em' }}>
              📍 {f?.location || (language === 'ar' ? 'جدة، المملكة العربية السعودية' : 'Jeddah, Saudi Arabia')}
            </div>
          </div>
        </div>

        {/* 3 Main Link Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '48px clamp(24px, 4vw, 64px)', padding: 'clamp(48px, 6vh, 80px) 0' }}>
          
          {/* Column 1: Spaces */}
          <div>
            <h4 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: 600, letterSpacing: '0.08em', color: '#C86B3C', textTransform: 'uppercase' }}>
              {f?.col1Title || (language === 'ar' ? 'المساحات' : 'Spaces')}
            </h4>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '12px', fontSize: '15px', color: 'rgba(245, 243, 239, 0.75)' }}>
              {(f?.col1Items || []).map((item, idx) => (
                <li key={idx}>
                  <a href={item.href} style={{ transition: 'color 200ms' }}>{item.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: Mars Space */}
          <div>
            <h4 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: 600, letterSpacing: '0.08em', color: '#C86B3C', textTransform: 'uppercase' }}>
              {f?.col2Title || (language === 'ar' ? 'مارس سبيس' : 'Mars Space')}
            </h4>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '12px', fontSize: '15px', color: 'rgba(245, 243, 239, 0.75)' }}>
              {(f?.col2Items || []).map((item, idx) => (
                <li key={idx}>
                  <a href={item.href} style={{ transition: 'color 200ms' }}>{item.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Actions & Legal */}
          <div>
            <h4 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: 600, letterSpacing: '0.08em', color: '#C86B3C', textTransform: 'uppercase' }}>
              {f?.col3Title || (language === 'ar' ? 'إجراءات' : 'Actions')}
            </h4>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '12px', fontSize: '15px', color: 'rgba(245, 243, 239, 0.75)' }}>
              {(f?.col3Items || []).map((item, idx) => (
                <li key={idx}>
                  <a href={item.href} style={{ transition: 'color 200ms' }}>{item.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright */}
        <div style={{ paddingTop: '32px', borderTop: '1px solid rgba(245, 243, 239, 0.08)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', fontSize: '14px', color: 'rgba(245, 243, 239, 0.45)' }}>
          <div>
            {f?.copyright || (language === 'ar' ? '© 2026 مارس سبيس. جميع الحقوق محفوظة.' : '© 2026 Mars Space. All rights reserved.')}
          </div>
        </div>
      </div>
    </footer>
  );
}
