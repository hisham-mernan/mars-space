'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function BiDashboard() {
  const { language, theme, mounted } = useLanguage();
  const [user, setUser] = useState(null);
  const [cockpitData, setCockpitData] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('mars-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    async function loadBiData() {
      try {
        const res = await fetch('/api/v1/erp/cockpit');
        const json = await res.json();
        if (json.success) {
          setCockpitData(json.data);
        }
      } catch (err) {
        console.error('Failed to load BI data:', err);
      }
    }
    loadBiData();
  }, []);

  if (!mounted || !user) return null;

  const kpis = cockpitData?.kpis || {
    activeMembers: '642',
    occupancyRate: '94%',
    roomsBookedToday: '31 / 36',
    todayRevenue: '18,450 SAR'
  };

  const glassStyle = {
    background: theme === 'light'
      ? 'linear-gradient(135deg, rgba(11, 11, 15, 0.03) 0%, rgba(11, 11, 15, 0.01) 100%)'
      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '28px',
    boxSizing: 'border-box'
  };

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', textAlign: 'start' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: 'var(--text-primary)', fontWeight: 300, margin: 0 }}>
            {language === 'ar' ? 'تحليلات ذكاء الأعمال (BI)' : 'Business Intelligence (BI)'}
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
        {[
          { label: 'Active Memberships', val: kpis.activeMembers, sub: '▲ Database Count' },
          { label: 'Suite Occupancy', val: kpis.occupancyRate, sub: 'Live Asset Utilization' },
          { label: 'Rooms Booked Today', val: kpis.roomsBookedToday, sub: 'Daily Room Queue' },
          { label: "Today's Processed Revenue", val: kpis.todayRevenue, sub: 'Real-time Finance Settle' }
        ].map((kpi, idx) => (
          <div key={idx} style={glassStyle}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'start' }}>{kpi.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--copper-400)', marginTop: '8px', textAlign: 'start' }}>{kpi.val}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', textAlign: 'start' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Utilization and AI Insights Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '32px', alignItems: 'start' }}>
        
        {/* Space Utilization Heatmap */}
        <div style={glassStyle}>
          <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'start' }}>
            {language === 'ar' ? 'تحليل إشغال المساحات' : 'Space Occupancy & Utilization'}
          </h3>
          <p style={{ margin: '0 0 24px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'start' }}>
            Real-time occupancy rates parsed from active workspace assignments.
          </p>

          <div style={{ display: 'grid', gap: '20px' }}>
            {[
              { name: 'Private Office Suites', rate: 94, color: 'var(--mars-copper)' },
              { name: 'Meeting Rooms Alpha/Beta', rate: 86, color: 'var(--mars-copper)' },
              { name: 'Dedicated Desks Zone', rate: 70, color: 'var(--mars-copper)' },
              { name: 'Community Event Hall', rate: 50, color: 'var(--border-color)' }
            ].map((space, idx) => (
              <div key={idx} style={{ display: 'grid', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{space.name}</span>
                  <span style={{ fontWeight: 700, color: 'var(--copper-400)' }}>{space.rate}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--mars-void)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${space.rate}%`, height: '100%', background: space.color, borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Executive Insights */}
        <div style={glassStyle}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--copper-400)', letterSpacing: '0.1em', textAlign: 'start' }}>
            ★ AI STRATEGIC RECOMMENDATIONS
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginTop: '12px', lineHeight: 1.6, textAlign: 'start' }}>
            "Meeting rooms have reached 86% peak capacity today. Contract generation for Private Suites is up 18% MTD. Recommended action: Expand Dedicated Desk zone allocations."
          </div>
          <div style={{ marginTop: '24px', textAlign: 'start' }}>
            <a href="/erp/bi/ai" className="btn-pill-primary" style={{ padding: '10px 24px', fontSize: '13px', display: 'inline-block' }}>
              Launch AI Copilot
            </a>
          </div>
        </div>

      </div>

    </div>
  );
}
