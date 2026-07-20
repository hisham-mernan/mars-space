'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function Header() {
  const { language, toggleLanguage, t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    
    // Auth Check
    const storedUser = localStorage.getItem('mars-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60 }}>
      {/* Scrolled Background Overlays */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(30, 30, 36, 0.92)',
          borderBottom: '1px solid rgba(245, 245, 245, 0.10)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          opacity: scrolled ? 1 : 0,
          transition: 'opacity 220ms cubic-bezier(0.16, 1, 0.30, 1)',
        }}
      />

      <div
        style={{
          position: 'relative',
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '10px clamp(24px, 5vw, 96px)',
          minHeight: '80px',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: '12px clamp(16px, 2vw, 32px)',
        }}
      >
        {/* Logo */}
        <a href="#top" style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', padding: '10px 0' }}>
          <img
            src="/assets/mars-lockup-white.png"
            alt="MARS مارس"
            style={{ height: '42px', display: 'block' }}
          />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              letterSpacing: '0.16em',
              color: 'var(--text-muted-dark)',
              paddingBottom: '3px',
            }}
          >
            {language === 'ar' ? 'سبيس' : 'SPACE'}
          </span>
        </a>

        {/* Desktop Navigation */}
        <nav
          style={{
            display: 'flex',
            gap: '8px clamp(12px, 1.6vw, 28px)',
            marginInlineStart: 'auto',
            fontSize: 'clamp(13px, 1vw, 14px)',
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
          className="desktop-nav"
        >
          <a href="#floor" style={{ padding: '8px 0' }}>{t.nav.space}</a>
          <a href="#rooms" style={{ padding: '8px 0' }}>{t.nav.rooms}</a>
          <a href="#community" style={{ padding: '8px 0' }}>{t.nav.community}</a>
          <a href="#membership" style={{ padding: '8px 0' }}>{t.nav.membership}</a>
          <a href="#ecosystem" style={{ padding: '8px 0' }}>{t.nav.about}</a>
          <a href="#location" style={{ padding: '8px 0' }}>{t.nav.contact}</a>
        </nav>

        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          style={{
            display: 'flex',
            border: '1px solid rgba(245, 245, 245, 0.22)',
            borderRadius: '999px',
            overflow: 'hidden',
            fontSize: '12px',
            fontWeight: 500,
            lineHeight: 1,
            whiteSpace: 'nowrap',
            background: 'none',
            cursor: 'pointer',
            padding: 0,
            color: 'inherit',
          }}
        >
          <span
            style={{
              padding: '8px 13px',
              color: language === 'ar' ? 'var(--mars-void)' : 'var(--text-muted-dark)',
              background: language === 'ar' ? 'var(--mars-paper)' : 'none',
              transition: 'all var(--dur-instant)',
            }}
          >
            عربي
          </span>
          <span
            style={{
              padding: '8px 13px',
              color: language === 'en' ? 'var(--mars-void)' : 'var(--text-muted-dark)',
              background: language === 'en' ? 'var(--mars-paper)' : 'none',
              transition: 'all var(--dur-instant)',
            }}
          >
            EN
          </span>
        </button>

        {/* CTA Button */}
        <a
          href={user ? '/member' : '#rooms'}
          className="btn-pill-primary"
          style={{
            padding: '11px 24px',
            fontSize: '14px',
            whiteSpace: 'nowrap',
          }}
        >
          {user ? (language === 'ar' ? 'لوحة التحكم' : 'Dashboard') : t.nav.cta}
        </a>

        {/* Mobile Hamburger toggle (styled via inline CSS) */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            display: 'none',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '20px',
            height: '14px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            zIndex: 70,
          }}
          className="mobile-hamburger"
        >
          <span style={{ width: '100%', height: '2px', background: '#F5F5F5', transition: 'all 0.2s', transform: menuOpen ? 'rotate(45deg) translateY(4px)' : 'none' }}></span>
          <span style={{ width: '100%', height: '2px', background: '#F5F5F5', transition: 'all 0.2s', opacity: menuOpen ? 0 : 1 }}></span>
          <span style={{ width: '100%', height: '2px', background: '#F5F5F5', transition: 'all 0.2s', transform: menuOpen ? 'rotate(-45deg) translateY(-4px)' : 'none' }}></span>
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {menuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--mars-void)',
            zIndex: 55,
            display: 'flex',
            flexDirection: 'column',
            padding: '100px 24px 40px',
            gap: '24px',
            boxSizing: 'border-box',
          }}
        >
          <a href="#floor" onClick={() => setMenuOpen(false)} style={{ fontSize: '20px', fontWeight: 500 }}>{t.nav.space}</a>
          <a href="#rooms" onClick={() => setMenuOpen(false)} style={{ fontSize: '20px', fontWeight: 500 }}>{t.nav.rooms}</a>
          <a href="#community" onClick={() => setMenuOpen(false)} style={{ fontSize: '20px', fontWeight: 500 }}>{t.nav.community}</a>
          <a href="#membership" onClick={() => setMenuOpen(false)} style={{ fontSize: '20px', fontWeight: 500 }}>{t.nav.membership}</a>
          <a href="#ecosystem" onClick={() => setMenuOpen(false)} style={{ fontSize: '20px', fontWeight: 500 }}>{t.nav.about}</a>
          <a href="#location" onClick={() => setMenuOpen(false)} style={{ fontSize: '20px', fontWeight: 500 }}>{t.nav.contact}</a>
          
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <a
              href={user ? '/member' : '#rooms'}
              onClick={() => setMenuOpen(false)}
              className="btn-pill-primary"
              style={{
                padding: '16px',
                fontSize: '16px',
                width: '100%',
                boxSizing: 'border-box',
                textAlign: 'center',
              }}
            >
              {user ? (language === 'ar' ? 'لوحة التحكم' : 'Dashboard') : t.nav.cta}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
