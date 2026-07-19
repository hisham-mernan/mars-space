'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ForgotPassword() {
  const { language, mounted } = useLanguage();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!mounted) return null;

  const handleStep1Submit = (e) => {
    e.preventDefault();
    if (!email) return;
    setStep(2);
  };

  const handleStep2Submit = (e) => {
    e.preventDefault();
    if (!otp) return;
    setStep(3);
  };

  const handleStep3Submit = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg(language === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }
    setStep(4);
  };

  return (
    <>
      <Header />

      <main style={{ minHeight: '90vh', background: 'var(--mars-void)', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '100px', paddingBottom: '100px', boxSizing: 'border-box' }}>
        <div style={{
          background: 'var(--mars-slate)',
          border: '1px solid var(--line-dark)',
          borderRadius: '8px',
          padding: '40px',
          width: '100%',
          maxWidth: '440px',
          boxSizing: 'border-box',
          margin: '0 20px'
        }}>
          
          {errorMsg && (
            <div style={{ background: 'rgba(255, 0, 0, 0.08)', color: '#FF4A4A', padding: '12px', borderRadius: '4px', marginBottom: '24px', fontSize: '13px', fontWeight: 500 }}>
              {errorMsg}
            </div>
          )}

          {/* STEP 1: Enter Email */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} style={{ display: 'grid', gap: '20px' }}>
              <h2 style={{ fontSize: '26px', fontWeight: 300, color: '#FFFFFF', margin: 0 }}>
                {language === 'ar' ? 'استعادة كلمة المرور' : 'Reset Password'}
              </h2>
              <p style={{ color: 'var(--text-muted-dark)', fontSize: '14px', margin: 0 }}>
                {language === 'ar' ? 'أدخل بريدك الإلكتروني وسنرسل لك رمز تحقق.' : 'Enter your registered email address to receive a recovery OTP code.'}
              </p>

              <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)' }}>
                {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                <input
                  type="email"
                  required
                  placeholder="ahmed@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    background: 'var(--mars-void)',
                    border: '1px solid var(--line-dark)',
                    borderRadius: '4px',
                    padding: '12px',
                    color: '#FFFFFF',
                    outline: 'none'
                  }}
                />
              </label>

              <button type="submit" className="btn-pill-primary" style={{ width: '100%', padding: '14px', fontSize: '15px', border: 'none', cursor: 'pointer', marginTop: '8px' }}>
                {language === 'ar' ? 'إرسال رمز التحقق' : 'Send Recovery OTP'}
              </button>
            </form>
          )}

          {/* STEP 2: Enter OTP */}
          {step === 2 && (
            <form onSubmit={handleStep2Submit} style={{ display: 'grid', gap: '20px' }}>
              <h2 style={{ fontSize: '26px', fontWeight: 300, color: '#FFFFFF', margin: 0 }}>
                {language === 'ar' ? 'أدخل رمز التحقق' : 'Enter OTP Code'}
              </h2>
              <p style={{ color: 'var(--text-muted-dark)', fontSize: '14px', margin: 0 }}>
                {language === 'ar' ? `تم إرسال رمز التحقق إلى بريدك ${email}` : `Verification recovery code has been sent to ${email}`}
              </p>

              <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)' }}>
                {language === 'ar' ? 'رمز التحقق (6 أرقام)' : 'Verification Code (6-digits)'}
                <input
                  type="text"
                  required
                  maxLength="6"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  style={{
                    background: 'var(--mars-void)',
                    border: '1px solid var(--line-dark)',
                    borderRadius: '4px',
                    padding: '12px',
                    color: '#FFFFFF',
                    textAlign: 'center',
                    fontSize: '18px',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
              </label>

              <button type="submit" className="btn-pill-primary" style={{ width: '100%', padding: '14px', fontSize: '15px', border: 'none', cursor: 'pointer', marginTop: '8px' }}>
                {language === 'ar' ? 'تأكيد الرمز' : 'Verify & Continue'}
              </button>
            </form>
          )}

          {/* STEP 3: Enter New Password */}
          {step === 3 && (
            <form onSubmit={handleStep3Submit} style={{ display: 'grid', gap: '20px' }}>
              <h2 style={{ fontSize: '26px', fontWeight: 300, color: '#FFFFFF', margin: 0 }}>
                {language === 'ar' ? 'كلمة المرور الجديدة' : 'Set New Password'}
              </h2>
              <p style={{ color: 'var(--text-muted-dark)', fontSize: '14px', margin: 0 }}>
                {language === 'ar' ? 'يرجى إدخال كلمة مرور جديدة قوية لحسابك.' : 'Enter your new strong password below to complete recovery.'}
              </p>

              <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)' }}>
                {language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    background: 'var(--mars-void)',
                    border: '1px solid var(--line-dark)',
                    borderRadius: '4px',
                    padding: '12px',
                    color: '#FFFFFF',
                    outline: 'none'
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)' }}>
                {language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm New Password'}
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    background: 'var(--mars-void)',
                    border: '1px solid var(--line-dark)',
                    borderRadius: '4px',
                    padding: '12px',
                    color: '#FFFFFF',
                    outline: 'none'
                  }}
                />
              </label>

              <button type="submit" className="btn-pill-primary" style={{ width: '100%', padding: '14px', fontSize: '15px', border: 'none', cursor: 'pointer', marginTop: '8px' }}>
                {language === 'ar' ? 'حفظ كلمة المرور الجديدة' : 'Save New Password'}
              </button>
            </form>
          )}

          {/* STEP 4: Success state */}
          {step === 4 && (
            <div style={{ textAlign: 'center' }}>
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
                {language === 'ar' ? 'تم تغيير كلمة المرور!' : 'Password Updated!'}
              </h2>
              
              <p style={{ color: 'var(--text-muted-dark)', marginTop: '12px', fontSize: '15px', lineHeight: 1.6 }}>
                {language === 'ar'
                  ? 'لقد تم حفظ كلمة المرور بنجاح. يمكنك الآن الانتقال لتسجيل الدخول.'
                  : 'Your account password has been updated. You can now continue to login page.'}
              </p>

              <div style={{ marginTop: '32px' }}>
                <a href="/auth/login" className="btn-pill-primary" style={{ padding: '12px 28px', fontSize: '14px' }}>
                  {language === 'ar' ? 'الانتقال لتسجيل الدخول' : 'Go to Login'}
                </a>
              </div>
            </div>
          )}

        </div>
      </main>

      <Footer />
    </>
  );
}
