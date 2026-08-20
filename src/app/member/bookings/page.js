'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSession } from '@/context/SessionContext';
import { createClient } from '@/lib/supabase/client';
import { listBookings, cancelBooking } from '@/lib/supabase/queries';

export default function MyBookings() {
  const { language, t, mounted } = useLanguage();
  const { user, activeCompany, loading: loadingSession } = useSession();
  const [bookings, setBookings] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [cancelModalId, setCancelModalId] = useState(null);
  const [cancelReason, setCancelReason] = useState('Conflict in schedule');
  const [cancelError, setCancelError] = useState('');

  // Was fetching /api/v1/public/homepage and, if it returned anything at all,
  // rendering two hardcoded bookings. Reads the member's real bookings now;
  // RLS restricts the rows to their own company.
  useEffect(() => {
    if (!activeCompany?.id) return;
    let cancelled = false;

    listBookings(createClient(), { companyId: activeCompany.id })
      .then((rows) => { if (!cancelled) setBookings(rows); })
      .catch((err) => console.error('Failed to load bookings:', err))
      .finally(() => { if (!cancelled) setLoaded(true); });

    return () => { cancelled = true; };
  }, [activeCompany?.id]);

  // Derived rather than a second piece of state, so there is no setState in
  // the effect body just to clear a spinner.
  const loading = loadingSession || (Boolean(activeCompany?.id) && !loaded);

  if (!mounted || !user) return null;

  const handleCancelClick = (id) => {
    setCancelModalId(id);
  };

  const confirmCancellation = async () => {
    setCancelError('');
    try {
      // cancel_booking() frees the slot, returns any credit hours consumed and
      // voids the related invoice — all in one transaction.
      await cancelBooking(createClient(), cancelModalId, cancelReason);
      setBookings((prev) =>
        prev.map((b) => (b.id === cancelModalId ? { ...b, status: 'cancelled' } : b))
      );
      setCancelModalId(null);
    } catch (err) {
      setCancelError(
        language === 'ar'
          ? 'تعذر إلغاء الحجز. حاول مرة أخرى.'
          : 'Could not cancel this booking. Please try again.'
      );
      console.error('Cancellation failed:', err);
    }
  };

  // Filter bookings based on activeTab
  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'upcoming') {
      return ['confirmed', 'checked_in'].includes(b.status) && new Date(b.booking_date) >= new Date();
    }
    if (activeTab === 'history') {
      return b.status === 'completed' || new Date(b.booking_date) < new Date();
    }
    if (activeTab === 'cancelled') {
      return b.status === 'cancelled';
    }
    return true;
  });

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      
      {/* Header and Page Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#FFFFFF', fontWeight: 300, margin: 0 }}>
            {language === 'ar' ? 'إدارة حجوزاتي' : 'My Bookings'}
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted-dark)', fontSize: '14px' }}>
            {language === 'ar' ? 'عرض تفاصيل قاعات الاجتماعات ومساحات العمل وإدارتها.' : 'View, edit, or cancel your active workspace reservations.'}
          </p>
        </div>
        <a href="/spaces" className="btn-pill-primary" style={{ padding: '10px 24px', fontSize: '13px' }}>
          {language === 'ar' ? 'حجز مساحة عمل' : 'New Booking'}
        </a>
      </div>

      {/* Tabs selectors */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line-dark)', gap: '24px' }}>
        {['upcoming', 'history', 'cancelled'].map((tab) => {
          const isActive = activeTab === tab;
          const label = {
            upcoming: language === 'ar' ? 'الحجوزات القادمة' : 'Upcoming Bookings',
            history: language === 'ar' ? 'الحجوزات السابقة' : 'Past History',
            cancelled: language === 'ar' ? 'الملغاة' : 'Cancelled'
          }[tab];

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none',
                border: 'none',
                padding: '12px 4px',
                color: isActive ? 'var(--copper-400)' : 'var(--text-muted-dark)',
                borderBottom: isActive ? '2px solid var(--copper-400)' : 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 120ms ease'
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Bookings listing grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--copper-400)' }}>
          LOADING BOOKINGS...
        </div>
      ) : filteredBookings.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '64px 24px',
          background: 'var(--mars-slate)',
          borderRadius: '8px',
          border: '1px dashed var(--line-dark)'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            {language === 'ar' ? 'لا توجد أي حجوزات هنا' : 'No bookings found'}
          </h3>
          <p style={{ margin: '8px 0 24px', color: 'var(--text-muted-dark)', fontSize: '14px' }}>
            {language === 'ar' ? 'جرب حجز قاعة اجتماعات أو مكتب للبدء.' : 'Browse our spaces to schedule a meeting or workspace reservation.'}
          </p>
          <a href="/spaces" className="btn-pill-primary" style={{ padding: '10px 24px', fontSize: '13px' }}>
            {language === 'ar' ? 'تصفح المساحات' : 'Browse Spaces'}
          </a>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {filteredBookings.map((b) => {
            const isExpanded = expandedId === b.id;
            const statusColor = b.status === 'confirmed' ? 'var(--copper-400)' : 'var(--text-muted-dark)';
            const borderVal = isExpanded ? '1px solid var(--copper-400)' : '1px solid var(--line-dark)';

            return (
              <div
                key={b.id}
                style={{
                  background: 'var(--mars-slate)',
                  border: borderVal,
                  borderRadius: '8px',
                  overflow: 'hidden',
                  transition: 'all 150ms ease'
                }}
              >
                {/* Header card summary row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : b.id)}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    padding: '24px',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '20px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '80px', height: '60px', borderRadius: '4px', overflow: 'hidden' }}>
                      <img src={b.resource_image} alt={b.resource_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#FFFFFF' }}>{b.resource_name}</h4>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted-dark)', marginTop: '4px' }}>
                        Reference: {b.reference}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-muted-dark)' }}>
                      <div>{b.booking_date}</div>
                      <div style={{ marginTop: '2px', fontWeight: 500, color: '#FFFFFF' }}>{b.start_time} - {b.end_time}</div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: statusColor,
                      border: `1px solid ${statusColor}`,
                      padding: '4px 12px',
                      borderRadius: '999px'
                    }}>
                      {b.status}
                    </span>
                  </div>
                </div>

                {/* Expanded Details Pass / Options Panel */}
                {isExpanded && (
                  <div style={{
                    padding: '0 24px 24px',
                    borderTop: '1px solid rgba(245, 245, 245, 0.08)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '32px',
                    paddingTop: '24px',
                    animation: 'fadeIn 200ms ease-out'
                  }}>
                    {/* Left details */}
                    <div>
                      <h5 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text-muted-dark)' }}>
                        {language === 'ar' ? 'تفاصيل الفاتورة والمدفوعات' : 'Payment Details'}
                      </h5>
                      <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'حالة السداد' : 'Payment Status'}</span>
                          <span style={{ fontWeight: 600 }}>
                            {Number(b.credit_hours_used) > 0
                              ? (language === 'ar'
                                  ? `${b.credit_hours_used} ساعة من الرصيد`
                                  : `${b.credit_hours_used} hrs from credits`)
                              : (language === 'ar' ? 'يُفوتر' : 'Invoiced')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'المبلغ الإجمالي' : 'Total Amount'}</span>
                          <span style={{ fontWeight: 600 }}>{b.total} SAR</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'ساعات الحجز' : 'Total Hours'}</span>
                          <span style={{ fontWeight: 600 }}>{b.hours} hours</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle check-in QR Code badge mockup */}
                    {b.status === 'confirmed' && (
                      <div style={{
                        background: 'var(--mars-void)',
                        borderRadius: '6px',
                        padding: '20px',
                        textAlign: 'center',
                        border: '1px solid var(--line-dark)'
                      }}>
                        {/* Mock Ticket QR */}
                        <svg width="100" height="100" viewBox="0 0 29 29" style={{ display: 'block', margin: '0 auto', background: '#FFFFFF', padding: '6px', borderRadius: '4px' }}>
                          <path d="M0 0h7v7H0zm1 1v5h5V1zm8 0h1v1H9zm1 1h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm4-6h7v7h-7zm1 1v5h5V1zm-13 8h1v1h-1zm1 1h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm-13 8h7v7H0zm1 1v5h5v-5zm8 0h1v1H9zm1 1h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm4-8h1v1h-1zm1 1h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1zm-3 1h1v1H9zm5 0h1v1h-1zm1 1h1v1h-1z" fill="#000" />
                        </svg>
                        <div style={{ fontSize: '11px', marginTop: '10px', fontWeight: 600, color: 'var(--text-muted-dark)' }}>
                          {language === 'ar' ? 'تذكرة الدخول السريع للاستقبال' : 'Quick entry check-in QR pass'}
                        </div>
                      </div>
                    )}

                    {/* Right column: Action list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                      {b.status === 'confirmed' && (
                        <button
                          onClick={() => handleCancelClick(b.id)}
                          style={{
                            background: 'none',
                            border: '1px solid rgba(255, 0, 0, 0.3)',
                            borderRadius: '999px',
                            color: '#FF4A4A',
                            padding: '10px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {language === 'ar' ? 'إلغاء الحجز' : 'Cancel Reservation'}
                        </button>
                      )}
                      <button
                        onClick={() => window.print()}
                        style={{
                          background: 'none',
                          border: '1px solid var(--line-dark)',
                          borderRadius: '999px',
                          color: '#FFFFFF',
                          padding: '10px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {language === 'ar' ? 'تحميل الفاتورة PDF' : 'Download Invoice PDF'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cancellation Reason Modal Popup */}
      {cancelModalId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
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
            maxWidth: '440px',
            boxSizing: 'border-box',
            margin: '0 20px'
          }}>
            <h3 style={{ margin: 0, fontSize: '20px', color: '#FFFFFF' }}>
              {language === 'ar' ? 'هل أنت متأكد من إلغاء الحجز؟' : 'Confirm Cancellation'}
            </h3>
            <p style={{ margin: '10px 0 20px', color: 'var(--text-muted-dark)', fontSize: '14px', lineHeight: 1.6 }}>
              {language === 'ar'
                ? 'سيتم استرجاع الرصيد أو المبلغ المدفوع تلقائياً إلى حسابك وفقاً لشروط الإلغاء.'
                : 'Your payment will be automatically credited/refunded to your account in accordance with cancellation policy rules.'}
            </p>

            <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)' }}>
              {language === 'ar' ? 'سبب الإلغاء' : 'Cancellation Reason'}
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{
                  background: 'var(--mars-void)',
                  border: '1px solid var(--line-dark)',
                  borderRadius: '4px',
                  padding: '10px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="conflict">{language === 'ar' ? 'تضارب في المواعيد' : 'Conflict in schedule'}</option>
                <option value="changed">{language === 'ar' ? 'تغيير في خطة العمل' : 'Change of plans'}</option>
                <option value="illness">{language === 'ar' ? 'ظروف صحية/طارئة' : 'Emergency situation'}</option>
              </select>
            </label>

            {cancelError && (
              <div role="alert" style={{ color: '#FF4A4A', fontSize: '13px', fontWeight: 500, marginTop: '16px' }}>
                {cancelError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => { setCancelModalId(null); setCancelError(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted-dark)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {language === 'ar' ? 'تراجع' : 'Close'}
              </button>
              <button
                onClick={confirmCancellation}
                style={{
                  background: '#FF4A4A',
                  border: 'none',
                  borderRadius: '999px',
                  color: '#FFFFFF',
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {language === 'ar' ? 'تأكيد الإلغاء' : 'Cancel booking'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
