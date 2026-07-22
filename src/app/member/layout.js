'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

export default function MemberLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { language, toggleLanguage, theme, toggleTheme, t, mounted } = useLanguage();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check auth on load
  useEffect(() => {
    const storedUser = localStorage.getItem('mars-user');
    if (!storedUser) {
      router.push('/auth/login');
    } else {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('mars-user');
    router.push('/auth/login');
  };

  if (!mounted || loading) {
    return (
      <div style={{ background: 'var(--mars-void)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--copper-400)', fontSize: '15px', fontWeight: 600, letterSpacing: '0.05em' }}>
          {language === 'ar' ? 'جاري التوثيق...' : 'AUTHENTICATING MEMBER ACCESS...'}
        </div>
      </div>
    );
  }

  if (!user) return null;

  const links = [
    { name: language === 'ar' ? 'مساحتي' : 'Overview', path: '/member', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { name: language === 'ar' ? 'حجوزاتي' : 'My Bookings', path: '/member/bookings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { name: language === 'ar' ? 'عضويتي' : 'Membership', path: '/member/membership', icon: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8h2m6 0h2' },
    { name: language === 'ar' ? 'الفواتير' : 'Invoices', path: '/member/invoices', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { name: language === 'ar' ? 'بطاقات الدفع' : 'Billing & Cards', path: '/member/billing', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { name: language === 'ar' ? 'المكتبة والفعاليات' : 'Events & Perks', path: '/member/events', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { name: language === 'ar' ? 'شبكة المجتمع' : 'Community', path: '/member/community', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { name: language === 'ar' ? 'مكتب الدعم' : 'Support Desk', path: '/member/support', icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z' },
    { name: language === 'ar' ? 'التنبيهات' : 'Notifications', path: '/member/notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { name: language === 'ar' ? 'إعدادات الحساب' : 'Account Settings', path: '/member/profile', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--mars-void)', color: 'var(--text-primary)', flexDirection: 'column' }}>
      
      {/* Top Header Navigation */}
      <header style={{
        height: '68px',
        background: 'var(--surface-1)',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        boxSizing: 'border-box',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50
      }}>
        {/* Left: Brand Lockup */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/assets/mars-lockup-white.png" alt="MARS" style={{ height: '30px' }} />
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: 'var(--copper-400)',
            textTransform: 'uppercase',
            background: 'rgba(200, 107, 60, 0.1)',
            border: '1px solid rgba(200, 107, 60, 0.25)',
            padding: '2px 8px',
            borderRadius: '999px',
          }}>
            {language === 'ar' ? 'بوابة الأعضاء' : 'MEMBER HUB'}
          </span>
        </a>

        {/* Right Side Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Quick Keycode Access Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--glass-border)',
            padding: '4px 12px',
            borderRadius: '999px',
            fontSize: '12px',
          }}>
            <span style={{ color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'رمز الباب:' : 'Keycode:'}</span>
            <span style={{ fontWeight: 700, color: 'var(--copper-400)', fontFamily: 'monospace' }}>#8842-MS</span>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--glass-border)',
              borderRadius: '999px',
              padding: '6px 12px',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--glass-border)',
              borderRadius: '999px',
              padding: '6px 12px',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {language === 'en' ? 'عربي' : 'EN'}
          </button>

          {/* User Badge & Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingInlineStart: '8px', borderInlineStart: '1px solid var(--glass-border)' }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, var(--copper-400) 0%, var(--mars-copper) 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '13px',
              color: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(200, 107, 60, 0.25)'
            }}>
              {user.name ? user.name.charAt(0).toUpperCase() : 'M'}
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600 }} className="desktop-username">{user.name}</span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--status-crimson)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            {language === 'ar' ? 'خروج' : 'Logout'}
          </button>
        </div>
      </header>

      {/* Main Container Layout */}
      <div style={{ display: 'flex', flex: 1, paddingTop: '68px', boxSizing: 'border-box' }}>
        
        {/* Sidebar */}
        <aside style={{
          width: '240px',
          background: 'var(--surface-1)',
          borderRight: language === 'ar' ? 'none' : '1px solid var(--glass-border)',
          borderLeft: language === 'ar' ? '1px solid var(--glass-border)' : 'none',
          position: 'fixed',
          top: '68px',
          bottom: 0,
          left: language === 'ar' ? 'auto' : 0,
          right: language === 'ar' ? 0 : 'auto',
          padding: '20px 14px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          zIndex: 40
        }} className="member-sidebar">
          {links.map((link) => {
            const isActive = pathname === link.path;
            return (
              <a
                key={link.name}
                href={link.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(200, 107, 60, 0.15)' : 'transparent',
                  border: isActive ? '1px solid rgba(200, 107, 60, 0.3)' : '1px solid transparent',
                  transition: 'all 140ms ease'
                }}
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke={isActive ? 'var(--copper-400)' : 'currentColor'} strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                </svg>
                {link.name}
              </a>
            );
          })}
        </aside>

        {/* Dynamic page content */}
        <div style={{
          flex: 1,
          padding: '32px 28px 120px',
          boxSizing: 'border-box',
          marginLeft: language === 'ar' ? '0' : '240px',
          marginRight: language === 'ar' ? '240px' : '0',
          transition: 'all 200ms ease'
        }} className="member-main-content">
          {children}
        </div>

      </div>

      {/* Mobile Navigation */}
      <nav style={{
        display: 'none',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: 'var(--surface-1)',
        borderTop: '1px solid var(--glass-border)',
        zIndex: 45,
        gridTemplateColumns: 'repeat(5, 1fr)',
        boxSizing: 'border-box'
      }} className="mobile-tabbar">
        {links.slice(0, 5).map((link) => {
          const isActive = pathname === link.path;
          return (
            <a
              key={link.name}
              href={link.path}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                color: isActive ? 'var(--copper-400)' : 'var(--text-secondary)',
                gap: '4px'
              }}
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
              </svg>
              <span>{link.name}</span>
            </a>
          );
        })}
      </nav>

      <style jsx global>{`
        @media (max-width: 960px) {
          .member-sidebar {
            display: none !important;
          }
          .member-main-content {
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-bottom: 96px !important;
          }
          .mobile-tabbar {
            display: grid !important;
          }
          .desktop-username {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
