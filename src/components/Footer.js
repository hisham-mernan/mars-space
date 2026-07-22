'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function Footer() {
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <footer
      data-screen-label="Footer"
      style={{
        background: 'var(--surface-1)',
        borderTop: '1px solid var(--glass-border)',
        padding: 'clamp(56px, 7vw, 88px) 0 48px',
        position: 'relative',
        zIndex: 10,
      }}
    >
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '48px' }}>
          {/* Logo & Brand Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src="/assets/mars-lockup-white.png"
                alt="MARS مارس"
                style={{ height: '48px', display: 'block' }}
              />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  color: 'var(--copper-400)',
                  textTransform: 'uppercase',
                  background: 'rgba(200, 107, 60, 0.10)',
                  border: '1px solid rgba(200, 107, 60, 0.25)',
                  padding: '3px 8px',
                  borderRadius: '999px',
                }}
              >
                {language === 'ar' ? 'سبيس' : 'SPACE'}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
                whiteSpace: 'pre-line',
              }}
            >
              {t.footer.desc}
            </p>
            
            {/* Live System Status */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '999px', width: 'fit-content' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-emerald)', boxShadow: '0 0 8px var(--status-emerald)' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--status-emerald)' }}>
                {language === 'ar' ? 'جميع الأنظمة تعمل بكفاءة' : 'All Space Systems Operational'}
              </span>
            </div>
          </div>

          {/* Links Columns */}
          {t.footer.cols.map((col, idx) => (
            <div key={idx} style={{ display: 'grid', gap: '14px', alignContent: 'start', fontSize: '14px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                {col.title}
              </span>
              {col.links.map((link, lIdx) => (
                <a key={lIdx} href={link.href} style={{ color: 'var(--text-secondary)', transition: 'color 160ms' }} className="footer-link">
                  {link.text}
                </a>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom copyright & Info */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px 32px',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '64px',
            paddingTop: '28px',
            borderTop: '1px solid var(--glass-border)',
            fontSize: '13px',
            color: 'var(--text-muted-dark)',
          }}
        >
          <span>{t.footer.copyright}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span>{t.footer.crVat}</span>
            <button
              onClick={toggleLanguage}
              style={{
                display: 'inline-flex',
                border: '1px solid var(--glass-border)',
                borderRadius: '999px',
                overflow: 'hidden',
                fontSize: '11px',
                fontWeight: 600,
                background: 'rgba(255, 255, 255, 0.03)',
                cursor: 'pointer',
                padding: '2px',
                color: 'inherit',
              }}
            >
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  color: language === 'ar' ? '#FFFFFF' : 'var(--text-muted-dark)',
                  background: language === 'ar' ? 'var(--mars-copper)' : 'transparent',
                }}
              >
                عربي
              </span>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  color: language === 'en' ? '#FFFFFF' : 'var(--text-muted-dark)',
                  background: language === 'en' ? 'var(--mars-copper)' : 'transparent',
                }}
              >
                EN
              </span>
            </button>
          </div>
        </div>
      </div>
      <style jsx>{`
        .footer-link:hover {
          color: var(--copper-400) !important;
        }
      `}</style>
    </footer>
  );
}
