'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function MemberDashboard() {
  const { language, t, mounted } = useLanguage();
  const [user, setUser] = useState(null);
  const [dbData, setDbData] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('mars-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    async function loadDashboardData() {
      try {
        const res = await fetch('/api/v1/public/homepage');
        const json = await res.json();
        if (json.success) {
          setDbData(json.data);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadDashboardData();
  }, []);

  if (!mounted || !user) return null;

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      
      {/* 1. Welcome Banner Widget */}
      <section style={{
        position: 'relative',
        background: 'linear-gradient(135deg, var(--mars-copper) 0%, var(--copper-900) 100%)',
        borderRadius: '8px',
        padding: '36px',
        color: '#FFFFFF',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '24px',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontSize: '28px', fontWeight: 300, margin: 0 }}>
            {language === 'ar' ? `صباح الخير، ${user.name} 👋` : `Good Morning, ${user.name} 👋`}
          </h1>
          <p style={{ margin: '12px 0 0', opacity: 0.85, fontSize: '15px', maxWidth: '44ch', lineHeight: 1.6 }}>
            {language === 'ar'
              ? 'لديك حجز قاعة اجتماعات اليوم، وينتهي اشتراك عضويتك المميزة خلال 26 يوماً.'
              : 'You have 1 meeting room reservation scheduled for today. Your premium membership will auto-renew in 26 days.'}
          </p>
        </div>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <a href="/spaces" className="btn-pill-primary" style={{ background: '#FFFFFF', color: 'var(--mars-copper)', padding: '12px 28px', fontSize: '14px' }}>
            {language === 'ar' ? 'حجز مساحة عمل جديدة' : 'Book Workspace'}
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
          <div style={{ background: 'var(--mars-slate)', padding: '28px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 600, color: '#FFFFFF' }}>
              {language === 'ar' ? 'جدول أعمال اليوم' : "Today's Schedule"}
            </h3>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'var(--mars-void)', padding: '16px', borderRadius: '6px' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--copper-400)' }}>14:00</div>
                <div style={{ height: '24px', width: '1px', background: 'rgba(245, 245, 245, 0.1)' }} />
                <div>
                  <div style={{ fontWeight: 600 }}>Meeting Room Alpha</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)', marginTop: '4px' }}>Jeddah Branch · Floor 1</div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Upcoming Bookings List Widget */}
          <div style={{ background: 'var(--mars-slate)', padding: '28px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#FFFFFF' }}>
                {language === 'ar' ? 'الحجوزات القادمة' : 'Upcoming Bookings'}
              </h3>
              <a href="/member/bookings" style={{ fontSize: '13px', color: 'var(--copper-400)', fontWeight: 600 }}>
                {language === 'ar' ? 'عرض الكل' : 'View all'}
              </a>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--mars-void)', padding: '16px', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Meeting Room Alpha</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted-dark)', marginTop: '4px' }}>
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
          <div style={{ background: 'var(--mars-slate)', padding: '28px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 600, color: '#FFFFFF' }}>
              {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              <a href="/spaces" style={{ background: 'var(--mars-void)', padding: '16px', borderRadius: '6px', textAlign: 'center', display: 'block', border: '1px solid var(--line-dark)' }}>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{language === 'ar' ? 'حجز قاعة' : 'Book Room'}</div>
              </a>
              <a href="/member/support" style={{ background: 'var(--mars-void)', padding: '16px', borderRadius: '6px', textAlign: 'center', display: 'block', border: '1px solid var(--line-dark)' }}>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{language === 'ar' ? 'رفع تذكرة' : 'Report Issue'}</div>
              </a>
              <a href="/member/invoices" style={{ background: 'var(--mars-void)', padding: '16px', borderRadius: '6px', textAlign: 'center', display: 'block', border: '1px solid var(--line-dark)' }}>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{language === 'ar' ? 'سداد فاتورة' : 'Pay Invoice'}</div>
              </a>
            </div>
          </div>

        </div>

        {/* Right Column (Sidebar widgets) */}
        <div style={{ display: 'grid', gap: '32px' }}>
          
          {/* 5. Membership Card Widget */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
            border: '1px solid rgba(245, 245, 245, 0.15)',
            borderRadius: '12px',
            padding: '28px',
            boxSizing: 'border-box',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--copper-400)', letterSpacing: '0.1em' }}>
              MARS PREMIUM MEMBER
            </div>
            <div style={{ fontSize: '24px', fontWeight: 300, color: '#FFFFFF', marginTop: '16px' }}>
              Business Plan
            </div>

            <div style={{ display: 'grid', gap: '12px', marginTop: '24px', fontSize: '13px', borderTop: '1px solid rgba(245, 245, 245, 0.08)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'تاريخ التجديد' : 'Renewal Date'}</span>
                <span style={{ fontWeight: 600 }}>28 Dec 2026</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'أرصدة قاعات الاجتماعات' : 'Meeting Credits'}</span>
                <span style={{ fontWeight: 600, color: 'var(--copper-400)' }}>18 / 20 hours</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'أرصدة الطباعة' : 'Desk Credits'}</span>
                <span style={{ fontWeight: 600 }}>Unlimited</span>
              </div>
            </div>

            <a href="/member/membership" className="btn-pill-secondary" style={{ width: '100%', padding: '10px 0', fontSize: '13px', marginTop: '24px', textAlign: 'center' }}>
              {language === 'ar' ? 'إدارة الاشتراك' : 'Manage Membership'}
            </a>
          </div>

          {/* 6. Invoice Widget */}
          <div style={{ background: 'var(--mars-slate)', padding: '28px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600, color: '#FFFFFF' }}>
              {language === 'ar' ? 'الفواتير المستحقة' : 'Outstanding Balance'}
            </h3>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#FFFFFF' }}>0.00 SAR</div>
            <p style={{ margin: '6px 0 20px', color: 'var(--text-muted-dark)', fontSize: '13px' }}>
              ✓ {language === 'ar' ? 'جميع فواتيرك مدفوعة بالكامل!' : 'All invoices are paid in full!'}
            </p>
            <a href="/member/invoices" className="btn-pill-primary" style={{ width: '100%', padding: '10px 0', fontSize: '13px', textAlign: 'center' }}>
              {language === 'ar' ? 'تاريخ المدفوعات' : 'View Invoices'}
            </a>
          </div>

          {/* 7. Support Widget */}
          <div style={{ background: 'var(--mars-slate)', padding: '28px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600, color: '#FFFFFF' }}>
              {language === 'ar' ? 'مركز المساعدة المباشرة' : 'Support Desk'}
            </h3>
            <div style={{ display: 'grid', gap: '10px' }}>
              <a href="/member/support" className="btn-pill-primary" style={{ padding: '10px 0', fontSize: '13px', textAlign: 'center' }}>
                {language === 'ar' ? 'محادثة فورية مع الاستقبال' : 'Start Live Chat'}
              </a>
              <a href="/member/support" className="btn-pill-secondary" style={{ padding: '10px 0', fontSize: '13px', textAlign: 'center' }}>
                {language === 'ar' ? 'تذاكر المساعدة' : 'View Support Tickets'}
              </a>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
