'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function ErpBookingsPage() {
  const { language, mounted } = useLanguage();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBookings() {
      try {
        const res = await fetch('/api/v1/public/homepage');
        const data = await res.json();
        if (data.success && data.data?.recentBookings) {
          setBookings(data.data.recentBookings);
        } else {
          setBookings([
            {
              id: 'BK-1001',
              resourceName: 'Ventures Room',
              customerName: 'Ahmed Alharbi',
              date: '2026-07-28',
              startTime: '10:00',
              endTime: '12:00',
              amount: 506,
              status: 'Confirmed'
            }
          ]);
        }
      } catch (err) {
        console.error('Failed to load bookings', err);
      } finally {
        setLoading(false);
      }
    }
    loadBookings();
  }, []);

  if (!mounted) return null;

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#FFFFFF', fontWeight: 300, margin: 0 }}>
            {language === 'ar' ? 'إدارة الحجوزات' : 'Bookings Engine'}
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted-dark)', fontSize: '14px' }}>
            {language === 'ar' ? 'جدول وإدارة جميع حجوزات قاعات الاجتماعات والقاعة المجتمعية.' : 'Real-time schedule of meeting room and community space reservations.'}
          </p>
        </div>
      </div>

      {/* Bookings Table */}
      <div style={{ background: 'var(--mars-slate)', padding: '32px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
        {loading ? (
          <div style={{ color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'جاري التحميل...' : 'Loading bookings...'}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'start' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(245, 245, 245, 0.08)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Booking ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Space / Resource</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Customer</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Date & Time</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Amount</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid rgba(245, 245, 245, 0.04)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--copper-400)' }}>{b.id}</td>
                    <td style={{ padding: '12px 16px', color: '#FFFFFF' }}>{b.resourceName}</td>
                    <td style={{ padding: '12px 16px' }}>{b.customerName}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted-dark)' }}>{b.date} ({b.startTime} - {b.endTime})</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}><bdi>SAR {b.amount}</bdi></td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#10B981',
                        fontSize: '11px',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontWeight: 600
                      }}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
