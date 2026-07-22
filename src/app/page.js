'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FloorPlanSection from '../components/FloorPlanSection';

export default function Home() {
  const { t, language, mounted } = useLanguage();
  const [heroTitleIndex, setHeroTitleIndex] = useState(0);

  // States for Quick Book form
  const [quickDate, setQuickDate] = useState('today');
  const [quickTime, setQuickTime] = useState('11:00');
  const [quickDuration, setQuickDuration] = useState('1h');
  const [quickPeople, setQuickPeople] = useState('4');

  // Parallax scroll state
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for scroll-revealed elements
  useEffect(() => {
    if (!mounted) return;
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReducedMotion) return;

    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-active');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal-init');
    revealElements.forEach((el) => observer.observe(el));

    return () => {
      revealElements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, [mounted]);

  if (!mounted) {
    return (
      <div style={{ background: '#0B0B0F', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#C86B3C', fontSize: '18px', fontFamily: 'monospace' }}>MARS SPACE...</div>
      </div>
    );
  }

  // Hero title option mapping
  const titleOptions = t.hero.titleOptions || [
    "Built for people who build.",
    "One floor. Everything the work needs.",
    "Where the work gets done."
  ];

  const currentHeroTitle = titleOptions[heroTitleIndex];

  return (
    <>
      <Header />

      <main style={{ overflowX: 'hidden' }}>
        {/* Section 1: Hero Section */}
        <section
          id="top"
          data-screen-label="Hero"
          style={{
            position: 'relative',
            minHeight: '94vh',
            display: 'flex',
            alignItems: 'flex-end',
            background: 'var(--mars-void)',
            overflow: 'hidden',
          }}
        >
          {/* Background image with parallax */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'url(/assets/photo-community-cinema.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transform: `translateY(${scrollY * 0.15}px) scale(1.06)`,
              transition: 'transform 80ms ease-out',
              zIndex: 1,
            }}
          />
          {/* Dark Overlay Gradient */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(11, 11, 15, 0.96) 0%, rgba(11, 11, 15, 0.55) 55%, rgba(11, 11, 15, 0.25) 100%)',
              zIndex: 2,
            }}
          />

          {/* Hero Content */}
          <div className="container" style={{ position: 'relative', zIndex: 3, paddingBottom: 'clamp(96px, 14vh, 150px)', paddingTop: 'clamp(140px, 18vh, 180px)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '20px',
                animation: 'heroRise 380ms cubic-bezier(0.16, 1, 0.30, 1) 100ms both',
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--copper-400)' }}>
                {t.hero.location}
              </span>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#B9B9C0' }} dir="rtl">
                {language === 'ar' ? 'مارس سبيس، جدة' : 'Mars Space, Jeddah'}
              </span>
            </div>

            {/* Interactive Title Trigger */}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <h1
                onClick={() => setHeroTitleIndex((prev) => (prev + 1) % titleOptions.length)}
                style={{
                  margin: '24px 0 0',
                  fontSize: 'clamp(36px, 6.6vw, 80px)',
                  fontWeight: 200,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.05,
                  maxWidth: '18ch',
                  cursor: 'pointer',
                  animation: 'heroRise 380ms cubic-bezier(0.16, 1, 0.30, 1) 200ms both',
                  userSelect: 'none',
                }}
                title={language === 'ar' ? 'انقر لتغيير العنوان' : 'Click to cycle titles'}
              >
                {currentHeroTitle}
              </h1>
              <span
                style={{
                  position: 'absolute',
                  top: '-15px',
                  right: '-15px',
                  fontSize: '9px',
                  color: 'var(--copper-400)',
                  border: '1px solid var(--copper-400)',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  opacity: 0.6,
                }}
              >
                {language === 'ar' ? 'تفاعلي' : 'SELECT'}
              </span>
            </div>

            <p
              style={{
                margin: '28px 0 0',
                maxWidth: '52ch',
                fontSize: 'clamp(16px, 2vw, 20px)',
                fontWeight: 400,
                lineHeight: 1.6,
                color: 'rgba(245, 245, 245, 0.85)',
                animation: 'heroRise 380ms cubic-bezier(0.16, 1, 0.30, 1) 380ms both',
              }}
            >
              {t.hero.sub}
            </p>

            {/* Accent Rule Line */}
            <div
              style={{
                margin: '36px 0 0',
                height: '1px',
                width: 'min(560px, 60%)',
                background: 'var(--mars-copper)',
                transformOrigin: language === 'ar' ? '100% 50%' : '0 50%',
                animation: 'ruleDraw 700ms cubic-bezier(0.16, 1, 0.30, 1) 550ms both',
              }}
            />

            {/* CTAs */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
                marginTop: '36px',
                animation: 'heroRise 380ms cubic-bezier(0.16, 1, 0.30, 1) 700ms both',
              }}
            >
              <a
                href="#rooms"
                className="btn-pill-primary"
                style={{ padding: '16px 34px', fontSize: '16px' }}
              >
                {t.hero.bookCta}
              </a>
              <a
                href="#floor"
                className="btn-pill-secondary"
                style={{ padding: '16px 34px', fontSize: '16px' }}
              >
                {t.hero.floorCta}
              </a>
            </div>
          </div>
        </section>

        {/* Section 2: Quick-Book Bar */}
        <section data-screen-label="Quick book" style={{ background: 'var(--mars-paper)', padding: '0 0 72px', position: 'relative', zIndex: 10 }}>
          <div className="container">
            <div
              style={{
                position: 'relative',
                marginTop: '-58px',
                background: '#FFFFFF',
                border: '1px solid var(--line-light)',
                borderRadius: '8px',
                padding: '28px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '20px',
                alignItems: 'end',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
              }}
            >
              {/* Date Input */}
              <label style={{ display: 'grid', gap: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--text-muted-light)' }}>
                {t.quickBook.date}
                <select
                  value={quickDate}
                  onChange={(e) => setQuickDate(e.target.value)}
                  style={{
                    border: '1px solid rgba(11, 11, 15, 0.14)',
                    borderRadius: '4px',
                    padding: '13px 14px',
                    fontSize: '16px',
                    color: 'var(--mars-void)',
                    background: '#FFFFFF',
                  }}
                >
                  <option value="today">{t.quickBook.options.today}</option>
                  <option value="sun">{t.quickBook.options.sun}</option>
                  <option value="mon">{t.quickBook.options.mon}</option>
                </select>
              </label>

              {/* Time Input */}
              <label style={{ display: 'grid', gap: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--text-muted-light)' }}>
                {t.quickBook.from}
                <select
                  value={quickTime}
                  onChange={(e) => setQuickTime(e.target.value)}
                  style={{
                    border: '1px solid rgba(11, 11, 15, 0.14)',
                    borderRadius: '4px',
                    padding: '13px 14px',
                    fontSize: '16px',
                    color: 'var(--mars-void)',
                    background: '#FFFFFF',
                  }}
                >
                  <option value="09:00">09:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="13:00">01:00 PM</option>
                  <option value="14:00">02:00 PM</option>
                </select>
              </label>

              {/* Duration Input */}
              <label style={{ display: 'grid', gap: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--text-muted-light)' }}>
                {t.quickBook.duration}
                <select
                  value={quickDuration}
                  onChange={(e) => setQuickDuration(e.target.value)}
                  style={{
                    border: '1px solid rgba(11, 11, 15, 0.14)',
                    borderRadius: '4px',
                    padding: '13px 14px',
                    fontSize: '16px',
                    color: 'var(--mars-void)',
                    background: '#FFFFFF',
                  }}
                >
                  <option value="1h">{t.quickBook.options.h1}</option>
                  <option value="2h">{t.quickBook.options.h2}</option>
                  <option value="half">{t.quickBook.options.hd}</option>
                </select>
              </label>

              {/* People Input */}
              <label style={{ display: 'grid', gap: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--text-muted-light)' }}>
                {t.quickBook.people}
                <select
                  value={quickPeople}
                  onChange={(e) => setQuickPeople(e.target.value)}
                  style={{
                    border: '1px solid rgba(11, 11, 15, 0.14)',
                    borderRadius: '4px',
                    padding: '13px 14px',
                    fontSize: '16px',
                    color: 'var(--mars-void)',
                    background: '#FFFFFF',
                  }}
                >
                  <option value="4">{t.quickBook.options.p4}</option>
                  <option value="6">{t.quickBook.options.p6}</option>
                  <option value="8">{t.quickBook.options.p8}</option>
                </select>
              </label>

              {/* Submit CTA */}
              <a
                href="#rooms"
                className="btn-pill-primary"
                style={{
                  padding: '15px 30px',
                  fontSize: '16px',
                  height: '50px',
                  boxSizing: 'border-box',
                }}
              >
                {t.quickBook.cta}
              </a>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '16px',
                justifyContent: 'space-between',
                marginTop: '14px',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--text-muted-light)',
              }}
            >
              <span>{t.quickBook.subtext}</span>
              <span dir="rtl">{language === 'en' ? 'لا تحتاج إلى عضوية لحجز قاعة اجتماعات.' : 'No membership needed to book a meeting room.'}</span>
            </div>
          </div>
        </section>

        {/* Section 3: Interactive Floor Plan (Dynamic Component) */}
        <FloorPlanSection />

        {/* Section 4: The Six Zones Grid */}
        <section
          id="zones"
          data-screen-label="Six zones"
          style={{ background: 'var(--mars-paper)', color: 'var(--mars-void)', padding: '0 0 clamp(72px, 10vw, 128px)' }}
        >
          <div style={{ height: '1px', background: 'var(--mars-copper)' }} />
          <div className="container" style={{ paddingTop: 'clamp(56px, 7vw, 88px)' }}>
            <h2
              className="reveal-init"
              style={{
                margin: 0,
                fontSize: 'clamp(28px, 3vw, 40px)',
                fontWeight: 300,
                letterSpacing: '-0.015em',
                lineHeight: 1.15,
                maxWidth: '20ch',
              }}
            >
              {t.zones.h2}
            </h2>

            <div
              className="reveal-init stagger-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '32px',
                marginTop: '56px',
              }}
            >
              {t.zones.items.map((zone, idx) => {
                // Get corresponding local asset photos based on indices
                const imgs = [
                  '/assets/photo-glass-offices.jpg',
                  '/assets/photo-coworking.jpg',
                  '/assets/photo-vip-lounge.jpg',
                  '/assets/photo-community-cinema.jpg',
                  '/assets/photo-community-cinema.jpg',
                  '/assets/photo-lounge-velvet.jpg',
                ];
                const anchors = ['#floor', '#floor', '#rooms', '#floor', '#community', '#floor'];

                return (
                  <a
                    key={idx}
                    href={anchors[idx]}
                    style={{
                      display: 'block',
                      border: '1px solid rgba(11, 11, 15, 0.10)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: '#FFFFFF',
                      color: 'var(--mars-void)',
                      transition: 'transform var(--dur-instant) var(--ease-out)',
                    }}
                    className="zone-card"
                  >
                    <div style={{ aspectRatio: '4/5', overflow: 'hidden' }}>
                      <img
                        src={imgs[idx]}
                        alt={zone.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                          transition: 'transform var(--dur-base) var(--ease-out)',
                        }}
                        className="zone-card-img"
                      />
                    </div>
                    <div style={{ padding: '22px' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px' }}>
                        <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 600, letterSpacing: '-0.01em' }}>
                          {language === 'ar' ? zone.ar : zone.name}
                        </h3>
                        <span style={{ fontSize: '14px', color: 'var(--text-muted-light)' }}>
                          {zone.ar}
                        </span>
                      </div>
                      <p style={{ margin: '10px 0 0', fontSize: '15px', color: 'var(--text-muted-light)', lineHeight: 1.6 }}>
                        {zone.line}
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '18px',
                          fontSize: '14px',
                        }}
                      >
                        <span style={{ fontWeight: 500, color: 'var(--text-muted-light)' }}>{zone.cap}</span>
                        <span style={{ fontWeight: 600, color: 'var(--mars-copper)' }}>{zone.cta}</span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

          <style jsx>{`
            .zone-card:hover {
              transform: translateY(-4px);
            }
            .zone-card:hover .zone-card-img {
              transform: scale(1.03);
            }
          `}</style>
        </section>

        {/* Section 5: Available Today (Rooms Live) */}
        <section id="rooms" data-screen-label="Meeting rooms live" style={{ background: 'var(--mars-void)', padding: 'clamp(72px, 10vw, 128px) 0' }}>
          <div className="container">
            <div
              className="reveal-init"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
                gap: '48px',
                alignItems: 'end',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '20px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--copper-400)' }}>
                    {t.roomsLive.eyebrow}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted-dark)' }}>
                    {language === 'ar' ? 'متاح اليوم' : 'Available today'}
                  </span>
                </div>
                <h2 style={{ margin: '20px 0 0', fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 300, letterSpacing: '-0.015em', lineHeight: 1.15 }}>
                  {t.roomsLive.h2}
                </h2>
              </div>
              <p style={{ margin: 0, color: 'rgba(245, 245, 245, 0.72)' }}>
                {t.roomsLive.desc}
              </p>
            </div>

            {/* Room List Horizontal Grid / Slider */}
            <div
              className="reveal-init"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '24px',
                marginTop: '56px',
              }}
            >
              {t.roomsLive.rooms.map((room, idx) => {
                const statusColor =
                  room.status.includes('Free now') || room.status.includes('متاح الآن')
                    ? 'var(--copper-400)'
                    : 'var(--text-muted-dark)';
                const statusBorder =
                  room.status.includes('Free now') || room.status.includes('متاح الآن')
                    ? '1px solid rgba(200, 107, 60, 0.45)'
                    : '1px solid rgba(245, 245, 245, 0.18)';

                return (
                  <a
                    key={idx}
                    href="#rooms"
                    style={{
                      display: 'block',
                      background: 'var(--mars-slate)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      color: 'var(--mars-paper)',
                      transition: 'transform var(--dur-instant) var(--ease-out), background var(--dur-instant) var(--ease-out)',
                    }}
                    className="room-card"
                  >
                    <div style={{ aspectRatio: '3/2', overflow: 'hidden' }}>
                      <img
                        src={room.img}
                        alt={room.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                          transition: 'transform var(--dur-base) var(--ease-out)',
                        }}
                        className="room-card-img"
                      />
                    </div>
                    <div style={{ padding: '22px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{room.name}</h3>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: statusColor, border: statusBorder, borderRadius: '999px', padding: '5px 12px', lineHeight: 1 }}>
                          {room.status}
                        </span>
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-muted-dark)', fontWeight: 500 }}>
                        {room.seats} · {room.display}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: '8px',
                          marginTop: '18px',
                          paddingTop: '14px',
                          borderTop: '1px solid rgba(245, 245, 245, 0.10)',
                        }}
                      >
                        <span style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.01em' }}>
                          <bdi>{room.rate}</bdi>
                        </span>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted-dark)', fontWeight: 500 }}>
                          {t.roomsLive.hourlyRateSub}
                        </span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 6: Membership Plans */}
        <section
          id="membership"
          data-screen-label="Membership"
          style={{ background: 'var(--mars-void)', padding: 'clamp(72px, 10vw, 128px) 0', borderTop: '1px solid rgba(245, 245, 245, 0.10)' }}
        >
          <div className="container">
            <div className="reveal-init">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '20px' }}>
                <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--copper-400)' }}>
                  {t.membership.eyebrow}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted-dark)' }}>
                  {language === 'ar' ? 'العضوية' : 'Membership'}
                </span>
              </div>
              <h2 style={{ margin: '20px 0 0', fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 300, letterSpacing: '-0.015em', lineHeight: 1.15 }}>
                {t.membership.h2}
              </h2>
            </div>

            {/* Plans Staggered Grid */}
            <div
              className="reveal-init"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '24px',
                marginTop: '56px',
              }}
            >
              {t.membership.plans.map((plan, idx) => {
                const borderVal = plan.isFeatured
                  ? '1px solid rgba(200, 107, 60, 0.5)'
                  : '1px solid rgba(245, 245, 245, 0.10)';
                const labelColor = plan.isFeatured ? 'var(--copper-400)' : 'var(--text-muted-dark)';

                return (
                  <div
                    key={idx}
                    style={{
                      border: borderVal,
                      borderRadius: '8px',
                      padding: '28px',
                      transition: 'background var(--dur-instant) var(--ease-out)',
                    }}
                    className="plan-card"
                  >
                    <div style={{ fontSize: '14px', fontWeight: 500, color: labelColor }}>
                      {plan.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
                      <span style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.01em' }}>
                        <bdi>{plan.price}</bdi>
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted-dark)' }}>{plan.sub}</span>
                    </div>
                    <div style={{ display: 'grid', gap: '10px', marginTop: '22px', fontSize: '14px', color: 'rgba(245, 245, 245, 0.78)' }}>
                      {plan.bullets.map((bullet, bIdx) => (
                        <div key={bIdx} style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              background: 'var(--mars-copper)',
                              flex: 'none',
                              transform: 'translateY(-1px)',
                            }}
                          />
                          {bullet}
                        </div>
                      ))}
                    </div>
                    <a href="#membership" style={{ display: 'inline-block', marginTop: '24px', fontSize: '14px', fontWeight: 600, color: 'var(--copper-400)' }}>
                      {plan.cta}
                    </a>
                  </div>
                );
              })}
            </div>

            {/* Compare plans link */}
            <div className="reveal-init" style={{ display: 'flex', justifyContent: 'center', marginTop: '48px' }}>
              <a
                href="#membership"
                className="btn-pill-secondary"
                style={{ padding: '15px 32px', fontSize: '15px' }}
              >
                {t.membership.compareCta}
              </a>
            </div>
          </div>
        </section>

        {/* Section 7: Community Space & Checklist */}
        <section
          id="community"
          data-screen-label="Community space"
          style={{ background: 'var(--mars-paper)', color: 'var(--mars-void)', padding: '0 0 clamp(72px, 10vw, 128px)' }}
        >
          <div style={{ height: '1px', background: 'var(--mars-copper)' }} />
          <div className="container" style={{ paddingTop: 'clamp(56px, 7vw, 88px)' }}>
            <div
              className="reveal-init"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
                gap: '48px',
                alignItems: 'end',
              }}
            >
              <h2 style={{ margin: 0, fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 300, letterSpacing: '-0.015em', lineHeight: 1.15 }}>
                {t.communitySection.h2}
              </h2>
              <div>
                <p style={{ margin: 0, color: 'var(--text-muted-light)' }}>{t.communitySection.desc}</p>
                <a
                  href="#location"
                  className="btn-pill-primary"
                  style={{
                    padding: '14px 30px',
                    fontSize: '15px',
                    marginTop: '24px',
                  }}
                >
                  {t.communitySection.cta}
                </a>
              </div>
            </div>

            {/* Wide layout image display */}
            <div className="reveal-init community-image-container">
              <img
                src="/assets/photo-community-cinema.jpg"
                alt="Community space set up for a screening"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>

            {/* Amenities Grid */}
            <div
              className="reveal-init"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                gap: '12px 32px',
                marginTop: '88px',
                paddingTop: '48px',
                borderTop: '1px solid rgba(11, 11, 15, 0.10)',
              }}
            >
              {t.communitySection.amenities.map((amenity, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '10px 0', fontSize: '15px', fontWeight: 500 }}>
                  <span
                    style={{
                      width: '9px',
                      height: '9px',
                      border: '1.5px solid var(--mars-copper)',
                      flex: 'none',
                    }}
                  />
                  {amenity}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 8: Location, hours & directions */}
        <section id="location" data-screen-label="Location" style={{ background: 'var(--mars-paper)', color: 'var(--mars-void)', padding: '0 0 clamp(72px, 10vw, 128px)' }}>
          <div className="container">
            <div
              className="reveal-init"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
                gap: 'clamp(32px, 4vw, 64px)',
                alignItems: 'start',
                paddingTop: '48px',
                borderTop: '1px solid rgba(11, 11, 15, 0.10)',
              }}
            >
              {/* Map block */}
              <div>
                <h2 style={{ margin: '0 0 32px', fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 300, letterSpacing: '-0.015em' }}>
                  {t.locationSection.h2}{' '}
                  <span style={{ fontSize: '0.75em', color: 'var(--text-muted-light)' }} dir="rtl">
                    {language === 'ar' ? '' : 'موقعنا.'}
                  </span>
                </h2>
                <div className="map-image-container">
                  <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '12px', color: 'var(--text-muted-dark)' }}>
                    {t.locationSection.mapPlaceholder}
                  </span>
                </div>
              </div>

              {/* Text Address & Hours Block */}
              <div style={{ paddingTop: 'clamp(0px, 5vw, 76px)' }}>
                <div style={{ fontSize: '18px', fontWeight: 600 }}>{t.locationSection.name}</div>
                <p style={{ margin: '6px 0 0', color: 'var(--text-muted-light)', fontSize: '15px', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                  {t.locationSection.address}
                </p>

                {language === 'en' && (
                  <div dir="rtl" style={{ marginTop: '10px', color: 'var(--text-muted-light)', fontSize: '15px', lineHeight: 1.8 }}>
                    [العنوان]، [الحي]، جدة، المملكة العربية السعودية
                  </div>
                )}

                <div style={{ display: 'flex', gap: '20px', marginTop: '18px', fontSize: '14px', fontWeight: 600 }}>
                  <a href="#location" style={{ color: 'var(--mars-copper)' }}>
                    {t.locationSection.gmaps}
                  </a>
                  <a href="#location" style={{ color: 'var(--mars-copper)' }}>
                    {t.locationSection.appleMaps}
                  </a>
                </div>

                {/* Opening Hours list */}
                <div style={{ display: 'grid', marginTop: '32px', fontSize: '14px' }}>
                  {t.locationSection.hours.map((hour, idx) => {
                    const borderStyle =
                      idx === t.locationSection.hours.length - 1
                        ? { borderTop: '1px solid rgba(11, 11, 15, 0.10)', borderBottom: '1px solid rgba(11, 11, 15, 0.10)' }
                        : { borderTop: '1px solid rgba(11, 11, 15, 0.10)' };
                    const timeColor = hour.highlight ? 'var(--mars-copper)' : 'inherit';

                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '16px',
                          padding: '12px 0',
                          fontWeight: hour.highlight ? 600 : 'normal',
                          ...borderStyle,
                        }}
                      >
                        <span style={{ fontWeight: 500, color: 'var(--text-muted-light)' }}>{hour.label}</span>
                        <span style={{ fontWeight: 600, color: timeColor }}>
                          <bdi>{hour.time}</bdi>
                        </span>
                        <span style={{ color: 'var(--text-muted-light)' }} dir="rtl">
                          {language === 'ar' ? '' : hour.labelAr || ''}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <p style={{ margin: '18px 0 0', fontSize: '14px', color: 'var(--text-muted-light)' }}>
                  {t.locationSection.parking}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 9: Mars Ecosystem Marquee */}
        <section id="ecosystem" data-screen-label="Mars ecosystem" style={{ background: 'var(--mars-slate)', padding: 'clamp(64px, 9vw, 112px) 0', overflow: 'hidden' }}>
          <div className="container">
            <div
              className="reveal-init"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
                gap: '48px',
                alignItems: 'end',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '20px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--copper-400)' }}>
                    {t.ecosystem.eyebrow}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted-dark)' }}>
                    {language === 'ar' ? 'جزء من مارس' : 'Part of Mars'}
                  </span>
                </div>
                <h2 style={{ margin: '20px 0 0', fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 300, letterSpacing: '-0.015em', lineHeight: 1.15 }}>
                  {t.ecosystem.h2}
                </h2>
              </div>
              <p style={{ margin: 0, color: 'rgba(245, 245, 245, 0.72)' }}>
                {t.ecosystem.desc}
              </p>
            </div>
          </div>

          {/* Continuous scrolling marquee */}
          <div
            style={{
              marginTop: '72px',
              borderTop: '1px solid rgba(245, 245, 245, 0.10)',
              borderBottom: '1px solid rgba(245, 245, 245, 0.10)',
              padding: '36px 0',
            }}
          >
            <div className="marquee-container">
              <div className={language === 'ar' ? 'marquee-content-rtl' : 'marquee-content-ltr'}>
                {/* Loop 1 */}
                <span style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
                  <img src="/assets/mars-wordmark-white.png" alt="MARS" style={{ height: '24px' }} />
                  <span style={{ fontSize: '24px', fontWeight: 300, color: 'var(--text-muted-dark)' }}>Ventures</span>
                </span>
                <span style={{ width: '8px', height: '8px', background: 'var(--mars-copper)', transform: 'rotate(45deg)', alignSelf: 'center' }}></span>

                <span style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
                  <img src="/assets/mars-wordmark-white.png" alt="MARS" style={{ height: '24px' }} />
                  <span style={{ fontSize: '24px', fontWeight: 300, color: 'var(--text-muted-dark)' }}>Lab</span>
                </span>
                <span style={{ width: '8px', height: '8px', background: 'var(--mars-copper)', transform: 'rotate(45deg)', alignSelf: 'center' }}></span>

                <span style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
                  <img src="/assets/mars-wordmark-white.png" alt="MARS" style={{ height: '24px' }} />
                  <span style={{ fontSize: '24px', fontWeight: 300, color: 'var(--text-muted-dark)' }}>VC</span>
                </span>
                <span style={{ width: '8px', height: '8px', background: 'var(--mars-copper)', transform: 'rotate(45deg)', alignSelf: 'center' }}></span>

                <span style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
                  <img src="/assets/mars-wordmark-white.png" alt="MARS" style={{ height: '24px' }} />
                  <span style={{ fontSize: '24px', fontWeight: 300, color: 'var(--text-muted-dark)' }}>Consultancy</span>
                </span>
                <span style={{ width: '8px', height: '8px', background: 'var(--mars-copper)', transform: 'rotate(45deg)', alignSelf: 'center' }}></span>

                <span style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
                  <img src="/assets/mars-wordmark-white.png" alt="MARS" style={{ height: '24px' }} />
                  <span style={{ fontSize: '24px', fontWeight: 300, color: 'var(--copper-400)' }}>Space</span>
                </span>
                <span style={{ width: '8px', height: '8px', background: 'var(--mars-copper)', transform: 'rotate(45deg)', alignSelf: 'center' }}></span>

                {/* Loop 2 (Duplicates for continuous scrolling) */}
                <span style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
                  <img src="/assets/mars-wordmark-white.png" alt="MARS" style={{ height: '24px' }} />
                  <span style={{ fontSize: '24px', fontWeight: 300, color: 'var(--text-muted-dark)' }}>Ventures</span>
                </span>
                <span style={{ width: '8px', height: '8px', background: 'var(--mars-copper)', transform: 'rotate(45deg)', alignSelf: 'center' }}></span>

                <span style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
                  <img src="/assets/mars-wordmark-white.png" alt="MARS" style={{ height: '24px' }} />
                  <span style={{ fontSize: '24px', fontWeight: 300, color: 'var(--text-muted-dark)' }}>Lab</span>
                </span>
                <span style={{ width: '8px', height: '8px', background: 'var(--mars-copper)', transform: 'rotate(45deg)', alignSelf: 'center' }}></span>

                <span style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
                  <img src="/assets/mars-wordmark-white.png" alt="MARS" style={{ height: '24px' }} />
                  <span style={{ fontSize: '24px', fontWeight: 300, color: 'var(--text-muted-dark)' }}>VC</span>
                </span>
                <span style={{ width: '8px', height: '8px', background: 'var(--mars-copper)', transform: 'rotate(45deg)', alignSelf: 'center' }}></span>

                <span style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
                  <img src="/assets/mars-wordmark-white.png" alt="MARS" style={{ height: '24px' }} />
                  <span style={{ fontSize: '24px', fontWeight: 300, color: 'var(--text-muted-dark)' }}>Consultancy</span>
                </span>
                <span style={{ width: '8px', height: '8px', background: 'var(--mars-copper)', transform: 'rotate(45deg)', alignSelf: 'center' }}></span>

                <span style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
                  <img src="/assets/mars-wordmark-white.png" alt="MARS" style={{ height: '24px' }} />
                  <span style={{ fontSize: '24px', fontWeight: 300, color: 'var(--copper-400)' }}>Space</span>
                </span>
                <span style={{ width: '8px', height: '8px', background: 'var(--mars-copper)', transform: 'rotate(45deg)', alignSelf: 'center' }}></span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 10: Closing CTA */}
        <section data-screen-label="Closing CTA" style={{ background: 'var(--mars-void)', padding: 'clamp(88px, 13vw, 160px) 0' }}>
          <div className="container" style={{ textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 'clamp(32px, 4vw, 56px)', fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {t.closingCta.h2}
            </h2>
            <div style={{ marginTop: '12px', fontSize: 'clamp(20px, 2vw, 28px)', fontWeight: 300, color: 'var(--text-muted-dark)' }} dir="rtl">
              {language === 'ar' ? 'تعال وشاهد الطابق.' : ''}
            </div>
            <p style={{ margin: '24px auto 0', maxWidth: '44ch', color: 'rgba(245, 245, 245, 0.72)' }}>
              {t.closingCta.sub}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px', marginTop: '40px' }}>
              <a
                href="#location"
                className="btn-pill-primary"
                style={{ padding: '16px 34px', fontSize: '16px' }}
              >
                {t.closingCta.tourBtn}
              </a>
              <a
                href="#rooms"
                className="btn-pill-secondary"
                style={{ padding: '16px 34px', fontSize: '16px' }}
              >
                {t.closingCta.roomBtn}
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
