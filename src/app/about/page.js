'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AnnouncementBar from '@/components/AnnouncementBar';
import { useLanguage } from '@/context/LanguageContext';

export default function AboutPage() {
  const { language, t, mounted } = useLanguage();
  if (!mounted) return null;

  const ab = t?.aboutSection || {};

  return (
    <>
      <AnnouncementBar />
      <Header />

      <main style={{ minHeight: '100vh', background: '#07070A', color: '#F5F3EF', paddingTop: '140px', paddingBottom: '120px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', color: '#C86B3C', textTransform: 'uppercase' }}>
            {ab.eyebrow}
          </span>

          <h1 style={{ fontSize: 'clamp(40px, 5.5vw, 84px)', fontWeight: 300, lineHeight: 1.1, margin: '20px 0 32px', letterSpacing: '-0.02em' }}>
            {ab.headline}
          </h1>

          <div style={{ fontSize: 'clamp(18px, 2vw, 24px)', fontWeight: 300, color: 'rgba(245, 243, 239, 0.75)', lineHeight: 1.7, maxWidth: '54ch', display: 'grid', gap: '24px', marginBottom: '56px' }}>
            {ab.body?.split('\n\n').map((paragraph, idx) => (
              <p key={idx} style={{ margin: 0 }}>{paragraph}</p>
            ))}
          </div>

          <a
            href="/contact"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#8A4120',
              color: '#FFFFFF',
              padding: '16px 36px',
              borderRadius: '999px',
              fontSize: '16px',
              fontWeight: 500
            }}
          >
            {ab.cta} →
          </a>
        </div>
      </main>

      <Footer />
    </>
  );
}
