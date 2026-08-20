'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

/**
 * Where an invited member sets their password for the first time, and where a
 * password reset lands.
 *
 * Reached from /auth/callback, which has already exchanged the emailed code
 * for a session — so the visitor is signed in but has no password of their
 * own yet. Without a session the link was expired or reused, and there is
 * nothing to do but request a new one.
 */
export default function SetPassword() {
  const { language, mounted } = useLanguage();
  const isAr = language === 'ar';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('checking'); // checking | ready | expired | saving | done
  const [errorMsg, setErrorMsg] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data?.user) {
        setStatus('expired');
        return;
      }
      setEmail(data.user.email ?? '');
      setStatus('ready');
    });
  }, []);

  if (!mounted) return null;

  const MIN_LENGTH = 10; // matches minimum_password_length in supabase/config.toml

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < MIN_LENGTH) {
      setErrorMsg(
        isAr
          ? `كلمة المرور يجب أن تكون ${MIN_LENGTH} أحرف على الأقل`
          : `Password must be at least ${MIN_LENGTH} characters`
      );
      return;
    }
    if (password !== confirm) {
      setErrorMsg(isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }

    setStatus('saving');
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMsg(error.message);
      setStatus('ready');
      return;
    }

    setStatus('done');

    const { data } = await supabase
      .from('profiles')
      .select('platform_role')
      .single();

    const isStaff = ['staff', 'erp_admin'].includes(data?.platform_role);
    window.location.href = isStaff ? '/erp' : '/member';
  };

  const label = {
    fontSize: '12px',
    fontWeight: 500,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--text-muted-dark)',
    marginBottom: '8px',
    display: 'block',
  };

  const input = {
    width: '100%',
    background: 'var(--surface-2)',
    border: '1px solid var(--line-dark)',
    borderRadius: '12px',
    padding: '14px 16px',
    color: '#FFFFFF',
    fontSize: '15px',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
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
          padding: '120px 24px 80px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ width: '100%', maxWidth: '440px' }}>
          <h1
            style={{
              fontSize: 'clamp(28px, 4vw, 36px)',
              fontWeight: 300,
              color: '#FFFFFF',
              marginBottom: '12px',
            }}
          >
            {isAr ? 'اختر كلمة المرور' : 'Set your password'}
          </h1>

          {status === 'checking' && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
              {isAr ? 'جاري التحقق من الرابط...' : 'Checking your link…'}
            </p>
          )}

          {status === 'expired' && (
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.8, marginBottom: '24px' }}>
                {isAr
                  ? 'انتهت صلاحية هذا الرابط أو تم استخدامه من قبل. اطلب رابطاً جديداً لتعيين كلمة المرور.'
                  : 'This link has expired or has already been used. Request a new one to set your password.'}
              </p>
              <a
                href="/auth/forgot-password"
                style={{
                  display: 'inline-block',
                  background: 'var(--mars-copper)',
                  color: '#FFFFFF',
                  padding: '14px 28px',
                  borderRadius: '999px',
                  fontSize: '14px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                {isAr ? 'إرسال رابط جديد' : 'Send a new link'}
              </a>
            </div>
          )}

          {(status === 'ready' || status === 'saving' || status === 'done') && (
            <>
              <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.8, marginBottom: '32px' }}>
                {isAr ? 'مرحباً بك في مارس سبيس. ' : 'Welcome to Mars Space. '}
                {email && (
                  /* bdi keeps a Latin email from reordering inside Arabic text */
                  <bdi style={{ color: 'var(--copper-400)', fontWeight: 600 }}>{email}</bdi>
                )}
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label htmlFor="password" style={label}>
                    {isAr ? 'كلمة المرور الجديدة' : 'New password'}
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={MIN_LENGTH}
                    style={input}
                  />
                  <p style={{ fontSize: '12px', color: 'var(--text-muted-dark)', marginTop: '8px' }}>
                    {isAr
                      ? `${MIN_LENGTH} أحرف على الأقل`
                      : `At least ${MIN_LENGTH} characters`}
                  </p>
                </div>

                <div>
                  <label htmlFor="confirm" style={label}>
                    {isAr ? 'تأكيد كلمة المرور' : 'Confirm password'}
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                    style={input}
                  />
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid var(--status-crimson)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      color: 'var(--status-crimson)',
                      fontSize: '14px',
                    }}
                  >
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'saving' || status === 'done'}
                  style={{
                    background: 'var(--mars-copper)',
                    color: '#FFFFFF',
                    padding: '16px',
                    borderRadius: '999px',
                    fontSize: '15px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: status === 'saving' ? 'wait' : 'pointer',
                    opacity: status === 'saving' ? 0.7 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {status === 'saving'
                    ? isAr ? 'جاري الحفظ...' : 'Saving…'
                    : status === 'done'
                      ? isAr ? 'تم' : 'Done'
                      : isAr ? 'حفظ ومتابعة' : 'Save and continue'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
