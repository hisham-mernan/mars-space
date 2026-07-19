'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function AccountProfile() {
  const { language, t, mounted } = useLanguage();
  const [user, setUser] = useState(null);

  // Security states
  const [enable2FA, setEnable2FA] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [devices, setDevices] = useState([
    { id: 'dev-1', name: 'MacBook Pro', browser: 'Chrome', location: 'Jeddah', status: 'Current Session' },
    { id: 'dev-2', name: 'iPhone 15 Pro', browser: 'Safari', location: 'Jeddah', status: 'Active 2 hours ago' }
  ]);
  const [auditLogs, setAuditLogs] = useState([
    { action: '2FA Status Modified', device: 'Chrome / macOS', time: 'Just now' },
    { action: 'Profile Picture Updated', device: 'Safari / iOS', time: 'Yesterday' }
  ]);

  // Account deletion Danger Zone
  const [deleteStep, setDeleteStep] = useState(0); // 0: None, 1: Confirm Warning, 2: Enter Password, 3: Success Queue
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('Found another coworking space');

  useEffect(() => {
    const storedUser = localStorage.getItem('mars-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  if (!mounted || !user) return null;

  const handleToggle2FA = () => {
    if (!enable2FA) {
      setShowQr(true);
    } else {
      setEnable2FA(false);
      setShowQr(false);
    }
  };

  const handleVerify2FA = (e) => {
    e.preventDefault();
    if (verificationCode.length === 6) {
      setEnable2FA(true);
      setShowQr(false);
      setVerificationCode('');
      setAuditLogs([
        { action: '2FA Protection Enabled', device: 'Chrome / macOS', time: 'Just now' },
        ...auditLogs
      ]);
    }
  };

  const handleSignOutDevice = (id) => {
    setDevices(prev => prev.filter(d => d.id !== id));
  };

  const handleDeleteAccount = (e) => {
    e.preventDefault();
    if (confirmPassword === 'password') {
      setDeleteStep(3);
      // Wait 3 seconds and log out
      setTimeout(() => {
        localStorage.removeItem('mars-user');
        window.location.href = '/';
      }, 3000);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '28px', color: '#FFFFFF', fontWeight: 300, margin: 0 }}>
          {language === 'ar' ? 'حسابي الشخصي والأمان' : 'Profile & Security'}
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-muted-dark)', fontSize: '14px' }}>
          {language === 'ar' ? 'تعديل تفاصيل ملفك الشخصي وإعداد خيارات الحماية والأمان.' : 'Manage your personal details, profile picture, two-factor authentication, and connected devices.'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '32px', alignItems: 'start' }}>
        
        {/* Left Column (Personal Info & Devices) */}
        <div style={{ gridColumn: 'span 2', display: 'grid', gap: '32px' }}>
          
          {/* General Information */}
          <div style={{ background: 'var(--mars-slate)', padding: '32px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
            <h3 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: 600, color: '#FFFFFF' }}>
              {language === 'ar' ? 'المعلومات الشخصية' : 'Personal Information'}
            </h3>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'center', marginBottom: '32px' }}>
              {/* Profile Photo upload */}
              <div style={{
                width: '80px',
                height: '80px',
                background: 'var(--mars-copper)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                fontWeight: 700,
                color: '#FFFFFF'
              }}>
                {user.name.charAt(0)}
              </div>
              <div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button style={{ background: 'var(--mars-copper)', border: 'none', color: '#FFFFFF', padding: '8px 18px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    {language === 'ar' ? 'تحميل صورة جديدة' : 'Upload photo'}
                  </button>
                  <button style={{ background: 'none', border: '1px solid var(--line-dark)', color: 'var(--text-muted-dark)', padding: '8px 18px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    {language === 'ar' ? 'إزالة' : 'Remove'}
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)', marginTop: '8px' }}>
                  Supports JPG, PNG, WEBP. Max size 2MB.
                </div>
              </div>
            </div>

            <form style={{ display: 'grid', gap: '20px', fontSize: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-muted-dark)' }}>
                  {language === 'ar' ? 'الاسم بالكامل' : 'Full Name'}
                  <input type="text" value={user.name} readOnly style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '10px', color: 'rgba(255,255,255,0.7)', outline: 'none' }} />
                </label>
                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-muted-dark)' }}>
                  {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                  <input type="email" value={user.email} readOnly style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '10px', color: 'rgba(255,255,255,0.7)', outline: 'none' }} />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-muted-dark)' }}>
                  {language === 'ar' ? 'الشركة المنتسبة' : 'Company'}
                  <input type="text" value={user.company || 'Individual'} readOnly style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '10px', color: 'rgba(255,255,255,0.7)', outline: 'none' }} />
                </label>
                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-muted-dark)' }}>
                  {language === 'ar' ? 'رقم عضوية مارس' : 'Member ID'}
                  <input type="text" value="MS-2026-00452" readOnly style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '10px', color: 'rgba(255,255,255,0.7)', outline: 'none' }} />
                </label>
              </div>
            </form>
          </div>

          {/* Connected Connected Devices */}
          <div style={{ background: 'var(--mars-slate)', padding: '32px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 600, color: '#FFFFFF' }}>
              {language === 'ar' ? 'الأجهزة المتصلة بالحساب' : 'Connected Devices'}
            </h3>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              {devices.map((dev) => (
                <div
                  key={dev.id}
                  style={{
                    background: 'var(--mars-void)',
                    padding: '20px',
                    borderRadius: '6px',
                    border: '1px solid var(--line-dark)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{dev.name} · {dev.browser}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)', marginTop: '4px' }}>
                      {dev.location} · {dev.status}
                    </div>
                  </div>
                  {dev.status !== 'Current Session' && (
                    <button
                      onClick={() => handleSignOutDevice(dev.id)}
                      style={{
                        background: 'none',
                        border: '1px solid rgba(255, 0, 0, 0.3)',
                        borderRadius: '999px',
                        color: '#FF4A4A',
                        padding: '6px 16px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {language === 'ar' ? 'إنهاء الجلسة' : 'Sign Out'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Security Center & Danger Zone */}
        <div style={{ display: 'grid', gap: '32px' }}>
          
          {/* Two-Factor Authentication 2FA */}
          <div style={{ background: 'var(--mars-slate)', padding: '32px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#FFFFFF' }}>
              {language === 'ar' ? 'المصادقة الثنائية (2FA)' : 'Two-Factor Auth (2FA)'}
            </h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-muted-dark)' }}>
                {enable2FA ? (language === 'ar' ? 'حالة الحماية: نشط' : 'Protection Status: Enabled') : (language === 'ar' ? 'حالة الحماية: معطل' : 'Protection Status: Disabled')}
              </span>
              <input
                type="checkbox"
                checked={enable2FA}
                onChange={handleToggle2FA}
                style={{ width: '40px', height: '20px', cursor: 'pointer' }}
              />
            </div>

            {/* Verification code scanner popup */}
            {showQr && (
              <form onSubmit={handleVerify2FA} style={{ display: 'grid', gap: '16px', background: 'var(--mars-void)', padding: '20px', borderRadius: '6px', border: '1px solid var(--line-dark)', marginTop: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>1. Scan QR with Authenticator App</div>
                <div style={{ background: '#FFFFFF', padding: '10px', borderRadius: '4px', width: '120px', height: '120px', margin: '0 auto' }}>
                  {/* Mock 2FA QR Code */}
                  <svg width="100" height="100" viewBox="0 0 29 29">
                    <path d="M0 0h7v7H0zm1 1v5h5V1zm8 0h1v1H9zm1 1h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm4-6h7v7h-7zm1 1v5h5V1zm-13 8h1v1h-1zm1 1h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm-13 8h7v7H0zm1 1v5h5v-5zm8 0h1v1H9zm1 1h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm4-8h1v1h-1zm1 1h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1z" fill="#000" />
                  </svg>
                </div>
                <label style={{ display: 'grid', gap: '6px', fontSize: '13px' }}>
                  2. Enter 6-digit Code
                  <input type="text" maxLength="6" placeholder="123456" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} style={{ background: 'var(--mars-slate)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '10px', color: '#FFFFFF', textAlign: 'center', outline: 'none' }} />
                </label>
                <button type="submit" className="btn-pill-primary" style={{ padding: '8px 0', fontSize: '13px', border: 'none', cursor: 'pointer' }}>
                  Confirm Setup
                </button>
              </form>
            )}
          </div>

          {/* Danger Zone: Account Deletion */}
          <div style={{ background: 'var(--mars-slate)', padding: '32px', borderRadius: '8px', border: '1px solid rgba(255, 0, 0, 0.2)' }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#FF4A4A' }}>
              {language === 'ar' ? 'منطقة الخطر (إجراءات حساسة)' : 'Danger Zone'}
            </h3>
            <p style={{ margin: '6px 0 20px', color: 'var(--text-muted-dark)', fontSize: '13px', lineHeight: 1.5 }}>
              {language === 'ar' ? 'حذف الحساب بشكل نهائي وإلغاء الاشتراكات النشطة.' : 'Permanently close your account, cancel all active subscriptions, and delete personal history.'}
            </p>

            {deleteStep === 0 && (
              <button
                onClick={() => setDeleteStep(1)}
                className="btn-pill-secondary"
                style={{ border: '1px solid #FF4A4A', color: '#FF4A4A', padding: '10px 24px', fontSize: '13px', cursor: 'pointer' }}
              >
                {language === 'ar' ? 'حذف حسابي الشخصي' : 'Delete Account'}
              </button>
            )}

            {/* Step 1 Warning */}
            {deleteStep === 1 && (
              <div style={{ background: 'rgba(255, 0, 0, 0.05)', padding: '16px', borderRadius: '4px', border: '1px solid rgba(255, 0, 0, 0.15)' }}>
                <div style={{ fontWeight: 600, color: '#FF4A4A', fontSize: '14px' }}>WARNING: Action is irreversible</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)', marginTop: '8px' }}>
                  All your reservations, paid invoices history, and team profiles will be removed.
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button onClick={() => setDeleteStep(0)} style={{ background: 'none', border: 'none', color: 'var(--text-muted-dark)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                  <button onClick={() => setDeleteStep(2)} className="btn-pill-primary" style={{ background: '#FF4A4A', border: 'none', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>Proceed</button>
                </div>
              </div>
            )}

            {/* Step 2 Password confirmation */}
            {deleteStep === 2 && (
              <form onSubmit={handleDeleteAccount} style={{ display: 'grid', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '6px', fontSize: '13px' }}>
                  Enter Password to Confirm
                  <input type="password" required placeholder="Type 'password' to test" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '10px', color: '#FFFFFF', outline: 'none' }} />
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" onClick={() => setDeleteStep(0)} style={{ background: 'none', border: 'none', color: 'var(--text-muted-dark)', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ background: '#FF4A4A', border: 'none', padding: '8px 16px', borderRadius: '999px', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}>Delete Permanently</button>
                </div>
              </form>
            )}

            {/* Step 3 Success Scheduled */}
            {deleteStep === 3 && (
              <div style={{ color: 'var(--copper-400)', fontSize: '14px', fontWeight: 600 }}>
                ✓ Account scheduled for deletion. Logging out...
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
