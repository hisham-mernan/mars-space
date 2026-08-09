'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AnnouncementBar from '@/components/AnnouncementBar';
import { useLanguage } from '@/context/LanguageContext';

export default function ContactPage() {
  const { language, t, mounted } = useLanguage();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [helpTopic, setHelpTopic] = useState('Workspace / مساحة عمل');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!mounted) return null;

  const ct = t?.contactSection || {};
  const fields = ct.fields || {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/v1/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, company, email, phone, helpTopic, message })
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

      <main style={{ minHeight: '100vh', background: '#07070A', color: '#F5F3EF', paddingTop: '140px', paddingBottom: '120px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '56px' }}>
            
            {/* Info side */}
            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', color: '#C86B3C', textTransform: 'uppercase' }}>
                {ct.cta}
              </span>

              <h1 style={{ fontSize: 'clamp(40px, 5vw, 76px)', fontWeight: 300, margin: '20px 0 24px', letterSpacing: '-0.02em' }}>
                {ct.headline}
              </h1>

              <p style={{ fontSize: '18px', fontWeight: 300, color: 'rgba(245, 243, 239, 0.75)', lineHeight: 1.7, marginBottom: '40px' }}>
                {ct.body}
              </p>

              <div style={{ display: 'grid', gap: '16px', fontSize: '15px', color: 'rgba(245, 243, 239, 0.7)', padding: '24px', background: '#111116', borderRadius: '12px', border: '1px solid rgba(245, 243, 239, 0.08)' }}>
                <div>📍 {language === 'ar' ? 'جدة، المملكة العربية السعودية' : 'Jeddah, Saudi Arabia'}</div>
                <div>✉️ hello@mars.sa</div>
                <div>📞 +966 12 600 0000</div>
              </div>
            </div>

            {/* Form side (§18) */}
            <div style={{ background: '#111116', border: '1px solid rgba(245, 243, 239, 0.08)', borderRadius: '12px', padding: '40px' }}>
              {submitted ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: '48px', color: '#10B981', marginBottom: '16px' }}>✓</div>
                  <h3 style={{ fontSize: '24px', fontWeight: 300, color: '#F5F3EF', margin: '0 0 12px' }}>
                    {language === 'ar' ? 'شكراً لك' : 'Thank you'}
                  </h3>
                  <p style={{ fontSize: '15px', color: 'rgba(245, 243, 239, 0.65)', margin: 0, lineHeight: 1.6 }}>
                    {language === 'ar' ? 'وصلتنا رسالتك وسيتواصل معك فريقنا قريباً.' : 'We have received your message and our team will get in touch shortly.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
                  {errorMsg && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: '12px', borderRadius: '4px', fontSize: '13px' }}>
                      {errorMsg}
                    </div>
                  )}

                  {/* Full Name */}
                  <label style={{ display: 'grid', gap: '8px', fontSize: '14px', color: 'rgba(245, 243, 239, 0.8)', fontWeight: 500 }}>
                    {fields.name}
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} style={{ background: '#07070A', border: '1px solid rgba(245, 243, 239, 0.12)', borderRadius: '6px', padding: '12px', color: '#F5F3EF', outline: 'none' }} />
                  </label>

                  {/* Company */}
                  <label style={{ display: 'grid', gap: '8px', fontSize: '14px', color: 'rgba(245, 243, 239, 0.8)', fontWeight: 500 }}>
                    {fields.company}
                    <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} style={{ background: '#07070A', border: '1px solid rgba(245, 243, 239, 0.12)', borderRadius: '6px', padding: '12px', color: '#F5F3EF', outline: 'none' }} />
                  </label>

                  {/* Email */}
                  <label style={{ display: 'grid', gap: '8px', fontSize: '14px', color: 'rgba(245, 243, 239, 0.8)', fontWeight: 500 }}>
                    {fields.email}
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ background: '#07070A', border: '1px solid rgba(245, 243, 239, 0.12)', borderRadius: '6px', padding: '12px', color: '#F5F3EF', outline: 'none' }} />
                  </label>

                  {/* Phone */}
                  <label style={{ display: 'grid', gap: '8px', fontSize: '14px', color: 'rgba(245, 243, 239, 0.8)', fontWeight: 500 }}>
                    {fields.phone}
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ background: '#07070A', border: '1px solid rgba(245, 243, 239, 0.12)', borderRadius: '6px', padding: '12px', color: '#F5F3EF', outline: 'none' }} />
                  </label>

                  {/* What can we help you with? */}
                  <label style={{ display: 'grid', gap: '8px', fontSize: '14px', color: 'rgba(245, 243, 239, 0.8)', fontWeight: 500 }}>
                    {fields.helpTopic}
                    <input type="text" value={helpTopic} onChange={(e) => setHelpTopic(e.target.value)} style={{ background: '#07070A', border: '1px solid rgba(245, 243, 239, 0.12)', borderRadius: '6px', padding: '12px', color: '#F5F3EF', outline: 'none' }} />
                  </label>

                  {/* Message */}
                  <label style={{ display: 'grid', gap: '8px', fontSize: '14px', color: 'rgba(245, 243, 239, 0.8)', fontWeight: 500 }}>
                    {fields.message}
                    <textarea rows="4" required value={message} onChange={(e) => setMessage(e.target.value)} style={{ background: '#07070A', border: '1px solid rgba(245, 243, 239, 0.12)', borderRadius: '6px', padding: '12px', color: '#F5F3EF', outline: 'none', resize: 'vertical' }} />
                  </label>

                  {/* Send Button */}
                  <button type="submit" disabled={loading} style={{ background: '#8A4120', color: '#FFFFFF', border: 'none', borderRadius: '999px', padding: '16px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', marginTop: '8px' }}>
                    {loading ? (language === 'ar' ? 'جاري الإرسال...' : 'Sending...') : ct.sendBtn}
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
