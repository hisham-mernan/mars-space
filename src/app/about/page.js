'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AnnouncementBar from '@/components/AnnouncementBar';
import { useLanguage } from '@/context/LanguageContext';

export default function AboutPage() {
  const { language, t, mounted } = useLanguage();
  if (!mounted) return null;

  const valuesList = t?.aboutPage?.values || [
    { name: 'Discipline', arName: 'الانضباط', line: language === 'ar' ? 'الانضباط — معيارٌ واحد، يُحافظ عليه كل يوم' : 'Discipline — one standard, held every day' },
    { name: 'Ownership', arName: 'المسؤولية', line: language === 'ar' ? 'المسؤولية — نتعامل مع الطابق كأنه ملكنا' : 'Ownership — we treat the floor as our own' },
    { name: 'Care', arName: 'العناية', line: language === 'ar' ? 'العناية — التفاصيل هي الأساس، لا أمرٌ ثانوي' : 'Care — the details are the point, not an afterthought' },
    { name: 'Vision', arName: 'الرؤية', line: language === 'ar' ? 'الرؤية — مساحةٌ مبنيةٌ لما هو قادم' : 'Vision — a workspace built for what\'s next' }
  ];

  return (
    <>
      <AnnouncementBar />
      <Header />

      <main style={{ minHeight: '100vh', background: 'var(--mars-void)', color: 'var(--text-primary)', paddingTop: '140px', paddingBottom: '120px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--copper-400)', textTransform: 'uppercase' }}>
            {language === 'ar' ? 'عن مارس سبيس' : 'ABOUT MARS SPACE'}
          </span>

          <h1 style={{ fontSize: 'clamp(36px, 5vw, 76px)', fontWeight: 300, lineHeight: 1.1, margin: '16px 0 24px' }}>
            {t?.aboutPage?.h1 || (language === 'ar' ? 'طابقٌ يُدار كشركة، لا كردهة.' : 'A floor run like a company, not a lobby.')}
          </h1>

          {/* Intro Section (§9) */}
          <div style={{ padding: '36px', background: 'var(--surface-1)', border: '1px solid var(--glass-border)', borderRadius: '12px', marginBottom: '48px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--copper-400)', margin: '0 0 12px' }}>
              {language === 'ar' ? 'عن مارس سبيس' : 'About Mars Space'}
            </h2>
            <p style={{ fontSize: 'clamp(17px, 1.5vw, 20px)', fontWeight: 300, color: '#FFFFFF', lineHeight: 1.7, margin: 0 }}>
              {t?.aboutPage?.intro || (language === 'ar'
                ? 'مارس سبيس مساحة عملٍ منتقاة في جدة، بناها ويدعمها مارس فينتشرز. نحافظ على طابقٍ واحدٍ بمعيارٍ واحد — مساحاتٌ مختارة، وتفاصيل مدروسة، وفريقٌ يتعامل مع يوم عملك بالجدية نفسها التي تتعامل بها.'
                : 'Mars Space is a curated workspace in Jeddah, built and backed by Mars Ventures. We keep one floor to a single standard — chosen spaces, considered details, and a team that treats your working day as seriously as you do.')}
            </p>
          </div>

          {/* Vision & Mission Grid (§9) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', marginBottom: '64px' }}>
            <div style={{ background: 'var(--surface-2)', padding: '36px', borderRadius: '12px', border: '1px solid var(--line-dark)' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--copper-400)', textTransform: 'uppercase' }}>
                {language === 'ar' ? 'الرؤية' : 'VISION'}
              </span>
              <h3 style={{ fontSize: '22px', fontWeight: 400, margin: '12px 0 12px', color: '#FFFFFF' }}>
                {language === 'ar' ? 'أن نضع المعيار' : 'Set the Standard'}
              </h3>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                {t?.aboutPage?.vision || (language === 'ar'
                  ? 'أن نضع المعيار لما يمكن أن تكون عليه مساحة العمل — مدروسة، واحترافية، ومبنية فعلاً حول من يستخدمها.'
                  : 'To set the standard for what a workspace can be — considered, professional, and genuinely built around the people who use it.')}
              </p>
            </div>

            <div style={{ background: 'var(--surface-2)', padding: '36px', borderRadius: '12px', border: '1px solid var(--line-dark)' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--copper-400)', textTransform: 'uppercase' }}>
                {language === 'ar' ? 'الرسالة' : 'MISSION'}
              </span>
              <h3 style={{ fontSize: '22px', fontWeight: 400, margin: '12px 0 12px', color: '#FFFFFF' }}>
                {language === 'ar' ? 'انضباط بناء المشاريع' : 'Venture Builder Discipline'}
              </h3>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                {t?.aboutPage?.mission || (language === 'ar'
                  ? 'نُدير طابقاً واحداً منتقى بانضباط شركةٍ لبناء المشاريع — لتكون المساحة والتفاصيل والخدمة مُدارة، وتضع تركيزك حيث ينبغي: على العمل.'
                  : 'We run one curated floor with the discipline of a venture builder — so the space, the details and the service are handled, and you can put your attention where it belongs: on the work.')}
              </p>
            </div>
          </div>

          {/* Core Values (§9) */}
          <h2 style={{ fontSize: '28px', fontWeight: 300, color: '#FFFFFF', marginBottom: '24px' }}>
            {language === 'ar' ? 'القيم الأساسية' : 'Core Values'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {valuesList.map((val, vIdx) => (
              <div key={vIdx} style={{ background: 'var(--surface-1)', border: '1px solid var(--glass-border)', padding: '28px', borderRadius: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--copper-400)', marginBottom: '8px' }}>0{vIdx + 1}</div>
                <h4 style={{ fontSize: '18px', fontWeight: 500, color: '#FFFFFF', margin: '0 0 8px' }}>{language === 'ar' ? (val.arName || val.name) : val.name}</h4>
                <p style={{ fontSize: '14px', color: 'var(--text-muted-dark)', lineHeight: 1.6, margin: 0 }}>{val.line}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
