'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import BookingModal from './BookingModal';

export default function Header() {
  const { language, toggleLanguage, t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
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
    <>
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60 }}>
        {/* Scrolled Background Overlays */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: scrolled ? 'var(--glass-bg)' : 'transparent',
            borderBottom: scrolled ? '1px solid var(--glass-border)' : '1px solid transparent',
            backdropFilter: scrolled ? 'blur(16px)' : 'none',
            WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
            transition: 'all 300ms cubic-bezier(0.16, 1, 0.30, 1)',
          }}
        />

        <div
          style={{
            position: 'relative',
            maxWidth: '1440px',
            margin: '0 auto',
            padding: '12px clamp(24px, 5vw, 64px)',
            minHeight: '76px',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {/* Brand Logo & Tagline */}
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src="/assets/mars-lockup-white.png"
              alt="MARS مارس"
              style={{ height: '36px', display: 'block' }}
            />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.22em',
                color: 'var(--copper-400)',
                textTransform: 'uppercase',
                background: 'rgba(200, 107, 60, 0.10)',
                border: '1px solid rgba(200, 107, 60, 0.25)',
                padding: '3px 8px',
                borderRadius: '999px',
              }}
            >
              {language === 'ar' ? 'سبيس' : 'SPACE'}
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              marginInlineStart: 'auto',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
            }}
            className="desktop-nav"
          >
            <a href="#floor" style={{ transition: 'color 160ms' }} className="nav-link-item">{t.nav.space}</a>
            <a href="#rooms" style={{ transition: 'color 160ms' }} className="nav-link-item">{t.nav.rooms}</a>
            <a href="#community" style={{ transition: 'color 160ms' }} className="nav-link-item">{t.nav.community}</a>
            <a href="#membership" style={{ transition: 'color 160ms' }} className="nav-link-item">{t.nav.membership}</a>
            <a href="#ecosystem" style={{ transition: 'color 160ms' }} className="nav-link-item">{t.nav.about}</a>
            <a href="#location" style={{ transition: 'color 160ms' }} className="nav-link-item">{t.nav.contact}</a>
          </nav>

          {/* Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginInlineStart: menuOpen ? 'auto' : '0' }}>
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                border: '1px solid var(--glass-border)',
                borderRadius: '999px',
                overflow: 'hidden',
                fontSize: '12px',
                fontWeight: 600,
                background: 'rgba(255, 255, 255, 0.03)',
                cursor: 'pointer',
                padding: '2px',
                color: 'inherit',
              }}
            >
              <span
                style={{
                  padding: '6px 12px',
                  borderRadius: '999px',
                  color: language === 'ar' ? '#FFFFFF' : 'var(--text-muted-dark)',
                  background: language === 'ar' ? 'var(--mars-copper)' : 'transparent',
                  transition: 'all 200ms ease',
                }}
              >
                عربي
              </span>
              <span
                style={{
                  padding: '6px 12px',
                  borderRadius: '999px',
                  color: language === 'en' ? '#FFFFFF' : 'var(--text-muted-dark)',
                  background: language === 'en' ? 'var(--mars-copper)' : 'transparent',
                  transition: 'all 200ms ease',
                }}
              >
                EN
              </span>
            </button>

            {/* CTA Button */}
            <button
              onClick={() => setBookingOpen(true)}
              className="btn-pill-primary"
              style={{
                padding: '9px 20px',
                fontSize: '13px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {language === 'ar' ? 'احجز قاعة' : 'Book a room'}
            </button>
          </div>

          <style jsx>{`
            .nav-link-item:hover {
              color: var(--copper-400) !important;
            }
            @media (max-width: 900px) {
              .desktop-nav {
                display: none !important;
              }
            }
          `}</style>
        </div>
      </header>

      {/* Booking Modal */}
      <BookingModal isOpen={bookingOpen} onClose={() => setBookingOpen(false)} />
    </>
  );
}
