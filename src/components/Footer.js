'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function Footer() {
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <footer
      data-screen-label="Footer"
      style={{
        background: 'var(--mars-void)',
        borderTop: '1px solid var(--mars-copper)',
        padding: 'clamp(56px, 7vw, 88px) 0 48px',
        position: 'relative',
        zIndex: 10,
      }}
    >
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '48px' }}>
          {/* Logo & Brand Column */}
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
              <img
                src="/assets/mars-lockup-white.png"
                alt="MARS مارس"
                style={{ height: '56px', display: 'block' }}
              />
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  letterSpacing: '0.16em',
                  color: 'var(--text-muted-dark)',
                  paddingBottom: '4px',
                }}
              >
                {language === 'ar' ? 'سبيس' : 'SPACE'}
              </span>
            </div>
            <p
              style={{
                margin: '24px 0 0',
                fontSize: '14px',
                color: 'var(--text-muted-dark)',
                lineHeight: 1.7,
                whiteSpace: 'pre-line',
              }}
            >
              {t.footer.desc}
            </p>
            <p style={{ margin: '16px 0 0', fontSize: '13px', color: 'var(--text-muted-light)' }}>
              {t.footer.hours}
            </p>
          </div>

          {/* Links Columns */}
          {t.footer.cols.map((col, idx) => (
            <div key={idx} style={{ display: 'grid', gap: '12px', alignContent: 'start', fontSize: '14px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#B9B9C0', marginBottom: '6px' }}>
                {col.title}
              </span>
              {col.links.map((link, lIdx) => (
                <a key={lIdx} href={link.href} style={{ color: 'var(--text-muted-dark)' }}>
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
            paddingTop: '24px',
            borderTop: '1px solid rgba(245, 245, 245, 0.10)',
            fontSize: '13px',
            color: 'var(--text-muted-light)',
          }}
        >
          <span>{t.footer.copyright}</span>
          <span>{t.footer.crVat}</span>

          {/* Tiny Language Selector */}
          <button
            onClick={toggleLanguage}
            style={{
              display: 'flex',
              border: '1px solid rgba(245, 245, 245, 0.18)',
              borderRadius: '999px',
              overflow: 'hidden',
              fontWeight: 500,
              lineHeight: 1,
              background: 'none',
              cursor: 'pointer',
              padding: 0,
              color: 'inherit',
            }}
          >
            <span
              style={{
                padding: '6px 11px',
                color: language === 'ar' ? 'var(--mars-void)' : 'var(--text-muted-dark)',
                background: language === 'ar' ? 'var(--mars-paper)' : 'none',
                transition: 'all var(--dur-instant)',
              }}
            >
              عربي
            </span>
            <span
              style={{
                padding: '6px 11px',
                color: language === 'en' ? 'var(--mars-void)' : 'var(--text-muted-dark)',
                background: language === 'en' ? 'var(--mars-paper)' : 'none',
                transition: 'all var(--dur-instant)',
              }}
            >
              EN
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
}
