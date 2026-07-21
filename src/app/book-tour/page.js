'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function BookTour() {
  const { language, mounted } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredDate, setPreferredDate] = useState('2026-07-20');
  const [preferredTime, setPreferredTime] = useState('10:00');
  const [workspaceInterest, setWorkspaceInterest] = useState('private_office');
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!mounted) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/v1/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          name: fullName,
          email,
          phone,
          preferredDate,
          preferredTime,
          workspaceInterest,
          message: `Tour request for ${workspaceInterest} on ${preferredDate} at ${preferredTime}. Notes: ${notes}`,
          source: 'Website Tour Request Form'
        })
      });

      const json = await res.json();
      if (json.success) {
        setSuccess(true);
      } else {
        alert(json.error?.message || 'Submission failed');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />

      <main style={{ background: 'var(--mars-void)', minHeight: '100vh', paddingTop: '100px', paddingBottom: '120px', boxSizing: 'border-box' }}>
        <div className="container" style={{ maxWidth: '640px' }}>
          
          {success ? (
            /* Success state view */
            <div style={{
              background: 'var(--mars-slate)',
              padding: '48px',
              borderRadius: '8px',
              border: '1px solid var(--line-dark)',
              textAlign: 'center',
              marginTop: '40px',
              animation: 'fadeIn 300ms ease-out'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: 'rgba(200, 107, 60, 0.1)',
                border: '2px solid var(--copper-400)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--copper-400)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 style={{ fontSize: '26px', color: '#FFFFFF', fontWeight: 300 }}>
                {language === 'ar' ? 'تمت جدولة جولتك بنجاح!' : 'Your Tour is Scheduled!'}
              </h2>
              <p style={{ color: 'var(--text-muted-dark)', marginTop: '12px', fontSize: '15px', lineHeight: 1.6 }}>
                {language === 'ar'
                  ? `أهلاً بك، تم حجز جولتك ليوم ${preferredDate} الساعة ${preferredTime}. لقد أرسلنا رسالة تأكيد إلكترونية إلى ${email}.`
                  : `Hello ${fullName}, your tour is confirmed for ${preferredDate} at ${preferredTime}. We have sent a confirmation email to ${email}.`}
              </p>
              <div style={{ marginTop: '32px' }}>
                <a href="/" className="btn-pill-primary" style={{ padding: '12px 28px', fontSize: '14px' }}>
                  {language === 'ar' ? 'العودة للرئيسية' : 'Return Home'}
                </a>
              </div>
            </div>
          ) : (
            /* Input form view */
            <div style={{
              background: 'var(--mars-slate)',
              padding: '40px',
              borderRadius: '8px',
              border: '1px solid var(--line-dark)',
              marginTop: '40px'
            }}>
              <h2 style={{ fontSize: '28px', fontWeight: 300, color: '#FFFFFF', marginBottom: '8px' }}>
                {language === 'ar' ? 'حجز جولة تعريفية' : 'Schedule a Tour'}
              </h2>
              <p style={{ color: 'var(--text-muted-dark)', fontSize: '14px', marginBottom: '32px' }}>
                {language === 'ar'
                  ? 'اكتشف الطابق بنفسك وتعرف على الفروقات والميزات المتاحة قبل التسجيل.'
                  : 'Come explore the floor and see our space, amenities, and available desk configurations before joining.'}
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
                <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>
                  {language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{
                      background: 'var(--mars-void)',
                      border: '1px solid var(--line-dark)',
                      borderRadius: '4px',
                      padding: '12px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>
                    {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        background: 'var(--mars-void)',
                        border: '1px solid var(--line-dark)',
                        borderRadius: '4px',
                        padding: '12px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </label>

                  <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>
                    {language === 'ar' ? 'رقم الهاتف الجوال' : 'Mobile Number'}
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{
                        background: 'var(--mars-void)',
                        border: '1px solid var(--line-dark)',
                        borderRadius: '4px',
                        padding: '12px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>
                    {language === 'ar' ? 'التاريخ المفضل' : 'Preferred Date'}
                    <input
                      type="date"
                      required
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      style={{
                        background: 'var(--mars-void)',
                        border: '1px solid var(--line-dark)',
                        borderRadius: '4px',
                        padding: '12px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </label>

                  <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>
                    {language === 'ar' ? 'الوقت المفضل' : 'Preferred Time'}
                    <select
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                      style={{
                        background: 'var(--mars-void)',
                        border: '1px solid var(--line-dark)',
                        borderRadius: '4px',
                        padding: '12px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="09:00">09:00 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="13:00">01:00 PM</option>
                      <option value="14:00">02:00 PM</option>
                      <option value="15:00">03:00 PM</option>
                    </select>
                  </label>
                </div>

                <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>
                  {language === 'ar' ? 'المساحة التي تهتم بها' : 'Workspace Interest'}
                  <select
                    value={workspaceInterest}
                    onChange={(e) => setWorkspaceInterest(e.target.value)}
                    style={{
                      background: 'var(--mars-void)',
                      border: '1px solid var(--line-dark)',
                      borderRadius: '4px',
                      padding: '12px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="private_office">{language === 'ar' ? 'مكاتب خاصة' : 'Private Office'}</option>
                    <option value="coworking">{language === 'ar' ? 'عمل مشترك' : 'Coworking Space'}</option>
                    <option value="dedicated_desk">{language === 'ar' ? 'مكتب مخصص' : 'Dedicated Desk'}</option>
                    <option value="meeting_room">{language === 'ar' ? 'قاعات اجتماعات' : 'Meeting Room'}</option>
                  </select>
                </label>

                <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>
                  {language === 'ar' ? 'ملاحظات إضافية' : 'Additional Notes'}
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows="3"
                    style={{
                      background: 'var(--mars-void)',
                      border: '1px solid var(--line-dark)',
                      borderRadius: '4px',
                      padding: '12px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-pill-primary"
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: '16px',
                    border: 'none',
                    cursor: 'pointer',
                    marginTop: '12px'
                  }}
                >
                  {submitting 
                    ? (language === 'ar' ? 'جاري الإرسال...' : 'Submitting...')
                    : (language === 'ar' ? 'تأكيد وحجز الجولة' : 'Confirm & Schedule Tour')}
                </button>
              </form>
            </div>
          )}
          
        </div>
      </main>

      <Footer />
    </>
  );
}
