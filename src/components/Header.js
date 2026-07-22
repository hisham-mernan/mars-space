'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import BookingModal from './BookingModal';

export default function Header() {
  const { language, toggleLanguage } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
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
            background: scrolled ? 'rgba(11, 11, 15, 0.85)' : 'transparent',
            borderBottom: scrolled ? '1px solid rgba(245, 243, 239, 0.08)' : '1px solid transparent',
            backdropFilter: scrolled ? 'blur(16px)' : 'none',
            WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
            transition: 'opacity 400ms ease',
          }}
        />

        <div
          style={{
            position: 'relative',
            maxWidth: '1600px',
            margin: '0 auto',
            padding: '0 clamp(24px, 4vw, 72px)',
            height: '88px',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            gap: 'clamp(20px, 3vw, 48px)',
          }}
        >
          {/* Brand Logo & Lockup */}
          <a href="#top" style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
            <img
              src="/assets/mars-lockup-white.png"
              alt="MARS مارس"
              style={{ height: '40px', display: 'block' }}
            />
            <span
              style={{
                fontSize: '13px',
                fontWeight: 500,
                letterSpacing: '0.1em',
                color: '#A8A49D',
                paddingBottom: '3px',
                textTransform: 'uppercase',
              }}
            >
              {language === 'ar' ? 'سبيس' : 'SPACE'}
            </span>
          </a>

          {/* Navigation Links */}
          <nav
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px clamp(16px, 2.2vw, 36px)',
              marginInlineStart: 'auto',
              fontSize: '15px',
              fontWeight: 400,
              whiteSpace: 'nowrap',
              color: '#F5F3EF',
            }}
            className="desktop-nav"
          >
            <a href="#space" className="nav-link">{language === 'ar' ? 'المساحة' : 'The Space'}</a>
            <a href="#explore" className="nav-link">{language === 'ar' ? 'استكشف' : 'Explore'}</a>
            <a href="#offices" className="nav-link">{language === 'ar' ? 'المكاتب' : 'Offices'}</a>
            <a href="#membership" className="nav-link">{language === 'ar' ? 'العضويات' : 'Membership'}</a>
            <a href="#community" className="nav-link">{language === 'ar' ? 'المجتمع' : 'Community'}</a>
            <a href="#visit" className="nav-link">{language === 'ar' ? 'زيارة' : 'Visit'}</a>
          </nav>

          {/* Language Switcher Pill */}
          <div
            onClick={toggleLanguage}
            style={{
              display: 'flex',
              flex: 'none',
              border: '1px solid rgba(245, 243, 239, 0.2)',
              borderRadius: '999px',
              overflow: 'hidden',
              fontSize: '12px',
              fontWeight: 500,
              lineHeight: 1,
              cursor: 'pointer'
            }}
          >
            <span
              style={{
                padding: '8px 13px',
                color: language === 'ar' ? '#0B0B0F' : '#A8A49D',
                background: language === 'ar' ? '#F5F3EF' : 'transparent',
                transition: 'all 200ms ease'
              }}
            >
              عربي
            </span>
            <span
              style={{
                padding: '8px 13px',
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
            style={{
              display: 'inline-flex',
              flex: 'none',
              alignItems: 'center',
              gap: '10px',
              background: '#8A4120',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '999px',
              padding: '12px 26px',
              font: "500 15px 'Thmanyah Sans', sans-serif",
              lineHeight: 1,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'background 250ms, gap 250ms'
            }}
          >
            {user ? (language === 'ar' ? 'لوحة التحكم' : 'Dashboard') : (language === 'ar' ? 'احجز مساحة' : 'Book a space')}
            <span style={{ fontSize: '15px', lineHeight: 1 }}>→</span>
          </button>
        </div>
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
        }
      `}</style>

      {/* Booking Modal */}
      <BookingModal isOpen={bookingOpen} onClose={() => setBookingOpen(false)} />
    </>
  );
}
