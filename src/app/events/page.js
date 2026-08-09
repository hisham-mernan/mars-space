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
              title: 'Venture Builder Meetup: AI in Saudi Startups',
              titleAr: 'ملتقى حاضنات الأعمال: الذكاء الاصطناعي في الشركات الناشئة السعودية',
              date: '2026-08-15',
              time: '18:00 - 20:30',
              location: 'Community Hall, Jeddah Branch',
              locationAr: 'القاعة المجتمعية، فرع جدة',
              speakers: 'Sarah Al-Otaibi, Founder @ AI Studio',
              capacity: 80,
              attendeesCount: 42,
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

  return (
    <>
      <AnnouncementBar />
      <Header />

      <main style={{ minHeight: '100vh', background: 'var(--mars-void)', color: 'var(--text-primary)', paddingTop: '140px', paddingBottom: '120px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(24px, 4vw, 72px)' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--copper-400)', textTransform: 'uppercase' }}>
            {language === 'ar' ? 'المساحة المجتمعية' : 'COMMUNITY SPACE'}
          </span>

          <h1 style={{ fontSize: 'clamp(36px, 4.5vw, 68px)', fontWeight: 200, margin: '16px 0 20px' }}>
            {t?.communityBand?.subHeadline || (language === 'ar' ? 'مساحةٌ صُمّمت للّقاءات.' : 'A room made for gatherings.')}
          </h1>

          <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '58ch', lineHeight: 1.65, marginBottom: '48px' }}>
            {t?.communityBand?.subBody || (language === 'ar'
              ? 'حتى [N] ضيف، وعدة تهيئات للجلوس، وتجهيزات صوتية ومرئية كاملة، وفريقٌ استضاف حتى [N] فعالية على هذا الطابق.'
              : 'Up to [N] guests, several seating arrangements, full AV, and a team that has hosted [N] events on this floor.')}
          </p>

          {/* Section — what we handle (§7) */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--glass-border)', padding: '36px', borderRadius: '12px', marginBottom: '64px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--copper-400)', margin: '0 0 12px' }}>
              {t?.communityBand?.whatWeHandle?.title || (language === 'ar' ? 'أنت تُحضر الضيوف، ونحن نتكفّل بالباقي.' : 'You bring the guests. We handle the rest.')}
            </h2>
            <p style={{ fontSize: '16px', color: '#FFFFFF', lineHeight: 1.7, margin: '0 0 24px' }}>
              {t?.communityBand?.whatWeHandle?.body || (language === 'ar'
                ? 'التهيئة، والصوتيات، والجلوس، والضيافة، والاستقبال — كلها مُرتّبةٌ لك. أخبرنا بطبيعة الفعالية، وتكون المساحة جاهزةً قبل وصول أول ضيف.'
                : 'Configuration, AV, seating, catering and front-of-house are all arranged for you. Tell us the shape of the event, and the room is ready before your first guest arrives.')}
            </p>
            <a href="/contact?type=events" className="btn-pill-primary" style={{ display: 'inline-block', padding: '12px 28px', fontSize: '14px', textDecoration: 'none' }}>
              {t?.communityBand?.cta || (language === 'ar' ? 'تحقّق من المواعيد' : 'Check dates')} →
            </a>
          </div>

          <h2 style={{ fontSize: '28px', fontWeight: 300, color: '#FFFFFF', marginBottom: '24px' }}>
            {language === 'ar' ? 'الفعاليات القادمة' : 'Upcoming Events'}
          </h2>

          {loading ? (
            <div style={{ color: 'var(--text-muted-dark)', fontSize: '16px', padding: '40px 0' }}>
              {language === 'ar' ? 'جاري تحميل الفعاليات...' : 'Loading events...'}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '24px' }}>
              {events.map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    background: 'var(--surface-1)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '12px',
                    padding: '32px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '24px'
                  }}
                >
                  <div style={{ flex: '1 1 400px' }}>
                    <span style={{
                      background: 'rgba(200, 107, 60, 0.12)',
                      color: 'var(--copper-400)',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '999px'
                    }}>
                      {evt.status || 'Upcoming'}
                    </span>

                    <h3 style={{ fontSize: '24px', fontWeight: 400, color: '#FFFFFF', margin: '12px 0 8px' }}>
                      {language === 'ar' ? (evt.titleAr || evt.title) : evt.title}
                    </h3>

                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                      <span>📅 {evt.date} ({evt.time})</span>
                      <span>📍 {language === 'ar' ? (evt.locationAr || evt.location) : evt.location}</span>
                    </div>

                    {evt.speakers && (
                      <div style={{ fontSize: '13px', color: 'var(--text-muted-dark)', marginTop: '8px' }}>
                        🗣️ {evt.speakers}
                      </div>
                    )}
                  </div>

                  <a
                    href="/checkout?event=EVT-01"
                    className="btn-pill-primary"
                    style={{
                      padding: '14px 28px',
                      fontSize: '14px',
                      borderRadius: '999px',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {language === 'ar' ? 'تأكيد الحضور (مجاناً)' : 'RSVP Free'}
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
