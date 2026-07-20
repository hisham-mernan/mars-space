'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function MemberDashboard() {
  const { language, theme, mounted } = useLanguage();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('mars-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  if (!mounted || !user) return null;

  // Glass style depending on active theme
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

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      
      {/* 1. Welcome Banner Widget (Polished with Gradient and Glows) */}
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
        {/* Subtle decorative vector glow */}
        <div style={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '300px',
          height: '300px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '50%',
          filter: 'blur(40px)',
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontSize: '32px', fontWeight: 300, margin: 0, letterSpacing: '-0.02em' }}>
            {language === 'ar' ? `مرحباً، ${user.name} 👋` : `Welcome back, ${user.name} 👋`}
          </h1>
          <p style={{ margin: '14px 0 0', opacity: 0.85, fontSize: '15px', maxWidth: '48ch', lineHeight: 1.7 }}>
            {language === 'ar'
              ? 'لديك حجز قاعة اجتماعات نشط اليوم. جميع فواتيرك الحالية مدفوعة بالكامل.'
              : 'Your workspaces parameters are fully active. You have 1 reservation scheduled for today, and 0 overdue invoices.'}
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

      {/* Grid of widgets: Left (2/3 width) and Right (1/3 width) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
        gap: '32px',
        alignItems: 'start'
      }}>
        
        {/* Left Column (Main widgets) */}
        <div style={{ gridColumn: 'span 2', display: 'grid', gap: '32px' }}>
          
          {/* 2. Today's Schedule Widget */}
          <div style={glassStyle}>
            <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              {language === 'ar' ? 'جدول أعمال اليوم' : "Today's Schedule"}
            </h3>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{
                display: 'flex',
                gap: '20px',
                alignItems: 'center',
                background: theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
                padding: '20px 24px',
                borderRadius: '8px',
                border: theme === 'light' ? '1px solid rgba(11,11,15,0.04)' : '1px solid rgba(255,255,255,0.04)'
              }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--copper-400)' }}>14:00</div>
                <div style={{ height: '32px', width: '1px', background: 'var(--border-color)' }} />
                <div style={{ textAlign: 'start' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Meeting Room Alpha</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Jeddah Towers Branch · Floor 1
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Upcoming Bookings List Widget */}
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
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
                padding: '20px 24px',
                borderRadius: '8px',
                border: theme === 'light' ? '1px solid rgba(11,11,15,0.04)' : '1px solid rgba(255,255,255,0.04)'
              }}>
                <div style={{ textAlign: 'start' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Meeting Room Alpha</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Tomorrow · 02:00 PM - 04:00 PM
                  </div>
                </div>
                <a href="/member/bookings" style={{ fontSize: '13px', color: 'var(--copper-400)', fontWeight: 600 }}>
                  {language === 'ar' ? 'عرض الرمز' : 'View Ticket'}
                </a>
              </div>
            </div>
          </div>

          {/* 4. Quick Actions Widget */}
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

        {/* Right Column (Sidebar widgets) */}
        <div style={{ display: 'grid', gap: '32px' }}>
          
          {/* 5. Premium Membership Glass Card */}
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
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الطباعة والخدمات' : 'Printing Limit'}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>50 pages / month</span>
              </div>
            </div>

            <a
              href="/member/membership"
              className="btn-pill-primary"
              style={{ width: '100%', padding: '12px 0', fontSize: '13px', marginTop: '24px', textAlign: 'center', border: 'none', cursor: 'pointer' }}
            >
              {language === 'ar' ? 'إدارة الاشتراك' : 'Manage Subscription'}
            </a>
          </div>

          {/* 6. Outstanding Balance Widget */}
          <div style={glassStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {language === 'ar' ? 'الفواتير المستحقة' : 'Outstanding Balance'}
            </h3>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>0.00 SAR</div>
            <p style={{ margin: '6px 0 20px', color: '#4CAF50', fontSize: '13px', fontWeight: 500 }}>
              ✓ {language === 'ar' ? 'جميع فواتيرك مسددة بالكامل!' : 'All invoices are settled in full!'}
            </p>
            <a
              href="/member/invoices"
              className="btn-pill-secondary"
              style={{ width: '100%', padding: '12px 0', fontSize: '13px', textAlign: 'center', cursor: 'pointer' }}
            >
              {language === 'ar' ? 'عرض الفواتير' : 'View Invoices Log'}
            </a>
          </div>

        </div>

      </div>

    </div>
  );
}
