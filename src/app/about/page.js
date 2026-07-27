'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AnnouncementBar from '@/components/AnnouncementBar';
import { useLanguage } from '@/context/LanguageContext';

export default function AboutPage() {
  const { language, mounted } = useLanguage();
  if (!mounted) return null;

  return (
    <>
      <AnnouncementBar />
      <Header />

      <main style={{ minHeight: '100vh', background: 'var(--mars-void)', color: 'var(--text-primary)', paddingTop: '140px', paddingBottom: '120px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--copper-400)', textTransform: 'uppercase' }}>
            {language === 'ar' ? 'عن مارس سبيس' : 'ABOUT MARS SPACE'}
          </span>

          <h1 style={{ fontSize: 'clamp(40px, 5.5vw, 84px)', fontWeight: 200, lineHeight: 1.1, margin: '16px 0 24px' }}>
            {language === 'ar' ? 'بُني بحب للذين يبنون المستقبل.' : 'Built for the people who build.'}
          </h1>

          <p style={{ fontSize: 'clamp(18px, 1.8vw, 24px)', fontWeight: 300, color: 'var(--text-secondary)', maxWidth: '44ch', lineHeight: 1.6, marginBottom: '64px' }}>
            {language === 'ar'
              ? 'مارس سبيس ليست مجرد مكاتب للإيجار، بل هي طابق عمل خاص تُديره حاضنة أعمال تعمل في نفس المكان بنفس الشغف.'
              : 'Mars Space is not just leased desks. It is a private working floor operated by the venture builder that works here too.'}
          </p>

          {/* Grid Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginBottom: '80px' }}>
            <div style={{ background: 'var(--surface-1)', border: '1px solid var(--glass-border)', padding: '32px', borderRadius: '12px' }}>
              <div style={{ fontSize: '48px', fontWeight: 200, color: 'var(--copper-400)', marginBottom: '8px' }}>1,800m²</div>
              <div style={{ fontSize: '16px', fontWeight: 500, color: '#FFFFFF' }}>{language === 'ar' ? 'طابق عمل متكامل' : 'Premium Working Floor'}</div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted-dark)', marginTop: '4px' }}>{language === 'ar' ? 'في قلب جدة' : 'In the heart of Jeddah'}</div>
            </div>

            <div style={{ background: 'var(--surface-1)', border: '1px solid var(--glass-border)', padding: '32px', borderRadius: '12px' }}>
              <div style={{ fontSize: '48px', fontWeight: 200, color: 'var(--copper-400)', marginBottom: '8px' }}>24/7</div>
              <div style={{ fontSize: '16px', fontWeight: 500, color: '#FFFFFF' }}>{language === 'ar' ? 'دخول كامل غير مشروط' : 'Full Access'}</div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted-dark)', marginTop: '4px' }}>{language === 'ar' ? 'للأعضاء والمؤسسين' : 'For members & founders'}</div>
            </div>

            <div style={{ background: 'var(--surface-1)', border: '1px solid var(--glass-border)', padding: '32px', borderRadius: '12px' }}>
              <div style={{ fontSize: '48px', fontWeight: 200, color: 'var(--copper-400)', marginBottom: '8px' }}>100%</div>
              <div style={{ fontSize: '16px', fontWeight: 500, color: '#FFFFFF' }}>{language === 'ar' ? 'ألياف ضوئية متماثلة' : 'Symmetric Fiber'}</div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted-dark)', marginTop: '4px' }}>{language === 'ar' ? 'سرعة فائقة دون انقطاع' : 'High-speed clean Wi-Fi'}</div>
            </div>
          </div>

          {/* Core Values */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
            <div style={{ background: 'var(--surface-2)', padding: '36px', borderRadius: '12px', border: '1px solid var(--line-dark)' }}>
              <h3 style={{ fontSize: '22px', fontWeight: 400, margin: '0 0 12px', color: '#FFFFFF' }}>
                {language === 'ar' ? 'الهدوء الهندسي' : 'Quiet Infrastructure'}
              </h3>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                {language === 'ar'
                  ? 'كل شيء معد بعناية فائقة: الإضاءة، الصوت، المصلى، القهوة المختصة، حتى لا تفكر سوى في عملك.'
                  : 'Lighting, acoustic design, prayer rooms, specialty coffee, and lockers arranged so you stop thinking about them.'}
              </p>
            </div>

            <div style={{ background: 'var(--surface-2)', padding: '36px', borderRadius: '12px', border: '1px solid var(--line-dark)' }}>
              <h3 style={{ fontSize: '22px', fontWeight: 400, margin: '0 0 12px', color: '#FFFFFF' }}>
                {language === 'ar' ? 'المجتمع والنمو' : 'Community & Growth'}
              </h3>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                {language === 'ar'
                  ? 'ملتقيات أسبوعية، ورش عمل، ولقاءات مع مستثمرين ومؤسسين يقفون في نفس مكانك.'
                  : 'Weekly meetups, workshops, and direct access to investors and peer founders building alongside you.'}
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
