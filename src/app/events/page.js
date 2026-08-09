'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AnnouncementBar from '@/components/AnnouncementBar';
import { useLanguage } from '@/context/LanguageContext';

export default function EventsPage() {
  const { language, t, mounted } = useLanguage();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch('/api/v1/public/homepage');
        const data = await res.json();
        if (data.success && data.data?.events) {
          setEvents(data.data.events);
        } else {
          setEvents([
            {
              id: 'EVT-01',
              title: 'AI in Saudi Startups & Founders Meetup',
              titleAr: 'الذكاء الاصطناعي في الشركات الناشئة ملتقى المؤسسين',
              date: '2026-08-15',
              time: '18:00 - 20:30',
              location: 'Event Space, Jeddah',
              locationAr: 'مساحة الفعاليات، جدة',
              speakers: 'Sarah Al-Otaibi',
              capacity: 80,
              status: 'Upcoming'
            }
          ]);
        }
      } catch (err) {
        console.error('Failed to load events', err);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  if (!mounted) return null;

  const ev = t?.eventsSection || {};

  return (
    <>
      <AnnouncementBar />
      <Header />

      <main style={{ minHeight: '100vh', background: '#07070A', color: '#F5F3EF', paddingTop: '140px', paddingBottom: '120px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', color: '#C86B3C', textTransform: 'uppercase' }}>
            {ev.eyebrow}
          </span>

          <h1 style={{ fontSize: 'clamp(36px, 4.5vw, 68px)', fontWeight: 300, margin: '16px 0 20px', letterSpacing: '-0.02em' }}>
            {ev.headline}
          </h1>

          <p style={{ fontSize: '18px', color: 'rgba(245, 243, 239, 0.75)', maxWidth: '58ch', lineHeight: 1.65, marginBottom: '48px' }}>
            {ev.body}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '64px' }}>
            <a href="#upcoming" style={{ background: '#8A4120', color: '#FFFFFF', padding: '14px 32px', borderRadius: '999px', fontSize: '15px', fontWeight: 500 }}>
              {ev.primaryCta} →
            </a>
            <a href="/contact?type=events" style={{ border: '1px solid rgba(245,243,239,0.3)', color: '#F5F3EF', padding: '14px 32px', borderRadius: '999px', fontSize: '15px', fontWeight: 500 }}>
              {ev.secondaryCta}
            </a>
          </div>

          <h2 id="upcoming" style={{ fontSize: '28px', fontWeight: 300, color: '#F5F3EF', marginBottom: '24px' }}>
            {language === 'ar' ? 'الفعاليات القادمة' : 'Upcoming Events'}
          </h2>

          {loading ? (
            <div style={{ color: 'rgba(245,243,239,0.5)', fontSize: '16px', padding: '40px 0' }}>
              {language === 'ar' ? 'جاري تحميل الفعاليات...' : 'Loading events...'}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '24px' }}>
              {events.map((eItem) => (
                <div
                  key={eItem.id}
                  style={{
                    background: '#111116',
                    border: '1px solid rgba(245, 243, 239, 0.08)',
                    borderRadius: '12px',
                    padding: '32px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '24px'
                  }}
                >
                  <div style={{ flex: '1 1 360px' }}>
                    <h3 style={{ fontSize: '22px', fontWeight: 300, color: '#F5F3EF', margin: '0 0 12px' }}>
                      {language === 'ar' ? (eItem.titleAr || eItem.title) : eItem.title}
                    </h3>
                    <div style={{ fontSize: '14px', color: 'rgba(245, 243, 239, 0.65)', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                      <span>📅 {eItem.date} ({eItem.time})</span>
                      <span>📍 {language === 'ar' ? (eItem.locationAr || eItem.location) : eItem.location}</span>
                    </div>
                  </div>

                  <a
                    href="/contact?type=events"
                    style={{
                      background: '#8A4120',
                      color: '#FFFFFF',
                      padding: '12px 24px',
                      borderRadius: '999px',
                      fontSize: '14px',
                      fontWeight: 500
                    }}
                  >
                    {language === 'ar' ? 'تسجيل الحضور' : 'RSVP'}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
