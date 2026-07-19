'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function EventsLog() {
  const { language, t, mounted } = useLanguage();
  const [user, setUser] = useState(null);
  
  // Seeded events list matching DB structure
  const [events, setEvents] = useState([
    { id: 'ev-01', title: 'Startup Networking Night', titleAr: 'ليلة تواصل الشركات الناشئة', category: 'Networking', date: '2026-07-23', time: '7:00 PM', duration: '2 Hours', venue: 'Community Hall', speaker: 'Abeer Al-Shoraim', seatsRemaining: 52, price: 'Free', image: '/assets/photo-community-cinema.jpg', registered: false },
    { id: 'ev-02', title: 'AI Startup Workshop', titleAr: 'ورشة عمل الذكاء الاصطناعي للشركات', category: 'Workshops', date: '2026-07-25', time: '5:00 PM', duration: '3 Hours', venue: 'Mars Hall', speaker: 'Dr. Fahad Al-Otaibi', seatsRemaining: 18, price: 'Free', image: '/assets/photo-vip-lounge.jpg', registered: false }
  ]);

  const [activeFilter, setActiveFilter] = useState('all');
  const [ticketModalEvent, setTicketModalEvent] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('mars-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  if (!mounted || !user) return null;

  const handleRegisterEvent = (event) => {
    // Deduct seat
    setEvents(prev =>
      prev.map(e => {
        if (e.id === event.id) {
          return { ...e, registered: true, seatsRemaining: Math.max(0, e.seatsRemaining - 1) };
        }
        return e;
      })
    );

    // Simulate adding 100 loyalty points
    alert("Congratulations! You earned +100 Community Points for registering for this event!");
    
    // Open Ticket Modal Pass
    setTicketModalEvent(event);
  };

  const filteredEvents = events.filter(e => {
    if (activeFilter === 'all') return true;
    return e.category.toLowerCase() === activeFilter;
  });

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '28px', color: '#FFFFFF', fontWeight: 300, margin: 0 }}>
          {language === 'ar' ? 'فعاليات وورش عمل المجتمع' : 'Community Events & Workshops'}
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-muted-dark)', fontSize: '14px' }}>
          {language === 'ar' ? 'تصفح الفعاليات القادمة واحجز تذكرتك للمشاركة وكسب نقاط الولاء.' : 'Discover startup meetups, pitch nights, and technical bootcamps. Register to get your pass.'}
        </p>
      </div>

      {/* Category filters */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line-dark)', gap: '20px' }}>
        {['all', 'networking', 'workshops'].map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              style={{
                background: 'none',
                border: 'none',
                padding: '12px 4px',
                color: isActive ? 'var(--copper-400)' : 'var(--text-muted-dark)',
                borderBottom: isActive ? '2px solid var(--copper-400)' : 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {/* Events Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '32px'
      }}>
        {filteredEvents.map((e) => (
          <div
            key={e.id}
            style={{
              background: 'var(--mars-slate)',
              borderRadius: '8px',
              border: '1px solid var(--line-dark)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            {/* Image banner */}
            <div style={{ aspectRatio: '16/9', overflow: 'hidden' }}>
              <img src={e.image} alt={e.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            {/* Details panel */}
            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifySelf: 'start', justifyContent: 'space-between', gap: '20px' }}>
              <div style={{ display: 'grid', gap: '8px', textAlign: 'start' }}>
                <span style={{ fontSize: '11px', color: 'var(--copper-400)', fontWeight: 700, textTransform: 'uppercase' }}>
                  {e.category}
                </span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#FFFFFF' }}>
                  {language === 'ar' ? e.titleAr : e.title}
                </h3>
                <div style={{ fontSize: '13px', color: 'var(--text-muted-dark)', marginTop: '4px' }}>
                  {e.date} · {e.time} ({e.duration})
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted-dark)' }}>
                  Venue: {e.venue} · Speaker: {e.speaker}
                </div>
              </div>

              {/* Action row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(245, 245, 245, 0.08)', paddingTop: '16px', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-muted-dark)' }}>{e.seatsRemaining} seats left</span>
                
                {e.registered ? (
                  <button
                    onClick={() => setTicketModalEvent(e)}
                    className="btn-pill-secondary"
                    style={{ padding: '8px 18px', fontSize: '13px', cursor: 'pointer' }}
                  >
                    {language === 'ar' ? 'عرض التذكرة' : 'View Pass'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleRegisterEvent(e)}
                    className="btn-pill-primary"
                    style={{ padding: '8px 18px', fontSize: '13px', border: 'none', cursor: 'pointer' }}
                  >
                    {language === 'ar' ? 'حجز تذكرة' : 'Register Now'}
                  </button>
                )}
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Ticket Pass Modal Popup */}
      {ticketModalEvent && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            background: 'var(--mars-slate)',
            padding: '36px',
            borderRadius: '8px',
            border: '1px solid var(--line-dark)',
            width: '100%',
            maxWidth: '400px',
            boxSizing: 'border-box',
            margin: '0 20px',
            textAlign: 'center'
          }}>
            
            {/* Ticket Header icon */}
            <div style={{
              width: '56px',
              height: '56px',
              background: 'rgba(200, 107, 60, 0.1)',
              border: '2px solid var(--copper-400)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="var(--copper-400)" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>

            <h3 style={{ margin: 0, fontSize: '20px', color: '#FFFFFF' }}>
              {language === 'ar' ? 'تذكرة دخول الفعالية' : 'Event Entry Pass'}
            </h3>
            
            <div style={{ margin: '24px 0', display: 'grid', gap: '8px', fontSize: '13px', textAlign: 'start' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', textAlign: 'center', marginBottom: '8px' }}>
                {language === 'ar' ? ticketModalEvent.titleAr : ticketModalEvent.title}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted-dark)' }}>Date</span>
                <span style={{ fontWeight: 600 }}>{ticketModalEvent.date}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted-dark)' }}>Time</span>
                <span style={{ fontWeight: 600 }}>{ticketModalEvent.time}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted-dark)' }}>Venue</span>
                <span style={{ fontWeight: 600 }}>{ticketModalEvent.venue}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted-dark)' }}>Ticket Reference</span>
                <span style={{ fontWeight: 600, color: 'var(--copper-400)' }}>MS-EV-TKT-{Math.floor(1000 + Math.random() * 9000)}</span>
              </div>
            </div>

            {/* Mock QR Code pass */}
            <div style={{ background: '#FFFFFF', padding: '10px', borderRadius: '4px', width: '120px', height: '120px', margin: '0 auto 24px' }}>
              <svg width="100" height="100" viewBox="0 0 29 29">
                <path d="M0 0h7v7H0zm1 1v5h5V1zm8 0h1v1H9zm1 1h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm4-6h7v7h-7zm1 1v5h5V1zm-13 8h1v1h-1zm1 1h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm-13 8h7v7H0zm1 1v5h5v-5zm8 0h1v1H9zm1 1h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm4-8h1v1h-1zm1 1h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1z" fill="#000" />
              </svg>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setTicketModalEvent(null)}
                className="btn-pill-secondary"
                style={{ padding: '10px 24px', fontSize: '13px', cursor: 'pointer' }}
              >
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </button>
              <button
                onClick={() => window.print()}
                className="btn-pill-primary"
                style={{ padding: '10px 24px', fontSize: '13px', border: 'none', cursor: 'pointer' }}
              >
                {language === 'ar' ? 'طباعة التذكرة' : 'Print Pass'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
