'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import BookingModal from '@/components/BookingModal';

export default function MemberDashboard() {
  const { language, theme, mounted } = useLanguage();
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [bookingOpen, setBookingOpen] = useState(false);

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

  const userBookings = bookings.filter(b => b.customerEmail === user.email || !b.customerEmail);

  return (
    <div style={{ display: 'grid', gap: '28px' }} className="animate-fade-in">
      
      {/* Welcome Banner Widget */}
      <section style={{
        position: 'relative',
        background: 'linear-gradient(135deg, rgba(200, 107, 60, 0.2) 0%, rgba(138, 65, 32, 0.08) 100%)',
        border: '1px solid rgba(200, 107, 60, 0.3)',
        borderRadius: '16px',
        padding: '36px clamp(24px, 4vw, 40px)',
        color: '#FFFFFF',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '24px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="status-pill status-pill-copper" style={{ marginBottom: '12px' }}>
            {language === 'ar' ? 'العضوية نشطة · المقر الرئيسي' : 'ACTIVE MEMBERSHIP · JEDDAH HQ'}
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 300, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            {language === 'ar' ? `مرحباً، ${user.name} 👋` : `Welcome back, ${user.name} 👋`}
          </h1>
          <p style={{ margin: '10px 0 0', color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '54ch', lineHeight: 1.6 }}>
            {language === 'ar'
              ? `لديك ${userBookings.length} حجوزات نشطة في مساحات مارس سبيس.`
              : `Your workspace parameters are operational. You have ${userBookings.length} active reservation(s) scheduled today.`}
          </p>
        </div>

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setBookingOpen(true)}
            className="btn-pill-primary"
            style={{
              padding: '12px 28px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {language === 'ar' ? 'حجز مساحة عمل' : 'Reserve Space'}
          </button>
        </div>
      </section>

      {/* Grid of widgets */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
        gap: '28px',
        alignItems: 'start'
      }}>
        
        {/* Main Content Column */}
        <div style={{ gridColumn: 'span 2', display: 'grid', gap: '28px' }}>
          
          {/* Upcoming Bookings Widget */}
          <div className="glass-card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {language === 'ar' ? 'جدول الحجوزات القادمة' : 'Upcoming Space Schedule'}
              </h3>
              <a href="/member/bookings" style={{ fontSize: '12px', color: 'var(--copper-400)', fontWeight: 600 }}>
                {language === 'ar' ? 'عرض الكل ←' : 'View Schedule →'}
              </a>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {userBookings.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted-dark)', border: '1px dashed var(--glass-border)', borderRadius: '8px', fontSize: '14px' }}>
                  {language === 'ar' ? 'لا توجد حجوزات قادمة حالياً.' : 'No active bookings found. Book a suite or desk slot to get started.'}
                </div>
              ) : (
                userBookings.map((b) => (
                  <div key={b.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '16px 20px',
                    borderRadius: '10px',
                    border: '1px solid var(--glass-border)'
                  }}>
                    <div style={{ textAlign: 'start' }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{b.resourceName || 'Meeting Suite A'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {b.date} · {b.startTime} - {b.endTime}
                      </div>
                    </div>
                    <span className="status-pill status-pill-emerald">
                      {b.status || 'CONFIRMED'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="glass-card" style={{ padding: '28px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {language === 'ar' ? 'إجراءات الأعضاء السريعة' : 'Member Shortcuts'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
              {[
                { name: language === 'ar' ? 'حجز مساحة' : 'Book Room', link: '/spaces' },
                { name: language === 'ar' ? 'الدعم الفني' : 'Support Desk', link: '/member/support' },
                { name: language === 'ar' ? 'سداد الفواتير' : 'Invoices', link: '/member/invoices' },
                { name: language === 'ar' ? 'تعديل الحساب' : 'Edit Profile', link: '/member/profile' }
              ].map((act, idx) => (
                <a
                  key={idx}
                  href={act.link}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '16px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    display: 'block',
                    border: '1px solid var(--glass-border)',
                    fontWeight: 600,
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    transition: 'all 140ms ease'
                  }}
                  className="glass-card"
                >
                  {act.name}
                </a>
              ))}
            </div>
          </div>

        </div>

        {/* Right Sidebar Widget Column */}
        <div style={{ display: 'grid', gap: '28px' }}>
          
          {/* Membership Card */}
          <div className="glass-card" style={{ padding: '28px', border: '1px solid rgba(200, 107, 60, 0.35)' }}>
            <div className="status-pill status-pill-copper" style={{ marginBottom: '12px' }}>
              MARS ENTERPRISE MEMBER
            </div>
            <div style={{ fontSize: '24px', fontWeight: 300, color: 'var(--text-primary)' }}>
              Business Suite Pass
            </div>

            <div style={{ display: 'grid', gap: '14px', marginTop: '20px', fontSize: '13px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'تاريخ التجديد' : 'Renewal Date'}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>28 Dec 2026</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'ساعات الاجتماعات' : 'Meeting Credits'}</span>
                <span style={{ fontWeight: 700, color: 'var(--copper-400)', fontVariantNumeric: 'tabular-nums' }}>18 / 20 hrs</span>
              </div>
            </div>

            {/* Credit Progress Gauge */}
            <div style={{ marginTop: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
              <div style={{ width: '90%', height: '100%', background: 'linear-gradient(90deg, var(--mars-copper), var(--copper-400))', borderRadius: '999px' }} />
            </div>

            <a
              href="/member/membership"
              className="btn-pill-primary"
              style={{ width: '100%', padding: '10px 0', fontSize: '12px', fontWeight: 600, marginTop: '20px', textAlign: 'center', display: 'block' }}
            >
              {language === 'ar' ? 'إدارة الاشتراك' : 'Manage Subscription'}
            </a>
          </div>

        </div>

      </div>

      <BookingModal isOpen={bookingOpen} onClose={() => setBookingOpen(false)} />
    </div>
  );
}
