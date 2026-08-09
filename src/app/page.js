'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BookingModal from '../components/BookingModal';

export default function Home() {
  const { language, t, mounted } = useLanguage();

  // Booking Modal State
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingFlow, setBookingFlow] = useState('book');
  const [initialSpaceIndex, setInitialSpaceIndex] = useState(0);
  const [initialOfficeIndex, setInitialOfficeIndex] = useState(0);
  const [initialPlanIndex, setInitialPlanIndex] = useState(0);

  // Gallery Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState(null);

  if (!mounted) return null;

  const h = t?.hero || {};
  const hs = t?.heroSupport || {};
  const ss = t?.spacesSection || {};
  const cards = ss.cards || {};
  const vs = t?.visualStorytelling || {};
  const photo = t?.photography || {};
  const am = t?.amenitiesSection || {};
  const mem = t?.membershipSection || {};
  const mr = t?.meetingRoomsSection || {};
  const comm = t?.communitySection || {};
  const ev = t?.eventsSection || {};
  const tr = t?.tourSection || {};

  const openBookFlow = (spaceIdx = 0) => {
    setBookingFlow('book');
    setInitialSpaceIndex(spaceIdx);
    setBookingOpen(true);
  };

  const openOfficeFlow = (officeIdx = 0) => {
    setBookingFlow('office');
    setInitialOfficeIndex(officeIdx);
    setBookingOpen(true);
  };

  const openPlanFlow = (planIdx = 0) => {
    setBookingFlow('plan');
    setInitialPlanIndex(planIdx);
    setBookingOpen(true);
  };

  const galleryImages = [
    { src: '/assets/photo-glass-offices.jpg', title: language === 'ar' ? 'مكاتب خاصة' : 'Private Offices' },
    { src: '/assets/photo-meeting-room.jpg', title: language === 'ar' ? 'قاعات الاجتماعات' : 'Meeting Rooms' },
    { src: '/assets/photo-community-space.jpg', title: language === 'ar' ? 'المجتمع' : 'Community' },
    { src: '/assets/photo-lounge-velvet.jpg', title: language === 'ar' ? 'صالة الاستراحة' : 'Lounge' },
    { src: '/assets/photo-barista-cafe.jpg', title: language === 'ar' ? 'القهوة المختصة' : 'Coffee' },
    { src: '/assets/photo-hall-full.jpg', title: language === 'ar' ? 'مساحة الفعاليات' : 'Event Space' }
  ];

  return (
    <>
      <Header />

      <main style={{ minHeight: '100vh', background: '#07070A', color: '#F5F3EF' }}>
        
        {/* Section 1: Homepage Hero (§3) */}
        <section
          style={{
            position: 'relative',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            paddingTop: '120px',
            paddingBottom: '80px'
          }}
        >
          {/* Subtle Background Layer */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'url(/assets/photo-glass-offices.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(0.35)',
              transform: 'scale(1.03)',
              transition: 'transform 8s ease'
            }}
          />

          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, rgba(7,7,10,0.4) 0%, rgba(7,7,10,0.92) 100%)' }} />

          <div style={{ position: 'relative', zIndex: 10, maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)', textAlign: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', color: '#C86B3C', textTransform: 'uppercase' }}>
              {h.eyebrow}
            </span>

            <h1 style={{ fontSize: 'clamp(42px, 6vw, 92px)', fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.05, margin: '20px 0 24px', textWrap: 'balance' }}>
              {h.headline}
            </h1>

            <p style={{ fontSize: 'clamp(18px, 2vw, 24px)', fontWeight: 300, color: 'rgba(245, 243, 239, 0.75)', maxWidth: '44ch', margin: '0 auto 40px', lineHeight: 1.6 }}>
              {h.sub}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <a
                href="/spaces"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#8A4120',
                  color: '#FFFFFF',
                  padding: '16px 36px',
                  borderRadius: '999px',
                  fontSize: '16px',
                  fontWeight: 500,
                  transition: 'background 250ms, transform 250ms'
                }}
              >
                {h.primaryCta} →
              </a>

              <a
                href="/contact?type=tour"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'transparent',
                  color: '#F5F3EF',
                  border: '1px solid rgba(245, 243, 239, 0.3)',
                  padding: '16px 36px',
                  borderRadius: '999px',
                  fontSize: '16px',
                  fontWeight: 500,
                  transition: 'border-color 250ms'
                }}
              >
                {h.secondaryCta}
              </a>
            </div>

            <p style={{ fontSize: '14px', color: 'rgba(245, 243, 239, 0.5)', margin: 0 }}>
              <a href="/spaces?category=meeting_room" style={{ textDecoration: 'underline', color: 'rgba(245,243,239,0.7)' }}>
                {h.microCtaText}
              </a>
            </p>
          </div>
        </section>

        {/* Section 2: Hero Supporting Statement (§4) */}
        <section style={{ background: '#0D0D12', padding: 'clamp(80px, 12vh, 140px) 0', borderTop: '1px solid rgba(245,243,239,0.08)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)', textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(32px, 4.5vw, 64px)', fontWeight: 300, letterSpacing: '-0.02em', color: '#F5F3EF', margin: '0 0 20px' }}>
              {hs.headline}
            </h2>
            <p style={{ fontSize: 'clamp(18px, 2vw, 24px)', fontWeight: 300, color: 'rgba(245,243,239,0.7)', maxWidth: '42ch', margin: '0 auto', lineHeight: 1.6 }}>
              {hs.body}
            </p>
          </div>
        </section>

        {/* Section 3: Spaces Section & Cards (§5 & §6) */}
        <section id="spaces" style={{ padding: 'clamp(100px, 14vh, 180px) 0', background: '#07070A' }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)', boxSizing: 'border-box' }}>
            
            <div style={{ maxWidth: '720px', marginBottom: 'clamp(48px, 6vh, 80px)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', color: '#C86B3C', textTransform: 'uppercase' }}>
                {ss.eyebrow}
              </span>
              <h2 style={{ fontSize: 'clamp(36px, 4.5vw, 64px)', fontWeight: 300, letterSpacing: '-0.02em', margin: '16px 0 20px', lineHeight: 1.1 }}>
                {ss.headline}
              </h2>
              <p style={{ fontSize: '18px', fontWeight: 300, color: 'rgba(245, 243, 239, 0.7)', lineHeight: 1.65, margin: 0 }}>
                {ss.body}
              </p>
            </div>

            {/* 4 Cards Grid (§6) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
              
              {/* Private Offices */}
              <div
                className="space-card"
                style={{
                  background: '#111116',
                  border: '1px solid rgba(245, 243, 239, 0.08)',
                  borderRadius: '12px',
                  padding: '40px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 300ms ease, border-color 300ms ease'
                }}
              >
                <div>
                  <h3 style={{ fontSize: '26px', fontWeight: 300, margin: '0 0 16px', color: '#F5F3EF' }}>{cards.offices?.title}</h3>
                  <p style={{ fontSize: '16px', fontWeight: 300, color: 'rgba(245, 243, 239, 0.65)', lineHeight: 1.6, margin: '0 0 32px' }}>{cards.offices?.desc}</p>
                </div>
                <a href="/spaces?category=private_office" style={{ color: '#C86B3C', fontSize: '15px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {cards.offices?.cta} →
                </a>
              </div>

              {/* Dedicated Desks */}
              <div
                className="space-card"
                style={{
                  background: '#111116',
                  border: '1px solid rgba(245, 243, 239, 0.08)',
                  borderRadius: '12px',
                  padding: '40px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 300ms ease, border-color 300ms ease'
                }}
              >
                <div>
                  <h3 style={{ fontSize: '26px', fontWeight: 300, margin: '0 0 16px', color: '#F5F3EF' }}>{cards.dedicated?.title}</h3>
                  <p style={{ fontSize: '16px', fontWeight: 300, color: 'rgba(245, 243, 239, 0.65)', lineHeight: 1.6, margin: '0 0 32px' }}>{cards.dedicated?.desc}</p>
                </div>
                <a href="/pricing" style={{ color: '#C86B3C', fontSize: '15px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {cards.dedicated?.cta} →
                </a>
              </div>

              {/* Meeting Rooms */}
              <div
                className="space-card"
                style={{
                  background: '#111116',
                  border: '1px solid rgba(245, 243, 239, 0.08)',
                  borderRadius: '12px',
                  padding: '40px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 300ms ease, border-color 300ms ease'
                }}
              >
                <div>
                  <h3 style={{ fontSize: '26px', fontWeight: 300, margin: '0 0 16px', color: '#F5F3EF' }}>{cards.meetingRooms?.title}</h3>
                  <p style={{ fontSize: '16px', fontWeight: 300, color: 'rgba(245, 243, 239, 0.65)', lineHeight: 1.6, margin: '0 0 32px' }}>{cards.meetingRooms?.desc}</p>
                </div>
                <a href="/spaces?category=meeting_room" style={{ color: '#C86B3C', fontSize: '15px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {cards.meetingRooms?.cta} →
                </a>
              </div>

              {/* Event Spaces */}
              <div
                className="space-card"
                style={{
                  background: '#111116',
                  border: '1px solid rgba(245, 243, 239, 0.08)',
                  borderRadius: '12px',
                  padding: '40px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 300ms ease, border-color 300ms ease'
                }}
              >
                <div>
                  <h3 style={{ fontSize: '26px', fontWeight: 300, margin: '0 0 16px', color: '#F5F3EF' }}>{cards.eventSpaces?.title}</h3>
                  <p style={{ fontSize: '16px', fontWeight: 300, color: 'rgba(245, 243, 239, 0.65)', lineHeight: 1.6, margin: '0 0 32px' }}>{cards.eventSpaces?.desc}</p>
                </div>
                <a href="/events" style={{ color: '#C86B3C', fontSize: '15px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {cards.eventSpaces?.cta} →
                </a>
              </div>

            </div>
          </div>
        </section>

        {/* Section 4: Visual Storytelling — Replacing Floor Plan (§7) */}
        <section style={{ background: '#0D0D12', padding: 'clamp(100px, 14vh, 180px) 0' }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)', boxSizing: 'border-box' }}>
            <div style={{ maxWidth: '720px', marginBottom: 'clamp(48px, 6vh, 80px)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', color: '#C86B3C', textTransform: 'uppercase' }}>
                {vs.eyebrow}
              </span>
              <h2 style={{ fontSize: 'clamp(36px, 4.5vw, 64px)', fontWeight: 300, letterSpacing: '-0.02em', margin: '16px 0 20px', lineHeight: 1.1 }}>
                {vs.headline}
              </h2>
              <p style={{ fontSize: '18px', fontWeight: 300, color: 'rgba(245, 243, 239, 0.7)', lineHeight: 1.65, margin: 0 }}>
                {vs.body}
              </p>
            </div>

            {/* Editorial Visual Storytelling Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
              {(vs.items || []).map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => setLightboxIndex(idx)}
                  className="story-card"
                  style={{
                    position: 'relative',
                    aspectRatio: '16/11',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: '#16161F'
                  }}
                >
                  <img
                    src={item.img}
                    alt={item.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      transition: 'transform 700ms cubic-bezier(0.16, 1, 0.30, 1)'
                    }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(7,7,10,0.85) 0%, rgba(7,7,10,0.1) 60%)' }} />
                  <div style={{ position: 'absolute', bottom: '24px', left: '24px', right: '24px' }}>
                    <h4 style={{ margin: 0, fontSize: '22px', fontWeight: 400, color: '#FFFFFF' }}>{item.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 5: Photography Section (§8) */}
        <section style={{ background: '#07070A', padding: 'clamp(100px, 14vh, 180px) 0', overflow: 'hidden' }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)', boxSizing: 'border-box' }}>
            <div style={{ maxWidth: '720px', marginBottom: 'clamp(48px, 6vh, 80px)' }}>
              <h2 style={{ fontSize: 'clamp(36px, 4.5vw, 64px)', fontWeight: 300, letterSpacing: '-0.02em', margin: '0 0 20px', lineHeight: 1.1 }}>
                {photo.headline}
              </h2>
              <p style={{ fontSize: '18px', fontWeight: 300, color: 'rgba(245, 243, 239, 0.7)', lineHeight: 1.65, margin: 0 }}>
                {photo.body}
              </p>
            </div>

            {/* Horizontal Scroll / Showcase Strip */}
            <div style={{ display: 'flex', gap: '24px', overflowX: 'auto', paddingBottom: '24px', scrollbarWidth: 'none' }}>
              {galleryImages.map((gImg, gIdx) => (
                <div
                  key={gIdx}
                  onClick={() => setLightboxIndex(gIdx)}
                  style={{
                    flex: 'none',
                    width: 'clamp(300px, 45vw, 600px)',
                    aspectRatio: '16/10',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <img
                    src={gImg.src}
                    alt={gImg.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 600ms ease' }}
                  />
                  <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(7,7,10,0.7)', backdropFilter: 'blur(8px)', padding: '6px 14px', borderRadius: '999px', fontSize: '13px', color: '#F5F3EF' }}>
                    {gImg.title}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 6: Amenities (§9) */}
        <section style={{ background: '#0D0D12', padding: 'clamp(100px, 14vh, 180px) 0' }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)', boxSizing: 'border-box' }}>
            <div style={{ maxWidth: '720px', marginBottom: 'clamp(48px, 6vh, 80px)' }}>
              <h2 style={{ fontSize: 'clamp(36px, 4.5vw, 64px)', fontWeight: 300, letterSpacing: '-0.02em', margin: '0 0 20px', lineHeight: 1.1 }}>
                {am.headline}
              </h2>
              <p style={{ fontSize: '18px', fontWeight: 300, color: 'rgba(245, 243, 239, 0.7)', lineHeight: 1.65, margin: 0 }}>
                {am.body}
              </p>
            </div>

            {/* Editorial List Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
              {(am.items || []).map((item, aIdx) => (
                <div
                  key={aIdx}
                  style={{
                    padding: '24px 28px',
                    background: '#16161F',
                    border: '1px solid rgba(245, 243, 239, 0.08)',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 400,
                    color: '#F5F3EF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <span style={{ color: '#C86B3C', fontSize: '14px' }}>✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 7: Membership (§10 & §11) */}
        <section id="membership" style={{ background: '#07070A', padding: 'clamp(100px, 14vh, 180px) 0' }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)', boxSizing: 'border-box' }}>
            <div style={{ maxWidth: '720px', marginBottom: 'clamp(48px, 6vh, 80px)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', color: '#C86B3C', textTransform: 'uppercase' }}>
                {mem.eyebrow}
              </span>
              <h2 style={{ fontSize: 'clamp(36px, 4.5vw, 64px)', fontWeight: 300, letterSpacing: '-0.02em', margin: '16px 0 20px', lineHeight: 1.1 }}>
                {mem.headline}
              </h2>
              <p style={{ fontSize: '18px', fontWeight: 300, color: 'rgba(245, 243, 239, 0.7)', lineHeight: 1.65, margin: 0 }}>
                {mem.body}
              </p>
            </div>

            {/* 4 Plans Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
              {(mem.plans || []).map((plan, pIdx) => (
                <div
                  key={plan.id || pIdx}
                  style={{
                    background: '#111116',
                    border: '1px solid rgba(245, 243, 239, 0.08)',
                    borderRadius: '12px',
                    padding: '40px 32px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '999px', background: 'rgba(200, 107, 60, 0.15)', color: '#C86B3C', fontSize: '12px', fontWeight: 600, marginBottom: '16px' }}>
                      {plan.badge}
                    </span>
                    <h3 style={{ fontSize: '26px', fontWeight: 300, margin: '0 0 12px', color: '#F5F3EF' }}>{plan.name}</h3>
                    <p style={{ fontSize: '15px', fontWeight: 300, color: 'rgba(245, 243, 239, 0.65)', lineHeight: 1.6, margin: '0 0 32px' }}>{plan.line}</p>
                  </div>
                  <button
                    onClick={() => openPlanFlow(pIdx)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: 500,
                      color: '#C86B3C'
                    }}
                  >
                    {plan.cta} →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 8: Meeting Rooms (§12) */}
        <section id="meeting-rooms" style={{ background: '#0D0D12', padding: 'clamp(100px, 14vh, 180px) 0' }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)', boxSizing: 'border-box' }}>
            <div style={{ maxWidth: '720px', marginBottom: 'clamp(48px, 6vh, 64px)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', color: '#C86B3C', textTransform: 'uppercase' }}>
                {mr.eyebrow}
              </span>
              <h2 style={{ fontSize: 'clamp(36px, 4.5vw, 64px)', fontWeight: 300, letterSpacing: '-0.02em', margin: '16px 0 20px', lineHeight: 1.1 }}>
                {mr.headline}
              </h2>
              <p style={{ fontSize: '18px', fontWeight: 300, color: 'rgba(245, 243, 239, 0.7)', lineHeight: 1.65, margin: 0 }}>
                {mr.body}
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              <button
                onClick={() => openBookFlow(0)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#8A4120',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '16px 36px',
                  fontSize: '16px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                {mr.primaryCta} →
              </button>

              <a
                href="/spaces?category=meeting_room"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'transparent',
                  color: '#F5F3EF',
                  border: '1px solid rgba(245, 243, 239, 0.3)',
                  padding: '16px 36px',
                  borderRadius: '999px',
                  fontSize: '16px',
                  fontWeight: 500
                }}
              >
                {mr.secondaryCta}
              </a>
            </div>
          </div>
        </section>

        {/* Section 9: Community (§14) */}
        <section id="community" style={{ background: '#07070A', padding: 'clamp(100px, 14vh, 180px) 0' }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)', boxSizing: 'border-box' }}>
            <div style={{ maxWidth: '720px', marginBottom: 'clamp(36px, 5vh, 48px)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', color: '#C86B3C', textTransform: 'uppercase' }}>
                {comm.eyebrow}
              </span>
              <h2 style={{ fontSize: 'clamp(36px, 4.5vw, 64px)', fontWeight: 300, letterSpacing: '-0.02em', margin: '16px 0 20px', lineHeight: 1.1 }}>
                {comm.headline}
              </h2>
              <p style={{ fontSize: '18px', fontWeight: 300, color: 'rgba(245, 243, 239, 0.7)', lineHeight: 1.65, margin: 0 }}>
                {comm.body}
              </p>
            </div>

            <a
              href="/events"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: '#C86B3C',
                fontSize: '16px',
                fontWeight: 500
              }}
            >
              {comm.cta} →
            </a>
          </div>
        </section>

        {/* Section 10: Events (§15) */}
        <section id="events" style={{ background: '#0D0D12', padding: 'clamp(100px, 14vh, 180px) 0' }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)', boxSizing: 'border-box' }}>
            <div style={{ maxWidth: '720px', marginBottom: 'clamp(48px, 6vh, 64px)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', color: '#C86B3C', textTransform: 'uppercase' }}>
                {ev.eyebrow}
              </span>
              <h2 style={{ fontSize: 'clamp(36px, 4.5vw, 64px)', fontWeight: 300, letterSpacing: '-0.02em', margin: '16px 0 20px', lineHeight: 1.1 }}>
                {ev.headline}
              </h2>
              <p style={{ fontSize: '18px', fontWeight: 300, color: 'rgba(245, 243, 239, 0.7)', lineHeight: 1.65, margin: 0 }}>
                {ev.body}
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              <a
                href="/events"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#8A4120',
                  color: '#FFFFFF',
                  padding: '16px 36px',
                  borderRadius: '999px',
                  fontSize: '16px',
                  fontWeight: 500
                }}
              >
                {ev.primaryCta} →
              </a>

              <a
                href="/contact?type=events"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'transparent',
                  color: '#F5F3EF',
                  border: '1px solid rgba(245, 243, 239, 0.3)',
                  padding: '16px 36px',
                  borderRadius: '999px',
                  fontSize: '16px',
                  fontWeight: 500
                }}
              >
                {ev.secondaryCta}
              </a>
            </div>
          </div>
        </section>

        {/* Section 11: Tour Section (§17) */}
        <section id="tour" style={{ background: '#07070A', padding: 'clamp(100px, 14vh, 180px) 0', textAlign: 'center' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)' }}>
            <h2 style={{ fontSize: 'clamp(36px, 5vw, 72px)', fontWeight: 300, letterSpacing: '-0.02em', margin: '0 0 20px', lineHeight: 1.1 }}>
              {tr.headline}
            </h2>

            <p style={{ fontSize: 'clamp(18px, 2vw, 24px)', fontWeight: 300, color: 'rgba(245, 243, 239, 0.75)', lineHeight: 1.6, margin: '0 0 40px' }}>
              {tr.body}
            </p>

            <a
              href="/contact?type=tour"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#8A4120',
                color: '#FFFFFF',
                padding: '18px 42px',
                borderRadius: '999px',
                fontSize: '17px',
                fontWeight: 500
              }}
            >
              {tr.cta} →
            </a>
          </div>
        </section>

      </main>

      {/* Lightbox Modal for Photography Expansion */}
      {lightboxIndex !== null && (
        <div
          onClick={() => setLightboxIndex(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(7,7,10,0.95)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px'
          }}
        >
          <img
            src={galleryImages[lightboxIndex]?.src || vs.items?.[lightboxIndex]?.img}
            alt="Fullscreen preview"
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px' }}
          />
          <div style={{ position: 'absolute', top: '24px', right: '24px', color: '#F5F3EF', fontSize: '24px', cursor: 'pointer' }}>
            ✕
          </div>
        </div>
      )}

      <Footer />

      <BookingModal
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        initialFlow={bookingFlow}
        initialSpaceIndex={initialSpaceIndex}
        initialOfficeIndex={initialOfficeIndex}
        initialPlanIndex={initialPlanIndex}
      />

      <style jsx global>{`
        .space-card:hover {
          transform: translateY(-4px);
          border-color: rgba(200, 107, 60, 0.4) !important;
        }
        .story-card:hover img {
          transform: scale(1.06);
        }
      `}</style>
    </>
  );
}
