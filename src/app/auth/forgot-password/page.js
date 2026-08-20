'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

/**
 * Password reset request.
 *
 * The previous version was a four-step mock — email, then an OTP field, then a
 * new password — with no backend behind any of it; every step just advanced a
 * counter. Supabase resets by emailing a single-use link, so the real flow has
 * two states: ask for the address, then tell the member to check their inbox.
 * The link lands on /auth/callback, which exchanges it for a session and sends
 * them to /auth/set-password.
 */
export default function ForgotPassword() {
  const { language, mounted } = useLanguage();
  const isAr = language === 'ar';

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!mounted) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setErrorMsg('');

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/set-password`,
    });

    setLoading(false);

    // Rate limiting is the only failure worth surfacing. Anything else —
    // including "no such account" — reports success, because a different
    // response for unknown addresses would confirm who is a member here.
    if (error && error.status === 429) {
      setErrorMsg(
        isAr
          ? 'محاولات كثيرة. انتظر قليلاً ثم حاول مرة أخرى.'
          : 'Too many attempts. Please wait a moment and try again.'
      );
      return;
    }

    setSent(true);
  };

  return (
    <>
      <Header />

      <main
        style={{
          minHeight: '90vh',
          background: 'var(--mars-void)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '100px',
          paddingBottom: '100px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            background: 'var(--mars-slate)',
            border: '1px solid var(--line-dark)',
            borderRadius: '8px',
            padding: '40px',
            width: '100%',
            maxWidth: '440px',
            boxSizing: 'border-box',
            margin: '0 20px',
          }}
        >
          {errorMsg && (
            <div
              role="alert"
              style={{
                background: 'rgba(255, 0, 0, 0.08)',
                color: '#FF4A4A',
                padding: '12px',
                borderRadius: '4px',
                marginBottom: '24px',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              {errorMsg}
            </div>
          )}

          {!sent ? (
            <>
              <h1
                style={{
                  fontSize: '26px',
                  fontWeight: 300,
                  color: '#FFFFFF',
                  marginBottom: '12px',
                }}
              >
                {isAr ? 'استعادة كلمة المرور' : 'Reset your password'}
              </h1>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.8,
                  marginBottom: '32px',
                }}
              >
                {isAr
                  ? 'أدخل بريدك الإلكتروني وسنرسل لك رابطاً لتعيين كلمة مرور جديدة.'
                  : 'Enter your email and we will send you a link to set a new password.'}
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label
                    htmlFor="email"
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--text-muted-dark)',
                      marginBottom: '8px',
                      display: 'block',
                    }}
                  >
                    {isAr ? 'البريد الإلكتروني' : 'Email address'}
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    dir="ltr"
                    required
                    style={{
                      width: '100%',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--line-dark)',
                      borderRadius: '4px',
                      padding: '14px 16px',
                      color: '#FFFFFF',
                      fontSize: '15px',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: 'var(--mars-copper)',
                    color: '#FFFFFF',
                    padding: '15px',
                    borderRadius: '999px',
                    fontSize: '15px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: loading ? 'wait' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {loading
                    ? isAr ? 'جاري الإرسال...' : 'Sending…'
                    : isAr ? 'إرسال الرابط' : 'Send reset link'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1
                style={{
                  fontSize: '26px',
                  fontWeight: 300,
                  color: '#FFFFFF',
                  marginBottom: '12px',
                }}
              >
                {isAr ? 'تحقق من بريدك' : 'Check your inbox'}
              </h1>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.8,
                  marginBottom: '32px',
                }}
              >
                {isAr ? 'إذا كان ' : 'If '}
                <bdi style={{ color: 'var(--copper-400)', fontWeight: 600 }}>{email}</bdi>
                {isAr
                  ? ' مسجلاً لدينا، فسيصلك رابط لتعيين كلمة المرور خلال دقائق. الرابط صالح لمرة واحدة.'
                  : ' is registered with us, a link to set your password will arrive shortly. The link works once.'}
              </p>
            </>
          )}

          <div
            style={{
              textAlign: 'center',
              marginTop: '32px',
              fontSize: '14px',
              color: 'var(--text-muted-dark)',
            }}
          >
            <a href="/auth/login" style={{ color: 'var(--copper-400)', fontWeight: 600 }}>
              {isAr ? 'العودة لتسجيل الدخول' : 'Back to sign in'}
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
