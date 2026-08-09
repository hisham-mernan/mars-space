'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AnnouncementBar from '@/components/AnnouncementBar';
import { useLanguage } from '@/context/LanguageContext';

export default function PricingPage() {
  const { language, t, mounted } = useLanguage();
  if (!mounted) return null;

  const mem = t?.membershipSection || {};
  const plans = mem.plans || [];

  return (
    <>
      <AnnouncementBar />
      <Header />

      <main style={{ minHeight: '100vh', background: '#07070A', color: '#F5F3EF', paddingTop: '140px', paddingBottom: '120px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)' }}>
          
          <div style={{ maxWidth: '720px', marginBottom: '64px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', color: '#C86B3C', textTransform: 'uppercase' }}>
              {mem.eyebrow}
            </span>

            <h1 style={{ fontSize: 'clamp(36px, 4.5vw, 68px)', fontWeight: 300, margin: '16px 0 20px', letterSpacing: '-0.02em' }}>
              {mem.headline}
            </h1>

            <p style={{ fontSize: '18px', color: 'rgba(245, 243, 239, 0.75)', lineHeight: 1.65 }}>
              {mem.body}
            </p>
          </div>

          {/* 4 Plans Grid (§10 & §11) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '32px' }}>
            {plans.map((p, idx) => (
              <div
                key={p.id || idx}
                style={{
                  background: '#111116',
                  border: '1px solid rgba(245, 243, 239, 0.08)',
                  borderRadius: '12px',
                  padding: '40px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '999px', background: 'rgba(200, 107, 60, 0.15)', color: '#C86B3C', fontSize: '12px', fontWeight: 600, marginBottom: '16px' }}>
                    {p.badge}
                  </span>
                  <h3 style={{ fontSize: '26px', fontWeight: 300, margin: '0 0 12px', color: '#F5F3EF' }}>{p.name}</h3>
                  <p style={{ fontSize: '15px', color: 'rgba(245, 243, 239, 0.65)', margin: '0 0 32px', lineHeight: 1.6 }}>{p.line}</p>
                </div>

                <a
                  href="/contact"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#C86B3C',
                    fontSize: '15px',
                    fontWeight: 500
                  }}
                >
                  {p.cta} →
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
