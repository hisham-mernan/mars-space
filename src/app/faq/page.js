'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AnnouncementBar from '@/components/AnnouncementBar';
import { useLanguage } from '@/context/LanguageContext';

export default function FAQPage() {
  const { language, mounted } = useLanguage();
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFaqs() {
      try {
        const res = await fetch('/api/v1/public/faqs/featured');
        const data = await res.json();
        if (data.success && data.data) {
          setFaqs(data.data);
        } else {
          setFaqs([
            {
              id: 'FAQ-01',
              category: 'General',
              question: 'What is included in a Mars Space membership?',
              questionAr: 'ما الذي تشتمل عليه عضوية مارس سبيس؟',
              answer: 'All memberships include 24/7 access to the floor, high-speed symmetric fiber Wi-Fi, unlimited specialty coffee, print/scan credits, prayer room, and member lounge access.',
              answerAr: 'تشمل جميع العضويات دخولاً على مدار الساعة للطابق، إنترنت ألياف ضوئية فائقة السرعة، قهوة مختصة غير محدودة، رصيد طباعة ومسح ضوئي، دخول المصلى واستراحة الأعضاء.'
            },
            {
              id: 'FAQ-02',
              category: 'Bookings',
              question: 'Can non-members book meeting rooms and community space?',
              questionAr: 'هل يمكن لغير الأعضاء حجز قاعات الاجتماعات والقاعة المجتمعية؟',
              answer: 'Yes! Meeting rooms and the community hall are open to both members and visitors at transparent rates.',
              answerAr: 'نعم! قاعات الاجتماعات والقاعة المجتمعية متاحة للأعضاء والزوار بأسعار واضحة ومحددة.'
            }
          ]);
        }
      } catch (err) {
        console.error('Failed to fetch FAQs', err);
      } finally {
        setLoading(false);
      }
    }
    loadFaqs();
  }, []);

  if (!mounted) return null;

  return (
    <>
      <AnnouncementBar />
      <Header />

      <main style={{ minHeight: '100vh', background: 'var(--mars-void)', color: 'var(--text-primary)', paddingTop: '140px', paddingBottom: '120px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--copper-400)', textTransform: 'uppercase' }}>
            {language === 'ar' ? 'الأسئلة الشائعة' : 'FREQUENTLY ASKED QUESTIONS'}
          </span>

          <h1 style={{ fontSize: 'clamp(36px, 4.5vw, 68px)', fontWeight: 200, margin: '16px 0 40px' }}>
            {language === 'ar' ? 'كل ما تحتاج معرفته.' : 'Everything you need to know.'}
          </h1>

          {loading ? (
            <div style={{ color: 'var(--text-muted-dark)', fontSize: '16px', padding: '40px 0' }}>
              {language === 'ar' ? 'جاري تحميل الأسئلة...' : 'Loading questions...'}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {faqs.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--surface-1)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '12px',
                    padding: '28px 32px'
                  }}
                >
                  <h3 style={{ fontSize: '20px', fontWeight: 400, color: '#FFFFFF', margin: '0 0 12px' }}>
                    {language === 'ar' ? (item.questionAr || item.question) : item.question}
                  </h3>
                  <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                    {language === 'ar' ? (item.answerAr || item.answer) : item.answer}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
