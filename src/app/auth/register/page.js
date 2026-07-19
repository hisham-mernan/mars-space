'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function Register() {
  const { language, mounted } = useLanguage();
  const [step, setStep] = useState(1);

  // Step 1 Form States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Step 2 OTP States
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(59);

  // Step 3 Profile Onboarding States
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [industry, setIndustry] = useState('tech');
  const [teamSize, setTeamSize] = useState('1-5');
  const [address, setAddress] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [preferredWorkspace, setPreferredWorkspace] = useState('private_office');

  // Countdown timer for OTP
  useEffect(() => {
    if (step !== 2) return;
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, timer]);

  if (!mounted) return null;

  const handleStep1Submit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirmPassword) {
      setErrorMsg(language === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }
    if (!agreeTerms) {
      setErrorMsg(language === 'ar' ? 'يجب عليك الموافقة على الشروط والأحكام' : 'You must accept the terms & conditions');
      return;
    }

    setStep(2);
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleStep2Submit = (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال رمز التحقق كاملاً' : 'Please enter the complete verification code');
      return;
    }
    setStep(3);
  };

  const handleStep3Submit = (e) => {
    e.preventDefault();
    // Save simulated profile updates and login
    localStorage.setItem('mars-user', JSON.stringify({
      id: `usr-${Date.now()}`,
      name: `${firstName} ${lastName}`,
      email,
      company: companyName
    }));
    window.location.href = '/';
  };

  const handleResendOtp = () => {
    setTimer(59);
    setOtp(['', '', '', '', '', '']);
    setErrorMsg('');
  };

  return (
    <>
      <Header />

      <main style={{ minHeight: '90vh', background: 'var(--mars-void)', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '120px', paddingBottom: '120px', boxSizing: 'border-box' }}>
        <div style={{
          background: 'var(--mars-slate)',
          border: '1px solid var(--line-dark)',
          borderRadius: '8px',
          padding: '40px',
          width: '100%',
          maxWidth: '540px',
          boxSizing: 'border-box',
          margin: '0 20px'
        }}>
          {/* Progress bar */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
            <div style={{ flex: 1, height: '4px', background: step >= 1 ? 'var(--mars-copper)' : 'rgba(245,245,245,0.1)', borderRadius: '2px' }} />
            <div style={{ flex: 1, height: '4px', background: step >= 2 ? 'var(--mars-copper)' : 'rgba(245,245,245,0.1)', borderRadius: '2px' }} />
            <div style={{ flex: 1, height: '4px', background: step >= 3 ? 'var(--mars-copper)' : 'rgba(245,245,245,0.1)', borderRadius: '2px' }} />
          </div>

          {errorMsg && (
            <div style={{ background: 'rgba(255, 0, 0, 0.08)', color: '#FF4A4A', padding: '12px', borderRadius: '4px', marginBottom: '24px', fontSize: '13px', fontWeight: 500 }}>
              {errorMsg}
            </div>
          )}

          {/* STEP 1: CREATE ACCOUNT */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} style={{ display: 'grid', gap: '20px' }}>
              <h2 style={{ fontSize: '26px', fontWeight: 300, color: '#FFFFFF', margin: 0 }}>
                {language === 'ar' ? 'إنشاء حساب جديد' : 'Create Account'}
              </h2>
              <p style={{ color: 'var(--text-muted-dark)', fontSize: '14px', margin: '0 0 12px' }}>
                {language === 'ar' ? 'الخطوة الأولى: أدخل تفاصيل حسابك الشخصي للبدء.' : 'Step 1: Enter your personal account details to get started.'}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)' }}>
                  {language === 'ar' ? 'الاسم الأول' : 'First Name'}
                  <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '12px', color: '#FFFFFF', outline: 'none' }} />
                </label>
                <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)' }}>
                  {language === 'ar' ? 'اسم العائلة' : 'Last Name'}
                  <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '12px', color: '#FFFFFF', outline: 'none' }} />
                </label>
              </div>

              <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)' }}>
                {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '12px', color: '#FFFFFF', outline: 'none' }} />
              </label>

              <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)' }}>
                {language === 'ar' ? 'رقم الهاتف الجوال' : 'Mobile Number'}
                <input type="tel" required value={mobile} onChange={(e) => setMobile(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '12px', color: '#FFFFFF', outline: 'none' }} />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)' }}>
                  {language === 'ar' ? 'كلمة المرور' : 'Password'}
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '12px', color: '#FFFFFF', outline: 'none' }} />
                </label>
                <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)' }}>
                  {language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                  <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '12px', color: '#FFFFFF', outline: 'none' }} />
                </label>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer', color: 'var(--text-muted-dark)' }}>
                <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
                {language === 'ar' ? 'أوافق على الشروط والأحكام وسياسة الخصوصية' : 'I agree to the Terms & Conditions and Privacy Policy'}
              </label>

              <button type="submit" className="btn-pill-primary" style={{ width: '100%', padding: '14px', fontSize: '15px', border: 'none', cursor: 'pointer', marginTop: '12px' }}>
                {language === 'ar' ? 'متابعة وتأكيد الجوال' : 'Continue & Verify'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: 'var(--text-muted-dark)' }}>
                {language === 'ar' ? 'لديك حساب بالفعل؟ ' : 'Already have an account? '}
                <a href="/auth/login" style={{ color: 'var(--copper-400)', fontWeight: 600 }}>
                  {language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
                </a>
              </div>
            </form>
          )}

          {/* STEP 2: VERIFY OTP */}
          {step === 2 && (
            <form onSubmit={handleStep2Submit} style={{ display: 'grid', gap: '24px' }}>
              <h2 style={{ fontSize: '26px', fontWeight: 300, color: '#FFFFFF', margin: 0 }}>
                {language === 'ar' ? 'رمز التحقق (OTP)' : 'Verify Identity'}
              </h2>
              <p style={{ color: 'var(--text-muted-dark)', fontSize: '14px', margin: 0 }}>
                {language === 'ar' 
                  ? `أدخل رمز التحقق المكون من 6 أرقام المرسل إلى الهاتف ${mobile}` 
                  : `Please enter the 6-digit verification code sent to your mobile number ${mobile}`}
              </p>

              {/* 6 code inputs grid */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    style={{
                      width: '56px',
                      height: '56px',
                      background: 'var(--mars-void)',
                      border: '1px solid var(--line-dark)',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      textAlign: 'center',
                      fontSize: '22px',
                      fontWeight: 700,
                      outline: 'none'
                    }}
                  />
                ))}
              </div>

              {/* Timer/Resend */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-muted-dark)' }}>
                {timer > 0 ? (
                  <span>{language === 'ar' ? `إعادة الإرسال خلال ${timer} ثانية` : `Resend code in ${timer}s`}</span>
                ) : (
                  <button type="button" onClick={handleResendOtp} style={{ background: 'none', border: 'none', color: 'var(--copper-400)', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                    {language === 'ar' ? 'إعادة إرسال الرمز' : 'Resend Verification Code'}
                  </button>
                )}
                <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted-dark)', cursor: 'pointer', padding: 0 }}>
                  {language === 'ar' ? 'تعديل الرقم' : 'Edit Mobile'}
                </button>
              </div>

              <button type="submit" className="btn-pill-primary" style={{ width: '100%', padding: '14px', fontSize: '15px', border: 'none', cursor: 'pointer' }}>
                {language === 'ar' ? 'تأكيد الرمز والمتابعة' : 'Verify Code & Proceed'}
              </button>
            </form>
          )}

          {/* STEP 3: PROGRESSIVE PROFILE ONBOARDING */}
          {step === 3 && (
            <form onSubmit={handleStep3Submit} style={{ display: 'grid', gap: '20px' }}>
              <h2 style={{ fontSize: '26px', fontWeight: 300, color: '#FFFFFF', margin: 0 }}>
                {language === 'ar' ? 'إعداد ملفك التعريفي' : 'Complete Your Profile'}
              </h2>
              <p style={{ color: 'var(--text-muted-dark)', fontSize: '14px', margin: 0 }}>
                {language === 'ar' 
                  ? 'الخطوة الأخيرة: شاركنا بعض التفاصيل عن عملك لتخصيص تجربتك في مارس سبيس.' 
                  : 'Step 3: Tell us a bit about your business to customize your Mars Space workspace experience.'}
              </p>

              <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)' }}>
                {language === 'ar' ? 'اسم الشركة / المنشأة' : 'Company Name'}
                <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '12px', color: '#FFFFFF', outline: 'none' }} />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)' }}>
                  {language === 'ar' ? 'المسمى الوظيفي' : 'Job Title'}
                  <input type="text" required value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '12px', color: '#FFFFFF', outline: 'none' }} />
                </label>

                <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)' }}>
                  {language === 'ar' ? 'قطاع العمل' : 'Industry'}
                  <select value={industry} onChange={(e) => setIndustry(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '12px', color: '#FFFFFF', outline: 'none', cursor: 'pointer' }}>
                    <option value="tech">Technology / IT</option>
                    <option value="finance">Finance & Investment</option>
                    <option value="creative">Creative & Design</option>
                    <option value="consulting">Professional Consulting</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)' }}>
                  {language === 'ar' ? 'حجم فريق العمل' : 'Team Size'}
                  <select value={teamSize} onChange={(e) => setTeamSize(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '12px', color: '#FFFFFF', outline: 'none', cursor: 'pointer' }}>
                    <option value="1">1 Person (Freelancer)</option>
                    <option value="1-5">2-5 People</option>
                    <option value="6-15">6-15 People</option>
                    <option value="15+">15+ People</option>
                  </select>
                </label>

                <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)' }}>
                  {language === 'ar' ? 'مساحة العمل المفضلة' : 'Preferred Space'}
                  <select value={preferredWorkspace} onChange={(e) => setPreferredWorkspace(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '12px', color: '#FFFFFF', outline: 'none', cursor: 'pointer' }}>
                    <option value="private_office">Private Office</option>
                    <option value="coworking">Coworking Space</option>
                    <option value="dedicated_desk">Dedicated Desk</option>
                  </select>
                </label>
              </div>

              <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)' }}>
                {language === 'ar' ? 'الرقم الضريبي (إن وجد)' : 'VAT/Tax Number (Optional)'}
                <input type="text" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '12px', color: '#FFFFFF', outline: 'none' }} />
              </label>

              <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)' }}>
                {language === 'ar' ? 'عنوان العمل التجاري' : 'Business Address'}
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '12px', color: '#FFFFFF', outline: 'none' }} />
              </label>

              <button type="submit" className="btn-pill-primary" style={{ width: '100%', padding: '16px', fontSize: '16px', border: 'none', cursor: 'pointer', marginTop: '12px' }}>
                {language === 'ar' ? 'إكمال وتفعيل الحساب' : 'Complete Setup & Login'}
              </button>
            </form>
          )}

        </div>
      </main>

      <Footer />
    </>
  );
}
