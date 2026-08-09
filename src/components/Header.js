'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import BookingModal from './BookingModal';
import MegaMenu from './MegaMenu';

export default function Header() {
  const { language, toggleLanguage, t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60 }}>
        {/* Scrolled Background Overlays */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: scrolled || mobileMenuOpen ? 'rgba(11, 11, 15, 0.92)' : 'transparent',
            borderBottom: scrolled || mobileMenuOpen ? '1px solid rgba(245, 243, 239, 0.08)' : '1px solid transparent',
            backdropFilter: scrolled || mobileMenuOpen ? 'blur(16px)' : 'none',
            WebkitBackdropFilter: scrolled || mobileMenuOpen ? 'blur(16px)' : 'none',
            transition: 'background 300ms ease, border-color 300ms ease',
          }}
        />

        <div
          className="header-inner"
          style={{
            position: 'relative',
            maxWidth: '1600px',
            margin: '0 auto',
            padding: '0 clamp(16px, 3.5vw, 72px)',
            height: 'clamp(64px, 8vh, 88px)',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'clamp(10px, 2vw, 48px)',
            width: '100%'
          }}
        >
          {/* Brand Logo & Lockup */}
          <a href="/" style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', flexShrink: 0 }}>
            <img
              src="/assets/mars-lockup-white.png"
              alt="MARS مارس"
              className="logo-img"
              style={{ height: '36px', display: 'block', width: 'auto' }}
            />
            <span
              className="logo-text"
              style={{
                fontSize: '12px',
                fontWeight: 500,
                letterSpacing: '0.1em',
                color: '#A8A49D',
                paddingBottom: '2px',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap'
              }}
            >
              {language === 'ar' ? 'سبيس' : 'SPACE'}
            </span>
          </a>

          {/* Desktop Navigation Links */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'clamp(16px, 2.2vw, 36px)',
              marginInlineStart: 'auto',
              fontSize: '15px',
              fontWeight: 400,
              whiteSpace: 'nowrap',
              color: '#F5F3EF',
            }}
            className="desktop-nav"
          >
            <div
              onMouseEnter={() => setMegaOpen(true)}
              style={{ position: 'relative', display: 'inline-block' }}
            >
              <a href="/spaces" className="nav-link">
                {t?.nav?.space || (language === 'ar' ? 'المساحة ▾' : 'The Space ▾')}
              </a>
              <MegaMenu isOpen={megaOpen} onClose={() => setMegaOpen(false)} />
            </div>

            <a href="/spaces?category=meeting_room" className="nav-link">{t?.nav?.rooms || (language === 'ar' ? 'قاعات الاجتماعات' : 'Meeting Rooms')}</a>
            <a href="/pricing" className="nav-link">{t?.nav?.membership || (language === 'ar' ? 'العضوية' : 'Membership')}</a>
            <a href="/events" className="nav-link">{t?.nav?.community || (language === 'ar' ? 'المجتمع' : 'Community')}</a>
            <a href="/about" className="nav-link">{t?.nav?.about || (language === 'ar' ? 'عن مارس سبيس' : 'About')}</a>
            <a href="/contact" className="nav-link">{t?.nav?.contact || (language === 'ar' ? 'تواصل معنا' : 'Contact')}</a>
          </nav>

          {/* Controls Right Wrapper (Language Toggle, CTA Button, Mobile Hamburger) */}
          <div
            className="header-controls"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'clamp(8px, 1.5vw, 14px)',
              flexShrink: 0
            }}
          >
            {/* Language Switcher Pill */}
            <div
              onClick={toggleLanguage}
              style={{
                display: 'flex',
                flex: 'none',
                border: '1px solid rgba(245, 243, 239, 0.2)',
                borderRadius: '999px',
                overflow: 'hidden',
                fontSize: '11px',
                fontWeight: 500,
                lineHeight: 1,
                cursor: 'pointer'
              }}
            >
              <span
                className="lang-pill-item"
                style={{
                  padding: '7px 11px',
                  color: language === 'ar' ? '#0B0B0F' : '#A8A49D',
                  background: language === 'ar' ? '#F5F3EF' : 'transparent',
                  transition: 'all 200ms ease'
                }}
              >
                عربي
              </span>
              <span
                className="lang-pill-item"
                style={{
                  padding: '7px 11px',
                  color: language === 'en' ? '#0B0B0F' : '#A8A49D',
                  background: language === 'en' ? '#F5F3EF' : 'transparent',
                  transition: 'all 200ms ease'
                }}
              >
                EN
              </span>
            </div>

            {/* Book Button */}
            <button
              onClick={() => setBookingOpen(true)}
              className="cta-book-btn"
              style={{
                display: 'inline-flex',
                flex: 'none',
                alignItems: 'center',
                gap: '6px',
                background: '#8A4120',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '999px',
                padding: '9px 18px',
                font: "500 14px var(--font-sans)",
                lineHeight: 1,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'background 250ms, gap 250ms'
              }}
            >
              <span>{user ? (language === 'ar' ? 'لوحة التحكم' : 'Dashboard') : (t?.nav?.cta || (language === 'ar' ? 'احجز قاعة' : 'Book a room'))}</span>
              <span style={{ fontSize: '13px', lineHeight: 1 }}>→</span>
            </button>

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-hamburger-btn"
              aria-label="Toggle navigation menu"
              style={{
                display: 'none',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                width: '36px',
                height: '36px',
                background: 'transparent',
                border: '1px solid rgba(245, 243, 239, 0.2)',
                borderRadius: '8px',
                cursor: 'pointer',
                padding: 0,
                gap: '4px'
              }}
            >
              <span
                style={{
                  width: '18px',
                  height: '2px',
                  background: '#F5F3EF',
                  borderRadius: '2px',
                  transition: 'transform 200ms ease, opacity 200ms ease',
                  transform: mobileMenuOpen ? 'translateY(6px) rotate(45deg)' : 'none'
                }}
              />
              <span
                style={{
                  width: '18px',
                  height: '2px',
                  background: '#F5F3EF',
                  borderRadius: '2px',
                  transition: 'opacity 200ms ease',
                  opacity: mobileMenuOpen ? 0 : 1
                }}
              />
              <span
                style={{
                  width: '18px',
                  height: '2px',
                  background: '#F5F3EF',
                  borderRadius: '2px',
                  transition: 'transform 200ms ease, opacity 200ms ease',
                  transform: mobileMenuOpen ? 'translateY(-6px) rotate(-45deg)' : 'none'
                }}
              />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            className="mobile-drawer"
            style={{
              position: 'fixed',
              top: '64px',
              left: 0,
              right: 0,
              bottom: 0,
              background: '#0B0B0F',
              zIndex: 55,
              padding: '24px clamp(20px, 5vw, 36px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <a
                href="/spaces"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  fontSize: '22px',
                  fontWeight: 300,
                  color: '#F5F3EF',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(245,243,239,0.1)'
                }}
              >
                {t?.nav?.space || (language === 'ar' ? 'المساحة' : 'The Space')}
              </a>

              <a
                href="/spaces?category=meeting_room"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  fontSize: '22px',
                  fontWeight: 300,
                  color: '#F5F3EF',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(245,243,239,0.1)'
                }}
              >
                {t?.nav?.rooms || (language === 'ar' ? 'قاعات الاجتماعات' : 'Meeting Rooms')}
              </a>

              <a
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  fontSize: '22px',
                  fontWeight: 300,
                  color: '#F5F3EF',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(245,243,239,0.1)'
                }}
              >
                {t?.nav?.membership || (language === 'ar' ? 'العضوية' : 'Membership')}
              </a>

              <a
                href="/events"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  fontSize: '22px',
                  fontWeight: 300,
                  color: '#F5F3EF',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(245,243,239,0.1)'
                }}
              >
                {t?.nav?.community || (language === 'ar' ? 'المجتمع' : 'Community')}
              </a>

              <a
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  fontSize: '22px',
                  fontWeight: 300,
                  color: '#F5F3EF',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(245,243,239,0.1)'
                }}
              >
                {t?.nav?.about || (language === 'ar' ? 'عن مارس سبيس' : 'About')}
              </a>

              <a
                href="/contact"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  fontSize: '22px',
                  fontWeight: 300,
                  color: '#F5F3EF',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(245,243,239,0.1)'
                }}
              >
                {t?.nav?.contact || (language === 'ar' ? 'تواصل معنا' : 'Contact')}
              </a>
            </div>

            <div style={{ paddingTop: '24px' }}>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setBookingOpen(true);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  background: '#8A4120',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                {t?.nav?.cta || (language === 'ar' ? 'احجز قاعة' : 'Book a room')} →
              </button>
            </div>
          </div>
        )}
      </header>

      <style jsx global>{`
        .nav-link {
          padding: 6px 0;
          background-image: linear-gradient(#C86B3C, #C86B3C);
          background-repeat: no-repeat;
          background-position: 0 100%;
          background-size: 0% 1.5px;
          transition: background-size 320ms cubic-bezier(0.16, 1, 0.30, 1), color 200ms;
        }
        .nav-link:hover {
          background-size: 100% 1.5px;
          color: #F5F3EF !important;
        }

        @media (max-width: 900px) {
          .desktop-nav {
            display: none !important;
          }
          .header-controls {
            margin-inline-start: auto !important;
          }
          .mobile-hamburger-btn {
            display: flex !important;
          }
        }

        @media (max-width: 600px) {
          .logo-img {
            height: 28px !style !important;
          }
          .logo-text {
            font-size: 10px !important;
          }
          .cta-book-btn {
            padding: 7px 12px !important;
            font-size: 12px !important;
          }
          .lang-pill-item {
            padding: 5px 8px !important;
            font-size: 10px !important;
          }
        }

        @media (max-width: 375px) {
          .logo-text {
            display: none !important;
          }
          .cta-book-btn {
            padding: 6px 10px !important;
            font-size: 11px !important;
          }
        }
      `}</style>

      {/* Booking Modal */}
      <BookingModal isOpen={bookingOpen} onClose={() => setBookingOpen(false)} />
    </>
  );
}
