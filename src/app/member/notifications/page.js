'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function NotificationsInbox() {
  const { language, t, mounted } = useLanguage();
  const [user, setUser] = useState(null);
  
  // Seeded notifications list
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      category: 'booking',
      title: 'Meeting Room Confirmed',
      message: 'Your booking for Meeting Room Alpha on 2026-07-20 has been confirmed.',
      time: '15 minutes ago',
      read: false,
      actions: [
        { label: 'View Booking', link: '/member/bookings' },
        { label: 'Open QR', link: '/member/bookings' }
      ]
    },
    {
      id: 'notif-2',
      category: 'finance',
      title: 'Invoice Generated',
      message: 'A new invoice INV-2026-001302 for Locker Rental has been generated.',
      time: '2 hours ago',
      read: false,
      actions: [
        { label: 'Pay Now', link: '/member/invoices' }
      ]
    },
    {
      id: 'notif-3',
      category: 'community',
      title: 'New Event Added',
      message: 'Join us for "AI Startup Workshop" on Saturday, 25 July at 5 PM.',
      time: '1 day ago',
      read: true,
      actions: []
    }
  ]);

  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const storedUser = localStorage.getItem('mars-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  if (!mounted || !user) return null;

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleMarkRead = (id) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleArchive = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Filter list
  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'unread') return !n.read;
    return n.category === activeFilter;
  });

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#FFFFFF', fontWeight: 300, margin: 0 }}>
            {language === 'ar' ? 'التنبيهات والرسائل' : 'Notifications Inbox'}
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted-dark)', fontSize: '14px' }}>
            {language === 'ar' ? 'ابق على اطلاع بخصوص حجز القاعات، الفواتير المستحقة، وفعاليات المجتمع.' : 'Stay informed about your workspace bookings, payment receipts, and events.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleMarkAllRead}
            className="btn-pill-secondary"
            style={{ padding: '10px 24px', fontSize: '13px', cursor: 'pointer' }}
          >
            {language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark All as Read'}
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px' }}>
        <div style={{ background: 'var(--mars-slate)', padding: '20px', borderRadius: '6px', border: '1px solid var(--line-dark)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'غير مقروءة' : 'Unread'}</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--copper-400)', marginTop: '4px' }}>
            {notifications.filter(n => !n.read).length}
          </div>
        </div>
        <div style={{ background: 'var(--mars-slate)', padding: '20px', borderRadius: '6px', border: '1px solid var(--line-dark)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'إجمالي الرسائل' : 'Total'}</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF', marginTop: '4px' }}>
            {notifications.length}
          </div>
        </div>
      </div>

      {/* Filters selectors */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line-dark)', gap: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {['all', 'unread', 'booking', 'finance', 'community'].map((filter) => {
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
                textTransform: 'capitalize',
                whiteSpace: 'nowrap'
              }}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {/* Notifications list feed */}
      {filteredNotifications.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '64px 24px',
          background: 'var(--mars-slate)',
          borderRadius: '8px',
          border: '1px dashed var(--line-dark)'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            {language === 'ar' ? 'لا توجد أي تنبيهات جديدة' : 'You are all caught up!'}
          </h3>
          <p style={{ margin: '8px 0 0', color: 'var(--text-muted-dark)', fontSize: '14px' }}>
            {language === 'ar' ? 'سنقوم بإعلامك عند وجود تحديثات بخصوص حسابك.' : 'No new notifications to display.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {filteredNotifications.map((n) => {
            const isUnread = !n.read;
            const borderVal = isUnread ? '1px solid var(--copper-400)' : '1px solid var(--line-dark)';
            
            return (
              <div
                key={n.id}
                style={{
                  background: 'var(--mars-slate)',
                  border: borderVal,
                  borderRadius: '8px',
                  padding: '24px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  flexWrap: 'wrap',
                  gap: '20px'
                }}
              >
                {/* Left side info block */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'start', flex: 1 }}>
                  {/* Status dot indicator */}
                  {isUnread && (
                    <span style={{
                      width: '8px',
                      height: '8px',
                      background: 'var(--copper-400)',
                      borderRadius: '50%',
                      marginTop: '6px',
                      flex: 'none'
                    }} />
                  )}
                  <div style={{ display: 'grid', gap: '6px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>{n.title}</h4>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted-dark)', lineHeight: 1.5 }}>
                      {n.message}
                    </p>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted-dark)' }}>{n.time}</span>
                    
                    {/* Action buttons if available */}
                    {n.actions && n.actions.length > 0 && (
                      <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                        {n.actions.map((act, actIdx) => (
                          <a
                            key={actIdx}
                            href={act.link}
                            className="btn-pill-primary"
                            style={{ padding: '8px 18px', fontSize: '12px' }}
                          >
                            {act.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side dismiss button */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  {isUnread && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--copper-400)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      {language === 'ar' ? 'تحديد كمقروء' : 'Mark Read'}
                    </button>
                  )}
                  <button
                    onClick={() => handleArchive(n.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted-dark)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  >
                    {language === 'ar' ? 'أرشفة' : 'Archive'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
