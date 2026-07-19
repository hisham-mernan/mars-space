'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function BiDashboard() {
  const { language, mounted } = useLanguage();
  const [user, setUser] = useState(null);

  // Custom Dashboard builder components selection
  const [builderWidgets, setBuilderWidgets] = useState({
    kpis: true,
    revenueChart: true,
    utilizationHeatmap: true,
    aiInsights: true
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('mars-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  if (!mounted || !user) return null;

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#FFFFFF', fontWeight: 300, margin: 0 }}>
            {language === 'ar' ? 'تحليلات ذكاء الأعمال (BI)' : 'Business Intelligence (BI)'}
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted-dark)', fontSize: '14px' }}>
            {language === 'ar' ? 'تحليل الأداء المالي، معدلات إشغال الغرف والمكاتب، وتوقعات التدفقات النقدية.' : 'Monitor company-wide KPIs, financial statements, cash flow, and occupancy metrics.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <a href="/erp/bi/ai" className="btn-pill-primary" style={{ padding: '10px 24px', fontSize: '13px' }}>
            {language === 'ar' ? 'المساعد التنفيذي بالذكاء الاصطناعي' : 'AI Executive Copilot'}
          </a>
        </div>
      </div>

      {/* 1. Executive Financial Cockpit KPI Cards */}
      {builderWidgets.kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
          {[
            { label: 'Revenue (MTD)', val: '812,000 SAR', sub: '▲ 14% vs target' },
            { label: 'Operating Expenses', val: '486,000 SAR', sub: '▼ 3% below budget' },
            { label: 'Net Profit (MTD)', val: '326,000 SAR', sub: 'Margin: 40.1%' },
            { label: 'Cash Balance', val: '1.84M SAR', sub: 'Healthy liquidity' },
            { label: 'Accounts Receivable', val: '148,200 SAR', sub: '2 overdue invoices' },
            { label: 'Accounts Payable', val: '91,300 SAR', sub: 'Due in 30 days' }
          ].map((kpi, idx) => (
            <div key={idx} style={{ background: 'var(--mars-slate)', padding: '24px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>{kpi.label}</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#FFFFFF', marginTop: '8px' }}>{kpi.val}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted-dark)', marginTop: '4px' }}>{kpi.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Charts section layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
        gap: '32px',
        alignItems: 'start'
      }}>
        
        {/* Left widget: Monthly Revenue Bar Chart (Pure CSS!) */}
        {builderWidgets.revenueChart && (
          <div style={{ background: 'var(--mars-slate)', padding: '32px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600, color: '#FFFFFF' }}>
              {language === 'ar' ? 'تقرير الإيرادات الشهرية' : 'Monthly Revenue Performance'}
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: '12px', color: 'var(--text-muted-dark)' }}>
              Comparison of actual revenue performance over the last 5 months (in SAR).
            </p>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              height: '200px',
              paddingTop: '20px',
              position: 'relative'
            }}>
              {/* Grid rules lines */}
              <div style={{ position: 'absolute', left: 0, right: 0, top: '50px', height: '1px', background: 'rgba(245,245,245,0.05)' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, top: '100px', height: '1px', background: 'rgba(245,245,245,0.05)' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, top: '150px', height: '1px', background: 'rgba(245,245,245,0.05)' }} />

              {[
                { label: 'March', height: '40%' },
                { label: 'April', height: '60%' },
                { label: 'May', height: '75%' },
                { label: 'June', height: '90%' },
                { label: 'July', height: '95%', highlight: true }
              ].map((bar, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '10px', zIndex: 2 }}>
                  <div style={{
                    width: '32px',
                    height: `calc(180px * ${bar.height.replace('%', '') / 100})`,
                    background: bar.highlight ? 'var(--mars-copper)' : 'rgba(245,245,245,0.15)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'all 300ms ease'
                  }} />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>{bar.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Right widget: Space Utilization Heatmap */}
        {builderWidgets.utilizationHeatmap && (
          <div style={{ background: 'var(--mars-slate)', padding: '32px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600, color: '#FFFFFF' }}>
              {language === 'ar' ? 'تحليل إشغال المساحات' : 'Space Occupancy & Utilization'}
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: '12px', color: 'var(--text-muted-dark)' }}>
              Real-time occupancy rates parsed from active workspace assignments.
            </p>

            <div style={{ display: 'grid', gap: '20px' }}>
              {[
                { name: 'Private Offices', rate: 94, color: 'var(--mars-copper)' },
                { name: 'Meeting Rooms', rate: 76, color: 'var(--mars-copper)' },
                { name: 'Coworking Seats', rate: 61, color: 'var(--mars-copper)' },
                { name: 'Community Hall', rate: 45, color: 'rgba(245, 245, 245, 0.15)' }
              ].map((space, idx) => (
                <div key={idx} style={{ display: 'grid', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ fontWeight: 500 }}>{space.name}</span>
                    <span style={{ fontWeight: 700, color: space.rate > 70 ? 'var(--copper-400)' : '#FFFFFF' }}>{space.rate}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--mars-void)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${space.rate}%`, height: '100%', background: space.color, borderRadius: '3px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* AI Executive Insights center preview banner */}
      {builderWidgets.aiInsights && (
        <section style={{
          background: 'rgba(200, 107, 60, 0.08)',
          border: '1px solid rgba(200, 107, 60, 0.3)',
          borderRadius: '8px',
          padding: '28px',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--copper-400)', letterSpacing: '0.1em' }}>
                ★ AI STRATEGIC RECOMMENDATIONS PREVIEW
              </div>
              <div style={{ fontSize: '15px', color: '#FFFFFF', marginTop: '10px', maxWidth: '64ch', lineHeight: 1.6 }}>
                "Meeting Room Alpha has reached 98% utilization over the past 30 days. Consider expanding premium meeting capacity or adjusting hourly peak rates."
              </div>
            </div>
            <a href="/erp/bi/ai" className="btn-pill-primary" style={{ padding: '10px 24px', fontSize: '13px' }}>
              Open Copilot
            </a>
          </div>
        </section>
      )}

    </div>
  );
}
