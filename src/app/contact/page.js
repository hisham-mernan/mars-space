'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AnnouncementBar from '@/components/AnnouncementBar';
import { useLanguage } from '@/context/LanguageContext';

export default function ContactPage() {
  const { language, mounted } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
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
        body: JSON.stringify({ name, email, phone, message })
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setErrorMsg(data.error?.message || (language === 'ar' ? 'فشل الإرسال' : 'Failed to send'));
      }
    } catch (err) {
      setErrorMsg('Network error, please try again.');
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
            {/* Info side */}
            <div>
              <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--copper-400)', textTransform: 'uppercase' }}>
                {language === 'ar' ? 'تواصل معنا' : 'GET IN TOUCH'}
              </span>

              <h1 style={{ fontSize: 'clamp(36px, 4vw, 56px)', fontWeight: 200, margin: '16px 0 24px' }}>
                {language === 'ar' ? 'نحن هنا لمساعدتك.' : 'We are here to help.'}
              </h1>

              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '40px' }}>
                {language === 'ar'
                  ? 'سواء كنت تبحث عن مكتب خاص لشركتك، قاعة اجتماعات، أو ترغب في تنظيم فعالية في القاعة المجتمعية، تواصل معنا فوراً.'
                  : 'Whether looking for a private office, meeting room, or planning a community event, reach out to our floor team.'}
              </p>

              <div style={{ display: 'grid', gap: '20px', fontSize: '15px', color: '#FFFFFF' }}>
                <div>📍 {language === 'ar' ? 'برج جدة، طريق الملك عبدالعزيز، جدة' : 'Jeddah Tower, King Abdulaziz Rd, Jeddah'}</div>
                <div>📞 +966 12 600 0000</div>
                <div>✉️ hello@mars.sa</div>
                <div>⏰ {language === 'ar' ? 'الأحد - الخميس: ٨ ص - ٨ م (24/7 للأعضاء)' : 'Sun - Thu: 8 AM - 8 PM (24/7 for members)'}</div>
              </div>
            </div>

            {/* Form side */}
            <div style={{ background: 'var(--surface-1)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '40px' }}>
              {submitted ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: '48px', color: 'var(--status-emerald)', marginBottom: '16px' }}>✓</div>
                  <h3 style={{ fontSize: '24px', fontWeight: 400, color: '#FFFFFF', margin: '0 0 12px' }}>
                    {language === 'ar' ? 'تم استلام رسالتك بنجاح!' : 'Message Received!'}
                  </h3>
                  <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: 0 }}>
                    {language === 'ar' ? 'سيتواصل معك فريقنا خلال يوم عمل واحد.' : 'Our floor team will reach out within one business day.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
                  {errorMsg && (
                    <div style={{ background: 'rgba(255,0,0,0.08)', color: '#FF4A4A', padding: '12px', borderRadius: '4px', fontSize: '13px' }}>
                      {errorMsg}
                    </div>
                  )}

                  <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>
                    {language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '12px', color: '#FFFFFF', outline: 'none' }} />
                  </label>

                  <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>
                    {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '12px', color: '#FFFFFF', outline: 'none' }} />
                  </label>

                  <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>
                    {language === 'ar' ? 'رقم الجوال' : 'Phone Number'}
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '12px', color: '#FFFFFF', outline: 'none' }} />
                  </label>

                  <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>
                    {language === 'ar' ? 'الرسالة / الاستفسار' : 'Message'}
                    <textarea rows="4" required value={message} onChange={(e) => setMessage(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '12px', color: '#FFFFFF', outline: 'none', resize: 'vertical' }} />
                  </label>

                  <button type="submit" disabled={loading} className="btn-pill-primary" style={{ padding: '14px', fontSize: '15px', border: 'none', cursor: 'pointer', marginTop: '8px' }}>
                    {loading ? (language === 'ar' ? 'جاري الإرسال...' : 'Sending...') : (language === 'ar' ? 'إرسال الرسالة' : 'Send Message')}
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
