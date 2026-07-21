'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function MemberDashboard() {
  const { language, theme, mounted } = useLanguage();
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('mars-user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);

      async function loadMemberData() {
        try {
          const [bRes, iRes] = await Promise.all([
            fetch('/api/v1/public/bookings'),
            fetch('/api/v1/erp/invoices')
          ]);
          const bJson = await bRes.json();
          const iJson = await iRes.json();

          if (bJson.success) setBookings(bJson.data);
          if (iJson.success) setInvoices(iJson.data);
        } catch (err) {
          console.error('Error loading member data:', err);
        }
      }
      loadMemberData();
    }
  }, []);

  if (!mounted || !user) return null;

  const glassStyle = {
    background: theme === 'light'
      ? 'linear-gradient(135deg, rgba(11, 11, 15, 0.03) 0%, rgba(11, 11, 15, 0.01) 100%)'
      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
    border: theme === 'light'
      ? '1px solid rgba(11, 11, 15, 0.08)'
      : '1px solid rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(12px)',
    borderRadius: '12px',
    padding: '28px',
    boxSizing: 'border-box'
  };

  const userBookings = bookings.filter(b => b.customerEmail === user.email || !b.customerEmail);

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      
      {/* 1. Welcome Banner Widget */}
      <section style={{
        position: 'relative',
        background: 'linear-gradient(135deg, var(--mars-copper) 0%, var(--copper-900) 100%)',
        borderRadius: '16px',
        padding: '48px clamp(24px, 5vw, 48px)',
        color: '#FFFFFF',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '24px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        boxShadow: '0 12px 40px rgba(138, 65, 32, 0.15)'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontSize: '32px', fontWeight: 300, margin: 0, letterSpacing: '-0.02em' }}>
            {language === 'ar' ? `مرحباً، ${user.name} 👋` : `Welcome back, ${user.name} 👋`}
          </h1>
          <p style={{ margin: '14px 0 0', opacity: 0.85, fontSize: '15px', maxWidth: '48ch', lineHeight: 1.7 }}>
            {language === 'ar'
              ? `لديك ${userBookings.length} حجوزات مسجلة في النظام.`
              : `Your workspace parameters are fully active. You have ${userBookings.length} active reservation(s) in the system.`}
          </p>
        </div>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <a
            href="/spaces"
            className="btn-pill-primary"
            style={{
              background: '#FFFFFF',
              color: 'var(--mars-copper)',
              padding: '14px 32px',
              fontSize: '14px',
              fontWeight: 700,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
            }}
          >
            {language === 'ar' ? 'حجز مساحة عمل جديدة' : 'Book Workspaces'}
          </a>
        </div>
      </section>

      {/* Grid of widgets */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
        gap: '32px',
        alignItems: 'start'
      }}>
        
        {/* Left Column */}
        <div style={{ gridColumn: 'span 2', display: 'grid', gap: '32px' }}>
          
          {/* Upcoming Bookings List Widget */}
          <div style={glassStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {language === 'ar' ? 'الحجوزات القادمة' : 'Upcoming Bookings'}
              </h3>
              <a href="/member/bookings" style={{ fontSize: '13px', color: 'var(--copper-400)', fontWeight: 600 }}>
                {language === 'ar' ? 'عرض الكل' : 'View all'}
              </a>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              {userBookings.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No upcoming bookings. Book a workspace slot to get started.
                </div>
              ) : (
                userBookings.map((b) => (
                  <div key={b.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
                    padding: '20px 24px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ textAlign: 'start' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.resourceName || 'Meeting Suite'}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {b.date} · {b.startTime} - {b.endTime}
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--copper-400)', fontWeight: 600, border: '1px solid var(--border-color)', padding: '4px 10px', borderRadius: '4px' }}>
                      {b.status || 'Confirmed'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions Widget */}
          <div style={glassStyle}>
            <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
              {[
                { name: language === 'ar' ? 'حجز مساحة' : 'Book Room', link: '/spaces' },
                { name: language === 'ar' ? 'الدعم والمساعدة' : 'Help Desk', link: '/member/support' },
                { name: language === 'ar' ? 'عرض الفواتير' : 'Settle Invoices', link: '/member/invoices' }
              ].map((act, idx) => (
                <a
                  key={idx}
                  href={act.link}
                  style={{
                    background: theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
                    padding: '20px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    display: 'block',
                    border: '1px solid var(--border-color)',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    transition: 'all 120ms ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--copper-400)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  {act.name}
                </a>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div style={{ display: 'grid', gap: '32px' }}>
          
          {/* Premium Membership Card */}
          <div style={{
            ...glassStyle,
            background: theme === 'light'
              ? 'linear-gradient(135deg, rgba(138, 65, 32, 0.08) 0%, rgba(138, 65, 32, 0.02) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
            border: '1px solid var(--copper-400)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--copper-400)', letterSpacing: '0.12em' }}>
              MARS SPACE MEMBER
            </div>
            <div style={{ fontSize: '26px', fontWeight: 300, color: 'var(--text-primary)', marginTop: '16px' }}>
              Business Plan
            </div>

            <div style={{ display: 'grid', gap: '12px', marginTop: '24px', fontSize: '13px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', textAlign: 'start' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'تاريخ التجديد' : 'Renewal Date'}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>28 Dec 2026</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'ساعات قاعات الاجتماعات' : 'Meeting Credits'}</span>
                <span style={{ fontWeight: 600, color: 'var(--copper-400)' }}>18 / 20 hours</span>
              </div>
            </div>

            <a
              href="/member/membership"
              className="btn-pill-primary"
              style={{ width: '100%', padding: '12px 0', fontSize: '13px', marginTop: '24px', textAlign: 'center', border: 'none', cursor: 'pointer', display: 'block' }}
            >
              {language === 'ar' ? 'إدارة الاشتراك' : 'Manage Subscription'}
            </a>
          </div>

        </div>

      </div>

    </div>
  );
}
