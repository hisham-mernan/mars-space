'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AnnouncementBar from '@/components/AnnouncementBar';
import { useLanguage } from '@/context/LanguageContext';

export default function SpacesPage() {
  const { language, t, mounted } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState('all');

  if (!mounted) return null;

  const ss = t?.spacesSection || {};
  const cards = ss.cards || {};

  const spacesList = [
    {
      id: 'private_office',
      title: cards.offices?.title || (language === 'ar' ? 'مكاتب خاصة' : 'Private Offices'),
      desc: cards.offices?.desc || (language === 'ar' ? 'مساحة مخصصة للفرق التي تبحث عن الخصوصية والراحة وبيئة عمل مهنية.' : 'A dedicated space for teams that value privacy, comfort and a professional setting.'),
      cta: cards.offices?.cta || (language === 'ar' ? 'استكشف المكاتب' : 'View Offices'),
      category: 'private_office',
      image: '/assets/photo-glass-offices.jpg'
    },
    {
      id: 'dedicated',
      title: cards.dedicated?.title || (language === 'ar' ? 'مكاتب مخصصة' : 'Dedicated Desks'),
      desc: cards.dedicated?.desc || (language === 'ar' ? 'مكتبك الخاص ضمن بيئة عمل مشتركة، مجهز بكل ما تحتاجه ليوم عمل منتج.' : 'Your own desk in a shared environment, with everything you need for a productive workday.'),
      cta: cards.dedicated?.cta || (language === 'ar' ? 'استكشف المكاتب' : 'View Desks'),
      category: 'dedicated',
      image: '/assets/photo-coworking.jpg'
    },
    {
      id: 'meeting_room',
      title: cards.meetingRooms?.title || (language === 'ar' ? 'قاعات الاجتماعات' : 'Meeting Rooms'),
      desc: cards.meetingRooms?.desc || (language === 'ar' ? 'قاعات مجهزة بعناية للاجتماعات وورش العمل والمقابلات واللقاءات مع العملاء.' : 'Thoughtfully equipped rooms for meetings, workshops, interviews and client conversations.'),
      cta: cards.meetingRooms?.cta || (language === 'ar' ? 'احجز قاعة' : 'Book a Room'),
      category: 'meeting_room',
      image: '/assets/photo-meeting-room.jpg'
    },
    {
      id: 'event_space',
      title: cards.eventSpaces?.title || (language === 'ar' ? 'مساحات الفعاليات' : 'Event Spaces'),
      desc: cards.eventSpaces?.desc || (language === 'ar' ? 'مساحات مرنة للورش، واللقاءات، والفعاليات المجتمعية والخاصة.' : 'Flexible spaces for workshops, talks, community gatherings and private events.'),
      cta: cards.eventSpaces?.cta || (language === 'ar' ? 'استكشف المساحات' : 'Explore Event Spaces'),
      category: 'event_space',
      image: '/assets/photo-hall-full.jpg'
    }
  ];

  const filteredSpaces = selectedCategory === 'all' 
    ? spacesList 
    : spacesList.filter(s => s.category === selectedCategory);

  return (
    <>
      <AnnouncementBar />
      <Header />

      <main style={{ minHeight: '100vh', background: '#07070A', color: '#F5F3EF', paddingTop: '140px', paddingBottom: '120px' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)' }}>
          
          {/* Header Section (§5) */}
          <div style={{ maxWidth: '720px', marginBottom: '48px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', color: '#C86B3C', textTransform: 'uppercase' }}>
              {ss.eyebrow}
            </span>

            <h1 style={{ fontSize: 'clamp(36px, 4.5vw, 68px)', fontWeight: 300, margin: '16px 0 20px', letterSpacing: '-0.02em' }}>
              {ss.headline}
            </h1>

            <p style={{ fontSize: '18px', color: 'rgba(245, 243, 239, 0.75)', lineHeight: 1.65 }}>
              {ss.body}
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '48px' }}>
            <button
              onClick={() => setSelectedCategory('all')}
              style={{
                padding: '8px 20px',
                borderRadius: '999px',
                border: '1px solid rgba(245, 243, 239, 0.2)',
                background: selectedCategory === 'all' ? '#8A4120' : 'transparent',
                color: '#F5F3EF',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              {language === 'ar' ? 'الكل' : 'All Spaces'}
            </button>

            <button
              onClick={() => setSelectedCategory('private_office')}
              style={{
                padding: '8px 20px',
                borderRadius: '999px',
                border: '1px solid rgba(245, 243, 239, 0.2)',
                background: selectedCategory === 'private_office' ? '#8A4120' : 'transparent',
                color: '#F5F3EF',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              {cards.offices?.title}
            </button>

            <button
              onClick={() => setSelectedCategory('dedicated')}
              style={{
                padding: '8px 20px',
                borderRadius: '999px',
                border: '1px solid rgba(245, 243, 239, 0.2)',
                background: selectedCategory === 'dedicated' ? '#8A4120' : 'transparent',
                color: '#F5F3EF',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              {cards.dedicated?.title}
            </button>

            <button
              onClick={() => setSelectedCategory('meeting_room')}
              style={{
                padding: '8px 20px',
                borderRadius: '999px',
                border: '1px solid rgba(245, 243, 239, 0.2)',
                background: selectedCategory === 'meeting_room' ? '#8A4120' : 'transparent',
                color: '#F5F3EF',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              {cards.meetingRooms?.title}
            </button>

            <button
              onClick={() => setSelectedCategory('event_space')}
              style={{
                padding: '8px 20px',
                borderRadius: '999px',
                border: '1px solid rgba(245, 243, 239, 0.2)',
                background: selectedCategory === 'event_space' ? '#8A4120' : 'transparent',
                color: '#F5F3EF',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              {cards.eventSpaces?.title}
            </button>
          </div>

          {/* Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
            {filteredSpaces.map((item) => (
              <div
                key={item.id}
                style={{
                  background: '#111116',
                  border: '1px solid rgba(245, 243, 239, 0.08)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ aspectRatio: '16/10', overflow: 'hidden' }}>
                  <img src={item.image} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                  <div>
                    <h3 style={{ fontSize: '24px', fontWeight: 300, color: '#F5F3EF', margin: '0 0 12px' }}>{item.title}</h3>
                    <p style={{ fontSize: '15px', color: 'rgba(245, 243, 239, 0.65)', lineHeight: 1.6, margin: '0 0 24px' }}>{item.desc}</p>
                  </div>
                  <a href={`/spaces/${item.id}`} style={{ color: '#C86B3C', fontSize: '15px', fontWeight: 500 }}>
                    {item.cta} →
                  </a>
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>

      <Footer />
    </>
  );
}
