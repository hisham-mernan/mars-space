'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AnnouncementBar from '@/components/AnnouncementBar';
import { useLanguage } from '@/context/LanguageContext';

export default function ContactPage() {
  const { language, t, mounted } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [aboutTopic, setAboutTopic] = useState('tour');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!mounted) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/v1/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, company, aboutTopic, message })
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setErrorMsg(data.error?.message || (language === 'ar' ? 'فشل الإرسال' : 'Failed to send'));
      }
    } catch (err) {
      setErrorMsg(language === 'ar' ? 'خطأ في الشبكة، يُرجى المحاولة مرة أخرى.' : 'Network error, please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnnouncementBar />
      <Header />

      <main style={{ minHeight: '100vh', background: 'var(--mars-void)', color: 'var(--text-primary)', paddingTop: '140px', paddingBottom: '120px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '48px' }}>
            {/* Info side (§10) */}
            <div>
              <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--copper-400)', textTransform: 'uppercase' }}>
                {language === 'ar' ? 'تواصل معنا' : 'CONTACT'}
              </span>

              <h1 style={{ fontSize: 'clamp(36px, 4vw, 56px)', fontWeight: 200, margin: '16px 0 24px' }}>
                {t?.contactPage?.h1 || (language === 'ar' ? 'تفضّل بزيارتنا.' : 'Come and see it.')}
              </h1>

              <p style={{ fontSize: '17px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '40px' }}>
                {t?.contactPage?.sub || (language === 'ar'
                  ? 'الطابق يتّضح أكثر عند زيارته. احجز جولة، أو تواصل معنا مباشرةً.'
                  : 'The floor makes more sense in person. Book a tour, or reach us directly.')}
              </p>

              <div style={{ display: 'grid', gap: '20px', fontSize: '15px', color: '#FFFFFF', padding: '24px', background: 'var(--surface-1)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <div>📍 {language === 'ar' ? '[المبنى، الشارع، الحي]، جدة، المملكة العربية السعودية' : '[Building, street, district], Jeddah, Saudi Arabia'}</div>
                <div>📞 phone [+966 __ ___ ____]</div>
                <div>💬 WhatsApp [____]</div>
                <div>✉️ email [hello@mars.sa]</div>
                <div>⏰ {language === 'ar' ? 'الأحد – الخميس [08:00 – 20:00] · الأعضاء 24/7' : 'Sunday to Thursday [08:00–20:00] · Members 24/7'}</div>
              </div>
            </div>

            {/* Form side (§10) */}
            <div style={{ background: 'var(--surface-1)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '40px' }}>
              {submitted ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: '48px', color: 'var(--status-emerald)', marginBottom: '16px' }}>✓</div>
                  <h3 style={{ fontSize: '24px', fontWeight: 400, color: '#FFFFFF', margin: '0 0 12px' }}>
                    {language === 'ar' ? 'شكراً لك' : 'Thanks'}
                  </h3>
                  <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                    {t?.contactPage?.confirmation || (language === 'ar'
                      ? 'شكراً لك — وصلتنا رسالتك، وسنردّ خلال يوم عملٍ واحد.'
                      : 'Thanks — we\'ve got your message and will reply within one business day.')}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
                  {errorMsg && (
                    <div style={{ background: 'rgba(255,0,0,0.08)', color: '#FF4A4A', padding: '12px', borderRadius: '4px', fontSize: '13px' }}>
                      {errorMsg}
                    </div>
                  )}

                  {/* Name */}
                  <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>
                    {t?.contactPage?.form?.name || (language === 'ar' ? 'الاسم' : 'Name')}
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '12px', color: '#FFFFFF', outline: 'none' }} />
                  </label>

                  {/* Email */}
                  <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>
                    {t?.contactPage?.form?.email || (language === 'ar' ? 'البريد الإلكتروني' : 'Email')}
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '12px', color: '#FFFFFF', outline: 'none' }} />
                  </label>

                  {/* Phone */}
                  <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>
                    {t?.contactPage?.form?.phone || (language === 'ar' ? 'رقم الجوال' : 'Phone')}
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '12px', color: '#FFFFFF', outline: 'none' }} />
                  </label>

                  {/* Company (optional) */}
                  <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>
                    {t?.contactPage?.form?.company || (language === 'ar' ? 'المنشأة (اختياري)' : 'Company (optional)')}
                    <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '12px', color: '#FFFFFF', outline: 'none' }} />
                  </label>

                  {/* What's this about? */}
                  <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>
                    {t?.contactPage?.form?.aboutQuestion || (language === 'ar' ? 'ما موضوع تواصلك؟' : 'What\'s this about?')}
                    <select value={aboutTopic} onChange={(e) => setAboutTopic(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '12px', color: '#FFFFFF', outline: 'none' }}>
                      <option value="tour">{t?.contactPage?.form?.options?.tour || (language === 'ar' ? 'حجز جولة' : 'Book a tour')}</option>
                      <option value="membership">{t?.contactPage?.form?.options?.membership || (language === 'ar' ? 'العضوية' : 'Membership')}</option>
                      <option value="rooms">{t?.contactPage?.form?.options?.rooms || (language === 'ar' ? 'قاعات الاجتماعات' : 'Meeting rooms')}</option>
                      <option value="events">{t?.contactPage?.form?.options?.events || (language === 'ar' ? 'الفعاليات' : 'Events')}</option>
                      <option value="other">{t?.contactPage?.form?.options?.other || (language === 'ar' ? 'موضوع آخر' : 'Something else')}</option>
                    </select>
                  </label>

                  {/* Message */}
                  <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>
                    {t?.contactPage?.form?.message || (language === 'ar' ? 'رسالتك' : 'Message')}
                    <textarea rows="4" required value={message} onChange={(e) => setMessage(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '12px', color: '#FFFFFF', outline: 'none', resize: 'vertical' }} />
                  </label>

                  {/* Send */}
                  <button type="submit" disabled={loading} className="btn-pill-primary" style={{ padding: '14px', fontSize: '15px', border: 'none', cursor: 'pointer', marginTop: '8px' }}>
                    {loading ? (language === 'ar' ? 'جاري الإرسال...' : 'Sending...') : (t?.contactPage?.form?.send || (language === 'ar' ? 'إرسال' : 'Send'))}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
