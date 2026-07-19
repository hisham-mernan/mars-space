'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function Login() {
  const { language, mounted } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!mounted) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      if (email === 'ahmed@example.com' && password === 'password') {
        // Success
        localStorage.setItem('mars-user', JSON.stringify({ id: 'usr-01', name: 'Ahmed Alharbi', email: 'ahmed@example.com' }));
        window.location.href = '/';
      } else {
        setErrorMsg(language === 'ar' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password');
      }
    } catch (err) {
      setErrorMsg('Network error, please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />

      <main style={{ minHeight: '90vh', background: 'var(--mars-void)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', paddingTop: '80px', boxSizing: 'border-box' }}>
        
        {/* Left Side (Desktop): Lifestyle image */}
        <div style={{
          position: 'relative',
          backgroundImage: 'url(/assets/photo-coworking.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '60px 48px',
          boxSizing: 'border-box'
        }} className="login-hero-side">
          {/* dark overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11,11,15,0.92) 0%, rgba(11,11,15,0.4) 100%)', zIndex: 1 }} />
          
          <div style={{ position: 'relative', zIndex: 2 }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--copper-400)', letterSpacing: '0.1em' }}>
              {language === 'ar' ? 'مرحبًا بك مجددًا' : 'WELCOME BACK'}
            </span>
            <h1 style={{ fontSize: '32px', fontWeight: 200, color: '#FFFFFF', margin: '8px 0 0' }}>
              {language === 'ar' ? 'مرحباً بك في مساحتك الإبداعية.' : 'Welcome back to your workspace.'}
            </h1>
          </div>
        </div>

        {/* Right Side: Login Form with glassmorphism card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px clamp(24px, 5vw, 64px)',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: 'var(--mars-slate)',
            border: '1px solid var(--line-dark)',
            borderRadius: '8px',
            padding: '40px',
            width: '100%',
            maxWidth: '440px',
            boxSizing: 'border-box'
          }}>
            <h2 style={{ fontSize: '26px', fontWeight: 300, color: '#FFFFFF', margin: '0 0 8px' }}>
              {language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
            </h2>
            <p style={{ color: 'var(--text-muted-dark)', fontSize: '14px', margin: '0 0 32px' }}>
              {language === 'ar' ? 'أدخل تفاصيل حسابك للوصول إلى لوحة التحكم.' : 'Enter your credential details to access your portal.'}
            </p>

            {errorMsg && (
              <div style={{ background: 'rgba(255, 0, 0, 0.08)', color: '#FF4A4A', padding: '12px', borderRadius: '4px', marginBottom: '24px', fontSize: '13px', fontWeight: 500 }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'grid', gap: '20px' }}>
              <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>
                {language === 'ar' ? 'البريد الإلكتروني' : 'Email address'}
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
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{language === 'ar' ? 'كلمة المرور' : 'Password'}</span>
                  <a href="/auth/forgot-password" style={{ color: 'var(--copper-400)', fontSize: '12px' }}>
                    {language === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
                  </a>
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer', color: 'var(--text-muted-dark)' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                {language === 'ar' ? 'تذكرني على هذا الجهاز' : 'Remember me on this device'}
              </label>

              <button
                type="submit"
                disabled={loading}
                className="btn-pill-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '15px',
                  border: 'none',
                  cursor: 'pointer',
                  marginTop: '8px'
                }}
              >
                {loading ? (language === 'ar' ? 'جاري التحقق...' : 'Verifying...') : (language === 'ar' ? 'تسجيل الدخول' : 'Sign In')}
              </button>
            </form>

            {/* Social logins */}
            <div style={{ textAlign: 'center', margin: '24px 0 16px', fontSize: '13px', color: 'var(--text-muted-dark)' }}>
              {language === 'ar' ? 'أو سجل الدخول بواسطة' : 'OR CONTINUE WITH'}
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              <button style={{
                background: 'none',
                border: '1px solid var(--line-dark)',
                borderRadius: '999px',
                padding: '12px',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}>
                Google
              </button>
              <button style={{
                background: 'none',
                border: '1px solid var(--line-dark)',
                borderRadius: '999px',
                padding: '12px',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}>
                Apple
              </button>
            </div>

            {/* Register link */}
            <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '14px', color: 'var(--text-muted-dark)' }}>
              {language === 'ar' ? 'ليس لديك حساب؟ ' : "Don't have an account? "}
              <a href="/auth/register" style={{ color: 'var(--copper-400)', fontWeight: 600 }}>
                {language === 'ar' ? 'إنشاء حساب جديد' : 'Register now'}
              </a>
            </div>

          </div>
        </div>

      </main>

      <Footer />
      
      <style jsx>{`
        @media (max-width: 768px) {
          .login-hero-side {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
