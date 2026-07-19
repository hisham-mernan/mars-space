'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function MembershipManagement() {
  const { language, t, mounted } = useLanguage();
  const [user, setUser] = useState(null);
  const [dbData, setDbData] = useState(null);
  const [autoRenew, setAutoRenew] = useState(true);
  const [comparisonModal, setComparisonModal] = useState(false);
  const [addons, setAddons] = useState([
    { id: 'locker', name: 'Locker Rental', price: 150, period: 'Month', active: false },
    { id: 'parking', name: 'Premium Parking Space', price: 250, period: 'Month', active: false },
    { id: 'phone', name: 'Dedicated VOIP Number', price: 90, period: 'Month', active: false },
    { id: 'mail', name: 'Premium Mail Forwarding', price: 120, period: 'Month', active: false }
  ]);

  useEffect(() => {
    const storedUser = localStorage.getItem('mars-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  if (!mounted || !user) return null;

  const toggleAddon = (id) => {
    setAddons(prev =>
      prev.map(add => (add.id === id ? { ...add, active: !add.active } : add))
    );
  };

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: '28px', color: '#FFFFFF', fontWeight: 300, margin: 0 }}>
          {language === 'ar' ? 'إدارة عضويتي' : 'Membership Management'}
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-muted-dark)', fontSize: '14px' }}>
          {language === 'ar' ? 'عرض تفاصيل العضوية النشطة والأرصدة المتوفرة وإدارة الإضافات.' : 'Monitor your active subscription details, credits meters, and optional add-ons.'}
        </p>
      </div>

      {/* Main Grid Layout: Left Column (General info & credits) and Right Column (Addons) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
        gap: '32px',
        alignItems: 'start'
      }}>
        
        {/* Left Column */}
        <div style={{ gridColumn: 'span 2', display: 'grid', gap: '32px' }}>
          
          {/* Active Contract Info Card */}
          <div style={{ background: 'var(--mars-slate)', padding: '32px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
            <h3 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: 600, color: '#FFFFFF' }}>
              {language === 'ar' ? 'تفاصيل العقد الحالي' : 'Active Subscription'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'نوع العضوية والاشتراك' : 'Membership Level'}</div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>Business Plan (Premium)</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'الرسوم الشهرية' : 'Monthly Fee'}</div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>2,400 SAR</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'صالح لغاية' : 'Expiration Date'}</div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>28 Dec 2026</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'التجديد التلقائي' : 'Auto Renewal'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <input
                    type="checkbox"
                    checked={autoRenew}
                    onChange={(e) => setAutoRenew(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: autoRenew ? 'var(--copper-400)' : 'var(--text-muted-dark)' }}>
                    {autoRenew ? (language === 'ar' ? 'مفعّل' : 'Enabled') : (language === 'ar' ? 'معطّل' : 'Disabled')}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '36px' }}>
              <button
                onClick={() => setComparisonModal(true)}
                className="btn-pill-primary"
                style={{ padding: '12px 28px', fontSize: '14px', cursor: 'pointer', border: 'none' }}
              >
                {language === 'ar' ? 'ترقية / تعديل الاشتراك' : 'Upgrade Membership'}
              </button>
            </div>
          </div>

          {/* Credits meters progress block */}
          <div style={{ background: 'var(--mars-slate)', padding: '32px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
            <h3 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: 600, color: '#FFFFFF' }}>
              {language === 'ar' ? 'أرصدة الميزات المتبقية' : 'Remaining Benefit Credits'}
            </h3>

            <div style={{ display: 'grid', gap: '24px' }}>
              {/* Meeting room credits meter */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                  <span>{language === 'ar' ? 'قاعات الاجتماعات (ساعات شهرياً)' : 'Meeting Rooms (hours/month)'}</span>
                  <span style={{ fontWeight: 600 }}>18 / 20 hours used</span>
                </div>
                {/* Progress bar */}
                <div style={{ height: '8px', background: 'var(--mars-void)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '90%', height: '100%', background: 'var(--mars-copper)', borderRadius: '4px' }} />
                </div>
              </div>

              {/* Printing credits meter */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                  <span>{language === 'ar' ? 'أوراق الطباعة الملونة' : 'Color Printing pages'}</span>
                  <span style={{ fontWeight: 600 }}>45 / 50 pages used</span>
                </div>
                <div style={{ height: '8px', background: 'var(--mars-void)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '90%', height: '100%', background: 'var(--mars-copper)', borderRadius: '4px' }} />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Addons Marketplace */}
        <div>
          <div style={{ background: 'var(--mars-slate)', padding: '32px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#FFFFFF' }}>
              {language === 'ar' ? 'متجر الإضافات والخدمات' : 'Add-ons Marketplace'}
            </h3>
            <p style={{ margin: '6px 0 24px', color: 'var(--text-muted-dark)', fontSize: '13px', lineHeight: 1.5 }}>
              {language === 'ar' ? 'قم بتخصيص عضويتك وتفعيل خدمات إضافية.' : 'Customize your subscription by adding premium workspaces addons.'}
            </p>

            <div style={{ display: 'grid', gap: '16px' }}>
              {addons.map((add) => (
                <div
                  key={add.id}
                  style={{
                    background: 'var(--mars-void)',
                    padding: '18px',
                    borderRadius: '6px',
                    border: '1px solid var(--line-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{add.name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted-dark)', marginTop: '4px' }}>
                      {add.price} SAR / {add.period}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAddon(add.id)}
                    style={{
                      background: add.active ? 'none' : 'var(--mars-copper)',
                      border: add.active ? '1px solid rgba(255, 0, 0, 0.4)' : 'none',
                      color: add.active ? '#FF4A4A' : '#FFFFFF',
                      borderRadius: '999px',
                      padding: '8px 18px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {add.active 
                      ? (language === 'ar' ? 'إلغاء' : 'Deactivate') 
                      : (language === 'ar' ? 'تفعيل' : 'Activate')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Upgrade Comparison Modal */}
      {comparisonModal && (
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
            maxWidth: '560px',
            boxSizing: 'border-box',
            margin: '0 20px'
          }}>
            <h3 style={{ margin: 0, fontSize: '22px', color: '#FFFFFF' }}>
              {language === 'ar' ? 'مقارنة وترقية العضويات' : 'Compare & Upgrade Plans'}
            </h3>

            {/* Comparison table */}
            <div style={{ marginTop: '24px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'start' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(245, 245, 245, 0.1)' }}>
                    <th style={{ padding: '10px 0' }}>Feature</th>
                    <th>Basic</th>
                    <th style={{ color: 'var(--copper-400)' }}>Premium</th>
                    <th>Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(245, 245, 245, 0.05)' }}>
                    <td style={{ padding: '10px 0', color: 'var(--text-muted-dark)' }}>Meeting Credits</td>
                    <td>5 hrs</td>
                    <td style={{ fontWeight: 600, color: 'var(--copper-400)' }}>20 hrs</td>
                    <td>Unlimited</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(245, 245, 245, 0.05)' }}>
                    <td style={{ padding: '10px 0', color: 'var(--text-muted-dark)' }}>Business Address</td>
                    <td>—</td>
                    <td style={{ color: 'var(--copper-400)' }}>✓</td>
                    <td>✓</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(245, 245, 245, 0.05)' }}>
                    <td style={{ padding: '10px 0', color: 'var(--text-muted-dark)' }}>Team Members</td>
                    <td>—</td>
                    <td style={{ color: 'var(--copper-400)' }}>5 seats</td>
                    <td>Unlimited</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
              <button
                onClick={() => setComparisonModal(false)}
                className="btn-pill-secondary"
                style={{ padding: '10px 24px', fontSize: '13px', cursor: 'pointer' }}
              >
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </button>
              <button
                onClick={() => setComparisonModal(false)}
                className="btn-pill-primary"
                style={{ padding: '10px 24px', fontSize: '13px', border: 'none', cursor: 'pointer' }}
              >
                {language === 'ar' ? 'تأكيد الترقية' : 'Request Upgrade'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
